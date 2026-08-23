#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateJunta, juntaIdentities, verifyAttestation } from './porteiro-pre-merge.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const arg=(n)=>{const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:undefined;};
const fail=(m)=>{throw new Error(m);};
const gh=(a,input)=>JSON.parse(execFileSync('gh',a,{cwd:ROOT,input,encoding:'utf8',stdio:['pipe','pipe','pipe']}));
const marked=(comments,marker)=>{const c=[...comments].reverse().find(x=>String(x.body).includes(marker));if(!c)fail(`${marker} ausente`);const line=String(c.body).split('\n').find(x=>x.startsWith('{'));return {comment:c,payload:JSON.parse(line)};};

const nonEmpty=(v)=>typeof v==='string'&&v.trim()!=='';

export function validateFinalization({pr,attestation,executorId,mergeExecutorId,junta}){
  if(!pr.merged||!pr.merge_commit_sha||pr.base.ref!=='main')fail('PR ainda não está mergeado em main');
  if(attestation.head!==pr.head.sha||attestation.pr!==pr.number)fail('head aprovado não é o head factual do PR');
  // D-9 — o fechamento confere o VEREDITO, não só `head`/`pr`. Antes desta correção um atestado
  // BLOQUEADO satisfazia o fechamento: o pós-merge "fecharia" um merge que o porteiro tinha barrado.
  // O objeto que o buraco engolia (veredicto negativo persistido) nasceu NESTA MESMA entrega, e o
  // marcador dele é o MESMO da liberação — o leitor pega sempre o ÚLTIMO comentário marcado, então
  // um veredicto negativo publicado depois SOMBREIA a liberação anterior. Deixar o buraco aberto
  // não seria pendência de melhoria: seria regressão de coerência interna da própria entrega.
  //
  // O mecanismo é REUSO, não uma segunda cópia da regra: `verifyAttestation` é a mesma função que
  // o gate pré-merge e o merge CAS executam, então o fechamento exige a liberação literal, o
  // vínculo com `snapshotSha256`/`pr`/`head` e a evidência conferível do head. Regra reescrita aqui
  // divergiria da original no próximo ciclo — foi exatamente assim que a triplicação do D-10 nasceu.
  const snapshot=attestation?.snapshot;
  if(!snapshot)fail('atestado sem o snapshot canônico: veredito não conferível no fechamento pós-merge');
  verifyAttestation(snapshot,attestation);
  // Mesmos campos obrigatórios do gate pré-merge: alçada omitida é erro, nunca colisão apagada.
  validateJunta(junta);
  for(const [papel,id] of [['porteiro pré-merge',attestation.agentId],['executor do merge',mergeExecutorId],['executor pós-merge',executorId]])
    if(!nonEmpty(id))fail(`alçada sem identidade no fechamento pós-merge: ${papel}`);
  const occupied=[...juntaIdentities(junta).map(x=>x.agentId),attestation.agentId,mergeExecutorId,executorId];
  if(new Set(occupied).size!==occupied.length)fail('executor pós-merge acumulou alçada incompatível');
  return {approvedHead:attestation.head,mergeCommit:pr.merge_commit_sha};
}
async function main(){
  const n=Number(arg('--pr'));const executorId=arg('--executor');const mergeExecutorId=arg('--merge-executor');if(!n||!executorId||!mergeExecutorId)fail('--pr, --executor e --merge-executor obrigatórios');
  const repo=gh(['repo','view','--json','nameWithOwner']).nameWithOwner;const pr=gh(['api',`repos/${repo}/pulls/${n}`]);const comments=gh(['api',`repos/${repo}/issues/${n}/comments?per_page=100`]);
  const att=marked(comments,'erp-porteiro-attestation:v1');const junta=marked(comments,'erp-junta-attestation:v1').payload;const facts=validateFinalization({pr,attestation:att.payload,executorId,mergeExecutorId,junta});
  if(process.argv.includes('--cleanup'))execFileSync('bash',['scripts/post-merge-cleanup.sh'],{cwd:ROOT,stdio:'inherit'});
  const payload={schema:'erp-post-merge-finalization:v1',repo,pr:n,base:'main',approvedHead:facts.approvedHead,mergeCommit:facts.mergeCommit,attestationUrl:att.comment.html_url,executorId,mergeExecutorId,cleanup:process.argv.includes('--cleanup'),timestamp:new Date().toISOString()};
  const body=`erp-post-merge-finalization:v1\n${JSON.stringify(payload)}`;const comment=gh(['api','-X','POST',`repos/${repo}/issues/${n}/comments`,'-f',`body=${body}`]);console.log(JSON.stringify({...payload,permalink:comment.html_url}));
}
if(process.argv[1]?.endsWith('post-merge-finalize.mjs'))main().catch(e=>{console.error(`post-merge-finalize: ${e.message}`);process.exitCode=1;});
