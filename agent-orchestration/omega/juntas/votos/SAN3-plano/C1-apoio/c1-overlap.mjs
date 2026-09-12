import fs from 'node:fs';
const tree = fs.readFileSync('c1-tree.txt','utf8').split('\n').filter(Boolean);
const M='mobile/flutter_app/lib/';
const B = {
 '04a':[1,0,13,['src/modules/inventory/**','prisma/schema.prisma','prisma/migrations/**']],
 '03a':[1,13,26,['src/modules/expense-management/**']],
 'SAN3-02':[1,26,39,['src/modules/work-order-financials/**','src/modules/financial-titles/**','prisma/schema.prisma','prisma/migrations/**']],
 'SAN3-20':[1,39,44,['src/modules/cheques/**','src/modules/financial-titles/**','prisma/schema.prisma','prisma/migrations/**']],
 'SAN3-03':[1,44,57,['src/modules/cloud-usage/**','src/modules/cloud-cost-allocation/**','src/modules/cloud-charges/**','src/infra/events/domain-event.publisher.ts','src/modules/notifications/notification.service.ts','src/modules/checklists/**','src/infra/jobs/job.worker.ts']],
 'SAN3-05':[2,0,13,['src/database/**','src/config/env.ts','docker-compose.prod.yml','docs/deployment.md','scripts/NOVO-SAN3-05','src/modules/cloud-usage/cloud-usage-prisma.repository.ts']],
 '07c':[2,13,26,['src/modules/work-orders/work-order.routes.ts','src/modules/work-orders/work-order.service.ts','src/modules/work-order-comments/**','src/modules/mobile/mobile-work-order-sync.ts']],
 'SAN3-04':[2,26,31,['src/modules/core-saas/permissions/catalog.ts','src/modules/navigation/navigation.registry.ts','frontend/src/layouts/appSidebarNav.ts','frontend/src/modules/auth/auth.adapter.ts','prisma/seed.ts','scripts/provision-rbac.ts']],
 'SAN3-09':[2,31,32.5,['scripts/bootstrap-platform-admin.ts']],
 'SAN3-22':[2,32.5,37.5,['src/modules/checklists/**','frontend/src/modules/checklists/**','API_CONTRACTS.md']],
 'O6R-12':[2,37.5,42.5,['src/modules/jurisdiction/**','src/modules/charging/**','src/modules/auction/auction.eligibility.ts','src/modules/impound/impound-prisma.repository.ts','prisma/schema.prisma','prisma/migrations/**']],
 'SAN3-18':[2,42.5,55.5,['src/modules/navigation/navigation.registry.ts','src/app.ts','src/modules/navigation/NOVO-middleware','frontend/src/layouts/appSidebarNav.ts']],
 'SAN3-01':[3,0,5,['frontend/src/modules/work-orders/**','frontend/src/modules/registry/service-quotes/useServiceQuoteReferences.ts','frontend/src/modules/operations/dispatches/dispatches.service.ts','tests/e2e/critical-flows.spec.ts']],
 'SAN3-12':[3,5,10,['frontend/src/modules/finance/**','frontend/src/App.tsx','frontend/src/layouts/appSidebarNav.ts']],
 'SAN3-24':[3,10,23,['frontend/src/modules/finance/cheques/**','frontend/src/modules/finance/period-closes/**','frontend/src/modules/finance/commissions/**','frontend/src/App.tsx','frontend/src/layouts/appSidebarNav.ts']],
 'AV-REAL':[3,23,28,['src/modules/evidence/**','src/config/env.ts','fly.clamav.toml','.github/workflows/ci.yml']],
 'SAN3-11':[3,28,29.5,['frontend/src/modules/patios/processes/**','src/modules/impound/**']],
 'SAN3-06a':[3,31,36,['frontend/src/modules/purchase-orders/**','frontend/src/modules/reports/**','frontend/src/modules/dispatch/pages/DispatchConsolePage.tsx','frontend/src/layouts/appSidebarNav.ts','frontend/src/navigation/tenantNavigation.ts','frontend/src/App.tsx']],
 'SAN3-07':[3,36,37.5,['prisma/seed.ts']],
 'SAN3-08':[3,37.5,42.5,['frontend/src/modules/registry/service-quotes/**','frontend/src/modules/work-orders/components/tabs/QuoteTab.tsx']],
 'SAN3-06b':[3,42.5,55.5,['frontend/src/modules/platform/**','frontend/src/navigation/platformNavigation.ts']],
 'SAN3-21':[3,55.5,57,['frontend/src/**/*.ts','frontend/src/**/*.tsx']],
 '11':[4,0,5,[M+'features/work_orders/data/work_order_remote_api.dart',M+'features/prestador/data/prestador_repository.dart',M+'core/sync/sync_queue_repository.dart',M+'core/local_db/drift_sync_action_store.dart']],
 'SAN3-13':[4,5,10,[M+'shared/ui/home_screen.dart',M+'features/work_orders/data/work_order_repository.dart',M+'features/work_orders/data/work_order_remote_api.dart']],
 'SAN3-14':[4,10,15,[M+'features/work_orders/ui/work_order_execute_screen.dart',M+'features/work_orders/domain/work_order_steps.dart',M+'app/router.dart']],
 'SAN3-15':[4,15,28,[M+'features/prestador/**',M+'app/router.dart',M+'features/work_orders/ui/**','src/modules/inventory/**']],
 'SAN3-16':[4,28,33,[M+'core/sync/sync_replay_service.dart',M+'features/work_orders/data/work_order_repository.dart','src/modules/mobile/mobile-work-order-sync.ts']],
 'SAN3-17':[4,33,38,[M+'core/location/**',M+'shared/ui/home_screen.dart',M+'app/router.dart']],
 '04b':[4,38,43,[M+'features/inventory/**',M+'core/sync/auto_sync_coordinator.dart',M+'core/sync/sync_providers.dart','src/modules/mobile/mobile-inventory-sync.ts']],
 '03b':[4,43,48,[M+'features/expenses/**',M+'core/sync/sync_providers.dart',M+'core/auth/auth_notifier.dart',M+'core/network/http_client.dart','src/modules/expense-management/expense-management.routes.ts']],
 'SAN3-19':[4,48,49.5,['mobile/flutter_app/android/app/src/main/AndroidManifest.xml',M+'shared/ui/home_screen.dart',M+'shared/ui/module_placeholder_screen.dart',M+'shared/ui/sync_screen.dart']],
 'SAN3-23':[4,49.5,54.5,['src/modules/work-orders/work-order.service.ts','src/modules/work-order-financials/**']],
 'O6R-09':[4,54.5,59.5,['src/modules/field-dispatch/**','prisma/schema.prisma','prisma/migrations/**']],
 'SAN3-10':[5,59.5,72.5,['tests/e2e/**','playwright.config.ts','.github/workflows/ci.yml','docs/ROTEIRO-DEMO-E-OPERACAO.md','docs/go-live-readiness.md']],
};
function expand(p){
  if (p==='prisma/migrations/**') return ['HISTORICO:prisma/migrations'];
  if (p.includes('NOVO')) return [p];
  if (p.startsWith('frontend/src/**/*.')){ const ext=p.slice(p.lastIndexOf('.')); return tree.filter(f=>f.startsWith('frontend/src/')&&f.endsWith(ext)); }
  if (p.endsWith('/**')){ const pre=p.slice(0,-2); const r=tree.filter(f=>f.startsWith(pre)); return r.length?r:['VAZIO:'+p]; }
  return tree.includes(p)?[p]:['AUSENTE:'+p];
}
const files={}; const missing=[];
for (const [k,v] of Object.entries(B)){ files[k]=new Set(); for(const p of v[3]){ for(const x of expand(p)){ files[k].add(x); if(x.startsWith('VAZIO:')||x.startsWith('AUSENTE:')) missing.push(k+' '+x);} } }
console.log('== padroes sem arquivo na arvore:'); missing.forEach(m=>console.log('  '+m));
const keys=Object.keys(B);
const over=(A,C)=>(C[2]>A[1])&&(A[2]>C[1]);
console.log(
