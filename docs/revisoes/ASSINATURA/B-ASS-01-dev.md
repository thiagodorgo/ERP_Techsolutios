# B-ASS-01 — relatório do desenvolvimento

- **executor:** `dev-ass01-sol` · Codex GPT-5.6 Sol · nível menor declarado · esforço medium · identidade nova
- **plano:** `planejador-assinatura` · Claude Fable 5.1 · correções de 31/10 e 02/11
- **ref inicial medida:** `origin/main = 18e54804882204e70e5b9a1a3905f9a76236027b`
- **ramo:** `feat/b-ass-01-cloud-billing-sem-markup`
- **skills aplicadas:** `ts-frontend-full` (preservar as camadas adapter → service → hook → tela) e `saas-multi-tenant` (guarda de RBAC/tenant; nenhuma rota, tabela ou permissão nova)
- **KPI:** congelado (§C7 item 8(5)); `Kpis/*` não será alterado.

## F0 — pré-voo, terreno e hipótese H-ROTAS-CC

**Comando.** `git rev-parse HEAD origin/main; git status --porcelain=v1; git show origin/main:tests/cloud-charge-routes.test.ts | grep -nE "createApp|createCloudChargesPlatformRouter"; df -h /c; powershell.exe ...FreeVirtualMemory; grep -Ec "^[[:space:]]*(test|it)\\(" <suítes-alvo>`

**Saída resumida.** HEAD e `origin/main` iguais em `18e54804`; árvore limpa; H-ROTAS-CC encontrou `createApp` nas linhas 119/153 e nenhum `createCloudChargesPlatformRouter`; 277 GB livres em disco; 14,7 GB de memória de commit livre; contagens iniciais: markup 12, rotas 2, core-saas 26, san3-04a 14, parity 3, san3-05 2, census 16, smoke Cloud Billing 16 e smoke-flow 22 (113 casos).

**Veredito.** Terreno liberado. A hipótese H-ROTAS-CC caiu pelo caminho previsto no plano: os 2 testes existentes passam a asserir 404. Não contradiz o plano e não exige pausa.

## F0 — dependências isoladas

**Comandos.** `npm ci` na raiz; `npm ci` em `frontend/`.

**Saída resumida.** Raiz: 326 pacotes instalados; frontend: 103 pacotes instalados. Sem junction/symlink. O npm informou vulnerabilidades preexistentes (raiz 42; frontend 9); nenhuma dependência ou lockfile foi alterado.

**Veredito.** Dependências próprias do worktree prontas.

## F0 — atualização da ref alvo

**Comando.** `git fetch origin main && git merge --ff-only origin/main`.

**Saída resumida.** `origin/main` avançou para `4f260796` apenas com `tests/kpi-painel-frescor.test.ts`; o ramo foi atualizado por fast-forward antes da autoria. A sonda H-ROTAS-CC foi repetida nessa ref e manteve o resultado previsto.

**Veredito.** Ref alvo fixada em `4f260796`; nenhuma contaminação da árvore da sessão.

## F1 — testes, vermelho-controle e backend

**Comando do vermelho.** `npm test -- tests/ass-01-markup-retirado.test.ts tests/ass-01-frontend-sem-markup.test.ts tests/navigation-menu.test.ts` sobre o código ainda equivalente à `origin/main` para os requisitos.

**Saída resumida.** 23 casos: 7 pass, 16 fail. Falharam as nove ausências de rota, os dois critérios do job, os dois critérios do menu e os dois critérios de frontend; a carga do app também expôs a necessidade de gerar o Prisma Client local após `npm ci`.

**Veredito.** Vermelho-controle confirmado antes do conserto; nenhuma mutação ficou verde.

**Implementação.** Retirados o mount de `createCloudChargesPlatformRouter`, o nome/handler `cloud-charges.calculate` e a dependência de menu em `platform:cloud-charges:read`. As nove rotas agora chegam ao 404 padrão. `tests/cloud-charge-routes.test.ts` passou a medir os dois 404 previstos por H-ROTAS-CC. A superfície SAN3 e o censo O6R07c foram reduzidos somente pelas vias removidas.

**Validação parcial.** `npm run check` e `npm --prefix frontend run check`: verdes. Critérios ASS-01 + navegação + rotas: 25/25 verdes. `o6r07c-census-guard`: 16/16 verdes. `san3-04a-matriz-x-catalogo-guard`: 14/14 verdes.

## F2/F3 — frontend sem markup e permissões do front

**Implementação.** Adapter, service, types e página deixaram de conhecer `cloud-charge`, regras, cobrança ou margem. `getCloudBilling` agrega quatro leituras; a tela conserva o padrão existente, os estados §7 e cinco indicadores honestos. App, aliases de autenticação, mock e navegação deixaram de pedir as quatro permissões órfãs.

**Comando.** `cd frontend && node --test --import tsx tests/san3-06b-cloud-billing.smoke.test.tsx tests/smoke-flow.test.tsx`.

**Saída resumida.** 38/38 pass, fail 0; a suíte dedicada manteve 16 casos e `smoke-flow` 22.

**Veredito.** R-RM-3/R-RM-4 verdes; nenhuma chamada ou rótulo de markup permanece no módulo.

## F4 — documentação e permissões órfãs

**Implementação.** Os 13 documentos receberam a marca explícita `SUPERADO por D-COBRANCA-ASSINATURA-FRANQUIA (2026-10-30)` sem apagar o texto histórico. As quatro chaves permanecem nos catálogos, comentadas como órfãs, e entram nominalmente em `ORFAS_ESPERADAS`.

**Comandos.** `npm test -- tests/san3-04a-matriz-x-catalogo-guard.test.ts`; contagem `SUPERADO por` nos 13 arquivos.

**Saída resumida.** 14/14 pass; cada um dos 13 arquivos contém ao menos uma marca de superação.

**Veredito.** R-RM-6/R-RM-8 verdes; nenhuma chave de permissão foi apagada.

