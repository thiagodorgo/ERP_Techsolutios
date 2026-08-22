import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { buildSnapshot,verifyAttestation,checkAllowlist,validateJunta,juntaIdentities } from '../scripts/porteiro-pre-merge.mjs';
import { assertMergeCandidate } from '../scripts/merge-authorized-pr.mjs';
import { validateFinalization } from '../scripts/post-merge-finalize.mjs';
import { assertJuntaCritica } from '../scripts/configure-main-ruleset.mjs';

const H='a'.repeat(40),B='b'.repeat(40);
const ruleset=():any=>({id:1,name:'main',target:'branch',enforcement:'active',bypass_actors:[],
  conditions:{ref_name:{include:['~DEFAULT_BRANCH'],exclude:[]}},
  rules:[{type:'deletion'},{type:'non_fast_forward'},{type:'pull_request',parameters:{required_approving_review_count:0}},
    {type:'required_status_checks',parameters:{strict_required_status_checks_policy:true,required_status_checks:[{context:'ci',integration_id:10},{context:'erp/porteiro-pre-merge',integration_id:20}]}}]});
const junta=():any=>({marker:'erp-junta-attestation:v1',result:'APROVADO',critical:false,fabrica:null,origin:'owner',planner:'planner',developer:'dev',
  votes:[{agentId:'r1',vote:'APROVADO'},{agentId:'r2',vote:'APROVADO'},{agentId:'r3',vote:'APROVADO'}]});
const state=():any=>({repo:'acme/erp',defaultBranch:'main',
  pr:{number:9,state:'open',draft:false,body:'escopo',head:{ref:'feat/x',sha:H},base:{ref:'main',sha:B}},
  rulesets:[ruleset()],checks:[{context:'ci',appId:10,conclusion:'success',detailsUrl:'https://ci'}],junta:junta(),juntaBlobOid:'c'.repeat(40)});
const att=(s:any):any=>({schema:'erp-porteiro-attestation:v1',verdict:`LIBERADO: merge do PR #9 no head ${H}`,repo:'acme/erp',pr:9,head:H,snapshotSha256:s.snapshotSha256,
  agentId:'porter',role:'porteiro-pos-merge',runtime:'codex',model:'gpt-5.6-sol',reasoningEffort:'ultra',commands:['npm test']});
const mergedPr=():any=>({number:9,merged:true,merge_commit_sha:'f'.repeat(40),base:{ref:'main'},head:{sha:H}});
const cas=(s:any,a:any,mergeAgentId:string)=>{const c={html_url:'https://gh/comment/1'};
  return assertMergeCandidate({snapshot:s,currentSnapshot:s,attestation:a,status:{context:'erp/porteiro-pre-merge',state:'success',target_url:c.html_url},comment:c,expectedHead:H,mergeAgentId});};

test('snapshot canônico liga repo/PR/head/base/body/check/ruleset/junta e aceita recibo exato',()=>{const s=buildSnapshot(state());assert.equal(s.bodySha256.length,64);assert.equal(s.ruleset.sha256.length,64);assert.equal(verifyAttestation(s,att(s)),true);});

test('mutações discriminantes alteram snapshot ou fecham o gate',()=>{const original=buildSnapshot(state());for(const mutate of [(x:any)=>x.pr.head.sha='d'.repeat(40),(x:any)=>x.pr.base.sha='e'.repeat(40),(x:any)=>x.pr.body='mudou',(x:any)=>x.checks[0].detailsUrl='https://ci/new',(x:any)=>x.rulesets[0].id=2]){const x=state();mutate(x);assert.notEqual(buildSnapshot(x).snapshotSha256,original.snapshotSha256);}const badCheck=state();badCheck.checks[0].conclusion='failure';assert.throws(()=>buildSnapshot(badCheck),/não verde/);const bypass=state();bypass.rulesets[0].bypass_actors=[{actor_id:1}];assert.throws(()=>buildSnapshot(bypass),/bypass/);const dup=state();dup.junta.votes[0].agentId='dev';assert.throws(()=>buildSnapshot(dup),/repetida/);});

test('ressalva, SHA curto e declaração de invocação degradada não liberam',()=>{const s=buildSnapshot(state());for(const patch of [{verdict:`LIBERADO COM RESSALVA: PR #9 head ${H}`},{head:H.slice(0,12)},{reasoningEffort:'high'},{model:'gpt-5.6-terra'},{runtime:'claude-code'},{role:'planejador-mestre'},{agentId:'dev'}])assert.throws(()=>verifyAttestation(s,{...att(s),...patch}));});

test('merge CAS exige snapshot/status/permalink/head e executor independentes',()=>{const s=buildSnapshot(state()),a=att(s),c={html_url:'https://gh/comment/1'},status={context:'erp/porteiro-pre-merge',state:'success',target_url:c.html_url};assert.equal(assertMergeCandidate({snapshot:s,currentSnapshot:s,attestation:a,status,comment:c,expectedHead:H,mergeAgentId:'merger'}),true);assert.throws(()=>assertMergeCandidate({snapshot:s,currentSnapshot:s,attestation:a,status,comment:c,expectedHead:'f'.repeat(40),mergeAgentId:'merger'}),/head divergiu/);assert.throws(()=>assertMergeCandidate({snapshot:s,currentSnapshot:s,attestation:a,status:{...status,target_url:'x'},comment:c,expectedHead:H,mergeAgentId:'merger'}),/permalink/);});

test('workflow nunca executa código do head em pull_request_target e ruleset é strict sem bypass',()=>{const y=readFileSync('.github/workflows/porteiro-pre-merge.yml','utf8');assert.match(y,/pull_request_target:/);assert.doesNotMatch(y,/ref:\s*\$\{\{\s*github\.event\.pull_request\.head/);assert.match(y,/ref: main/);const r=JSON.parse(readFileSync('.github/rulesets/main.template.json','utf8'));assert.deepEqual(r.bypass_actors,[]);assert.equal(r.enforcement,'active');assert.equal(r.rules.find((x:any)=>x.type==='required_status_checks').parameters.strict_required_status_checks_policy,true);});

test('guard de allowlist falha para qualquer path não manifestado',()=>{assert.equal(checkAllowlist(['CLAUDE.md'],new Set(['CLAUDE.md'])),true);assert.throws(()=>checkAllowlist(['CLAUDE.md','src/escape.ts'],new Set(['CLAUDE.md'])),/src\/escape/);});

// ---------------------------------------------------------------------------
// F-C — cruzamento de alçadas fail-closed (uma mutação por caso de teste)
// ---------------------------------------------------------------------------

test('F-C mut.1 — junta que OMITE planner não passa em gate nenhum',()=>{const x=state();delete x.junta.planner;assert.throws(()=>buildSnapshot(x),/alçada obrigatória da junta ausente ou vazia: planner/);const y=state();delete y.junta.origin;assert.throws(()=>buildSnapshot(y),/origin/);const z=state();delete z.junta.developer;assert.throws(()=>buildSnapshot(z),/developer/);});

test('F-C mut.2 — alçada nomeada com string vazia é omissão disfarçada',()=>{for(const role of ['origin','planner','developer']){const x=state();x.junta[role]='';assert.throws(()=>buildSnapshot(x),new RegExp(role));const y=state();y.junta[role]='   ';assert.throws(()=>buildSnapshot(y),new RegExp(role));}});

test('F-C mut.3 — critical:true exige cinco votantes distintos e unânimes',()=>{const x=state();x.junta.critical=true;assert.throws(()=>buildSnapshot(x),/cinco votantes/);const ok=state();ok.junta.critical=true;ok.junta.votes=['r1','r2','r3','r4','r5'].map((a)=>({agentId:a,vote:'APROVADO'}));assert.equal(buildSnapshot(ok).junta.identities.length,8);const dup=state();dup.junta.critical=true;dup.junta.votes=['r1','r2','r3','r4','r4'].map((a)=>({agentId:a,vote:'APROVADO'}));assert.throws(()=>buildSnapshot(dup),/repetida/);const nao=state();nao.junta.critical=true;nao.junta.votes=['r1','r2','r3','r4','r5'].map((a,i)=>({agentId:a,vote:i===4?'REPROVADO':'APROVADO'}));assert.throws(()=>buildSnapshot(nao),/não aprovado/);});

test('F-C mut.4 — critical ausente ou não-booleano é fail-closed',()=>{for(const v of [undefined,'true',1,null]){const x=state();if(v===undefined)delete x.junta.critical;else x.junta.critical=v;assert.throws(()=>buildSnapshot(x),/critical booleano/);}});

test('F-C mut.5 — porteiro com a identidade de uma alçada da junta não libera',()=>{const s=buildSnapshot(state());for(const id of ['owner','planner','dev','r1','r2','r3'])assert.throws(()=>verifyAttestation(s,{...att(s),agentId:id}),/independência não comprovada/);assert.throws(()=>verifyAttestation(s,{...att(s),agentId:''}),/identidade/);});

test('F-C mut.6 — executor do merge igual a votante ou ao porteiro não mergeia',()=>{const s=buildSnapshot(state()),a=att(s);for(const id of ['owner','planner','dev','r1','r2','r3'])assert.throws(()=>cas(s,a,id),/independência não comprovada/);assert.throws(()=>cas(s,a,'porter'),/mesma identidade do porteiro/);assert.throws(()=>cas(s,a,''),/independente|identidade/);assert.equal(cas(s,a,'merger'),true);});

test('F-C mut.7 — executor pós-merge acumulando alçada (nomeada OU omitida) é vermelho',()=>{const s=buildSnapshot(state()),a=att(s);assert.equal(validateFinalization({pr:mergedPr(),attestation:a,executorId:'closer',mergeExecutorId:'merger',junta:junta()}).mergeCommit,'f'.repeat(40));assert.throws(()=>validateFinalization({pr:mergedPr(),attestation:a,executorId:'owner',mergeExecutorId:'merger',junta:junta()}),/acumulou alçada/);const omitido=junta();delete omitido.origin;assert.throws(()=>validateFinalization({pr:mergedPr(),attestation:a,executorId:'owner',mergeExecutorId:'merger',junta:omitido}),/origin/);assert.throws(()=>validateFinalization({pr:mergedPr(),attestation:a,executorId:'',mergeExecutorId:'merger',junta:junta()}),/sem identidade/);});

test('F-C mut.8 — fabrica é chave obrigatória e entra no conjunto de colisão',()=>{const semChave=state();delete semChave.junta.fabrica;assert.throws(()=>buildSnapshot(semChave),/fabrica obrigatório/);const colide=state();colide.junta.fabrica='r1';assert.throws(()=>buildSnapshot(colide),/repetida/);const vazia=state();vazia.junta.fabrica='';assert.throws(()=>buildSnapshot(vazia),/fabrica precisa ser null/);const ok=state();ok.junta.fabrica='fabrica-2';assert.ok(buildSnapshot(ok).junta.identities.some((x:any)=>x.role==='fabrica'&&x.agentId==='fabrica-2'));});

test('F-C — junta.identities é canônica no snapshot e independentOf saiu do schema',()=>{const s=buildSnapshot(state());assert.deepEqual(s.junta.identities.map((x:any)=>x.role),['developer','origin','planner','vote:00','vote:01','vote:02']);assert.deepEqual(buildSnapshot(state()).junta.identities,juntaIdentities(junta()));assert.throws(()=>verifyAttestation(s,{...att(s),independentOf:['owner','planner','dev','r1','r2','r3']}),/campo desconhecido no atestado: independentOf/);const semIdent=buildSnapshot(state());delete semIdent.junta.identities;assert.throws(()=>verifyAttestation(semIdent,att(semIdent)),/identidades canônicas/);});

test('F-C — bootstrap do ruleset exige junta crítica 5/5 sem acúmulo do executor',()=>{const j=junta();j.critical=true;j.votes=['r1','r2','r3','r4','r5'].map((a)=>({agentId:a,vote:'APROVADO'}));assert.equal(assertJuntaCritica(j,'bootstrap'),true);assert.throws(()=>assertJuntaCritica(j,'r3'),/acumulou alçada/);assert.throws(()=>assertJuntaCritica(j,''),/executor/);const naoCritica=junta();naoCritica.votes=['r1','r2','r3','r4','r5'].map((a)=>({agentId:a,vote:'APROVADO'}));assert.throws(()=>assertJuntaCritica(naoCritica,'bootstrap'),/critical:true/);const tres=junta();tres.critical=true;assert.throws(()=>assertJuntaCritica(tres,'bootstrap'),/cinco votantes/);assert.throws(()=>validateJunta({...junta(),marker:'outro'}),/junta externa v1 ausente/);});
