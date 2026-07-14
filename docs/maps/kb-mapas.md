# Base de conhecimento — Mapas & Geo (KB da Junta de Mapas)

> Base **viva** mantida pela Junta de Mapas (`planejador-mapas` · `dev-mapas` · `avaliador-mapas`).
> Aqui vive o conhecimento **volátil** (preços, cotas, ToS, versões) que NÃO pode ficar dentro do
> corpo dos agentes — os agentes são enxutos e apontam para cá. **Toda seção é datada.** Preço,
> cota e ToS mudam: nunca cite de memória — reabra a fonte oficial e atualize a data antes de
> decidir. Fonte sem data em tema volátil = a própria Junta se veta.
>
> **Regra de ouro (arquitetura, não-volátil):** MapLibre GL + OpenFreeMap seguem como **base de
> exibição web** (decisão de junta Ω1, custo zero). Google Maps Platform entra **onde agrega**
> (geocoding de produção, Places Autocomplete de endereço, Routes/ETA/matriz para despacho, mapa
> mobile). Ativar qualquer SKU pago do Google **ou** trocar de provedor geo = **serviço externo**:
> exige PD-xxx (≥3 fontes) + **junta de 5 unânime** antes de configurar billing. Este documento é
> o dossiê técnico/custo que instrui essa decisão — ele **não** ativa nada.

**Última revisão geral:** 2026-07-13 · **Responsável:** Junta de Mapas (semeadura inicial)

---

## (a) Preços, tiers e cotas grátis por SKU — Google Maps Platform

**Última verificação:** 2026-07-13 · **Fonte primária:** [developers.google.com/maps/billing-and-pricing/pricing](https://developers.google.com/maps/billing-and-pricing/pricing) (página marcada "Last updated 2026-07-10 UTC").

### Mudança estrutural de 2025 (contexto que muda tudo)
Desde **1º de março de 2025** o modelo de **US$ 200 de crédito mensal** foi **extinto** e
substituído por **cota grátis por SKU**, atrelada ao tier do SKU
([FAQ oficial da transição](https://developers.google.com/maps/billing-and-pricing/faq)):

| Tier do SKU | Cota grátis/mês (por SKU) |
|---|---|
| **Essentials** | **10.000** eventos |
| **Pro** | **5.000** eventos |
| **Enterprise** | **1.000** eventos |
| **Map Tiles** (2D/Street View) | **100.000** eventos |

Descontos por volume automáticos foram estendidos até faixas de **5.000.000+** eventos/mês.
Existem também **assinaturas** (Starter ~US$100/mês, Essentials ~US$275/mês, Pro ~US$1.200/mês)
que embutem volumes — só valem a pena em escala, **não** no piloto (fonte:
[Google Maps Platform — Pricing/Subscriptions](https://mapsplatform.google.com/pricing/) +
[Woosmap — Is Google Maps API free 2026](https://www.woosmap.com/blog/is-google-maps-api-free),
ambas verificadas 2026-07-13; valores aproximados, **reconfirmar antes de assinar**).

### Tabela de preços por SKU (USD por 1.000 requisições)
Faixa/Tier 1 = volume **acima da cota grátis** até ~100K/mês; cai por degraus até Tier 5.
Verificado em 2026-07-13 na página oficial (marcada 2026-07-10 UTC).

| SKU | Cota grátis | Tier 1 | Tier 4 | Tier 5 | Observação |
|---|---|---|---|---|---|
| **Dynamic Maps** (mapa JS interativo) | 10K | $7,00 | $2,10 | $0,53 | Só se trocar a base MapLibre — **não é o caso** |
| **Static Maps** (imagem) | 10K | $2,00 | $0,60 | $0,15 | Thumbnail de OS em relatório/e-mail |
| **Geocoding** | 10K | $5,00 | $1,50 | $0,38 | Endereço→lat/lng (produção) |
| **Place Details (Essentials)** | 10K | $5,00 | $1,50 | $0,38 | Detalhe de um place_id |
| **Autocomplete — Requests** | 10K | $2,83 | $0,85 | $0,21 | Cobrança por requisição de tecla |
| **Autocomplete — Per Session** | (sessão) | ver nota | — | — | **Session token** agrupa teclas; confirmar preço/sessão vigente na implementação |
| **Address Validation (Pro)** | 5K | $17,00 | $5,10 | $1,28 | Validação/normalização forte de endereço |
| **Routes — Compute Routes (Essentials)** | 10K | $5,00 | $1,50 | $0,38 | Cobra **por requisição**; ≤10 waypoints |
| **Routes — Route Matrix (Essentials)** | 10K | $5,00 | $1,50 | $0,38 | Cobra **por elemento** = origens × destinos |

Fontes cruzadas (independentes, para sanidade dos números — todas consultadas 2026-07-13):
[Woosmap — Pricing breakdown 2026](https://www.woosmap.com/blog/google-maps-api-pricing-breakdown),
[Mapsi — Full SKU breakdown 2026](https://mapsi.dev/google-maps-api-pricing),
[MapAtlas — Exact cost per 1000 (2026)](https://mapatlas.eu/blog/google-maps-api-pricing-2026).

### Routes API — detalhe que muda o custo real
**Fonte:** [Routes API Usage and Billing](https://developers.google.com/maps/documentation/routes/usage-and-billing) (2026-07-13).
O **tier** do Routes depende dos campos pedidos:
- **Essentials** = básico, ≤10 waypoints intermediários.
- **Pro** = features avançadas, ex.: `TRAFFIC_AWARE` / `TRAFFIC_AWARE_OPTIMAL` (ETA com trânsito).
- **Enterprise** = features enterprise (ex.: rota de moto/two-wheel).

⚠️ **Route Matrix cobra por ELEMENTO (origens × destinos)** — cresce ao quadrado. Escolher o
técnico mais próximo entre 15 candidatos para 1 OS = 15 elementos por despacho. Este é o SKU que
**estoura primeiro** em escala; no piloto ainda cabe na cota grátis (ver seção c).

---

## (b) Regras de cache/armazenamento do ToS (Geocoding & Places)

**Última verificação:** 2026-07-13 · **Fontes:**
[Google Maps Platform Service Specific Terms — 2025-05-01](https://cloud.google.com/archive/maps-platform/terms/maps-service-terms-20250501),
[EEA Service Specific Terms — 2025-10-01](https://cloud.google.com/archive/terms/maps-platform/eea/maps-service-terms-20251001),
[Places API Policies](https://developers.google.com/maps/documentation/places/web-service/policies),
[Geocoding API Policies](https://developers.google.com/maps/documentation/geocoding/policies).

| Dado | Regra de cache | Consequência de projeto |
|---|---|---|
| **`place_id`** | **Isento** de restrição — pode ser armazenado **indefinidamente** | Persistir `place_id` como chave estável do endereço/local no nosso schema |
| **lat / lng** (Geocoding, Places, Directions, Roads) | Cache **temporário ≤ 30 dias corridos**; depois **deletar** | **Não** é chave permanente. Ou re-resolve pelo `place_id`, ou usa provedor sem essa trava para persistência longa |
| Demais campos de conteúdo (nome, endereço formatado etc.) | Regras da política de Places; **não** pré-buscar/armazenar em massa | Pedir só o que a tela usa (field mask) |

**Padrão de persistência recomendado (para o planejador):** guardar `place_id` (perene) + snapshot
de exibição; tratar `lat/lng` do Google como **cache de ≤30 dias** com carimbo de expiração, ou
persistir coordenada **apenas** quando vier de provedor cujo ToS permita (ex.: Nominatim
self-hosted / dado ODbL do OSM). **Decidir antes de modelar tabela** — é item de veto do avaliador.

**Enforcement do TTL (obrigatório, não confiar em disciplina manual):** o cache de `lat/lng` de
origem Google precisa de mecanismo ativo — coluna `geo_cached_at`/`expires_at` (timestamptz) +
**purga automática ≤30 dias** (job/cron ou filtro na leitura que ignora/re-resolve o expirado). A
Junta trata "sem enforcement de expiração" como equivalente a "cache ilegal": item de veto do
avaliador. O `place_id` associado permanece (perene) e permite re-resolver a coordenada quando
expira, sem novo geocoding de texto.

> Nota jurídica adjacente (não-ToS): a persistência de **coordenada de técnico** é dado pessoal
> (LGPD) → minimizar, reter o mínimo, **nunca** logar coordenada em log estruturado/analytics.

---

## (c) Matriz caso-de-uso do ERP → API → custo no piloto → alternativa aberta

**Cenário piloto:** 1 tenant · **~500 OS/mês** · **~15 técnicos**. Verificação de preços: 2026-07-13.

| Caso de uso (ERP) | API Google | Volume estimado/mês | Custo Google no piloto | Alternativa aberta |
|---|---|---|---|---|
| **Mapa operacional web** (base de exibição) | Dynamic Maps | — | **$0** (mantém MapLibre+OpenFreeMap) | MapLibre + OpenFreeMap (**já é o padrão**, self-host p/ prod) |
| **Geocoding de endereço da OS** (endereço→pin) | Geocoding | ~500–1.500 | **$0** (≪ 10K grátis) | Nominatim self-hosted · LocationIQ · Geoapify |
| **Autocomplete de endereço** (criar OS / cadastro) | Places Autocomplete (+ session token + field mask) | ~500–2.000 sessões | **$0–baixo** (dentro/perto de 10K) | Geoapify Autocomplete · Photon (self-host) |
| **ETA técnico→OS** (despacho) | Routes: Compute Routes | ~1.000–2.000 req | **$0** (≪ 10K; Pro se trânsito, cap 5K) | OSRM (self-host, sem trânsito) · Valhalla |
| **Escolher técnico mais próximo** | Route Matrix | ~2.500–7.500 **elementos** | **$0** no piloto, mas **cresce ao quadrado** | OSRM `/table` (self-host) · Valhalla matrix |
| **Thumbnail de local em relatório** | Static Maps | esporádico | **$0** (≪ 10K) | Render estático do MapLibre / staticmap OSM |
| **Mapa no app de campo (Flutter)** | google_maps_flutter | — (por device) | **$0** de API; custo = billing dos SKUs acima | flutter_map + tiles MapLibre (vendor-free) |

**Conclusão de custo (piloto):** no volume do piloto **praticamente tudo cabe na cota grátis por
SKU (10K/mês)** → **estimativa ≈ US$ 0/mês** mesmo se adotássemos Google em todos os casos. O
custo **não** aparece no piloto; aparece **na escala**, e o gatilho de custo é, nesta ordem:
**Route Matrix** (cobrança por elemento, cresce O(origens×destinos)) → **Dynamic Maps** (se um dia
trocar a base) → **Autocomplete por requisição** sem session token. **Implicação:** a decisão
"Google vs aberto" **não** deve ser tomada pelo custo do piloto (é ~zero nos dois lados) e sim por
**ToS/retenção, qualidade de dado BR e caminho de saída** — e, para o que escala (matriz de
distância), já desenhar com OSRM/Valhalla como alternativa self-host de baixo lock-in.

**Guarda de custo (obrigatória quando/se Google for ativado):** no dia da ativação (que só ocorre
após junta de 5 + PD) configurar **Cloud Billing budget + alertas** e **quotas por SKU** no projeto
GCP como teto rígido de gasto por tenant, e **rate limit por tenant** no proxy backend. Cota grátis
por SKU **não** é limite de gasto: sem budget/quota, um pico (ou um bug em loop de Route Matrix)
fura o piloto. Item de auditoria do avaliador antes de qualquer go-live com SKU pago.

---

## (d) Estado do ecossistema Flutter (mobile)

**Última verificação:** 2026-07-13.

### `google_maps_flutter`
- **Versão atual:** **2.17.1** (publicada ~47 dias antes de 2026-07-13, i.e. ~final de maio/2026).
  Fonte: [pub.dev/packages/google_maps_flutter](https://pub.dev/packages/google_maps_flutter) e
  [changelog](https://pub.dev/packages/google_maps_flutter/changelog).
- **SDK mínimo:** Flutter 3.29 / Dart 3.7; Android SDK 24+, iOS 14+.
- **Novidades relevantes recentes (changelog):** suporte a **clustering** e **heatmap layer**;
  animação de câmera com **duration**; **ground overlays**; correção de **memory leak** (dispose de
  stream subscriptions no `GoogleMapController`); `StateError` ao usar o controller após `dispose`.
- **Setup (para o planejador/dev):** Android = `meta-data` no `AndroidManifest` (chave via
  **placeholder**, restrita por **SHA-1 + package**); iOS = `AppDelegate`/`Info.plist` (chave por
  **bundle id**); chave **nunca** hardcoded → `--dart-define`. Custo de performance: usa **platform
  view / hybrid composition** → em **listas** preferir **lite mode**.

### `flutter_map` (alternativa vendor-free)
- **Versão atual:** **8.3.0** (publicada ~início de julho/2026). Fonte:
  [pub.dev/packages/flutter_map](https://pub.dev/packages/flutter_map) e
  [releases fleaflet/flutter_map](https://github.com/fleaflet/flutter_map/releases).
- **Perfil:** 100% Dart, **sem API key / sem billing**, consome tiles XYZ (raster) e, via
  `vector_map_tiles`, estilos vetoriais MapLibre → **consistência visual com o mapa web**.
- **Trade-off:** sem os serviços nativos do Google (traffic, Places embutido); rotas/ETA vêm de
  backend próprio (OSRM/Valhalla/Routes proxy). Alinha com a **regra de ouro** (base aberta).

**Recomendação padrão de mobile (a confirmar no plano):** `flutter_map` + tiles MapLibre para
paridade com o web e zero billing de exibição; `google_maps_flutter` só se o plano exigir feature
nativa do Google que não temos como replicar. Integrar com o `geolocator` existente e com a fila
de sync **Drift** (dado geo offline entra na fila como os demais domínios).

---

## (e) MapLibre GL + OpenFreeMap — status dos tiles (base web, custo zero)

**Última verificação:** 2026-07-13 · **Fontes:**
[OpenFreeMap Quick Start](https://openfreemap.org/quick_start/),
[GitHub hyperknot/openfreemap](https://github.com/hyperknot/openfreemap),
[MapLibre ❤️ OpenFreeMap (discussão)](https://github.com/maplibre/maplibre-gl-js/discussions/4736).

- **Instância pública OpenFreeMap:** **sem limite** de map views/requisições, **sem API key, sem
  registro, sem cookies**. Custeada por **doações**; **todo o setup é open-source** (sem open-core).
- **MapLibre GL JS:** fork community-driven do Mapbox GL JS, **open-source**, gratuito. Style URL
  de exemplo: `https://tiles.openfreemap.org/styles/liberty`.
- **Risco/mitigação (produção):** a instância pública depende de doações → para produção séria a
  Junta recomenda **self-host** dos tiles OpenFreeMap (stack 100% aberta e documentada) como
  caminho de resiliência e de **baixíssimo lock-in**. Item para o dossiê quando a base de mapa web
  entrar em trilha de produção.

---

## Fontes canônicas (consultar sempre; citar com data)
- `developers.google.com/maps` — docs + release notes + **billing-and-pricing** (tabela viva).
- `developers.google.com/maps/documentation/{geocoding,places,routes}/policies|usage-and-billing`.
- `cloud.google.com/.../maps-platform/terms` — Service Specific Terms (ToS de cache).
- `issuetracker.google.com`, GitHub `googlemaps/*`, `flutter/packages`, Stack Overflow `google-maps*`.
- `status.cloud.google.com` — incidentes.
- `pub.dev/packages/{google_maps_flutter,flutter_map}` — versões/changelog.
- `openfreemap.org` + GitHub `hyperknot/openfreemap`, `maplibre/maplibre-gl-js`.

## Histórico de revisões
- **2026-07-13** — Semeadura inicial (criação da Junta de Mapas). Preços verificados na tabela
  oficial marcada 2026-07-10 UTC; ToS na versão 2025-05-01 (EEA 2025-10-01); Flutter
  `google_maps_flutter` 2.17.1 e `flutter_map` 8.3.0; OpenFreeMap público sem limites.
- **2026-07-13 (J-MAPAS-3 · dev-mapas)** — Paridade do canvas **Google Maps** com o MapLibre
  (operador colorido por status real · pins de chamado por prioridade · legenda circulada).
  **Sem SKU novo:** o único SKU tocado é **Dynamic Maps (Maps JavaScript API)**, já ativo no
  canvas atual; advanced markers e a legenda são **DOM sobre o mesmo map load** — não geram
  chamada de SKU adicional → **custo incremental ≈ US$ 0**. Cota grátis de Dynamic Maps (ver §(a),
  tabela 2026-07-10 UTC) segue cobrindo o volume do piloto. Nenhum geocoding/Places/Routes;
  coordenadas vêm de dados próprios do tenant (sem cache Google, sem `place_id`). Não dispara
  "junta de 5 + PD". Bloco 100% frontend/apresentação (React + CSS + tipos JSX), fallback MapLibre
  sem chave preservado.
