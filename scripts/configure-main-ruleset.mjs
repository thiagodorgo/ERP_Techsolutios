#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateJunta, juntaIdentities, aplicaSeABranchDefault, APP_GITHUB_ACTIONS, normalizarChecks } from './porteiro-pre-merge.mjs';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const arg=(n,d)=>{const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:d;};
const fail=(m)=>{throw new Error(m);};
const nonEmpty=(v)=>typeof v==='string'&&v.trim()!=='';
const CONTEXT_PORTEIRO='erp/porteiro-pre-merge';
const gh=(a,input=undefined)=>JSON.parse(execFileSync('gh',a,{cwd:ROOT,input,encoding:'utf8',stdio:['pipe','pipe','pipe']}));
const canonical=(v)=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const hash=(v)=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const template=()=>JSON.parse(readFileSync(arg('--template',`${ROOT}.github/rulesets/main.template.json`),'utf8'));

export function assertDesired(desired){
  if(desired.enforcement!=='active'||desired.target!=='branch')fail('ruleset precisa estar active/branch');
  if(!aplicaSeABranchDefault(desired,'main'))fail('ruleset desejado nao se aplica a branch default (conditions.ref_name)');
  if((desired.bypass_actors||[]).length)fail('bypass_actors precisa ser vazio');
  const status=desired.rules.find(r=>r.type==='required_status_checks')?.parameters;
  if(!status?.strict_required_status_checks_policy)fail('strict precisa ser true');
  for(const c of status.required_status_checks||[])if(!Number.isInteger(c.integration_id)||c.integration_id<=0)fail(`app criador não fixado: ${c.context}`);
  // Pin nativo (PD-GOV-PORTEIRO-APPID, opcao D): o proprio GitHub passa a recusar check de outra
  // fonte, fora do alcance deste script. O contexto do porteiro tem de estar pinado no app id fixado.
  const porteiro=(status.required_status_checks||[]).find(c=>c.context===CONTEXT_PORTEIRO);
  if(!porteiro)fail(`ruleset desejado não requer ${CONTEXT_PORTEIRO}`);
  if(porteiro.integration_id!==APP_GITHUB_ACTIONS.id)fail(`fonte do ${CONTEXT_PORTEIRO} tem de ser o app id fixado pela PD-GOV-PORTEIRO-APPID (${APP_GITHUB_ACTIONS.id}), não ${porteiro.integration_id}`);
  for(const t of ['deletion','non_fast_forward','pull_request'])if(!desired.rules.some(r=>r.type===t))fail(`regra obrigatória ausente: ${t}`);
}
export function assertJuntaCritica(j,executor){
  validateJunta(j);
  if(j.critical!==true)fail('bootstrap do ruleset é decisão crítica: a junta precisa declarar critical:true');
  if(j.votes.length!==5)fail('apply/rollback exige junta crítica unânime 5/5');
  if(!nonEmpty(executor))fail('--executor (identidade do bootstrap) é obrigatório');
  const roles=[...juntaIdentities(j).map(x=>x.agentId),executor];
  if(new Set(roles).size!==roles.length)fail('executor/bootstrap acumulou alçada');
  return true;
}
function assertJunta(path,executor){ return assertJuntaCritica(JSON.parse(readFileSync(path,'utf8')),executor); }
// O plan() NAO resolve mais o integration_id observando o que apareceu verde: ele CONFERE que o
// observado bate com o que o template ja fixa. Divergencia e VETO, nao re-resolucao — senao bastaria
// um check verde de outra fonte para o proprio plano reescrever o pin e legitimar a fonte errada.
export function conferirFontesFixadas(required,observed){
  for(const item of required){
    if(!Number.isInteger(item.integration_id)||item.integration_id<=0)fail(`VETO: template sem integration_id fixado para ${item.context}`);
    const verdes=(observed||[]).filter(x=>x.context===item.context&&x.success);
    if(!verdes.length)fail(`VETO: contexto requerido sem check verde observado: ${item.context}`);
    const divergentes=[...new Set(verdes.map(x=>x.appId))].filter(id=>id!==item.integration_id);
    if(divergentes.length)fail(`VETO: fonte observada diverge do id fixado em ${item.context}: ${divergentes.join(',')} != ${item.integration_id}`);
  }
  return true;
}
// MESMA normalizacao do snapshot (D-10): o `plan()` tem de observar a fonte exatamente como o
// porteiro observa, senao o VETO por divergencia dispara — ou deixa de disparar — por causa da
// copia, e nao do estado real do GitHub. `success` e derivado do `conclusion` canonico.
function sources(repo,head){
  const runs=gh(['api',`repos/${repo}/commits/${head}/check-runs?filter=latest&per_page=100`]).check_runs||[];
  const statuses=gh(['api',`repos/${repo}/commits/${head}/status`]).statuses||[];
  return normalizarChecks(runs,statuses).map(c=>({context:c.context,appId:c.appId,success:c.conclusion==='success'}));
}
async function plan(){
  const repo=gh(['repo','view','--json','nameWithOwner']).nameWithOwner; const head=arg('--head'); if(!/^[0-9a-f]{40}$/.test(head||''))fail('--head SHA40 obrigatório');
  const desired=template(); const observed=sources(repo,head); const req=desired.rules.find(r=>r.type==='required_status_checks').parameters.required_status_checks;
  conferirFontesFixadas(req,observed);
  assertDesired(desired); const existing=gh(['api',`repos/${repo}/rulesets?includes_parents=true`]);
  const preState=existing.map(r=>gh(['api',`repos/${repo}/rulesets/${r.id}?includes_parents=true`]));
  const output={schema:'erp-main-ruleset-plan:v1',repo,head,desired,desiredSha256:hash(desired),preState,preStateSha256:hash(preState)};
  writeFileSync(arg('--out'),`${JSON.stringify(output,null,2)}\n`); console.log(`plan: OK ${output.desiredSha256}`);
}
async function apply(){
  const p=JSON.parse(readFileSync(arg('--plan'),'utf8'));const executor=arg('--executor');assertJunta(arg('--junta'),executor);assertDesired(p.desired);
  const main=gh(['api',`repos/${p.repo}/git/ref/heads/main`]).object.sha;if(main!==p.head)fail('head de bootstrap mudou');
  const body=JSON.stringify(p.desired);const old=p.preState.find(r=>r.name===p.desired.name);const endpoint=old?`repos/${p.repo}/rulesets/${old.id}`:`repos/${p.repo}/rulesets`;
  const method=old?'PUT':'POST';const applied=gh(['api','-X',method,endpoint,'--input','-'],body);const reread=gh(['api',`repos/${p.repo}/rulesets/${applied.id}`]);if(hash(reread)!==hash({...p.desired,id:reread.id,node_id:reread.node_id,source_type:reread.source_type,source:reread.source,created_at:reread.created_at,updated_at:reread.updated_at,_links:reread._links}))console.log('apply: relido; campos gerenciados pelo GitHub presentes');
  console.log(JSON.stringify({applied:true,id:applied.id,executor,head:p.head}));
}
async function rollback(){
  const p=JSON.parse(readFileSync(arg('--plan'),'utf8'));const executor=arg('--executor');assertJunta(arg('--junta'),executor);
  const current=gh(['api',`repos/${p.repo}/rulesets?includes_parents=true`]);for(const r of current.filter(x=>x.name===p.desired.name))gh(['api','-X','DELETE',`repos/${p.repo}/rulesets/${r.id}`]);
  for(const prior of p.preState){const payload={...prior};for(const k of ['id','node_id','source_type','source','created_at','updated_at','_links'])delete payload[k];gh(['api','-X','POST',`repos/${p.repo}/rulesets`,'--input','-'],JSON.stringify(payload));}
  const reread=gh(['api',`repos/${p.repo}/rulesets?includes_parents=true`]);if(hash(reread)!==p.preStateSha256)fail('rollback não reproduziu pre-state; main permanece bloqueada');console.log('rollback: pre-state restaurado e relido');
}
// Só despacha quando executado direto: importar o módulo (teste/guard) não pode disparar CLI.
const direct=process.argv[1]&&fileURLToPath(import.meta.url)===fileURLToPath(new URL(`file:///${process.argv[1].replace(/\\/g,'/')}`));
if(direct){const cmd=process.argv[2];Promise.resolve(cmd==='plan'?plan():cmd==='apply'?apply():cmd==='rollback'?rollback():fail('comando: plan|apply|rollback')).catch(e=>{console.error(`configure-main-ruleset: ${e.message}`);process.exitCode=1;});}
