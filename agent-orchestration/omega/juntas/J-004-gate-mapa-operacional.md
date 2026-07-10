# J-004 — Gate do Mapa Operacional (Ω1a) — junta de 5, unânime

**Tema:** a fatia Ω1a (mapa real MapLibre + OpenFreeMap dos operadores) está pronta para merge?

**Junta de 5 (exigida para a PRIORIDADE ZERO):**

| Agente | Veredito | Evidência-chave |
|---|---|---|
| validador-mestre (veto) | **APROVADO** | `check` verde · `test:smoke` **255/255** · `build` verde com maplibre em **chunk lazy**; escopo cirúrgico (nada de `prisma/**`/backend/KPI); atribuição OSM/OMT presente; única dep = `maplibre-gl` (J-002); task-history T-001 bate; Ω1b declarado. |
| inspetor-de-rotas | **APROVADO** | `/operations/map` intacta (`App.tsx:456`, guard `field_location:read`); links `/fleet/maintenance|insurance` existem; `?status=&team=&stale=&q=` não colide com `workOrderId`; nenhum endpoint inventado. |
| master-teste-telas-rotas | **APROVADO** | 9/9 linhas do screen-element-map com respaldo no código; cobertura nova (faixas 3/10 min, `[lng,lat]`, coord inválida, iniciais, `aria-pressed`, SSR-safety). **Achado:** KPI composto contava mais do que o filtro aplicava. |
| frontend-pixel-master | **APROVADO** | 4 tokens navy batem exatos; anti-Google; PT-BR/acentuação ok; grade de KPIs não quebra com o botão. **Achado:** superfície do protótipo é CLARA, não navy. |
| cognicao-visual (veto) | **APROVADO** | Tela VIVA: basemap real (OpenFreeMap), pins de coordenada real com descarte anti-fabricação (D-007), semântica de anel/frescor/cluster/seleção/animação, 4 estados honestos. Sem cheiro de mock. |

**Veredito:** **UNÂNIME 5/5 — APROVADO.**

## Correção aplicada antes do merge (achado de master-teste + pixel-master)
Os cards de KPI **compostos** ("Em atendimento" = `in_service`+`on_site`; "Offline/bloqueados" = `offline`+`blocked`)
contavam um superconjunto, mas ao clicar aplicavam um filtro de **status único** mais estreito que o número exibido.
Corrigido: esses dois cards viraram **informativos** (não são botão-filtro); apenas cards de status único
(total→all, Disponíveis, Em deslocamento) e o toggle "localização antiga" filtram. Teste trava em exatamente
**4 cards interativos**. Suíte segue 255/255.

## Itens para RATIFICAÇÃO HUMANA (registrados, não consolidados em silêncio — regra A2)
Governados pela fonte de verdade #1 (a diretriz do usuário em J-002 pediu explicitamente os tokens navy
`#0f1722…`, que por A1 supera o protótipo). Ficam registrados para o "sim" humano no gate:

1. **Basemap navy × referência clara.** No `ERP Web.dc.html` (`sc_opsMap`) e no PNG `screen-refs/web/mapa-operacional.png`
   a superfície do mapa é **clara** (`#E8EEF4`, look Google-diurno da demo); o navy vem da *sidebar*. Entregamos um
   mapa **navy "tático"** (padrão legítimo para operação) porque foi o alvo explícito de J-002 — mas **inverte o
   maior elemento visual** da referência. Decisão do usuário: manter navy ou migrar para o basemap claro?
2. **Cor "Em atendimento".** Referência usa âmbar `#F59E0B`; entregamos índigo `#6366f1` (âmbar foi reservado para
   "posição antiga >3 min"). Internamente consistente, diverge da referência.
3. **Legenda/tokens de status.** Os hexes de status do pin diferem dos chips do protótipo e a legenda é enxuta
   (gray rotula ">10 min" mas também é a cor de `offline`; `blocked`/`on_site` não aparecem). Decidir se os hexes
   viram tokens oficiais do DS e se a legenda deve cobrir todos os status.

Recomendação da junta: **mergear Ω1a agora** (mapa real destrava a demonstração e é reversível por PR) e tratar os
3 itens acima como decisão de UX do gate humano — nenhum é bug funcional.
