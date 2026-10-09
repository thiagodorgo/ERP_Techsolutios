# B-SAN3-06b — relatório de desenvolvimento

Identidade: `dev-b-san3-06b`

Worktree: `C:/Users/AMP/w-06b`

Ramo: `feat/b-san3-06b-plataforma`

## Terreno e baseline

| Comando | Saída resumida | Estado |
|---|---|---|
| `git rev-parse --short HEAD` | `4489a996` antes do início | verde |
| `Get-PSDrive C` | 13,11 GB livres (`df` indisponível no PowerShell) | verde, acima de 8 GB |
| `git fetch origin` + `git rebase origin/main` | ramo já atualizado, sem conflito | verde |
| `npm --prefix frontend ci` | 103 pacotes instalados no worktree | verde |
| `npm ci` | 326 pacotes instalados no worktree | verde |
| `npm --prefix frontend run check` | TypeScript sem erro | verde |
| `npm --prefix frontend pkg get scripts.lint` | `{}` | não aplicável: o frontend não possui script `lint` |
| `npm --prefix frontend run build` | 2.170 módulos transformados | verde |
| testes de overview, detalhe e saúde | 15/15 | verde |
| `smoke-flow.test.tsx` | 22/22 | verde |
| `npm --prefix frontend run test:smoke` | 1.268/1.268 | verde |

## Entregas

### E1 — Organizações reais e dados desatualizados

- Comando: `npm --prefix frontend run check`.
- Saída resumida: TypeScript sem erro.
- Comando: testes existentes de visão geral e detalhe.
- Saída resumida: 13/13 verdes.
- Estado: concluída — lista real, métricas de clientes sem a organização `platform`, selo de sistema nas três superfícies e preservação do último dado bom.

### E2 — Cloud Billing estritamente de leitura

- Comando: `npm --prefix frontend run check`.
- Saída resumida: TypeScript sem erro após espelhar os quatro DTOs, ligar cinco GETs com período e criar o hook de leitura.
- Estado: concluída — oito indicadores reais, painéis por serviço/organização, uso, cobranças e importações; ausência de fonte vira selo. A página não importa nenhuma função de escrita e não calcula margem.

### E3 — Paradas honestas

- Comando: `npm --prefix frontend run check`.
- Saída resumida: TypeScript sem erro nas quatro páginas substituídas.
- Estado: concluída — Auditoria da Plataforma, APIs e Credenciais, Planos e Módulos e Configurações não exibem linhas, números, controles ou ações sem fonte; todas exportam `PLATFORM_HONEST_STOP`.

### E4 — Saúde ligada ao readiness

- Comando: `npm --prefix frontend run check` + teste existente de saúde.
- Saída resumida: TypeScript verde; 2/2 testes verdes; alteração autorizada no teste = 1 adição/1 remoção.
- Estado: concluída — 200 e 503 exibem Postgres, Redis e Worker com estado real; rede/JSON inválido falha honestamente; uptime, p95, fila e backup continuam com selo, sem fonte.

### E5 — Interruptor único e vazio honesto

- Comando: `npm --prefix frontend run check` + busca por `readFrontendEnv("VITE_USE_MOCKS"`.
- Saída resumida: TypeScript verde; única ocorrência restante em `frontend/src/config/env.ts`.
- Estado: concluída — fixtures de plataforma removidos; modo demonstração devolve vazio ou recusa clara; tela de módulos sem código interno e com plano em PT-BR.

### E6 — Menu real e rótulos

- Comando: `npm --prefix frontend run check` + `git diff --numstat -- frontend/src/layouts/PlatformLayout.tsx`.
- Saída resumida: TypeScript verde; `PlatformLayout.tsx` = exatamente `1 5`.
- Estado: concluída — menu fica com Visão Geral, Organizações, Cloud Billing e Saúde do Sistema; as quatro paradas honestas continuam acessíveis somente por URL direta.

### E7 — Geradores reproduzíveis

- Comando: `node --check scripts/san3-06b-*.mjs` e execução dos cinco geradores sob `timeout 120`.
- Saída resumida: 10 rotas, 4 itens no menu real, 6 telas ligadas, 4 paradas honestas, 0 telas sem fonte; 0 sítios de dado fabricado; 32 endpoints reais; inventários de testes literais e das 6 pendências do bloco emitidos.
- Estado: concluída — os cinco censos são derivados dos fontes, usam falha conservadora para forma não reconhecida e o gerador de pendências aceita cabeçalhos `##` a `####`.

## Sucessão — E8 e bateria final

Identidade: `dev-b-san3-06b-sucessor` · modelo que rodou: **Claude Opus 5.5** (bloco de leitura, não de dinheiro;
Fable só em bloco de dinheiro, decisão do dono de 2026-10-08) · worktree `C:/Users/AMP/w-06b` · ramo
`feat/b-san3-06b-plataforma`. O antecessor (`dev-b-san3-06b`, Codex GPT-5.6 Sol) caiu por limite de uso no meio da E8,
editando o 3.º argumento de `scripts/san3-06b-testes-com-literal.mjs` (cauda do log bruto). Nada dele foi herdado como
fato: cada arquivo não commitado foi medido antes de ser aceito.

### Terreno recebido

| Comando | Saída resumida | Estado |
|---|---|---|
| `git rev-parse HEAD` × `origin/feat/b-san3-06b-plataforma` | `c29a1f8b` nos dois | igual ao mandato |
| `git status --short` | 13 modificados + 7 não rastreados (E8 do antecessor) | medidos um a um |
| `df -h /c` | 12 GB livres | acima de 8 GB |
| `ls node_modules frontend/node_modules` | presentes, diretórios reais (sem junction) | `npm ci` próprio do antecessor |
| `git fetch origin main` | `origin/main` = `a9bbde38`, ancestral do HEAD | sem rebase necessário |

### O que foi re-executado do antecessor (P3)

| Comando registrado por ele | Saída de agora | Confere? |
|---|---|---|
| 6 arquivos `san3-06b-*` (45 testes) | 45/45 no estado herdado | sim — mas ver "E8 — o que mudou" |
| `san3-06b-literais-de-plataforma.mjs .` | `sítios = 0` | sim |
| `san3-06b-telas-de-plataforma.mjs .` | 10 rotas · menu 4 · LIGADA 6 · PARADA-HONESTA 4 · SEM-FONTE 0 | sim |
| `san3-06b-endpoints-de-plataforma.mjs .` | 32 endpoints | sim |
| `san3-06b-testes-com-literal.mjs .` | com literal = 0 | sim |
| `san3-06b-pendencias-do-bloco.mjs pendencias.md` | 6 seções, 0 abertas | sim |
| `git diff --numstat` de `PlatformLayout.tsx` | `1 5` | sim |
| `git grep 'readFrontendEnv("VITE_USE_MOCKS"' -- frontend/src` | só `config/env.ts:23` | sim |
| `python agent-orchestration/controle/gerar-indice-pendencias.py` | índice regenerado byte a byte igual ao herdado (md5 `292fbb9d…`) | sim |

### E8 — o que o sucessor mudou, e por quê

1. **Testes que mediam forma em vez de comportamento.** T2, T3, T4 e T6 liam o texto-fonte da página com regex; T16,
   T17, T18 e T19 conferiam só o objeto do serviço; T15 conferia rótulos sem os valores; T13 não olhava a tela. O §8
   pede o estado renderizado ("Acesso não permitido", "HTML sem dígito", `EmptyState`, valores do fixture formatados).
   Os ramos de estado viviam dentro do componente com hook, inalcançáveis por `renderToString`. **Costura sem mudança
   de comportamento** (`ca29352f`, dentro de `frontend/src/modules/platform/**`): `PlatformTenantsScreen`,
   `PlatformCloudBillingScreen` e `PlatformHealthScreen` recebem os ramos movidos sem alteração; `refresh-state.ts`
   (`nextRefreshState`) é a regra única do "dados desatualizados" que os dois hooks já faziam inline, no espelho de
   `work-orders.state.ts` que a C-7 nomeia. Testes reforçados em `7644512c`: T2–T6, T8, T13, T15–T19, T29, T31, T41.
2. **Severidade distorcida no índice.** A prova de `P-SAN3-06B-CONFIG-PLATAFORMA-SEM-BACKEND` dizia "auditoria crítica" e
   o classificador do índice pega a primeira palavra-chave do corpo: a entrada declarada MÉDIA aparecia CRÍTICA. Texto
   trocado para "auditoria das operações sensíveis"; as 11 pendências novas agora mostram no índice a severidade que
   declaram (11/11).
3. **A18 — evidência com `arquivo:linha`.** As 6 entradas fechadas citavam testes por nome. Ganharam ponteiros; os 22
   resolvem no HEAD `d73d421c` para a linha pretendida (`git show HEAD:<arquivo> | sed -n '<n>p'`).
4. **Comando do bloco** passou a declarar a ampliação nominal da C-13 (`platform-health-honest-stop.smoke.test.tsx`,
   só a l.29).

### Controles negativos

Internos (o próprio teste faz a mutação em cópia temporária e exige a recusa): T34 (4 classes de fabricação), T35
(asserção literal), T37 (parada no menu e tela sem fonte), T43 (slug do bootstrap divergente), T44 (importação de
escrita monetária). Verdes = a mutação foi detectada.

Externos (executor no scratchpad da sessão, `controles-negativos.mjs`: âncora única provada, mutação no produto real,
teste-alvo isolado, restauro e md5):

| Mutação | Teste | Resultado |
|---|---|---|
| M1 calcular o % da margem no front sem o DTO | T45 | vermelho |
| M2 tirar o desconto da organização de sistema do cartão (A21) | T41 | vermelho |
| M3 importar `runCloudAllocationFromApi` na página real | T44 | vermelho |
| M4 engolir o 5xx de Organizações como vazio | T3 | vermelho |
| M5 tratar o 403 de Cloud Billing como falha genérica | T16 | vermelho |
| M6 apagar a tabela quando o refresh de fundo falha | T6 | vermelho |
| M7 engolir o 5xx de Cloud Billing como período vazio | T17 | vermelho |
| M8 renderizar a Saúde sem resposta | T31 | vermelho |
| M9 exibir o enum cru do status de cobrança | T13 | vermelho |

`# controles = 9 · falhas do controle = 0`; `frontend/src` com md5 idêntico (616 arquivos) antes e depois.

### C-2 — escrita monetária intocada (AST, não leitura)

- As 5 funções (`importCloudCostsFromApi`, `runCloudAllocationFromApi`, `calculateCloudChargesFromApi`,
  `createCloudChargeRuleFromApi`, `updateCloudChargeRuleFromApi`): texto do nó AST igual ao da `origin/main`, EOL-neutro.
- Corpos de requisição: `toRuleApiInput` equivalente por tokens; `defaultPeriodBody` executado nas duas versões com o
  mesmo relógio (3 datas) → corpo idêntico.
- Importadores fora de `cloud-billing.{adapter,service}.ts`: 0 (`git grep`), e T44 em verde.
- Mudaram só os mapeadores de **resposta** (lado de leitura). O `mapChargeRun` da `main` calculava margem no front;
  o do HEAD lê o percentual do DTO — alinhado à C-2.

### Bateria final (HEAD `d73d421c` para código e testes)

| Comando | Saída resumida | Estado |
|---|---|---|
| `npm --prefix frontend run check` | `tsc -b --noEmit` sem erro | verde |
| `npm --prefix frontend run lint` | script inexistente no frontend | não aplicável |
| `node --check scripts/san3-06b-*.mjs` (um por vez) | 5/5 | verde |
| 5 geradores | 0 sítios · 10 rotas/menu 4/SEM-FONTE 0 · 32 endpoints · literal 0 · 6 pendências, 0 abertas | verde |
| T1–T45 (6 arquivos) | 45/45 | verde |
| regressões da R.5 (8 arquivos) | 125/125 | verde |
| `smoke-flow.test.tsx` | 22/22 (contagem inalterada) | verde |
| `npm --prefix frontend run test:smoke` | **1313/1313**, 146 s; baseline do antecessor 1268 → Δ **+45** | verde |
| `npm --prefix frontend run build` | 2178 módulos | verde |
| testes da raiz que leem `frontend/src` (não `-db`) | `approval-frontend-contract` 1/1 · `checklist-editor-blockers-parity` 1/1 · `san3-04a-menu-front-x-catalogo` 14/14 | 16/16 |
| `npm run check` / `npm run lint` (raiz) | 1.ª execução: 251 erros, todos de cliente Prisma não gerado no worktree; após `prisma generate` local (URL fictícia só no ambiente, sem conexão): 0 erros | verde |
| `git diff --name-only origin/main...HEAD` × R.4 | 51 arquivos, 0 fora do PERMITIDO | verde |
| `--numstat` `PlatformLayout.tsx` / `platform-health-honest-stop` | `1 5` / `1 1` | verde |
| `git diff --name-only … -- Kpis src prisma mobile tests/e2e .github` (+ lockfiles, `App.tsx`, contratos) | vazio | verde |
| `platform-overview` e `platform-tenant-detail` (proibidos) | intocados | verde |
| `git diff --check origin/main...HEAD` | sem saída | verde |
| limpeza | `frontend/dist` e `frontend/tsconfig.tsbuildinfo` removidos; `git clean -nxd` sem resto além de `node_modules` | limpo |

### Divergências do plano (registradas, não corrigidas)

1. **Geradores não byte-idênticos aos apêndices.** O E7 reformatou os 5 e o E8 deu a (a) e (d) o 3.º argumento das
   mutações em cópia; md5 do blob (apêndice → HEAD `d73d421c`): (a) `99e599a2` → `397b2cae`, (b) `ec0101e1` →
   `07c86f8a`, (c) `c3c987eb` → `7b1b8737`, (d) `e07b5880` → `a7c0d389`, (e) v2 da C-6 `b97cd902` → `de1eae46`.
   Equivalência medida por saída na mesma árvore: (b), (c), (d) e (e) idênticas; (a) idêntica fora da coluna de
   classificação que a A11/T36 exige (10/10 linhas iguais sem ela). A v2 derivada do Apêndice E pelas
   duas âncoras reproduz o md5 da C-6 e a mesma saída do script commitado no `pendencias.md` do worktree e no da `main`.
2. **A18, critério de docs (`navigation/menu?scope=platform` → 0).** Dá 2 no HEAD, e as duas são verdadeiras (o endpoint
   existe no backend; nenhuma afirma que o `PlatformLayout` o consome): `docs/backend-navigation-menu.md:47` (fora do
   PERMITIDO, que libera só a l.32) e `docs/platform-console.md:83` ("API esperada"). A frase falsa da l.13 saiu.
3. **Custo importado** é formatado a partir de `totalUnblendedCost` (number), não de `totalUnblendedCostExact` como o
   §4.1 sugere. É só exibição e o valor formatado coincide no fixture; fica para o revisor (E2).
4. **Resíduos sem DOM** (o §8 manda `renderToString`): o auto-refresh desligado no 403 (T2) e a navegação por clique (T8)
   são conferidos pela fiação no texto-fonte, declarados como tais no próprio teste.
5. O gerador (d) só reconhece renderização da fronteira por `Platform*Page`; T15, T41 e T42 renderizam `*View` e
   asseveram valores **do fixture** (o que o §8 pede), fora do alcance da heurística.

### Commits do sucessor

`ca29352f` refactor (costura) · `7644512c` test (T1–T45 + `smoke-flow` + `test:smoke` + 3.º argumento dos geradores) ·
`8007be1e` docs (5 documentos) · `d73d421c` registro (6 fechadas com `arquivo:linha`, 11 abertas, índice, comando) ·
o commit deste relatório com `status-geral` e `log-execucao`. Sem linha de co-autoria. PR não aberto (cabe ao
orquestrador).
