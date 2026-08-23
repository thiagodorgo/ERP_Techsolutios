import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { buildSnapshot,verifyAttestation,checkAllowlist,validateJunta,juntaIdentities,aplicaSeABranchDefault,buildNegativeVerdict,assertCriadoPeloAppGitHubActions,resolveExpectedAppId,pathsDeGovernanca,coletarPaths,normalizarChecks,APP_GITHUB_ACTIONS } from '../scripts/porteiro-pre-merge.mjs';
import { assertMergeCandidate } from '../scripts/merge-authorized-pr.mjs';
import { validateFinalization } from '../scripts/post-merge-finalize.mjs';
import { assertJuntaCritica,assertDesired,conferirFontesFixadas } from '../scripts/configure-main-ruleset.mjs';

const H='a'.repeat(40),B='b'.repeat(40);
const ruleset=():any=>({id:1,name:'main',target:'branch',enforcement:'active',bypass_actors:[],
  conditions:{ref_name:{include:['~DEFAULT_BRANCH'],exclude:[]}},
  rules:[{type:'deletion'},{type:'non_fast_forward'},{type:'pull_request',parameters:{required_approving_review_count:0}},
    {type:'required_status_checks',parameters:{strict_required_status_checks_policy:true,required_status_checks:[{context:'ci',integration_id:10},{context:'erp/porteiro-pre-merge',integration_id:20}]}}]});
const junta=():any=>({marker:'erp-junta-attestation:v1',result:'APROVADO',critical:false,fabrica:null,origin:'owner',planner:'planner',developer:'dev',
  votes:[{agentId:'r1',vote:'APROVADO'},{agentId:'r2',vote:'APROVADO'},{agentId:'r3',vote:'APROVADO'}]});
const KPI='1'.repeat(40);
const state=():any=>({repo:'acme/erp',defaultBranch:'main',kpiLatestBlobSha:KPI,files:['src/app.ts','README.md'],
  pr:{number:9,state:'open',draft:false,body:'escopo',head:{ref:'feat/x',sha:H},base:{ref:'main',sha:B}},
  rulesets:[ruleset()],checks:[{context:'ci',appId:10,conclusion:'success',detailsUrl:'https://ci'}],junta:junta(),juntaBlobOid:'c'.repeat(40)});
const att=(s:any):any=>({schema:'erp-porteiro-attestation:v1',verdict:`LIBERADO: merge do PR #9 no head ${H}`,repo:'acme/erp',pr:9,head:H,snapshotSha256:s.snapshotSha256,
  agentId:'porter',role:'porteiro-pos-merge',runtime:'codex',model:'gpt-5.6-sol',reasoningEffort:'ultra',commands:[{cmd:'npm test',exitCode:0}],evidence:{kpiLatestBlobSha:KPI}});
const mergedPr=():any=>({number:9,merged:true,merge_commit_sha:'f'.repeat(40),base:{ref:'main'},head:{sha:H}});
// O atestado COMO ELE EXISTE no comentário publicado: `publish` persiste `{...attestation, snapshot}`.
// É essa forma que o merge CAS e o fechamento pós-merge leem — atestado sem snapshot não é conferível.
const persistido=(s:any,over:any={}):any=>({...att(s),snapshot:s,...over});
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

test('F-C mut.7 — executor pós-merge acumulando alçada (nomeada OU omitida) é vermelho',()=>{const s=buildSnapshot(state()),a=persistido(s);assert.equal(validateFinalization({pr:mergedPr(),attestation:a,executorId:'closer',mergeExecutorId:'merger',junta:junta()}).mergeCommit,'f'.repeat(40));assert.throws(()=>validateFinalization({pr:mergedPr(),attestation:a,executorId:'owner',mergeExecutorId:'merger',junta:junta()}),/acumulou alçada/);const omitido=junta();delete omitido.origin;assert.throws(()=>validateFinalization({pr:mergedPr(),attestation:a,executorId:'owner',mergeExecutorId:'merger',junta:omitido}),/origin/);assert.throws(()=>validateFinalization({pr:mergedPr(),attestation:a,executorId:'',mergeExecutorId:'merger',junta:junta()}),/sem identidade/);});

test('F-C mut.8 — fabrica é chave obrigatória e entra no conjunto de colisão',()=>{const semChave=state();delete semChave.junta.fabrica;assert.throws(()=>buildSnapshot(semChave),/fabrica obrigatório/);const colide=state();colide.junta.fabrica='r1';assert.throws(()=>buildSnapshot(colide),/repetida/);const vazia=state();vazia.junta.fabrica='';assert.throws(()=>buildSnapshot(vazia),/fabrica precisa ser null/);const ok=state();ok.junta.fabrica='fabrica-2';assert.ok(buildSnapshot(ok).junta.identities.some((x:any)=>x.role==='fabrica'&&x.agentId==='fabrica-2'));});

test('F-C — junta.identities é canônica no snapshot e independentOf saiu do schema',()=>{const s=buildSnapshot(state());assert.deepEqual(s.junta.identities.map((x:any)=>x.role),['developer','origin','planner','vote:00','vote:01','vote:02']);assert.deepEqual(buildSnapshot(state()).junta.identities,juntaIdentities(junta()));assert.throws(()=>verifyAttestation(s,{...att(s),independentOf:['owner','planner','dev','r1','r2','r3']}),/campo desconhecido no atestado: independentOf/);const semIdent=buildSnapshot(state());delete semIdent.junta.identities;assert.throws(()=>verifyAttestation(semIdent,att(semIdent)),/identidades canônicas/);});

test('F-C — bootstrap do ruleset exige junta crítica 5/5 sem acúmulo do executor',()=>{const j=junta();j.critical=true;j.votes=['r1','r2','r3','r4','r5'].map((a)=>({agentId:a,vote:'APROVADO'}));assert.equal(assertJuntaCritica(j,'bootstrap'),true);assert.throws(()=>assertJuntaCritica(j,'r3'),/acumulou alçada/);assert.throws(()=>assertJuntaCritica(j,''),/executor/);const naoCritica=junta();naoCritica.votes=['r1','r2','r3','r4','r5'].map((a)=>({agentId:a,vote:'APROVADO'}));assert.throws(()=>assertJuntaCritica(naoCritica,'bootstrap'),/critical:true/);const tres=junta();tres.critical=true;assert.throws(()=>assertJuntaCritica(tres,'bootstrap'),/cinco votantes/);assert.throws(()=>validateJunta({...junta(),marker:'outro'}),/junta externa v1 ausente/);});

// ---------------------------------------------------------------------------
// F-D — o ruleset conferido é o ruleset da branch default (main)
// ---------------------------------------------------------------------------

test('F-D mut.1 — ruleset ativo apontado para OUTRA branch não satisfaz o gate',()=>{const x=state();x.rulesets[0].conditions.ref_name.include=['refs/heads/develop'];assert.throws(()=>buildSnapshot(x),/nenhum ruleset ativo se aplica à branch default \(main\)/);const y=state();y.rulesets[0].target='tag';assert.throws(()=>buildSnapshot(y),/se aplica à branch default/);const z=state();delete z.rulesets[0].conditions;assert.throws(()=>buildSnapshot(z),/se aplica à branch default/);const ex=state();ex.rulesets[0].conditions.ref_name.exclude=['~DEFAULT_BRANCH'];assert.throws(()=>buildSnapshot(ex),/se aplica à branch default/);const porRef=state();porRef.rulesets[0].conditions.ref_name.include=['refs/heads/main'];assert.equal(buildSnapshot(porRef).snapshotSha256.length,64);});

test('F-D mut.2 — faltando pull_request, deletion ou non_fast_forward o gate fecha',()=>{for(const tipo of ['pull_request','deletion','non_fast_forward']){const x=state();x.rulesets[0].rules=x.rulesets[0].rules.filter((r:any)=>r.type!==tipo);assert.throws(()=>buildSnapshot(x),new RegExp(`regra obrigatória: ${tipo}`));}});

test('F-D mut.3 — required check com integration_id não-positivo é fonte não resolvida',()=>{for(const v of [null,undefined,0,-1,'10',1.5]){const x=state();const p=x.rulesets[0].rules.find((r:any)=>r.type==='required_status_checks').parameters;if(v===undefined)delete p.required_status_checks[0].integration_id;else p.required_status_checks[0].integration_id=v;assert.throws(()=>buildSnapshot(x),/sem fonte confiável resolvida \(integration_id\): ci/);}});

test('F-D mut.4 — appId nunca é curinga: check verde de outra fonte não satisfaz o requerido',()=>{const x=state();x.rulesets[0].rules.find((r:any)=>r.type==='required_status_checks').parameters.required_status_checks[0].integration_id=null;x.checks[0].appId=99;assert.throws(()=>buildSnapshot(x),/integration_id/);const y=state();y.checks[0].appId=99;assert.throws(()=>buildSnapshot(y),/fonte errada: ci/);const z=state();z.checks[0].appId=null;assert.throws(()=>buildSnapshot(z),/fonte errada: ci/);});

test('F-D mut.5 — o workflow NÃO deriva a fonte esperada do próprio run',()=>{const y=readFileSync('.github/workflows/porteiro-pre-merge.yml','utf8');assert.doesNotMatch(y,/source_id\s*=/);assert.doesNotMatch(y,/\.app\.id/);assert.doesNotMatch(y,/ERP_PORTEIRO_EXPECTED_APP_ID\s*[:=]\s*"?\$/);assert.match(y,/ERP_PORTEIRO_EXPECTED_APP_ID:\s*'?\d+'?\s*$/m);assert.match(y,/if \[ -z "\$\{ERP_PORTEIRO_EXPECTED_APP_ID\}" \]/);assert.match(y,/falha FECHADO/);});

test('F-D — branch default é obrigatória, tem de ser a base do PR e o template se aplica a ela',()=>{const semDefault=state();delete semDefault.defaultBranch;assert.throws(()=>buildSnapshot(semDefault),/branch default do repositório é obrigatória/);const outra=state();outra.defaultBranch='develop';assert.throws(()=>buildSnapshot(outra),/não é a base do PR/);assert.equal(buildSnapshot(state()).defaultBranch,'main');const tpl=JSON.parse(readFileSync('.github/rulesets/main.template.json','utf8'));assert.equal(aplicaSeABranchDefault(tpl,'main'),true);for(const tipo of ['pull_request','deletion','non_fast_forward'])assert.ok(tpl.rules.some((r:any)=>r.type===tipo),`template sem regra ${tipo}`);});

// ---------------------------------------------------------------------------
// F-E — atestado sem teatro: nenhum campo auto-escrito é tratado como prova
// ---------------------------------------------------------------------------

test('F-E mut.1 — EXPLOIT DO CICLO: LIBERADO forjado por `node -e`, sem evidência do head, é VERMELHO',()=>{const s=buildSnapshot(state());const forjado:any={schema:'erp-porteiro-attestation:v1',verdict:`LIBERADO: merge do PR #9 no head ${H}`,repo:'acme/erp',pr:9,head:H,snapshotSha256:s.snapshotSha256,agentId:'forjador',role:'porteiro-pos-merge',runtime:'codex',model:'gpt-5.6-sol',reasoningEffort:'ultra',commands:[{cmd:'fingi que rodei',exitCode:0}]};assert.throws(()=>verifyAttestation(s,forjado),/sem evidência de reexecução conferível/);const comIndependentOf:any={...forjado,independentOf:[]};assert.throws(()=>verifyAttestation(s,comIndependentOf),/campo desconhecido/);});

test('F-E mut.2 — evidence divergente do blob do head não libera',()=>{const s=buildSnapshot(state());for(const v of ['9'.repeat(40),KPI.slice(0,12),'',null,undefined])assert.throws(()=>verifyAttestation(s,{...att(s),evidence:{kpiLatestBlobSha:v}}),/evidência de reexecução|divergente/);assert.throws(()=>verifyAttestation(s,{...att(s),evidence:{kpiLatestBlobSha:KPI,extra:1}}),/campo desconhecido em evidence/);const semNoSnapshot=buildSnapshot(state());delete semNoSnapshot.evidence;assert.throws(()=>verifyAttestation(semNoSnapshot,att(semNoSnapshot)),/snapshot sem o digest/);const semNoEstado=state();delete semNoEstado.kpiLatestBlobSha;assert.throws(()=>buildSnapshot(semNoEstado),/blob SHA de Kpis\/kpis-latest\.json/);});

test('F-E mut.3 — comando sem cmd ou com exitCode diferente de 0 não libera',()=>{const s=buildSnapshot(state());for(const cmds of [[''],['npm test'],[{cmd:'npm test',exitCode:1}],[{cmd:'',exitCode:0}],[{cmd:'   ',exitCode:0}],[{exitCode:0}],[{cmd:'npm test'}],[{cmd:'npm test',exitCode:'0'}],[{cmd:'npm test',exitCode:0,fake:true}],[]])assert.throws(()=>verifyAttestation(s,{...att(s),commands:cmds}));assert.equal(verifyAttestation(s,{...att(s),commands:[{cmd:'npm test',exitCode:0},{cmd:'npm run check',exitCode:0}]}),true);});

test('F-E — os três campos de declaração de invocação são obrigatórios e a mensagem NÃO os chama de prova',()=>{const s=buildSnapshot(state());for(const patch of [{runtime:'claude-code'},{model:'fable'},{reasoningEffort:'high'},{role:'planejador-mestre'}])assert.throws(()=>verifyAttestation(s,{...att(s),...patch}),/declaração de invocação fora da decisão do dono \(D-PORTEIRO-PRE-MERGE\)/);const fonte=readFileSync('scripts/porteiro-pre-merge.mjs','utf8');assert.doesNotMatch(fonte,/recibo Codex/i,'a mensagem do gate nao pode chamar os campos declarados de recibo');assert.doesNotMatch(fonte,/fail\('[^']*recib/i,'nenhuma mensagem de erro pode nomear campo auto-escrito como recibo/prova');assert.match(fonte,/DECLARACAO DE INVOCACAO — nao e recibo nem prova/);});

test('F-E — veredicto negativo deixa rastro externo e nunca autoriza',()=>{const s=buildSnapshot(state());for(const verdict of ['BLOQUEADO','RESSALVA']){const p=buildNegativeVerdict({verdict,repo:'acme/erp',pr:9,head:H,agentId:'porter',reason:'evidência do head divergente'});assert.equal(p.autoriza,false);assert.equal(p.schema,'erp-porteiro-attestation:v1');assert.match(p.verdict,verdict==='BLOQUEADO'?/^BLOQUEADO: merge do PR #9 no head /:/^LIBERADO COM RESSALVA: merge do PR #9 no head /);assert.throws(()=>verifyAttestation(s,p as any),/veredito não é a liberação literal exata/);}
for(const bad of [{verdict:'LIBERADO'},{verdict:''},{pr:0},{head:H.slice(0,12)},{agentId:''},{reason:''}])assert.throws(()=>buildNegativeVerdict({verdict:'BLOQUEADO',repo:'acme/erp',pr:9,head:H,agentId:'porter',reason:'x',...bad} as any));
const y=readFileSync('.github/workflows/porteiro-pre-merge.yml','utf8');assert.doesNotMatch(y,/conclusion:"success"/);});

test('F-E — republicar até dar verde não passa: o status precisa apontar para o ÚLTIMO atestado',()=>{const s=buildSnapshot(state()),a=att(s);const antigo={html_url:'https://gh/comment/1'},atual={html_url:'https://gh/comment/2'};const status={context:'erp/porteiro-pre-merge',state:'success',target_url:antigo.html_url};assert.throws(()=>assertMergeCandidate({snapshot:s,currentSnapshot:s,attestation:a,status,comment:atual,expectedHead:H,mergeAgentId:'merger'}),/permalink/);assert.throws(()=>assertMergeCandidate({snapshot:s,currentSnapshot:s,attestation:a,status:{...status,state:'failure',target_url:atual.html_url},comment:atual,expectedHead:H,mergeAgentId:'merger'}),/status requerido não está verde/);const bloqueio=buildNegativeVerdict({verdict:'BLOQUEADO',repo:'acme/erp',pr:9,head:H,agentId:'porter2',reason:'regressão'});assert.throws(()=>assertMergeCandidate({snapshot:s,currentSnapshot:s,attestation:bloqueio as any,status:{...status,target_url:atual.html_url},comment:atual,expectedHead:H,mergeAgentId:'merger'}),/liberação literal exata/);});

// ---------------------------------------------------------------------------
// D-4 — pin do app id (PD-GOV-PORTEIRO-APPID) com cross-check triplo e override que prova
// ---------------------------------------------------------------------------

const app=(over:any={}):any=>({id:15368,slug:'github-actions',owner:{login:'github',id:9919},...over});
const registro=(over:any={}):any=>({id:15368,slug:'github-actions',owner:{login:'github',id:9919},...over});
const reqDoTpl=(d:any)=>d.rules.find((r:any)=>r.type==='required_status_checks').parameters.required_status_checks;
const tplPinado=():any=>{const d=JSON.parse(readFileSync('.github/rulesets/main.template.json','utf8'));for(const c of reqDoTpl(d))c.integration_id=APP_GITHUB_ACTIONS.id;return d;};

test('D-4 — o pin vem da PD e o cross-check é triplo: id, slug e owner.id',()=>{assert.deepEqual(APP_GITHUB_ACTIONS,{id:15368,slug:'github-actions',ownerId:9919});assert.equal(assertCriadoPeloAppGitHubActions(app(),15368),true);assert.throws(()=>assertCriadoPeloAppGitHubActions(app({id:9426}),15368),/app id 9426/);assert.throws(()=>assertCriadoPeloAppGitHubActions(app({slug:'azure-pipelines'}),15368),/app slug azure-pipelines/);assert.throws(()=>assertCriadoPeloAppGitHubActions(app({owner:{login:'github',id:1}}),15368),/owner\.id 1/);assert.throws(()=>assertCriadoPeloAppGitHubActions(app({owner:undefined}),15368),/owner\.id ausente/);assert.throws(()=>assertCriadoPeloAppGitHubActions(undefined,15368),/sem objeto/);assert.throws(()=>assertCriadoPeloAppGitHubActions(app(),0),/não resolvida/);});

test('D-4 — owner.id em vez de owner.login: rename de org não afrouxa o gate',()=>{assert.equal(assertCriadoPeloAppGitHubActions(app({owner:{login:'github-renomeado',id:9919}}),15368),true);assert.throws(()=>assertCriadoPeloAppGitHubActions(app({owner:{login:'github',id:9426}}),15368),/owner\.id 9426/);});

test('D-4 — caminho rápido: o literal do YAML tem de bater com o pin do código',()=>{assert.equal(resolveExpectedAppId({literal:'15368',override:'',registro:null}),15368);assert.throws(()=>resolveExpectedAppId({literal:'999999',override:'',registro:null}),/diverge do app id fixado pela PD-GOV-PORTEIRO-APPID/);for(const l of ['',null,undefined,'0','-1','abc','15368.5'])assert.throws(()=>resolveExpectedAppId({literal:l,override:'',registro:null}),/positivo é obrigatório/);});

test('D-4 — OVERRIDE QUE NÃO PROVA É VERMELHO: nunca é canal de afrouxamento silencioso',()=>{assert.equal(resolveExpectedAppId({literal:'15368',override:'15368',registro:registro()}),15368);assert.equal(resolveExpectedAppId({literal:'15368',override:'777',registro:registro({id:777})}),777);assert.throws(()=>resolveExpectedAppId({literal:'15368',override:'999999',registro:registro()}),/não confere com o registro global/);assert.throws(()=>resolveExpectedAppId({literal:'15368',override:'999999',registro:null}),/sem o registro global/);assert.throws(()=>resolveExpectedAppId({literal:'15368',override:'777',registro:registro({id:777,slug:'impostor'})}),/não é github-actions/);assert.throws(()=>resolveExpectedAppId({literal:'15368',override:'777',registro:registro({id:777,owner:{login:'github',id:1}})}),/owner\.id 1/);for(const o of ['0','-5','abc'])assert.throws(()=>resolveExpectedAppId({literal:'15368',override:o,registro:registro()}),/inteiro positivo/);});

test('D-4 — o template pina 15368 nos oito contextos e assertDesired veta o porteiro fora do pin',()=>{const tpl=JSON.parse(readFileSync('.github/rulesets/main.template.json','utf8'));const req=reqDoTpl(tpl);assert.equal(req.length,8);for(const c of req)assert.equal(c.integration_id,APP_GITHUB_ACTIONS.id,`${c.context} sem pin`);assert.equal(assertDesired(tpl),undefined);const diferente=tplPinado();reqDoTpl(diferente).find((c:any)=>c.context==='erp/porteiro-pre-merge').integration_id=9426;assert.throws(()=>assertDesired(diferente),/tem de ser o app id fixado pela PD-GOV-PORTEIRO-APPID \(15368\), não 9426/);const nulo=tplPinado();reqDoTpl(nulo).find((c:any)=>c.context==='erp/porteiro-pre-merge').integration_id=null;assert.throws(()=>assertDesired(nulo),/fonte confiável não resolvida/);const ausente=tplPinado();const r=reqDoTpl(ausente);r.splice(r.findIndex((c:any)=>c.context==='erp/porteiro-pre-merge'),1);assert.throws(()=>assertDesired(ausente),/não requer erp\/porteiro-pre-merge/);});

test('D-4 — plan() CONFERE o observado contra o fixado; divergência é VETO, não re-resolução',()=>{const req=[{context:'ci',integration_id:15368}];assert.equal(conferirFontesFixadas(req,[{context:'ci',appId:15368,success:true}]),true);assert.equal(req[0].integration_id,15368,'o pin do template não pode ser reescrito');assert.throws(()=>conferirFontesFixadas([{context:'ci',integration_id:15368}],[{context:'ci',appId:99,success:true}]),/VETO: fonte observada diverge do id fixado/);assert.throws(()=>conferirFontesFixadas([{context:'ci',integration_id:15368}],[{context:'ci',appId:15368,success:false}]),/VETO: contexto requerido sem check verde/);assert.throws(()=>conferirFontesFixadas([{context:'ci',integration_id:null}],[{context:'ci',appId:15368,success:true}]),/VETO: template sem integration_id fixado/);assert.throws(()=>conferirFontesFixadas([{context:'ci',integration_id:15368}],[]),/sem check verde observado/);});

test('D-4 — o workflow fixa o literal e o override vem de vars, nunca do próprio run',()=>{const y=readFileSync('.github/workflows/porteiro-pre-merge.yml','utf8');assert.match(y,/ERP_PORTEIRO_EXPECTED_APP_ID:\s*'15368'/);assert.match(y,/ERP_PORTEIRO_APP_ID_OVERRIDE:\s*\$\{\{\s*vars\.ERP_PORTEIRO_APP_ID_OVERRIDE\s*\}\}/);assert.doesNotMatch(y,/ERP_PORTEIRO_APP_ID_OVERRIDE:\s*\$\{\{\s*(steps|needs|jobs|env)\./);assert.match(y,/api\.github\.com\/apps\/github-actions/);assert.match(y,/2026-08-22/);assert.match(y,/owner\.id 9919/);});

// ---------------------------------------------------------------------------
// D-5(a).1 — escalada por superfície de governança
// ---------------------------------------------------------------------------

const criticaOk=():any=>({...junta(),critical:true,votes:['r1','r2','r3','r4','r5'].map((a)=>({agentId:a,vote:'APROVADO'}))});
const comFiles=(files:string[],j?:any):any=>{const x=state();x.files=files;if(j)x.junta=j;return x;};

test('D-5 — diff que toca a superfície de governança exige junta crítica 5/5',()=>{for(const p of ['.github/workflows/x.yml','.github/rulesets/main.template.json','.gitattributes','scripts/porteiro-pre-merge.mjs','scripts/sync-agent-agents.mjs','scripts/sync-agent-skills.mjs','tests/porteiro-pre-merge-governance.test.ts','tests/agent-model-routing.test.ts','CLAUDE.md','AGENTS.md','.claude/agents/porteiro-pos-merge.md','.agents/agents/especialistas/x.md'])assert.throws(()=>buildSnapshot(comFiles([p])),/exige junta crítica 5\/5/,`${p} deveria escalar`);const s=buildSnapshot(comFiles(['.github/workflows/x.yml'],criticaOk()));assert.deepEqual(s.governanceSurface,['.github/workflows/x.yml']);});

test('D-5 — diff fora da superfície não escala e a superfície entra no snapshot',()=>{const s=buildSnapshot(comFiles(['src/app.ts','frontend/src/x.tsx','docs/y.md','Kpis/kpis-latest.json','scripts/kpi-release.mjs']));assert.deepEqual(s.governanceSurface,[]);assert.deepEqual(s.files,['Kpis/kpis-latest.json','docs/y.md','frontend/src/x.tsx','scripts/kpi-release.mjs','src/app.ts']);assert.notEqual(buildSnapshot(comFiles(['src/app.ts'])).snapshotSha256,buildSnapshot(comFiles(['src/outro.ts'])).snapshotSha256);});

test('D-5 — a lista de paths é obrigatória e não aceita entrada vazia',()=>{const semFiles=state();delete semFiles.files;assert.throws(()=>buildSnapshot(semFiles),/lista de paths do diff do PR é obrigatória/);assert.throws(()=>buildSnapshot(comFiles(['src/app.ts',''])),/path vazio/);const naoLista=state();naoLista.files='src/app.ts';assert.throws(()=>buildSnapshot(naoLista),/lista de paths/);});

test('D-5 — pathsDeGovernanca cobre os sete grupos nomeados e não sobra-cobre',()=>{assert.deepEqual(pathsDeGovernanca(['.github/workflows/ci.yml','src/app.ts']),['.github/workflows/ci.yml']);assert.deepEqual(pathsDeGovernanca(['scripts/kpi-release.mjs','scripts/up.mjs','tests/core-saas.test.ts','docs/CLAUDE.md','frontend/AGENTS.md']),[]);assert.equal(pathsDeGovernanca(['.agents/agents/README.md','.claude/agents/x.md']).length,2);assert.equal(pathsDeGovernanca(['scripts/merge-authorized-pr.mjs','scripts/post-merge-finalize.mjs','scripts/configure-main-ruleset.mjs']).length,3);});

test('D-5 — a paginação da API de files não trunca: workflow na página 2 continua sendo pego',()=>{const pagina1=Array.from({length:100},(_,i)=>({filename:`src/f${i}.ts`}));const pagina2=[{filename:'.github/workflows/backdoor.yml'}];const paths=coletarPaths((p:number)=>(p===1?pagina1:pagina2));assert.equal(paths.length,101);assert.ok(paths.includes('.github/workflows/backdoor.yml'));assert.throws(()=>buildSnapshot(comFiles(paths)),/exige junta crítica 5\/5/);assert.deepEqual(coletarPaths(()=>[]),[]);assert.throws(()=>coletarPaths(()=>({} as any)),/resposta inesperada/);assert.throws(()=>coletarPaths(()=>Array.from({length:100},(_,i)=>({filename:`s${i}.ts`}))),/excedeu o limite seguro/);});

test('D-5 — rename PARA FORA da superfície é pego por previous_filename',()=>{const paths=coletarPaths((p:number)=>(p===1?[{filename:'docs/antigo.yml',previous_filename:'.github/workflows/x.yml'}]:[]));assert.deepEqual(paths,['.github/workflows/x.yml','docs/antigo.yml']);assert.throws(()=>buildSnapshot(comFiles(paths)),/exige junta crítica 5\/5/);});

test('D-5 — ESTE PR toca a superfície inteira e por isso exige 5/5',()=>{const meus=['.github/workflows/porteiro-pre-merge.yml','.github/rulesets/main.template.json','scripts/porteiro-pre-merge.mjs','scripts/merge-authorized-pr.mjs','scripts/post-merge-finalize.mjs','scripts/configure-main-ruleset.mjs','tests/porteiro-pre-merge-governance.test.ts','CLAUDE.md','AGENTS.md'];assert.equal(pathsDeGovernanca(meus).length,meus.length);assert.throws(()=>buildSnapshot(comFiles(meus)),/exige junta crítica 5\/5/);assert.equal(buildSnapshot(comFiles(meus,criticaOk())).governanceSurface.length,meus.length);});

// ---------------------------------------------------------------------------
// PROVENIENCIA — a prosa embutida não pode afirmar prova que o mecanismo não entrega.
// PD-GOV-PORTEIRO-PROVENIENCIA (docs/omega-pd.md, 24 respostas reais da API): a cadeia
// check-run -> check-suite -> workflow run devolve DADO FALSO para check criado por
// `POST /check-runs`. Guard executável — senão a redação corrigida é prosa sem enforcement,
// que é exatamente a classe de defeito deste ciclo em superfície menor.
// ---------------------------------------------------------------------------

// Achata a continuação de comentário (YAML `#` ou JS `//`) para que frase quebrada em duas linhas
// continue casando — senão o guard vira refém da largura da coluna. Normaliza CRLF antes: a árvore
// do dono é CRLF fora das quatro pastas espelhadas, e um `\r` residual quebraria toda asserção.
const achata=(texto:string,marca:'#'|'//')=>texto
  .replace(/\r\n?/g,'\n')
  .replace(marca==='#'?/\n[ \t]*#[ \t]?/g:/\n[ \t]*\/\/[ \t]?/g,' ');

export function guardProvenienciaWorkflow(y:string){
  const t=achata(y,'#');
  if(/Fonte confiável do check/i.test(t))throw new Error('a prosa afirma "fonte confiável do check": o pin prova apenas que foi o app GitHub Actions');
  if(/o gate deixa de provar a fonte/i.test(t))throw new Error('a prosa afirma que o gate prova a fonte do check');
  const exigidos:[RegExp,string][]=[
    [/PD-GOV-PORTEIRO-PROVENIENCIA/,'não aponta para PD-GOV-PORTEIRO-PROVENIENCIA'],
    [/CRIADO PELO APP GitHub Actions/,'não declara o que o pin prova'],
    [/NÃO PROVA/,'não declara o que o pin NÃO prova'],
    [/declarado POR WORKFLOW, não por repositório/,'não explica que checks: write é por workflow'],
    [/DADO FALSO/,'não registra que a cadeia devolve dado falso'],
    [/VETADO/,'não registra o veto à derivação por check-suite'],
    [/escalada por superfície de governança/i,'não nomeia a mitigação da escalada'],
    [/reexecução do porteiro sobre o diff/,'não nomeia a mitigação da reexecução sobre o diff'],
  ];
  for(const [re,erro] of exigidos)if(!re.test(t))throw new Error(`a prosa ${erro}`);
  return true;
}

test('PROVENIENCIA — o comentário do workflow declara o que o pin prova e o que NÃO prova',()=>{
  const y=readFileSync('.github/workflows/porteiro-pre-merge.yml','utf8');
  assert.equal(guardProvenienciaWorkflow(y),true);
  // As mutações são aplicadas ao texto JÁ ACHATADO: as frases exigidas vivem quebradas em duas
  // linhas de comentário, então mutar o texto cru seria no-op e a prova não provaria nada.
  // achata() é idempotente, então o guard aceita a entrada achatada do mesmo jeito.
  const t=achata(y,'#');
  assert.equal(guardProvenienciaWorkflow(t),true);
  assert.throws(()=>guardProvenienciaWorkflow(t.replace('App id do GitHub Actions, usado para publicar o check','Fonte confiável do check')),/fonte confiável do check/);
  assert.throws(()=>guardProvenienciaWorkflow(t.replace(/PD-GOV-PORTEIRO-PROVENIENCIA/g,'PD-QUALQUER')),/não aponta para PD-GOV-PORTEIRO-PROVENIENCIA/);
  assert.throws(()=>guardProvenienciaWorkflow(t.replace('declarado POR WORKFLOW, não por repositório','declarado no repositório')),/checks: write é por workflow/);
  assert.throws(()=>guardProvenienciaWorkflow(t.replace(/DADO FALSO/g,'dado')),/dado falso/);
  assert.throws(()=>guardProvenienciaWorkflow(t.replace(/VETADO/g,'possível')),/veto à derivação por check-suite/);
  assert.throws(()=>guardProvenienciaWorkflow(t.replace(/escalada por superfície de governança/gi,'escalada')),/mitigação da escalada/);
  assert.throws(()=>guardProvenienciaWorkflow(t.replace(/reexecução do porteiro sobre o diff/g,'a revisão')),/reexecução sobre o diff/);
  assert.throws(()=>guardProvenienciaWorkflow(t.replace('CRIADO PELO APP GitHub Actions','criado')),/não declara o que o pin prova/);
  assert.throws(()=>guardProvenienciaWorkflow(t.replace(/NÃO PROVA/g,'não garante')),/não declara o que o pin NÃO prova/);
});

test('PROVENIENCIA — o comentário do código carrega o mesmo limite e a derivação vetada não entrou',()=>{
  const m=achata(readFileSync('scripts/porteiro-pre-merge.mjs','utf8'),'//');
  assert.match(m,/NAO prova "foi o job do porteiro"/);
  assert.match(m,/PD-GOV-PORTEIRO-PROVENIENCIA/);
  assert.match(m,/DADO FALSO/);
  assert.match(m,/VETADO na lei/);
  assert.match(m,/condicao necessaria, nunca suficiente/);
  assert.match(m,/declarado POR WORKFLOW, nao por repositorio/);
  // A derivação por check-suite está VETADA na lei: nem como verificação best-effort.
  assert.doesNotMatch(m,/check_suite_id/);
  assert.doesNotMatch(m,/actions\/jobs\//);
  assert.doesNotMatch(m,/actions\/runs\//);
});

// ---------------------------------------------------------------------------
// D-9 — o fechamento pós-merge confere o VEREDITO, não só `head`/`pr`.
// Antes desta correção, um atestado BLOQUEADO satisfazia `validateFinalization`: o pós-merge
// "fecharia" um merge que o porteiro tinha barrado. O veredicto negativo PERSISTIDO nasceu na F-E
// desta mesma entrega e usa o MESMO marcador da liberação — publicado depois, ele SOMBREIA o
// LIBERADO para todo leitor que pega o último comentário marcado. Medido antes da correção: os
// quatro casos abaixo passavam VERDES.
// ---------------------------------------------------------------------------

const negativo=(verdict:'BLOQUEADO'|'RESSALVA',over:any={}):any=>({...buildNegativeVerdict({verdict,repo:'acme/erp',pr:9,head:H,agentId:'porter',reason:'evidência do head divergente'}),...over});
const fecha=(attestation:any,over:any={})=>validateFinalization({pr:mergedPr(),attestation,executorId:'closer',mergeExecutorId:'merger',junta:junta(),...over});

test('D-9 mut.1 — atestado BLOQUEADO ou COM RESSALVA não fecha o pós-merge',()=>{
  const s=buildSnapshot(state());
  // Como o veredicto negativo é realmente publicado (sem snapshot embutido).
  assert.throws(()=>fecha(negativo('BLOQUEADO')),/snapshot canônico/);
  assert.throws(()=>fecha(negativo('RESSALVA')),/snapshot canônico/);
  // E acolchoado com um snapshot íntegro, que é o caso difícil: só o VEREDITO o denuncia.
  assert.throws(()=>fecha(negativo('BLOQUEADO',{snapshot:s})),/veredito não é a liberação literal exata/);
  assert.throws(()=>fecha(negativo('RESSALVA',{snapshot:s})),/veredito não é a liberação literal exata/);
});

test('D-9 mut.2 — LIBERADO de OUTRO snapshot, ou sem a evidência do head, não fecha',()=>{
  const s=buildSnapshot(state());
  const outro=state();outro.pr.body='outro corpo';const b=buildSnapshot(outro);
  assert.notEqual(s.snapshotSha256,b.snapshotSha256);
  assert.throws(()=>fecha({...att(s),snapshot:b}),/atestado pertence a snapshot diferente/);
  assert.throws(()=>fecha(persistido(s,{evidence:{kpiLatestBlobSha:'9'.repeat(40)}})),/evidência de reexecução divergente/);
  assert.throws(()=>fecha(persistido(s,{commands:[{cmd:'npm test',exitCode:1}]})),/não terminou em 0/);
  assert.throws(()=>fecha(persistido(s,{agentId:'planner'})),/independência não comprovada/);
  assert.throws(()=>fecha(persistido(s,{runtime:'claude-code'})),/declaração de invocação/);
  // Controle: o atestado íntegro continua fechando.
  assert.equal(fecha(persistido(s)).approvedHead,H);
});

test('D-9 — o fechamento REUSA verifyAttestation; nunca uma segunda cópia da regra',()=>{
  const src=readFileSync('scripts/post-merge-finalize.mjs','utf8');
  assert.match(src,/import\s*\{[^}]*\bverifyAttestation\b[^}]*\}\s*from\s*'\.\/porteiro-pre-merge\.mjs'/);
  assert.match(src,/verifyAttestation\(snapshot,attestation\)/);
  // Cópia local do literal do veredito é como a divergência do D-10 nasceu: fica vermelho aqui.
  assert.doesNotMatch(src,/LIBERADO: merge do PR/,'o literal do veredito não pode ser reescrito no fechamento');
});

// ---------------------------------------------------------------------------
// D-10 — a normalização de check-runs/statuses é UMA função, não três cópias.
// Medido antes da correção: as três cópias já tinham divergido — duas derivavam o `appId` do autor
// do commit status cru, a do porteiro aplicava o condicional de Bot. O mesmo status normalizado de
// dois jeitos produz snapshot diferente e o compare-and-swap do merge acusa "snapshot ... mudou"
// sem que nada tenha mudado. Fail-closed (nunca abriu gate), mas falso-vermelho recorrente no CAS
// ensina o operador a desconfiar do gate e a re-rodar até passar — degradação real. A forma da
// correção importa mais que o valor: igualar as três linhas deixaria a divergência voltar.
// ---------------------------------------------------------------------------

const APP_ACTIONS=15368;      // `github-actions` — id de APP, o que o ruleset fixa em integration_id
const USUARIO_BOT=41898282;   // `github-actions[bot]` — id de USUÁRIO-bot, o que um status carrega

test('D-10 — a função única normaliza check-runs e statuses com o condicional de Bot',()=>{
  assert.deepEqual(normalizarChecks(
    [{name:'ci',app:{id:APP_ACTIONS},conclusion:'success',html_url:'https://run'},{name:'sem-app',conclusion:'failure'}],
    [{context:'legado',state:'success',target_url:'https://st',creator:{type:'Bot',id:USUARIO_BOT}},
     {context:'humano',state:'pending',target_url:null,creator:{type:'User',id:777}},
     {context:'sem-autor',state:'success'}],
  ),[
    {context:'ci',appId:APP_ACTIONS,conclusion:'success',detailsUrl:'https://run'},
    {context:'sem-app',appId:null,conclusion:'failure',detailsUrl:null},
    {context:'legado',appId:USUARIO_BOT,conclusion:'success',detailsUrl:'https://st'},
    {context:'humano',appId:null,conclusion:'pending',detailsUrl:null},
    {context:'sem-autor',appId:null,conclusion:'success',detailsUrl:null},
  ]);
  assert.deepEqual(normalizarChecks(undefined,undefined),[]);
});

test('D-10 — id de USUÁRIO-bot num status nunca satisfaz check requerido pinado em id de APP',()=>{
  // Erro de categoria nomeado no ponto: 41898282 é usuário, 15368 é app. O fail-closed é intencional.
  const x=state();
  x.rulesets[0].rules.find((r:any)=>r.type==='required_status_checks').parameters.required_status_checks[0].integration_id=APP_ACTIONS;
  x.checks=normalizarChecks([],[{context:'ci',state:'success',target_url:'u',creator:{type:'Bot',id:USUARIO_BOT}}]);
  assert.throws(()=>buildSnapshot(x),/fonte errada: ci/);
  // E o mesmo contexto vindo do app certo (check-run) satisfaz — o gate não é surdo, é estrito.
  const ok=state();
  ok.rulesets[0].rules.find((r:any)=>r.type==='required_status_checks').parameters.required_status_checks[0].integration_id=APP_ACTIONS;
  ok.checks=normalizarChecks([{name:'ci',app:{id:APP_ACTIONS},conclusion:'success',html_url:'u'}],[]);
  assert.equal(buildSnapshot(ok).snapshotSha256.length,64);
});

test('D-10 — cerca: a normalização inline não reaparece nos outros dois scripts do gate',()=>{
  const unica=readFileSync('scripts/porteiro-pre-merge.mjs','utf8');
  assert.match(unica,/export function normalizarChecks\(/);
  assert.equal((unica.match(/creator\?\.type/g)||[]).length,1,'a decisão por tipo de autor vive num lugar só');
  for(const alvo of ['scripts/merge-authorized-pr.mjs','scripts/configure-main-ruleset.mjs']){
    const src=readFileSync(alvo,'utf8');
    assert.doesNotMatch(src,/creator/,`${alvo}: derivar appId do autor do status voltou a ser inline`);
    assert.doesNotMatch(src,/statuses\.map\(/,`${alvo}: mapeador inline de statuses voltou a existir`);
    assert.match(src,/normalizarChecks/,`${alvo}: não consome a normalização única`);
  }
});

// ---------------------------------------------------------------------------
// D-11 — o identificador não pode prometer mais do que a execução prova.
// O nome antigo afirmava "fonte confiável" do check; a execução prova apenas que o check foi
// criado pelo app GitHub Actions (id, slug e owner.id) — condição necessária, nunca suficiente.
// Num ciclo cujo tema é "artefato que afirma o que a execução não produz", a própria tabela de
// símbolos não podia ser a exceção.
//
// O token proibido é montado por CONCATENAÇÃO de propósito: escrito por extenso, este arquivo (e
// qualquer futura varredura que o inclua) passaria a conter o nome que o guard proíbe.
// ---------------------------------------------------------------------------

const NOME_QUE_PROMETE_DEMAIS=new RegExp(['Fonte','Confi','[aá]vel'].join(''));
const SCRIPTS_DO_GATE=['scripts/porteiro-pre-merge.mjs','scripts/merge-authorized-pr.mjs','scripts/post-merge-finalize.mjs','scripts/configure-main-ruleset.mjs','scripts/sync-agent-agents.mjs','scripts/sync-agent-skills.mjs'];

export function guardNomeDoGate(src:string){
  if(NOME_QUE_PROMETE_DEMAIS.test(src))throw new Error('identificador que afirma "fonte confiável": a execução prova apenas que o check foi criado pelo app GitHub Actions');
  return true;
}

test('D-11 — o nome da função diz o que a execução prova: app + GitHub Actions',()=>{
  assert.equal(assertCriadoPeloAppGitHubActions(app(),15368),true);
  const fonte=readFileSync('scripts/porteiro-pre-merge.mjs','utf8');
  assert.match(fonte,/export function assertCriadoPeloAppGitHubActions\(/);
  const m=achata(fonte,'//');
  assert.match(m,/condicao necessaria,\s*nunca suficiente/,'o docstring perdeu o limite "necessária, nunca suficiente"');
  assert.match(m,/PD-GOV-PORTEIRO-APPID/);
  assert.match(m,/PD-GOV-PORTEIRO-PROVENIENCIA/);
});

test('D-11 — cerca: o identificador que promete demais não volta aos scripts do gate',()=>{
  for(const alvo of SCRIPTS_DO_GATE)assert.equal(guardNomeDoGate(readFileSync(alvo,'utf8')),true,`${alvo}`);
  // A cerca não é vaga: reintroduzir o nome, em fixture na memória, fica VERMELHO.
  const reintroduzido=readFileSync('scripts/porteiro-pre-merge.mjs','utf8').replace(/assertCriadoPeloAppGitHubActions/g,['assert','Fonte','Confiavel'].join(''));
  assert.throws(()=>guardNomeDoGate(reintroduzido),/fonte confiável/);
  assert.throws(()=>guardNomeDoGate(['assert','Fonte','Confiável'].join('')),/fonte confiável/);
});
