# B-ASS-10b (T5) — diário de dev

Bloco **B-ASS-10b, parte T5** — a tela de custo e margem da plataforma (`/platform/cloud-billing`), que fecha o critério
"3 aparências aprovadas" do item 61. Nível: **junta completa** (plano v2 §12.2: escrita do dólar do mês, escrita dos grupos
e as 2 fontes de permissão do front).

- **Devs, identidades declaradas (§C7 11(6)):** `dev-10b-a-cl` (Dev-A: F0, F1, F2, F4, F7, F8, F11, F12) e `dev-10b-b-cl`
  (Dev-B: F3, F5, F6, F9, F10), os dois Claude Opus 5.5. **Cruzamento: false** — ordem do dono de 13/11 (§C7 11(2)).
- **Lei:** plano v2 `plano-B-ASS-10b-T5-v2.md` + **Emenda 1** (A1-r2, A3-r2, A4-r2, A8-r2, A10-r2, A12-r2) + a maquete
  aprovada (`screen-refs/platform-cloud-billing-3opcoes.reference.html`; o dono em 14/11: *"aprovo as telas de custos"*).
  Plano, emenda e os diários completos ficam fora do repositório (`erp-pausa-2026-10-03/revisoes/b-ass-10b/`).
- **Ramo:** `feat/web-custos-t5` (o mandato, mais novo que o plano, troca o nome e manda integrar o pai por MERGE),
  empilhado no `feat/ass-09-visao-custo` (B-ASS-09, PR #566). Base: ponta do B-ASS-09 `fa5e5372`.

## Fatias

| fatia | quem | commit | o que entrou |
|---|---|---|---|
| F1 | A | `dff9a79f` | tipos com dinheiro marcado, `cloud-billing.money.ts`, adapter (toda leitura com `{ method: "GET" }` literal), serviço (A12-r2), trava de escopo versionada |
| F2 | A | `0075cccc` | modelo único (`buildCloudBillingView`, P13), `cloud-billing.groups.ts` (R-GRP, A1-r2), ações (uma requisição por confirmação), T-DIN-P, T44 novo, `ass-01` |
| — | A | `0c72e3a8` | merge da ponta do B-ASS-09 (`fa5e5372`) |
| F3 | B | `deb2ae35` | `ScatterPlot`, `StepBridge`, `KpiStatCard.footer` |
| F10 | B | `d7331999` | "Uso medido" no detalhe da organização |
| F4 | A | `3536bf67` | o contêiner, `cloudBilling.shared`, a View A, `MonthSeriesChart` e `ProportionBars` na biblioteca |
| F7 | A | `ec4b18c4` | as 10 janelas, R-FX (eco + pós-condição) e R-GRP na tela |
| F8 | A | `1d89d9d3` | estados do §6.5, a série de 6 meses pela regra da maquete, P13 na tela, a11y |
| F5 | B | `d8ed0737` | View B · Analítica |
| F11 (1) | A | `adfd7d80` | o vazio com o cabeçalho inteiro; "sem dólar" sem assinatura fora do vazio; a referência byte a byte |
| F6 | B | `81972d9e` | View C · Fechamento e grupos |
| F9 | B | `1ac6ef91` | aparência no console da plataforma, guarda da rota (2 aninhadas), as 2 fontes de permissão |
| F11 (2) | A | `5c504151` | achados do aceite real (janelas de grupo, margem sem assinatura na C, A-B2) e os roteiros de captura |
| F11 (3) | A | `c8edbe1a` | a tela segue a referência nas larguras (quebra em 1340 px) e nas janelas (foco, Escape) |
| F12 | A | (este) | registro (decisão + 12 pendências + 4 notas; índice regenerado) e este diário |

## Bateria do §9.1 (F12, head `c8edbe1a`)

| comando | resultado |
|---|---|
| `npm --prefix frontend run check` | exit 0 |
| `npm --prefix frontend run test:smoke` | `# tests 1903 · # pass 1903 · # fail 0 · # skipped 0` |
| `npm --prefix frontend run build` | exit 0 |
| `npm run check` | exit 0 |
| `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/ass-01-frontend-sem-markup.test.ts tests/ass-10b-contrato-overview.test.ts` | `# tests 11 · # pass 11 · # fail 0` |
| `node scripts/san3-06b-telas-de-plataforma.mjs` | `rotas /platform em App.tsx = 10 · itens PLATFORM_NAV = 4 · itens platformNavigation = 7 · LIGADA = 6 · PARADA-HONESTA = 4 · SEM-FONTE = 0` |
| `git diff --check` (o diff do bloco) | exit 0 |
| `bash docs/revisoes/ASSINATURA/B-ASS-10b-trava-escopo.sh` | `base=fa5e5372 (ponta do B-ASS-09) · arquivos do bloco=75 · TRAVA: ok`, exit 0 (antes do commit da F12) |
| presença: `defaultPeriodBody`, `manual-ui`, `cloud-usage/summary` em `frontend/src` | nenhuma das 3 |
| `sha256` da referência | `169bbdbc8189ad1ac1487e28a510a7f1dcbbac2265a3d562f05a516dc7916425` |
| `checar-3opcoes.cjs` (caminho absoluto) | `RESULTADO: PASSOU` |

O T40 do pai (achado A-8) passa com o pai em `fa5e5372`; o arquivo do T38-T40 voltou a carregar (A-B2, abaixo).

## Aceite na forma real (§9.2)

Cluster Postgres 16 descartável `C:/Users/thiag/pg-10b` (porta 55662, `timezone='UTC'` antes do start, só 127.0.0.1),
`prisma migrate deploy`, RBAC e o admin de plataforma; API real (`createApp` + `createCoreSaasService`, prisma, sem portal
e sem worker) em `127.0.0.1:58411`; Vite próprio em `127.0.0.1:58412` (`VITE_USE_MOCKS=false`). Roteiro PELA TELA no Edge
headless (Playwright, canal msedge):

- abrir sem rateio → novembro vazio, nenhum R$, com "Rodar rateio do mês" e "Importar arquivo de custo";
- importar um CSV de outubro em dólar → `POST …/imports/manual-csv -> 201`; rodar o rateio → `201`, "concluído";
- antes do dólar → aviso "Falta o dólar", `US$ 268,00`, nenhum valor em reais, e não é o vazio;
- digitar `5,41` → eco "1 dólar = R$ 5,410000"; a tela mostra `R$ 1.449,88`; **no banco: `platform_fx_rates` = `5.410000`**;
- reabrir → outubro; rodar novembro sem arquivo → "rodou sem arquivo de custo e ficou vazio"; **reabrir → outubro (A12)**;
- texto de 1,1 MB → "O arquivo passa de 1 MB" e nenhum POST;
- grupos: criar; "Mudar de grupo" de quem não tem grupo (1 `PUT`); "Editar membros" + 1, + 1 agendada para 01/12/2026, + a
  3ª → **no banco, as 2 primeiras com o mesmo id, a mesma data e o mesmo `updated_at`; a agendada continua de 01/12**;
  "Mudar de grupo" de quem tem grupo → só "Sem grupo" e o texto que explica (1 `PUT`, saída em 20/11);
- as 3 aparências lidas na tela real depois da F9 (chave `techsol.aparencia.plataforma.<userId>`): desenhada = pedida.

Nenhuma das 2 paradas do §9.2 aconteceu (o rateio manual sem `importId` enxergou a importação; nenhum `PUT /members`
deixou vínculo pela metade). **Não coberto, declarado:** assinatura e margem com demonstrativo real (a base de teste não tem
assinatura; as linhas saem "Sem assinatura", um estado verdadeiro). **Nota:** a importação criou um rateio `pending` (o
gancho do rateio automático enfileira na fila padrão, e o aceite roda sem worker).

**Achados do roteiro real, consertados com teste vermelho antes:** (1) o vazio não deixava rodar o rateio; (2) o "sem
dólar" sem assinatura caía no vazio; (3) "Editar membros", depois de salvar, mostrava "sem grupo" para quem entrou;
(4) "Mudar de grupo", depois de salvar e a tela reler, virava a operação oposta; (5) na C, "Margem mês a mês" dizia "sem
custo" e tracejava o mês que tem custo e não tem assinatura.

## Conferência visual (§9.3)

Roteiros versionados em `docs/revisoes/TELAS/B-APAR-capturas/`: `capture-cloud-billing.mjs` (toda chamada `/api/v1/**`
interceptada com as fixtures da tela, rota sem fixture → 599; as 3 aparências em 1280×720, 1366×768 e 1440×900 com
`scrollWidth ≤ clientWidth` em todas; detalhe, filtro, as 10 janelas, os estados do §6.5 nas 3 aparências e o perfil "só
consulta", que mostra só "Dólar do mês") e `capture-ref-cloud-billing.mjs` (a referência). PNG e log fora do repositório.
Da conferência própria contra a referência saíram: a quebra de layout em 1340 px (era 1200), as reticências dos rótulos
das barras, a nota do detalhe em corpo pequeno e, nas janelas, foco inicial, Escape e volta do foco. A conferência que
vale é do `cognicao-visual` (§9.3).

## Desvios e leituras declarados

- `MonthSeriesChart` e `ProportionBars` são componentes NOVOS na biblioteca, fora da lista PERMITIDO do §10 (a proporção e
  o eixo com `data-escala` só podem nascer na biblioteca, L8 e A8-r2; nenhum existente os desenha). Registrados em
  `COMPONENT_LIBRARY.md`. **A pré-revisão decide.**
- A F11 saiu em 3 commits (a PAUSA de 10:18 e a integração do Dev-B no meio).
- O Dev-A mexeu em arquivo do Dev-B (View C e o CSS de quebra de B e C), e o Dev-B no teste do Dev-A (o recorte da C no
  T-UI-3 (F11)); os dois declarados nos diários. O Dev-A conferiu que o T-UI-3 continua dizendo o que deve.
- **A-B2** (achado do Dev-B sobre a F1): a F1 tirou `getCloudCostSummary` do serviço, e o arquivo do T38-T40 do B-ASS-09
  (proibido ao bloco) deixou de carregar. O nome voltou no serviço com o mesmo contrato; o arquivo dá 3/3.

## Achados para o orquestrador (quem acha não conserta)

- **A-B1 (front, de hoje):** `PermissionProvider.hasAny`/`can` devolvem `true` para todo Admin Plataforma, e o
  `PlatformLayout` só deixa entrar Admin Plataforma; os 2 guardas aninhados não estreitam nada no front. A tela não usa
  `can`: cada botão confere a própria permissão por igualdade exata, e o servidor é a autoridade.
- **Biblioteca:** o `Modal` (`components/ui`) não fecha com Escape nem cuida do foco; a tela faz isso na própria moldura.
- Do plano, seguem: A-1, A-7 (servidor, B-ASS-09) e A-9.
