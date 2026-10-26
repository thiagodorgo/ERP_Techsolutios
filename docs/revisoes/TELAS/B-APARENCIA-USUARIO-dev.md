# B-APARENCIA-USUARIO — relatório do dev

- **Papel:** DEV (`dev-aparencia-opus`). Não planejou, não critica e não vota.
- **Executor:** Claude Opus 5.5, nível menor, DECLARADO (§C7.6). Cobre o Codex por ordem do dono (*"vc cobre o codex nessa rodada"*).
- **Base:** `origin/main` `b08c7557` (25/10/2026). Ramo `feat/web-aparencia-usuario`, worktree `C:/Users/AMP/w-aparencia`.
- **Fontes:** plano `docs/revisoes/TELAS/B-APARENCIA-USUARIO-plano.md` (medido em `9c7784b4`); crítica `…-critica.md` (APROVA COM AJUSTES, os ajustes valem sobre o plano); `D-APARENCIA-RESPOSTAS` (a)–(d) em `agent-orchestration/controle/decisoes.md:3688`; contrato do `B-SAN3-22` (decisão do dono de 25/10): `useScreenAppearance(screenKey)` → `{ appearance, setAppearance }`.
- **Formato P1:** cada etapa é gravada ao ser concluída (comando → saída resumida → conclusão).

## Etapa 0 — terreno

- `git fetch` → `origin/main` = `b08c7557` (#458). `git worktree add -b feat/web-aparencia-usuario C:/Users/AMP/w-aparencia origin/main` → HEAD `b08c7557`.
- `npm ci` próprio em `frontend/` (103 pacotes, 3 min) e na raiz (326 pacotes; a 1ª tentativa caiu em `ECONNRESET` de rede; a 2ª, com `--fetch-retries=5`, passou). Sem junction.
- **Disco** (`df -B1M /c`, livre): início 10.215 MiB (10,7 GB decimais, 9,98 GiB) → depois do worktree, 10.129 MiB → depois do `npm ci` do front, 9.913 MiB → `npm cache clean --force` (cache regenerável de 467 MB; nenhum processo `node` vivo, conferido por `Win32_Process`) → 10.129 MiB → depois do `npm ci` da raiz, **9.693 MiB = 10,16 GB decimais = 9,47 GiB**.
- **Unidade, declarada:** li o "~11 GB" do mandato em GB decimais (10,7 GB no início). Nessa unidade o livre ficou acima de 10 GB, e segui. Em GiB, o disco já estava abaixo de 10 antes de eu começar (9,98 GiB); se a régua do orquestrador for GiB, fica esta ressalva. Não rodei a limpeza profunda (`DEEP_CLEAN`, que mexe no gradle e no docker): ela afeta outros agentes e é decisão do orquestrador.
- **Incidente meu, declarado:** ao gravar esta etapa com `node -e` dentro do bash, as crases do markdown viraram substituição de comando. Medi o efeito: `git fetch\`, `git worktree add` e `npm cache clean --force\` falharam por argumento inválido, e `npm ci` caiu em "Unknown command". `git status` mostra só este relatório como novo, os dois `node_modules` estão intactos e o disco não mudou (9.693 MiB). Daqui em diante o relatório é gravado só pelas ferramentas de arquivo.
- Banco: nenhum. Portas 3000/5173/5050/8899: não usadas.

## Etapa 1 — re-medição das premissas do plano e da crítica na `origin/main` de hoje

Medido no worktree em `b08c7557` (`grep -n`/`sed -n` nos arquivos citados).

| Premissa citada | Medida hoje | Situação |
|---|---|---|
| `App.tsx:744-747`: Configurações só para administrador | `744: path="/administrator/settings"`, `746: PermissionGuard … "tenant_settings:read"` | confere. Deixou de importar: a (c) do dono põe a escolha no menu do usuário |
| `auth/types.ts:15` `user.id` e `:38` `tenant?` | `15: id: string;` · `38: tenant?: AuthTenant;` | confere |
| `frontend/package.json:11` `test:smoke` é lista explícita | `11: "test:smoke": "node --test --import tsx tests/…"` | confere |
| `PatiosPage.tsx:80-82` `useYards`, `usePatiosDashboardSummary`, `useAutoRefresh` (crítica, achado 1) | linhas 80, 81, 82 | confere |
| `patios-yards.smoke.test.tsx:145` importa `computeYardKpis`, `shouldShowInvite`, `occupancyTone` (crítica, achado 5) | import dentro do teste "PR-D: computeYardKpis…" | confere: os três exports ficam |
| `appSidebarNav.ts:152,171,184` menu por papel; `san3-04a-sidebar-estoque-financeiro.test.tsx:44` `deepEqual` (crítica, achados 2 e 3) | `152: items: [USUARIOS, … CONFIGURACOES, AUDITORIA]` · `171: admin: [...]` · `184: { label: "ADMINISTRAÇÃO", … }` · `44: assert.deepEqual(` | confere. Com a (c), o item NÃO entra no menu lateral: o lateral e o teste do Estoque ficam intocados |
| `pattern-css-guard.test.ts` exige `.pat-patios-grid` e `grid-template-columns` (crítica, achado 6) | `REQUIRED_RULES` contém `.pat-patios-grid`; o 2º teste exige `grid-template-columns` | confere: o risco é apagar regra, não criar classe |
| `useMapViewMemory.ts:14-51` localStorage com chave por organização e try/catch | `38: mapViewMemoryKey(tenantId)` · `45-48: try { … window.localStorage } catch` | confere: é o modelo da guarda |
| `CLAUDE.md:260-271` (aparência por usuário) | o texto está em `CLAUDE.md:252-271` | linhas deslocadas, conteúdo igual |
| `schema.prisma:144-196` (User) e `:2120-2136` (TenantSetting) | `149: model User` · `2267: model TenantSetting` | deslocadas; não pesam: a v1 é só front, pela (a) do dono |

**Premissas que as decisões do dono mudaram (não são premissas falsas do código, e não param o bloco):**

1. **Padrão.** O plano diz "padrão A; inválido cai em A". Valem a (b) do dono e o contrato do `B-SAN3-22`: `patios` → B, as demais → A, e o valor inválido cai no padrão **da tela**. Consequência medida: `tests/patios-yards.smoke.test.tsx` renderiza `PatiosPage` sem preferência guardada, logo passa a renderizar a B; e o arquivo está fora do PERMITIDO (só `aparencia-*`). **Como resolvi sem mexer nele:** a B, sem o resumo de custódia (sem `impound:read`, que é o caso desse teste), degrada para os mesmos números do cadastro que a A já usa (capacidade prevista, "sem acesso à custódia", coluna CAPACIDADE PREVISTA, abas Todos/Ativos/Inativos, porque sem ocupação não há faixa). É degradação honesta (D-007), não um atalho para o teste; e a A ganha cobertura própria no `aparencia-patios`. O subtítulo da B junta o da A ("Locais de guarda da organização") com o da referência; está na lista de divergências.
2. **Onde fica a escolha.** O plano diz rota `/settings/appearance` com o modelo `TenantSettingsPage`. Vale a (c): o menu do usuário, que no shell de hoje é o rodapé da barra lateral (avatar, nome, papel e "Sair", `AppShell.tsx:206-216`); não existe menu suspenso do usuário. Tela-modelo do menu: o menu suspenso de `DanosPage.tsx:606-680` (camada que fecha no clique fora, `Escape` devolve o foco, foco no primeiro item, classe `.ui-menu-item`). O shell só ganha o botão "Aparência" naquele ponto.

## Etapa 2 — implementação

Skills: `ts-frontend-full` (implementar) carregada; `ui-ux-pro-max` na etapa de revisão.

**Medição do parcial (pedido do orquestrador, que registrou uma queda de rede depois de "Agora a aparência A…").** Esta sessão não perdeu contexto. Mesmo assim, medi antes de seguir: `git status --short` → modificados `AppShell.tsx`, `PatiosPage.tsx`, `app.css`; novos `modules/appearance/`, `patios/yards/components/aparencias/`, os 5 `tests/aparencia-*` e este relatório; `git log origin/main..HEAD` → vazio (nada commitado). O arquivo mais arriscado de estar meio escrito, `PatiosViewA.tsx`, foi gerado por script a partir das linhas 145-456 da `PatiosPage.tsx` original e conferido por `npm --prefix frontend run check` (sem erro, depois de corrigir `ACTIVE_TABS` e `vehiclePlate`) e pelos testes da etapa 3.

| Arquivo | O quê |
|---|---|
| `frontend/src/modules/appearance/appearance.storage.ts` | chave `techsol.aparencia.<tenantId>.<userId>` (sem um dos dois, `null`: não grava); valor `{ tela: "A"\|"B"\|"C" }` saneado; padrão por tela (`patios` → B, o resto → A); try/catch em todo acesso; cópia em memória quando o navegador recusa gravar; JSON corrompido → padrão; assinatura para `useSyncExternalStore` (esta aba e evento `storage` de outras) |
| `frontend/src/modules/appearance/useScreenAppearance.ts` | **o contrato do `B-SAN3-22`**: `useScreenAppearance(screenKey)` → `{ appearance, setAppearance }`; organização = `activeContext.tenantId`, usuário = `session.user.id` |
| `frontend/src/modules/appearance/appearance.registry.ts` | telas que já entregam as 3 (hoje só Pátios: A · Padrão, B · Analítica, C · Mesa de pátio) |
| `frontend/src/modules/appearance/AppearanceMenu.tsx` | botão "Aparência das telas" + menu suspenso (`role="menu"`, itens `menuitemradio` com `aria-checked`, setas, `Escape` devolve o foco, clique fora fecha); etiqueta "padrão" na opção padrão; nota "vale só para você, nesta organização e neste navegador" |
| `frontend/src/modules/appearance/index.ts` | exporta o contrato |
| `frontend/src/layouts/AppShell.tsx` | só o rodapé do usuário: o botão entra antes de "Sair" (e abaixo do avatar com a barra recolhida); estilo igual ao "Recolher menu" do topo. Nenhum papel ou permissão decide se aparece |
| `frontend/src/modules/patios/yards/pages/PatiosPage.tsx` | vira CONTÊINER: `useYards`, `usePatiosDashboardSummary` e `useAutoRefresh` uma vez; `useScreenAppearance("patios")` escolhe a view; o modal de pátio fica aqui; reexporta `computeYardKpis`, `shouldShowInvite`, `occupancyTone` (crítica, ajuste 6) |
| `…/components/aparencias/PatiosViewA.tsx` | A · Padrão = a tela que estava no ar, movida sem mudança de comportamento |
| `…/components/aparencias/PatiosViewB.tsx` | B · Analítica: 5 KPIs clicáveis (Pátios ativos, Vagas ocupadas, Pátios em nível crítico, Vagas bloqueadas, Liberações pendentes → fila de liberações), faixa analítica em SVG inline (rosca da rede, barras por pátio que abrem o pátio, processos por fase + pátios por faixa), abas por faixa, chip do filtro removível, linha de 1 linha que abre o detalhe embaixo (um por vez; Enter/Espaço) com o mapa resumido das vagas e as ações; sem o resumo, degrada para o cadastro |
| `…/components/aparencias/PatiosViewC.tsx` | C · Mesa de pátio: 4 blocos clicáveis, lista à esquerda (linha que abre o detalhe e escolhe o pátio), quadro de vagas à direita (legenda que filtra, abas de área, vaga ocupada → dossiê) |
| `…/components/aparencias/patiosAparencias.shared.tsx` | o que as 3 dividem (funções puras, linhas com ocupação real, totais, fuso legível, cabeçalho, chip, estado de lista) |
| `…/components/aparencias/useYardSpotBoard.ts`, `YardSpotBoard.tsx` | vagas de UM pátio (as mesmas 3 chamadas da página do pátio), só quando a linha abre (B) ou o pátio é escolhido (C); stale-guard; carregando/erro com nova tentativa/vazio |
| `frontend/src/styles/app.css` | +121 linhas no fim, classes `pat-*` da referência (B e C) e do padrão de blocos clicáveis; nenhuma regra existente alterada |
| `frontend/package.json` | só a lista do `test:smoke` ganha os 5 `aparencia-*` |

## Etapa 3 — testes novos e mutações

Commit `ed3d375c`. Os 5 testes novos rodaram juntos com as regressões vizinhas (`patios-yards.smoke`, `pattern-css-guard`, `notifications.smoke`, que monta o `AppShell`): `node --test --import tsx …` → **40 testes, 40 ok, 0 falha**.

| Teste | Casos | O que prende |
|---|---|---|
| `tests/aparencia-storage.test.ts` | 9 | chave por organização E usuário (sem um dos dois, nada); padrão por tela; round-trip `{ tela: letra }`; isolamento entre usuários e entre organizações; inválido/corrompido/lista → padrão; saneamento (sem `__proto__`); sem chave não grava; navegador que recusa gravar ou ler não quebra; A/B/C só |
| `tests/aparencia-hook.test.tsx` | 5 | **o contrato do `B-SAN3-22`**: sai do índice do módulo; Pátios → B e as demais → A; `setAppearance` grava na chave certa e o próximo render usa a escolha; inválido → padrão da tela; sem organização ativa, padrão e nada gravado |
| `tests/aparencia-menu.smoke.test.tsx` | 2 | **todo papel** (os 9 rótulos de `UserRole`, sem permissão nenhuma) vê o item no menu do usuário (crítica, ajuste 2); o menu oferece as 3 de Pátios, com a B marcada e como "padrão", sem termo técnico no texto visível |
| `tests/aparencia-patios.smoke.test.tsx` | 8 | sem nada guardado abre na B (**asserção explícita do padrão**, crítica, ajuste 3); a guardada é a que abre (A, B, C); inválido/corrompido → B; a A é a tela de antes; B e C sem resumo não desenham gráfico nem número inventado; sem "tenant" nem o id da organização nas 3; os 3 exports seguem em `PatiosPage` (ajuste 6); faixas, totais e fuso legível |
| `tests/aparencia-patios-live.test.tsx` | 5 | DOM mínimo do repo (o de `context-selection-page-live`, sem dependência nova; acrescentei só `options`/`selected` para o `<select>` do paginador) com `fetch` no contrato real: abre na B; **o clique no menu troca a aparência da página aberta e grava a chave**; **"um fetch só"**: `/yards` e `/patios/dashboard/summary` pedidos 1 vez cada, também depois de A→C→B (crítica, ajuste 1); B: KPI de crítico filtra, chip aparece e sai; linha abre o detalhe embaixo, um por vez, Enter/Espaço, e só então busca `/yards/:id/occupancy`, com a vaga ocupada levando ao dossiê; C: bloco filtra, linha escolhe o pátio do quadro |

**Mutações** (`mutar.mjs` no scratchpad: âncora única, EOL-neutra, roda o teste-alvo e restaura; `git status` limpo depois de cada uma):

| # | Mutação | Resultado |
|---|---|---|
| M1 | tirar o `userId` da chave | `aparencia-storage` 4 de 9 vermelhos (inclusive "isolamento") |
| M2 | aceitar valor fora de A/B/C (as duas travas: saneamento e resolução) | 2 vermelhos ("inválido cai no padrão" no storage e no contrato do hook) |
| M3 | padrão de Pátios = A | 6 vermelhos (hook, smoke e live) |
| M4 | `write` sem efeito no navegador | 3 vermelhos (round-trip, contrato do hook, recusa do navegador) |
| M5 | a view B chama `usePatiosDashboardSummary` por conta própria | `aparencia-patios-live` vermelho ("resumo pedido uma vez") |
| M6 | o item só para o papel administrador | `aparencia-menu` vermelho ("todo papel vê o item") |
| M7 | a linha nunca fecha (abrir não fecha a anterior) | `aparencia-patios-live` vermelho ("um por vez", Espaço fecha) |
| M8 | gravar sem organização ativa | 2 vermelhos (chave e contrato do hook) |
| M9 | o KPI de crítico não filtra | `aparencia-patios-live` vermelho |

Todas restauradas (`git status --short` limpo após cada uma). Saída integral em `scratchpad/mutacoes.txt` (não versionada).

## Etapa 4 — fidelidade (§11) e revisão `ui-ux-pro-max`

**Como capturei.** Vite em `127.0.0.1:47193` (porta alta livre, conferida por `netstat`; nenhuma das portas proibidas), com uma página de captura TEMPORÁRIA (`frontend/captura-aparencia.{html,tsx}`, apagada ao fim, nunca commitada) que monta o `AppShell` e a `PatiosPage` reais com sessão e organização semeadas, a aparência guardada pela própria chave, e `fetch` respondendo no contrato real com 8 pátios iguais aos da referência. Edge headless (`--headless=new --window-size=1440,1700 --screenshot`), 1440 px. A referência foi capturada na mesma largura, com uma cópia no scratchpad que só troca a opção inicial (`trocarOpcao('b'|'c')`) e esconde o quadro de notas. Capturas no scratchpad (não versionadas): `patios-A.png`, `patios-B.png`, `patios-B-detalhe.png`, `patios-C.png`, `patios-C-linha.png`, `ref-a.png`, `ref-b.png`, `ref-c.png`.

**Achados da própria captura, corrigidos no commit `bcca9c66`:** (1) a pílula de situação herdava a altura de linha de 40 px da célula e virava um círculo de 46 px, e a linha passava de 44 px. Medi por `getComputedStyle` no Edge (`pill:40px/46px`); depois da correção, `pill:12.6px/18.6px`, e a linha ficou em 43 px; (2) as amostras da legenda das vagas (C) saíam com borda escura, por especificidade; corrigido (`sw:rgb(134,239,172)`); (3) os rótulos das barras e da dica do KPI de crítico perderam o prefixo "Pátio ", como na referência; (4) cada barra ganhou dica com o valor exato (`<title>`). Um tropeço meu, também declarado: o Vite deste worktree não recarregou o CSS e o TSX alterados, e duas rodadas de captura saíram com o código antigo. Reiniciei o servidor e recapturei.

**Divergências conscientes em relação à referência:**

| Onde | Referência | Implementado | Por quê |
|---|---|---|---|
| A | detalhe embaixo da linha, KPIs clicáveis, fuso legível | a tela que já estava no ar (linha leva à página do pátio, "Abrir"/lápis na linha) | Pátios é uma das 5 telas de `D-OS-CABECALHO-PADRONIZADO`, que "continuam como estão até o dono responder" (`CLAUDE.md` §4 item 6); o plano (§3) diz "A = igual ao que existe hoje". B e C aplicam o padrão de blocos clicáveis |
| B | coluna LIBERAÇÕES por pátio | sem a coluna | o resumo só traz o total da organização (`releaseQueueDepth`); a própria referência lista isso como "o que faltaria" no backend |
| B | KPI "Liberações pendentes" filtra a lista por pátio | leva à fila de liberações (`/patios/liberacoes`) | mesmo motivo; continua clicável e leva a uma lista |
| B | número do KPI de crítico em vermelho e o de liberações em roxo | número na cor padrão do `KpiStatCard` | o componente da biblioteca não tem cor de valor, e `components/patterns/**` está fora do PERMITIDO |
| B | subtítulo "Ocupação da rede de guarda, pátios sob pressão…" | "Locais de guarda da organização — ocupação da rede, pátios sob pressão…" | mantém o subtítulo que o smoke antigo de Pátios exige (fora do PERMITIDO); ver a Etapa 1, item 1 |
| B/C | o nome do pátio na linha é um link para a página do pátio | o nome é texto; a ação "Abrir vagas" / "Abrir página do pátio" fica no detalhe | a regra do dono diz "linha sem botão de ação"; um link dentro de uma linha clicável vira alvo duplo de teclado |
| B/C | "Ver processos do pátio" no detalhe | ausente | a tela de Processos guarda o filtro de pátio em estado local, não na URL; não dá para chegar já filtrado sem mexer nela (fora do PERMITIDO) |
| B/C | lista sem paginador | `TablePager` padrão | o padrão do sistema para listas; com até 100 pátios na janela |
| C | bloco "Com liberações pendentes" | bloco "Com vagas bloqueadas" | liberações por pátio não existem no backend; vagas bloqueadas por pátio existem no resumo |
| C | clicar numa vaga livre abre "alocar" | só a vaga ocupada é clicável (leva ao dossiê) | a referência anota que "o quadro compacto não mostra as ações da vaga (estão na página completa do pátio)" |
| B/C | áreas na ordem do cadastro | áreas em ordem alfabética | a ocupação não traz a hierarquia; a página do pátio monta a árvore por `parentId` |
| B e C | — | sem o resumo de custódia, a B degrada para os números do cadastro; a C mostra "—" nos blocos de faixa | D-007: nenhum gráfico ou número sem dado |

**Checklist `ui-ux-pro-max` (web):** 4 estados nas três (carregando com esqueleto, vazio com orientação, erro com "Tentar novamente", populado), e também no quadro e no mapa de vagas; situação e faixa com rótulo além da cor; tabela com `aria-sort`, ordenação e paginação; linha com foco visível, Enter/Espaço; barras com `role="button"`, teclado e dica; menu com `role="menu"`/`menuitemradio`, setas, `Escape` e foco devolvido; texto longo cortado com reticências e `title`; nenhum termo técnico visível. **Ressalva:** em B e C, a busca, a aba e o bloco escolhidos ficam no estado da página e se perdem ao voltar da página do pátio (a A guarda tudo na URL, pela `useDenseList`). Fica como pendência (abaixo). **Ressalva 2:** as cores das classes novas vêm da referência em hex, como todas as `pat-*` existentes; não há token novo.

## Etapa 5 — escopo

`git diff --name-only origin/main...HEAD` → 21 arquivos, todos em `frontend/` e neste relatório. Batidos contra o PROIBIDO (`prisma/**`, `migrations/**`, `infra/**`, `src/**`, `.env*`, lockfiles, `Kpis/**`, `modules/settings/**`, `useYards.ts`, `yards.service.ts`) e contra o menu lateral (`appSidebarNav.ts`, que pela (c) não entra): **nenhum**. `AppShell.tsx` mexe só no rodapé do usuário (+8/−2). `frontend/package.json` muda só a lista do `test:smoke`. O PERMITIDO do plano não listava o shell; ele entra pela (c) do dono, como o mandato manda.

## Pendências que deixo nomeadas (não são deste bloco)

- **P-APARENCIA-ESTADO-NA-URL** — B e C guardam busca, aba e filtro em estado local; ao voltar da página do pátio, voltam ao início. A A guarda tudo na URL. Dono sugerido: o próximo bloco de Pátios.
- **P-PATIOS-LIBERACOES-POR-PATIO** — o resumo `/patios/dashboard/summary` não traz liberações nem custódia por pátio; a coluna da B e o bloco da C da referência dependem disso. Backend.
- **P-PROCESSOS-FILTRO-PATIO-NA-URL** — "Ver processos do pátio" pede que a tela de Processos aceite o pátio pela URL.
- **P-KPI-COR-DO-VALOR** — `KpiStatCard` sem cor de valor (a referência pinta o crítico e as liberações). Biblioteca.
- **P-BLOCOS-CLICAVEIS-NA-BIBLIOTECA** — tabela de linha única que abre o detalhe, chip de filtro e linha de KPIs nasceram como classes `pat-*` e componentes em `patios/yards/components/aparencias/` (o PERMITIDO não incluía `components/**` da biblioteca). Promover à biblioteca no próximo bloco que usar o padrão (`CLAUDE.md` §4 item 3).
- **Aparência guardada no servidor** — a v1 é do navegador (a); o servidor vem junto da AWS, como o dono decidiu.
- **Ambiente local** — `tests/core-saas-role-authority.test.ts` (suíte da raiz) exige `DATABASE_URL` no carregamento: sem `.env` no worktree ele falha; com uma URL de mentira (sem conexão) passa 12 de 12. A CI exporta a variável. Não é deste bloco (não toquei `src/` nem `tests/` da raiz).

## Etapa 6 — bateria (§9 Frontend + raiz) no head de código `bcca9c66`

Os commits seguintes só mexem neste relatório.

| Comando | Resultado |
|---|---|
| `npm --prefix frontend run check` | `tsc -b --noEmit` sem erro, exit 0 |
| `npm --prefix frontend run build` | `✓ built in 1m 7s`, exit 0 (o aviso de bloco > 500 kB é do `maplibre-gl`, preexistente) |
| `npm --prefix frontend run test:smoke` | **1368 testes, 1368 ok, 0 falha, 0 pulado**. Linha de base em `b08c7557`: 1339/1339. Diferença: +29, exatamente os 9+5+2+8+5 dos `aparencia-*` |
| `npm run check` (raiz) | exit 0. Antes, o worktree não tinha o cliente Prisma gerado (`npm ci` não o gera); rodei `npx prisma generate` com uma `DATABASE_URL` de mentira, só para gerar os tipos, sem conexão e sem tocar em `prisma/**` |
| `npm test` (raiz) | 341 arquivos, **3347 testes: 3250 ok, 96 pulados, 1 falha**, exit 1. A falha única é `tests/core-saas-role-authority.test.ts`, que exige `DATABASE_URL` já no carregamento e não acha `.env` no worktree. Com uma URL de mentira (sem conexão), o arquivo passa 12/12; a CI exporta a variável (`.github/workflows/ci.yml:40`). O diff do bloco não toca `src/` nem `tests/` da raiz. É ambiente, e fica nomeado nas pendências |
| `git diff --check origin/main...HEAD` | limpo |

## Etapa 7 — limpeza (§C5)

Apaguei `frontend/dist/` (build), a página de captura temporária (antes do commit), os perfis do Edge no scratchpad e o Vite da porta 47193 (porta conferida livre). Ficaram no scratchpad, como evidência e fora do repositório, as capturas e a saída das mutações. Mantidos: o worktree (por ordem do mandato), os `node_modules` e o cliente Prisma gerado. Disco no fim: 10.614 MiB livres (11,1 GB decimais). Branch empurrada: `feat/web-aparencia-usuario`. PR não aberto: o orquestrador abre.
