# B-SAN3-12c — Aparências B e C do Financeiro

- **Tipo:** feature
- **Fase:** Execution / Validation
- **Trilha:** frontend React
- **Data:** 2026-10-28
- **Branch:** `feat/web-financeiro-aparencias-b-c`
- **Executor DEV:** `dev-san312c-sol` · Codex CLI · GPT-5.6 Sol · nível menor declarado

## Objetivo

Entregar as aparências B (“Conta em foco”) e C (“Conferência do caixa”) do Financeiro, conservar a aparência A e usar os mesmos dados, permissões e formulários já existentes. Não cria rota, permissão, contrato, cálculo financeiro, modelagem ou migração.

## Contexto e fontes de verdade

- Plano vigente: `docs/revisoes/SAN3/B-SAN3-12-plano.md`, **Emenda E5**.
- Referência aprovada: `docs/claude-code-handoff/screen-refs/financeiro-baixa-conta-conciliacao-3opcoes.reference.html`.
- Telas-modelo: `frontend/src/modules/finance/pages/FinanceiroPage.tsx` e `frontend/src/modules/finance/pages/views/FinanceiroViewA.tsx`; lista-modelo: `frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx`.
- Skills obrigatórias: `.agents/skills/ts-frontend-full/SKILL.md` e `.agents/skills/ui-ux-pro-max/SKILL.md`.
- O parecer `C:/Users/AMP/erp-pausa-2026-10-03/revisoes/rev-plano-12c-parecer.md` não existia na abertura da FATIA 1.

## Regras

- Executar somente uma fatia da E5.4 por vez; cada fatia termina com teste-dono, mutações, commit, push e `## RETOMADA n` no relatório.
- Vermelho-controle antes do código; cada mutação é restaurada com hash conferido.
- Backend continua autoridade de autorização; a UI só molda a experiência. Dados ausentes nunca viram zero, soma local ou placeholder.
- Reusar queries, ações e formulários existentes. Alteração de autorização, payload de escrita, CAS, idempotência, cálculo ou integridade suspende a implementação e aciona a reclassificação da E5.1.
- Node por caminho absoluto `C:/Users/AMP/AppData/Local/nvm/v22.14.0/node.exe`; nunca `nvm use`.
- Espaço livre abaixo de 7.500.000.000 bytes: parar e registrar.

## Escopo PERMITIDO

Somente a lista fechada de **E5.3**: views B/C e extrações estreitas compartilhadas; gráficos novos `BalanceBridge`, `ReconcileDonut` e, se necessário, `DayBars`; contêiner/estado/adapter do Financeiro nominalmente autorizados; registry apenas na integração final; prop opcional em `BaixaForm`; CSS escopado B/C; testes financeiros nomeados; `frontend/package.json` só para incluir testes no smoke; registros explicitamente listados na E5.3.

## Escopo PROIBIDO

Tudo fora da lista da E5.3, em especial `src/**`, testes da raiz, `prisma/**`, migrations, `infra/**`, `.env*`, lockfiles, `.github/**`, `mobile/**`, `Kpis/**`, arquivos globais de rota/navegação/auth e componentes genéricos já existentes. Proibidos também base viva, Docker, portas 5432/6379/3000/5173/5050/8899, junction de `node_modules`, `git add -A`, stash, rebase, `reset --hard`, clean e force-push.

## Fatias e validação

Executar, na ordem, as 14 fatias de **E5.4**, com seus commits e mutações nominais. A FATIA 1 abre o ramo/worktree, instala dependências próprias, versiona a E5 e mede o baseline. As FATIAS 2–13 implementam e provam R-P1…R-P6, R-B, R-C e R-T1…R-T5. A FATIA 14 executa a bateria final e fecha somente pendências comprovadas.

```bash
npm --prefix frontend run check
cd frontend
node --test --import tsx tests/finance-*.test.ts* tests/financial-*.adapter.test.ts tests/dense-expandable-row.test.tsx tests/pattern-css-guard.test.ts tests/balance-bridge.test.tsx tests/reconcile-donut.test.tsx
cd ..
npm --prefix frontend run test:smoke
npm --prefix frontend run build
git diff --check
git diff --name-only origin/main...HEAD -- src prisma .github Kpis
```

Se `DayBars` nascer, incluir `tests/day-bars.test.tsx`. Smoke final em Node 20 e 22 por executáveis explícitos. Não iniciar suíte raiz que alcance banco/Redis local.

## Revisão e DoD

- Um revisor independente + `cognicao-visual` + CI verde, conforme E5.1; o DEV não vota nem se aprova.
- A/B/C fiéis à referência, nas três larguras; loading, vazio, erro, acesso não permitido e dado desatualizado; teclado e um detalhe por vez.
- Mínimo de 40 casos comportamentais novos, sem contar repetição entre runtimes.
- `Kpis/**` congelado neste PR. O marco segue no PR #473 após merge + porteiro do 12c.
- Rastreabilidade no relatório `docs/revisoes/SAN3/B-SAN3-12c-dev.md`; PR/merge/approved head permanecem pendentes até as etapas correspondentes.
