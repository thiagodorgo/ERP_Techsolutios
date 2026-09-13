// [2ª passada: DEP SAN3-26 += 07c, B-O6R-12 += SAN3-11, SAN3-18 += SAN3-07; trava prisma/seed.ts 04a->07->18; FR SAN3-18 += prisma/seed.ts]
// [opção B, 2026-09-13 — cópia ajustada pelo aplicador: DEP SAN3-25 += SAN3-04a (CE-3); LOCKS += work-order.routes.ts (07c -> SAN3-26) e impound-prisma.repository.ts (SAN3-11 -> B-O6R-12) (C1-A4); FR SAN3-04a += RBAC_MATRIX.md (CE-5)]
// Agenda do §6 (plano SAN3 v5) — recalculada por script. Uso: node agenda-ciclo2.mjs <raiz-do-worktree>
// Semântica = a da cadeira C1 (C1-apoio/c1-sim.mjs): cada frente executa os blocos na SUA ordem; um bloco começa
// quando a frente está livre, as dependências da coluna Dep. do §5 terminaram e o antecessor de cada trava de
// mesmo arquivo do §6 terminou. Onde a ordem proposta contraria uma Dep./trava da mesma frente, a ordem é reparada
// por ordenação topológica ESTÁVEL (mantém a ordem proposta onde ela é viável).
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const ROOT = process.argv[2] || '.';
const ESF = {
  '04a':'G','03a':'G','SAN3-02':'G','SAN3-20':'M','SAN3-03':'G',
  'SAN3-04a':'M','SAN3-05':'G','07c':'G','SAN3-04b':'M','SAN3-09':'P','SAN3-22':'M','SAN3-18':'G','B-O6R-12':'M',
  'SAN3-01':'M','SAN3-12':'M','SAN3-24':'G','AV-REAL':'M','SAN3-11':'P','SAN3-06a':'M','SAN3-07':'P','SAN3-08':'M','SAN3-25':'M','SAN3-06b':'G','SAN3-21':'P',
  '11':'M','SAN3-13':'M','SAN3-14':'M','SAN3-15':'G','SAN3-16':'M','SAN3-17':'M','SAN3-26':'M','04b':'M','03b':'M','SAN3-19':'P','SAN3-23':'M','B-O6R-09':'M',
  'SAN3-10':'G'};
// Ordem PROPOSTA pelo plano de correção (§D), frente a frente.
const PROPOSTA = {
  1:['04a','03a','SAN3-02','SAN3-20','SAN3-03'],
  2:['SAN3-04a','SAN3-05','07c','SAN3-04b','SAN3-09','SAN3-22','SAN3-18','B-O6R-12'],
  3:['SAN3-01','SAN3-12','SAN3-24','AV-REAL','SAN3-11','SAN3-06a','SAN3-07','SAN3-08','SAN3-25','SAN3-06b','SAN3-21'],
  4:['11','SAN3-13','SAN3-14','SAN3-15','SAN3-17','SAN3-16','SAN3-26','04b','03b','SAN3-19','SAN3-23','B-O6R-09'],
  5:['SAN3-10']};
const PROP_T = { // início–fim publicados na proposta (melhor caso)
  '04a':[0,13],'03a':[13,26],'SAN3-02':[26,39],'SAN3-20':[39,44],'SAN3-03':[44,57],
  'SAN3-04a':[0,5],'SAN3-05':[5,18],'07c':[18,31],'SAN3-04b':[31,36],'SAN3-09':[36,37.5],'SAN3-22':[37.5,42.5],'SAN3-18':[42.5,55.5],'B-O6R-12':[55.5,60.5],
  'SAN3-01':[0,5],'SAN3-12':[5,10],'SAN3-24':[10,23],'AV-REAL':[23,28],'SAN3-11':[28,29.5],'SAN3-06a':[29.5,34.5],'SAN3-07':[34.5,36],'SAN3-08':[36,41],'SAN3-25':[41,46],'SAN3-06b':[46,59],'SAN3-21':[59,60.5],
  '11':[0,5],'SAN3-13':[5,10],'SAN3-14':[10,15],'SAN3-15':[15,28],'SAN3-17':[28,33],'SAN3-16':[33,38],'SAN3-26':[38,43],'04b':[43,48],'03b':[48,53],'SAN3-19':[53,54.5],'SAN3-23':[54.5,59.5],'B-O6R-09':[60.5,65.5]};
const FE = ['SAN3-04a','SAN3-22','SAN3-18','SAN3-01','SAN3-12','SAN3-24','SAN3-11','SAN3-06a','SAN3-08','SAN3-25','SAN3-06b'];
// Coluna Dep. do §5 (v5), já com os antecessores de trava que o §5 escreve na coluna.
const DEP = {
  '03a':['04a'], 'SAN3-02':['03a'], 'SAN3-20':['SAN3-02'], 'SAN3-03':['SAN3-05','SAN3-22'],
  '07c':['SAN3-13'], 'SAN3-04b':['SAN3-04a'], 'SAN3-22':['07c'], 'SAN3-18':['SAN3-04a','SAN3-06a','SAN3-07'], 'B-O6R-12':['SAN3-20','SAN3-11'],
  'SAN3-12':['SAN3-04a'], 'SAN3-24':['SAN3-12'], 'AV-REAL':['SAN3-05'], 'SAN3-06a':['SAN3-24'], 'SAN3-07':['SAN3-04a'],
  'SAN3-08':['SAN3-01','SAN3-04a'], 'SAN3-25':['SAN3-01','SAN3-02','SAN3-24','SAN3-04a'], 'SAN3-21':FE,
  'SAN3-13':['11'], 'SAN3-14':['SAN3-13'], 'SAN3-15':['04a','SAN3-14'], 'SAN3-16':['SAN3-15','07c'], 'SAN3-17':['SAN3-16'],
  'SAN3-26':['SAN3-13','07c'], '04b':['04a','SAN3-17'], '03b':['03a','04b'], 'SAN3-19':['03b'], 'SAN3-23':['07c','SAN3-02'],
  'B-O6R-09':['B-O6R-12'], 'SAN3-10':Object.keys(ESF).filter(k=>k!=='SAN3-10')};
// Travas de mesmo arquivo do §6 (v5), como cadeias ordenadas.
const LOCKS = {
  'prisma/schema.prisma + prisma/migrations/**':['04a','03a','SAN3-02','SAN3-20','B-O6R-12','B-O6R-09'],
  'src/config/env.ts':['SAN3-05','AV-REAL'],
  'frontend/src/layouts/appSidebarNav.ts + frontend/src/App.tsx':['SAN3-04a','SAN3-12','SAN3-24','SAN3-06a','SAN3-18'],
  'frontend/src/modules/finance/**':['SAN3-12','SAN3-24','SAN3-25'],
  'prisma/seed.ts':['SAN3-04a','SAN3-07','SAN3-18'],
  'src/modules/checklists/**':['07c','SAN3-22','SAN3-03'],
  'cloud-usage-prisma.repository.ts + cloud-charge-prisma.repository.ts':['SAN3-05','SAN3-03'],
  'src/modules/work-orders/work-order.service.ts':['SAN3-13','07c','SAN3-23'],
  'src/modules/mobile/mobile-work-order-sync.ts':['07c','SAN3-16'],
  'work-order-financials/** + financial-titles/** (a)':['SAN3-02','SAN3-20'],
  'work-order-financials/** + financial-titles/** (b)':['SAN3-02','SAN3-23'],
  'src/modules/inventory/**':['04a','SAN3-15'],
  'src/modules/expense-management/**':['03a','03b'],
  'QuoteTab':['SAN3-01','SAN3-08'],
  'FinancialTab + serviço de OS da web':['SAN3-01','SAN3-25'],
  'src/modules/core-saas/permissions/catalog.ts':['SAN3-04a','SAN3-04b'],
  'tests/e2e/**':['SAN3-01','SAN3-10'],
  'src/modules/work-orders/work-order.routes.ts':['07c','SAN3-26'],
  'src/modules/impound/impound-prisma.repository.ts':['SAN3-11','B-O6R-12'],
};
const EDGES = {}; const add=(k,d)=>{ (EDGES[k] ??= new Set()).add(d); };
for (const k in DEP) for (const d of DEP[k]) add(k,d);
const lockOnly=[];
for (const [nome,ch] of Object.entries(LOCKS)) for (let i=1;i<ch.length;i++){ if(!(DEP[ch[i]]||[]).includes(ch[i-1])) lockOnly.push(`${nome}: ${ch[i-1]} -> ${ch[i]}`); add(ch[i],ch[i-1]); }
for (const k of FE) add('SAN3-21',k);
const keys=Object.keys(ESF); const frenteDe={}; for (const f in PROPOSTA) for (const k of PROPOSTA[f]) frenteDe[k]=+f;
if (keys.length!==Object.keys(frenteDe).length || keys.some(k=>!frenteDe[k])) throw new Error('bloco sem frente');
{ const seen={},stk={}; const dfs=k=>{ if(stk[k]) throw new Error('ciclo em '+k); if(seen[k])return; seen[k]=stk[k]=1; for(const d of EDGES[k]||[]) dfs(d); stk[k]=0; }; keys.forEach(dfs); }
const ORDEM={}; const reparos=[];
for (const f in PROPOSTA){ const L=PROPOSTA[f], pos=Object.fromEntries(L.map((k,i)=>[k,i])); const placed=new Set(), out=[];
  while(out.length<L.length){ const ready=L.filter(k=>!placed.has(k) && [...(EDGES[k]||[])].every(d=>frenteDe[d]!==+f||placed.has(d)));
    if(!ready.length) throw new Error('deadlock intra-frente '+f); ready.sort((a,b)=>pos[a]-pos[b]); out.push(ready[0]); placed.add(ready[0]); }
  ORDEM[f]=out; if(out.join()!==L.join()) reparos.push(`frente ${f}: proposta [${L.join(', ')}] -> script [${out.join(', ')}]`); }
function sim(D){
  const st={},en={},idx={},free={}; for(const f in ORDEM){idx[f]=0;free[f]=0;} let n=keys.length;
  while(n){ let best=null;
    for(const f in ORDEM){ const k=ORDEM[f][idx[f]]; if(k===undefined) continue; const ds=[...(EDGES[k]||[])];
      if(ds.some(d=>en[d]===undefined)) continue; const r=Math.max(free[f],0,...ds.map(d=>en[d])); if(best===null||r<best.r) best={k,f,r}; }
    if(best===null) throw new Error('deadlock global'); st[best.k]=best.r; en[best.k]=best.r+D[ESF[best.k]]; free[best.f]=en[best.k]; idx[best.f]++; n--; }
  const fr={}; for(const f in ORDEM) fr[f]=Math.max(...ORDEM[f].map(k=>en[k])); return {st,en,fr};
}
const fmt=x=>(Math.round(x*10)/10).toString().replace('.',',');
const cnt={G:0,M:0,P:0}; keys.forEach(k=>cnt[ESF[k]]++);
console.log(`blocos=${keys.length} G=${cnt.G} M=${cnt.M} P=${cnt.P}`);
console.log('arestas de trava que NÃO estão na coluna Dep.: '+(lockOnly.length?lockOnly.join(' ; '):'nenhuma'));
console.log('reparos de ordem: '+(reparos.length?reparos.join(' ; '):'nenhum'));
const MELHOR={G:13,M:5,P:1.5}, REAL={G:57,M:10,P:2};
const res={};
for (const [nome,D] of [['melhor',MELHOR],['realista',REAL]]){ const r=sim(D); res[nome]=r;
  console.log(`\n== ${nome} ${JSON.stringify(D)}`);
  for (const f of [1,2,3,4,5]) console.log(`  F${f}: `+ORDEM[f].map(k=>`${k} ${fmt(r.st[k])}–${fmt(r.en[k])}`).join(' · ')+`   [fim ${fmt(r.fr[f])}]`);
  let v=0; for(const k of keys) for(const d of EDGES[k]||[]) if(r.en[d]>r.st[k]+1e-9){v++;console.log('   VIOLA '+d+'->'+k);}
  for(const f in ORDEM){ const L=ORDEM[f]; for(let i=1;i<L.length;i++) if(r.en[L[i-1]]>r.st[L[i]]+1e-9){v++;console.log('   SOBREPOE frente '+f);} }
  console.log(`  violações (Dep.+travas+frente) = ${v}`);
}
const b=res.melhor; const div=keys.filter(k=>PROP_T[k] && (PROP_T[k][0]!==b.st[k]||PROP_T[k][1]!==b.en[k]));
console.log('\n== divergências melhor caso × proposta: '+(div.length?div.map(k=>`${k} proposta ${fmt(PROP_T[k][0])}–${fmt(PROP_T[k][1])} / script ${fmt(b.st[k])}–${fmt(b.en[k])}`).join(' ; '):'nenhuma'));
const somaReal=keys.filter(k=>k!=='SAN3-10').reduce((s,k)=>s+REAL[ESF[k]],0);
console.log(`\n== 2 frentes (realista): soma do trabalho sem o fecho = ${somaReal} h; /2 = ${somaReal/2}; + fecho ${REAL.G} = ${somaReal/2+REAL.G} h`);
const somaMelhor=keys.filter(k=>k!=='SAN3-10').reduce((s,k)=>s+MELHOR[ESF[k]],0);
console.log(`   (referência, melhor caso com 2 frentes: ${somaMelhor}/2 + 13 = ${somaMelhor/2+13} h)`);
// ---- conferência de arquivo comum × janela (fronteiras do §5 v5 expandidas na árvore do HEAD)
const tree=execSync('git -C "'+ROOT+'" ls-tree -r --name-only HEAD',{encoding:'utf8',maxBuffer:64<<20}).split('\n').filter(Boolean);
const M='mobile/flutter_app/lib/';
const FR={
 '04a':['src/modules/inventory/**','prisma/schema.prisma','prisma/migrations/**'],
 '03a':['src/modules/expense-management/**','prisma/schema.prisma','prisma/migrations/**'],
 'SAN3-02':['src/modules/work-order-financials/**','src/modules/financial-titles/**','prisma/schema.prisma','prisma/migrations/**'],
 'SAN3-20':['src/modules/cheques/**','src/modules/financial-titles/**','prisma/schema.prisma','prisma/migrations/**'],
 'SAN3-03':['src/modules/cloud-usage/**','src/modules/cloud-cost-allocation/**','src/modules/cloud-charges/**','src/infra/events/domain-event.publisher.ts','src/modules/notifications/notification.service.ts','src/modules/checklists/**','src/infra/jobs/job.worker.ts'],
 'SAN3-04a':['src/modules/core-saas/permissions/catalog.ts','src/modules/navigation/navigation.registry.ts','frontend/src/layouts/appSidebarNav.ts','frontend/src/modules/auth/auth.adapter.ts','frontend/src/modules/auth/types.ts','prisma/seed.ts','scripts/provision-rbac.ts','RBAC_MATRIX.md'],
 'SAN3-05':['src/database/**','src/config/env.ts','docker-compose.prod.yml','docs/deployment.md','NOVO:scripts/san3-05','src/modules/cloud-usage/cloud-usage-prisma.repository.ts','src/modules/cloud-charges/cloud-charge-prisma.repository.ts'],
 '07c':['src/modules/work-orders/work-order.routes.ts','src/modules/work-orders/work-order.service.ts','src/modules/work-order-comments/**','src/modules/mobile/mobile-work-order-sync.ts','src/modules/checklists/checklist.routes.ts','src/modules/checklists/checklist.service.ts','src/modules/mobile/mobile-evidence-sync.ts','src/modules/mobile/mobile-checklist-sync.ts'],
 'SAN3-04b':['src/modules/dashboard/**','src/modules/core-saas/permissions/catalog.ts'],
 'SAN3-09':['NOVO:scripts/bootstrap-platform-admin.ts'],
 'SAN3-22':['src/modules/checklists/**','frontend/src/modules/checklists/**','API_CONTRACTS.md'],
 'SAN3-18':['src/modules/navigation/navigation.registry.ts','src/modules/navigation/navigation.service.ts','src/modules/platform/platform-modules.service.ts','src/app.ts','NOVO:src/modules/navigation/middleware','NOVO:scripts/san3-18','frontend/src/layouts/appSidebarNav.ts','prisma/seed.ts'],
 'B-O6R-12':['src/modules/jurisdiction/**','src/modules/charging/**','src/modules/auction/auction.eligibility.ts','src/modules/impound/impound-prisma.repository.ts','prisma/schema.prisma','prisma/migrations/**'],
 'SAN3-01':['frontend/src/modules/work-orders/**','frontend/src/modules/registry/service-quotes/useServiceQuoteReferences.ts','frontend/src/modules/operations/dispatches/dispatches.service.ts','tests/e2e/critical-flows.spec.ts'],
 'SAN3-12':['frontend/src/modules/finance/**','frontend/src/App.tsx','frontend/src/layouts/appSidebarNav.ts'],
 'SAN3-24':['frontend/src/modules/finance/cheques/**','frontend/src/modules/finance/period-closes/**','frontend/src/modules/finance/commissions/**','frontend/src/App.tsx','frontend/src/layouts/appSidebarNav.ts'],
 'AV-REAL':['src/modules/evidence/**','src/config/env.ts','NOVO:fly.clamav.toml','.github/workflows/ci.yml'],
 'SAN3-11':['frontend/src/modules/patios/processes/**','src/modules/impound/**'],
 'SAN3-06a':['frontend/src/modules/purchase-orders/**','frontend/src/modules/reports/**','frontend/src/modules/dispatch/pages/DispatchConsolePage.tsx','frontend/src/layouts/appSidebarNav.ts','frontend/src/navigation/tenantNavigation.ts','frontend/src/App.tsx'],
 'SAN3-07':['prisma/seed.ts'],
 'SAN3-08':['frontend/src/modules/registry/service-quotes/**','frontend/src/modules/work-orders/components/tabs/QuoteTab.tsx'],
 'SAN3-25':['frontend/src/modules/work-orders/components/tabs/FinancialTab.tsx','frontend/src/modules/work-orders/**','frontend/src/modules/finance/pages/InvoicesPage.tsx'],
 'SAN3-06b':['frontend/src/modules/platform/**','frontend/src/navigation/platformNavigation.ts'],
 'SAN3-21':['frontend/src/**/*.ts','frontend/src/**/*.tsx'],
 '11':[M+'features/work_orders/data/work_order_remote_api.dart',M+'features/prestador/data/prestador_repository.dart',M+'core/sync/sync_queue_repository.dart',M+'core/local_db/drift_sync_action_store.dart'],
 'SAN3-13':[M+'shared/ui/home_screen.dart',M+'features/work_orders/data/work_order_repository.dart',M+'features/work_orders/data/work_order_remote_api.dart','src/modules/work-orders/work-order.service.ts'],
 'SAN3-14':[M+'features/work_orders/ui/work_order_execute_screen.dart',M+'features/work_orders/domain/work_order_steps.dart',M+'app/router.dart'],
 'SAN3-15':[M+'features/prestador/**',M+'app/router.dart',M+'features/work_orders/ui/**','src/modules/inventory/**'],
 'SAN3-16':[M+'core/sync/sync_replay_service.dart',M+'features/work_orders/data/work_order_repository.dart','src/modules/mobile/mobile-work-order-sync.ts'],
 'SAN3-17':[M+'core/location/**',M+'shared/ui/home_screen.dart',M+'app/router.dart','src/modules/field-location/field-location.service.ts'],
 'SAN3-26':[M+'features/work_orders/ui/work_order_detail_screen.dart','src/modules/work-orders/**','src/modules/mobile/**'], // backend CONSERVADOR: o arquivo ainda não tem nome
 '04b':[M+'features/inventory/**',M+'core/sync/auto_sync_coordinator.dart',M+'core/sync/sync_providers.dart','src/modules/mobile/mobile-inventory-sync.ts'],
 '03b':[M+'features/expenses/**',M+'core/sync/sync_providers.dart',M+'core/auth/auth_notifier.dart',M+'core/network/http_client.dart','src/modules/expense-management/expense-management.routes.ts'],
 'SAN3-19':['mobile/flutter_app/android/app/src/main/AndroidManifest.xml',M+'shared/ui/home_screen.dart',M+'shared/ui/module_placeholder_screen.dart',M+'shared/ui/sync_screen.dart'],
 'SAN3-23':['src/modules/work-orders/work-order.service.ts','src/modules/work-order-financials/**'],
 'B-O6R-09':['src/modules/field-dispatch/**','prisma/schema.prisma','prisma/migrations/**'],
 'SAN3-10':['tests/e2e/**','playwright.config.ts','.github/workflows/ci.yml','NOVO:docs/ROTEIRO-DEMO-E-OPERACAO.md','docs/go-live-readiness.md'],
};
const missing=[];
function expand(p){ if(p==='prisma/migrations/**') return ['HIST:prisma/migrations']; if(p.startsWith('NOVO:')) return [p];
  if(p.startsWith('frontend/src/**/*.')){ const ext=p.slice(p.lastIndexOf('.')); return tree.filter(f=>f.startsWith('frontend/src/')&&f.endsWith(ext)); }
  if(p.endsWith('/**')){ const pre=p.slice(0,-2); const r=tree.filter(f=>f.startsWith(pre)); if(!r.length) missing.push(p); return r.length?r:['NOVO-DIR:'+p]; }
  if(!tree.includes(p)) missing.push(p); return [p]; }
const files={}; for (const k of keys){ files[k]=new Set(); for(const p of FR[k]) for(const x of expand(p)) files[k].add(x); }
console.log('\n== padrões de fronteira sem arquivo na árvore (esperado: só os novos): '+(missing.length?missing.join(' ; '):'nenhum'));
for (const [nome,r] of Object.entries(res)){
  let n_=0; const lista=[];
  keys.forEach((a,i)=>keys.slice(i+1).forEach(c=>{ if(frenteDe[a]===frenteDe[c]) return; const inter=[...files[a]].filter(x=>files[c].has(x)); if(!inter.length) return;
    const ov=(r.en[a]>r.st[c]+1e-9)&&(r.en[c]>r.st[a]+1e-9); if(ov){ n_++; lista.push(`${a}×${c} (${inter.slice(0,2).join(' | ')})`);} }));
  console.log(`== ${nome}: pares de frentes diferentes com arquivo comum E janelas sobrepostas = ${n_}`+(lista.length?' :: '+lista.join(' ; '):''));
}
writeFileSync(new URL('./agenda-ciclo2.out.json', import.meta.url), JSON.stringify({ORDEM, melhor:res.melhor, realista:res.realista, cnt, somaReal, ESF, DEP}, null, 1));
