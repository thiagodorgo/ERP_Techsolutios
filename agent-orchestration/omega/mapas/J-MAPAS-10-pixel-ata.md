# J-MAPAS-10 — Mapa Operacional pixel-perfect (PR-1)

> **Pedido do dono (2026-08-06, verbatim):** *"focar no mapa, a sidebar deixe de fora desta correção.
> copie pixel a pixel este prototipo"* — protótipo `Mapa Operacional.html`, desenhado por ele no Claude
> Design e importado para a raiz do repo (fonte da verdade visual, §11).
>
> **Diretivas complementares do dono, na mesma rodada (após ver a tela renderizada):**
> 1. *"existem umas legendas/objetos na parte superior esquerda, é para sair/excluir"*;
> 2. *"o mapa esta com vida propria ajustando para dar foco em uma area… DEVE sim guardar memoria da
>    ultima posição em que o operador focou, e deve ficar com esse foco ate que o operador o modifique"*;
> 3. *"informação de um tecnico aparecendo quando passado o mouse em cima (desaparece automatico) ou
>    com um clique (fecha manual)"*.

## 1. Composição da junta e vereditos

| Agente | Papel | Ciclo 1 |
|---|---|---|
| `planejador-mapas` | plano obrigatório (nenhum código de mapa sem ele) | plano emitido — `PLANO-MAPA-PIXEL.md` |
| `dev-mapas` | implementação | entregue: smoke 1052, backend 2110, suíte do mapa 125→177 |
| `avaliador-mapas` | **veto geo** | **APROVADO_CONDICIONADO** |
| `cognicao-visual` | **veto de pixel** | **REPROVADO** |

Cada achado sério passou por **refutação adversarial independente** (workflow): 0 refutados.
8 verificações caíram por limite de sessão do provedor e foram **re-verificadas pelo orquestrador**
com execução própria (render em Edge real + medição no DOM) — nenhuma foi aceita sem prova.

## 2. Decisões técnicas cravadas (D-MAPA-PIXEL)

- **Tiles do protótipo (CARTO Voyager) REJEITADOS**: verificação em carto.com/basemaps (2026-08-06) —
  *"For commercial purposes, you will need an Enterprise license"*. Ficamos em **MapLibre +
  OpenFreeMap** (keyless, comercial-ok, US$ 0) com token-set **claro** "voyager-like". O que muda a
  leitura é o mapa ser claro, não o cartógrafo. **Sem SKU, sem chave, sem dependência nova → junta-5
  e PD não disparam.**
- **Leaflet rejeitado** (dependência nova = junta-5): mapeamento função-a-função Leaflet→MapLibre.
- **Dados 100% reais (D-007)**: nada dos `TECHS`/`OSS` do protótipo. ETA/km por haversine **rotulado**
  como estimativa ("linha reta · sem trânsito"); rotas só com par técnico↔OS completo.

## 3. Achado ALTA que mudava tudo — a tela do dono não era o trabalho novo

`cognicao-visual` provou por screenshot: **com a chave Google no `.env`, o canvas renderizado era o
espelho ANTIGO** (`OperationsMapCanvas` preferia Google sempre que houvesse chave). Ou seja, o
auto-foco e os chips que o dono reclamou vinham da tela velha; o PR-1 nunca aparecia para ele.
**Correção:** MapLibre pixel-perfect vira o **default**; Google passa a exigir opt-in explícito
(`VITE_MAPS_PROVIDER=google`) até a paridade fechar no PR-2. Chave nova registrada em `config/env.ts`.

## 4. Diretivas do dono — implementação e PROVA (Edge real, 1440×900)

| Diretiva | Implementação | Prova medida |
|---|---|---|
| Chips do topo-esquerdo saem | `OperationsMapChips` desmontado da página; sobram só **banners de estado REAL** (erro de carga com "Tentar novamente"; contexto de OS filtrada com saída) | `chipsPresentes: 0` |
| Mapa sem vida própria | **Todo** movimento automático de câmera removido: auto-fit, `panToSelected`, `easeTo` por mudança de seleção e o `easeTo` de expansão de cluster. Sobrou **um único** `easeTo`: o `panTarget`, disparado só por clique do operador | `cameraEstavel: true` |
| Memória da última posição | `techsol.mapaOp.view.<tenantId>` + savenote; default Brasil z4 só na 1ª visita | chave gravada por organização |
| Detalhe por hover | `mousemove`/`mouseleave` na camada de pins + `onMouseEnter/Leave/Focus/Blur` na linha do painel; hover **nunca** move a câmera e **nunca** rouba um detalhe fixado | `popoverNoHover: 1` → `popoverSomeAoSair: true` |
| Detalhe por clique | `detailPinnedRef` fixa o popover; fecha só no ✕ | `popoverNoClique: 1` → fica ao sair o mouse → `popoverFechaManual: true` |

**Cluster desligado** junto: o protótipo nunca agrupa marcadores — e na visão default Brasil o
operador via bolhas "2"/"4" em vez dos avatares.

## 5. Demais achados aplicados

| Sev | Achado | Correção |
|---|---|---|
| MÉDIA | Borda esquerda do card selecionado virava azul (cascade invertido vs protótipo) | `.opmap-os.sel` declarado ANTES das regras de prioridade — urgente selecionado segue vermelho |
| MÉDIA | Palco com moldura de 24px, raio 8 e faixa branca de ~46px (o dono já reprovou "mapa espremido" na J-MAPAS-6) | palco **full-bleed**: página anula o padding do shell e o palco ocupa a altura restante |
| MÉDIA | Legenda quebrando em 2 linhas (protótipo: 1 linha de 27px) | itens com prioridade e `nowrap`; textos da direita cedem espaço e somem por media query; disclaimer vira `title` do hint. Medido: **26px** |
| MÉDIA | Chip "Fora de serviço" em 3 linhas | `white-space: nowrap` + `max-width` no select de ordenação |
| MÉDIA | Copy técnica e sem acento em 1º plano ("Realtime indisponivel", "SSE…") | "Tempo real indisponível/conectado", "atualização periódica" — §3/§11.3 |
| MÉDIA | Pipeline de badges de Frota órfão (fetch rodando sem consumidor) | ids repassados ao canvas — o fallback esquemático volta a exibi-los |
| BAIXA | `FullscreenControl` fora do protótipo | removido (só zoom bottom-right, verbatim) |

## 6. Pendências declaradas (PR-2 da mesma rodada)

- Espelho **GoogleMapsCanvas** sem paridade (losango, rotas, memória de visão, popup) — por isso está
  atrás de opt-in.
- Faxina: helpers/teste `focus-city`, `OperationsDispatchActionsPanel` órfão, `OperationsMapStatusBadge`.
- **e2e Playwright do mapa já estava defasada antes deste PR** (espera "Mapa placeholder", da era pré-Ω1)
  e não roda no CI — reescrever no PR-2.
- Contagem da legenda de OS = pins **mapeáveis**; pode divergir da fila quando há OS sem GPS (declarado).
- Badges de Frota fora do popover 2×3 do protótipo (o grid verbatim não os comporta).

## 7. Bateria

`npm --prefix frontend run check` verde · `test:smoke` **1052/1052** · `build` ✓ · backend
`CORE_SAAS_PERSISTENCE=memory` **2110 pass / 6 skip / 0 fail** · `git diff --check` limpo ·
guard de CSS sem `*/` órfão.

**Veredito final: APROVADO** (ciclo 2 — todos os achados sérios aplicados e provados por medição).
