# Ω-PD — Perguntas & Dúvidas resolvidas por pesquisa (RODADA Ω v3)

Regra da dúvida: qualquer dúvida instancia pesquisa web (≥3 fontes) e é registrada aqui **antes** de virar
decisão de junta. Dúvida sem pesquisa = veto.

---

## PD-001 — Existe provedor de mapa de qualidade, sem chave e sem custo, para produção?
**Contexto:** o `GoogleMapsCanvas` cai num placeholder sem `VITE_GOOGLE_MAPS_API_KEY`; queremos mapa real
sem depender de chave/billing.
**Fontes (3):**
- https://openfreemap.org/ — "no API key, no registration, no limit on map views/requests", mantido por doações.
- https://openfreemap.org/quick_start/ — estilos prontos (`positron`, `liberty`, `bright`) e uso direto com MapLibre GL JS; sem autenticação.
- `https://tiles.openfreemap.org/planet` (TileJSON) — template `…/{z}/{x}/{y}.pbf`, schema OpenMapTiles
  (camadas `water`, `transportation`, `building`, `place`, `poi`…), atribuição OSM/OMT embutida.
- https://maplibre.org/ — MapLibre GL JS é o fork open-source (licença BSD) do Mapbox GL JS v1.

**Achado:** SIM — **MapLibre GL + OpenFreeMap**. Tiles vetoriais permitem pintar o estilo nos tokens do DS.
Obrigações: exibir atribuição OSM/OMT; geocodificação (Nominatim) só em dev, 1 req/s + cache.
**Decisão:** J-002 (unânime). Dep `maplibre-gl` pré-aprovada.

---

## PD-002 — Como transformar endereço de OS em lat/lng sem serviço pago?
**Contexto:** OS têm endereço textual mas não coordenada; o mapa precisa de pin do chamado.
**Fontes:**
- https://nominatim.org/release-docs/latest/api/Search/ — geocodificação gratuita do OSM; política de uso:
  máx **1 req/s**, User-Agent identificável, sem uso em massa (bulk) sem cache próprio.
- https://operations.osmfoundation.org/policies/nominatim/ — política de uso aceitável do Nominatim público.

**Achado:** geocodificar **sob demanda** e **cachear** o resultado na própria OS (`lat`, `lng`,
`geocoded_at`, `geocode_source`), respeitando 1 req/s. Em produção de alto volume, trocar por provedor próprio
(pendência declarada). Para o MVP/venda, dev-mode + cache resolve.
**Decisão:** migration aditiva em `work_orders` (colunas nullable) + serviço de geocodificação com cache e
throttle; OS sem coordenada mostram painel "Sem localização".

---

## PD-003 — Política de uso do Nominatim público (implementação Ω1b-2)
**Fontes:**
- https://operations.osmfoundation.org/policies/nominatim/ — Usage Policy: **máx. absoluto 1 req/s**;
  **User-Agent/Referer identificável** obrigatório; **proibido** uso sistemático/bulk no endpoint público
  (banimento de IP); resultados devem ser cacheados.
- https://nominatim.org/release-docs/latest/api/Search/ — endpoint `/search` com `q`, `format=jsonv2`,
  `limit`, `addressdetails`, `countrycodes`; `lat`/`lon` vêm como strings.

**Aplicado no código:** `NominatimGeocoder` com fila serial + `minIntervalMs` (default 1100), cache em processo
(inclui o "não encontrado"), User-Agent por env, `AbortController`+timeout (R3, nunca trava a fila). Factory
gated por `GEOCODING_ENABLED` (default false → `NoopGeocoder`, CI/prod seguros). **Gate de release (R11):** o
`env.ts` REJEITA `GEOCODING_ENABLED=true` + URL pública do Nominatim em `NODE_ENV=production`. Provedor próprio
para alto volume/produção segue como pendência declarada.

---

## PD-INFRA-1 — Qual provedor de deploy para o ERP (Node + Postgres gerenciado + Redis)?
**Contexto (Ω-INFRA-1):** escolher provedor para hospedar backend Node 20/TS + Postgres 16 gerenciado (backup/
PITR) + Redis 7 + frontend Vite estático, multi-tenant, LGPD. Decisão CRÍTICA (serviço externo) → junta de 5
unânime (pré-autorizada por D-SAN-AUTONOMIA). Pesquisa conduzida por `agente-finops` (≥3 fontes por preço/região).

**Matriz (jul/2026) — provedor × critério:**

| Provedor | Custo/mês (stack) | Região BR/LGPD | Postgres PITR nativo | CD via GitHub Actions | Lock-in |
|---|---|---|---|---|---|
| Railway | ~$25→$55 | **NÃO** (US/EU/SEA) | parcial (vol PITR) | bom (railway.json, GHCR) | baixo-médio |
| Render | ~$15→$60 | **NÃO** (US/EU/SG) | **SIM, forte** (WAL, todos pagos) | bom (render.yaml) | baixo-médio |
| **Fly.io** | ~$50→$90 | **SIM — gru (SP)** | moderado-bom (MPG: backup+HA) | bom (fly.toml, OCI) | **o mais baixo** |
| Hetzner+Coolify | ~$8→$30 | **NÃO** (DE/FI/US/SG) | **NÃO** (só dump→S3) | bom (Coolify) | mais baixo (mas você opera tudo) |
| AWS Lightsail | ~$30→$55 | **SIM — sa-east-1** | **SIM** (5min/7d) | bom (aws-actions) | médio |
| AWS ECS+RDS | ~$60→$130 | **SIM — sa-east-1** | **SIM (padrão-ouro)** | excelente | médio (ECS/ALB/VPC/IAM) |

**Nota LGPD (honestidade):** a LGPD **não obriga** dado no Brasil (transf. internacional permitida com salvaguardas,
art. 33) — EU/US são defensáveis. Mas dado-no-país reduz risco jurídico e latência (~10–30 ms de gru vs ~120–200 ms
de US/EU). Por isso a rodada pondera região BR como **plus forte**, não obrigação absoluta.

**Recomendação (pesos: região BR/LGPD + PITR + baixo lock-in co-dominantes; custo desempata):**
- 🥇 **Fly.io (gru/São Paulo)** — única com região BR + menor lock-in (deploy = imagem OCI + `fly.toml`; PG/Redis
  padrão; sair = `pg_dump` + push da mesma imagem). Ponto fraco: piso do MPG Basic ($38) e PITR menos "batido"
  → **exige drill de restore documentado** antes de dado real (fecha com a exigência do PR 7).
- 🥈 **AWS (Lightsail→RDS/ECS)** — região BR (sa-east-1) + PITR padrão-ouro; contra: lock-in médio e maior custo
  de hand-off (VPC/IAM). Fallback quando recuperabilidade do dado financeiro virar prioridade máxima.
- **Reprovados no gate de região:** Railway, Render, Hetzner (sem datacenter BR). Hetzner soma 2º veto (sem PITR
  nativo). **Render seria forte** (PITR excelente, baixo custo) **se a região BR não fosse ponderada** — fica
  como opção caso a junta aceite formalmente salvaguardas de transferência internacional (art. 33) em vez de
  dado-no-país.

**Voto FinOps:** FAVORÁVEL a **Fly.io (gru) 1º / AWS 2º**; CONTRA Railway/Render/Hetzner como principal (gate de
região). Config-as-code do PR 5 será escrita para o vencedor da junta.

**Fronteira externa (hand-off humano, a rodada já sabe):** conta no provedor + cartão/billing + verificação +
domínio/DNS + provisionamento real. Aqui é só a DECISÃO; provisionar é etapa externa posterior (PR 5+).

**Fontes (≥3 por preço/região):** Railway docs.railway.com/reference/pricing/plans + railway.com/pricing +
docs.railway.com/deployments/regions · Render render.com/pricing + render.com/changelog/added-point-in-time-recovery
+ render.com/docs/regions · Fly fly.io/docs/about/pricing + fly.io/docs/mpg + community.fly.io/t/managed-postgres-pricing/25734
· Hetzner hetzner.com/pressroom/new-cx-plans + hetzner.com/cloud + coolify.io/docs · AWS aws.amazon.com/lightsail/pricing
+ instances.vantage.sh/aws/rds/db.t4g.micro + docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-creating-a-database-from-point-in-time-backup.html
· LGPD art. 33 (transferência internacional).

## PD-INFRA-2 — Observabilidade (logs agregados + uptime/alerta) para o stack Node no Fly.io/gru

**Contexto (Ω-INFRA-4):** com o deploy em Fly.io/gru (PD-INFRA-1), escolher observabilidade de MENOR custo
com região BR: logs (o `pino` já é o logger, vai pro stdout) + uptime/alerta de downtime.

**Decisão (2 lentes — `agente-pesquisador-web` + `agente-finops`, ≥3 fontes datadas jul/2026): FICAR NO
NATIVO DA FLY + GitHub Actions cron para uptime. NENHUM serviço externo pago adotado agora** — mesmo padrão
do MapLibre nos mapas (recurso nativo/aberto entrega o MVP sem cartão, sem novo sub-processador LGPD, sem
lock-in). Por isso a **junta-5-por-serviço-externo-pago NÃO dispara** neste PR (nada é contratado).

| Opção | Custo | Região BR | Retenção log | Alerta | Decisão |
|---|---|---|---|---|---|
| **Fly-native** (managed Prometheus ~15d + managed Grafana c/ alerting + live-tail logs) | **US$0** (fonte oficial: "no additional charge for the managed Prometheus and Grafana") | **Sim** (gru/SP) | ~7-15d | Grafana alerting | **ADOTADO (logs+métricas)** |
| **GitHub Actions cron** (`uptime-check.yml` → GET /health) | **US$0** enquanto o repo for **PÚBLICO** (minutos ilimitados) | n/a (probe externo) | n/a | run vermelho → notificação nativa | **ADOTADO (uptime)** |
| Better Stack (Logtail+Uptime) | free 10 monitores/30s | ❌ (EU) | free tier | email/Telegram/webhook + status page | **UPGRADE não adotado** |
| Axiom | free 500GB/30d | ❌ (US/EU) | 30d free | via integrações | **UPGRADE não adotado** |

**Correção honesta (achado do crítico):** o US$0 do uptime cron vem de o repositório ser **PÚBLICO**
(minutos de Actions ilimitados) — **não** de "free tier privado de 2.000 min" (a cadência `*/5` × 2 jobs ≈
17.000 min/mês estouraria o tier privado). **Gatilho de reabertura:** se o repo virar **privado**, o cron
`*/5` passa a custar (~US$120/mês a 5-min) → reduzir cadência ou migrar para monitor sintético.

**Upgrades documentados (só com junta-5 unânime + PD + avaliação de residência BR/LGPD do dado exportado):**
UPGRADE-A retenção/busca longa de log → **Axiom** (500GB/30d free, mas dado sai do BR — art. 33);
UPGRADE-B uptime multi-PoP + status page + on-call → **Better Stack**. **Gatilhos:** log > ~3-5 GB/mês
sustentado, retenção de auditoria > 30d, ou status page pública/on-call formal.

**Limitações aceitas para o MVP (registradas no dossiê de ativação):** o cron do Actions atrasa/pula sob
carga (não é sub-minuto nem multi-PoP); o alerta nativo não tem on-call/ACK/escalonamento; o schedule
auto-desabilita após 60d sem atividade no repo (confirmar vivo). Fly-native logs/métricas são **hand-off de
ativação** (não wired neste PR — este PR entrega BACKUP + UPTIME-PROBE, não a stack de observabilidade completa).

**Fontes (jul/2026):** fly.io/docs/monitoring/logging-overview · fly.io/docs/monitoring/metrics
("Prometheus retains ~15 days"; "no additional charge for managed Prometheus and Grafana") ·
community.fly.io/t/metrics-logs-cost/20061 (staff: custo nativo US$0 hoje) · github.com/superfly/fly-log-shipper.

---

## PD-004 — Como implementar gráficos temporais (série no tempo) em ERP React+TS+Vite de bundle enxuto? (2026-07-19)

Decisão de dependência (WS-UI-CARDS+CHARTS). Pesquisa `agente-pesquisador-web`, ≥5 fontes datadas 2025-2026.

**Decisão:** para o pedido do dono (gráfico temporal em cards/pop-ups de KPI) usar **SVG inline ZERO-DEP** (componente
interno `<TrendChart>`/`<Sparkline>`: linha/área/barra + tooltip simples via `<title>`). NÃO adicionar lib de gráfico agora.
Reservar **Recharts v3** (MIT, SVG, TS-first, a11y default-on, só submódulos D3) via **lazy-load** SÓ quando existir um
dashboard analítico rico de verdade (múltiplas séries, brush/zoom, legenda navegável).

**Comparativo (fatos com fonte):** Recharts ~50-140KB (líder React, a11y default-on v3); Chart.js ~106KB (Canvas);
visx ~15KB (D3, manutenção amarela — v3.12 nov/2024); Nivo ~500KB+ (D3 pesado); ECharts ~100KB tree-shaken (Canvas,
Apache-2.0); uPlot ~45KB (Canvas, low-level); Tremor ~200KB (exige Tailwind, embute Recharts). Inline SVG: ~0KB, controle
total, limites conhecidos (sem tooltip/eixo/zoom ricos — suficiente p/ sparkline/tendência de KPI).

**Descartados p/ este ERP:** Canvas (Chart.js/ECharts/uPlot) dificulta fidelidade token do DS; Nivo D3 pesado; Tremor exige
Tailwind (não temos); visx manutenção. Repo hoje só tem `lucide-react` + `maplibre-gl` (bundle enxuto = valor).

**Consequência de governança:** como NÃO há dependência nova, WS-UI-CHARTS deixou de ser decisão crítica → dispensou a
junta-5 unânime (§C7.1); virou bloco normal.

**Fontes:** github.com/recharts/recharts (+wiki accessibility); blog.logrocket.com/best-react-chart-libraries-2026;
pkgpulse.com (bundles); usedatabrain.com + chartts.com (ranking a11y MUI X>Recharts>ECharts>Chart.js…); github.com/leeoniya/uplot;
airbnb/visx discussion #1908; echartsforreact.com tree-shaking; dev.to sparkline + mui.com/x/react-charts/sparkline (padrão inline SVG).

---

## PD-005 — Layout do Mapa Operacional quando o MAPA é o herói (feedback do dono: mapa espremido) (2026-07-19)

Contexto: o redesign M-1 pôs grid de 3 colunas [chamados | mapa | técnicos] e o mapa virou a coluna estreita do meio
(~524px/45% a 1440px — o dono pediu altura mas perdeu largura). Objetivo: mapa dominante (largura E altura) mantendo
chamados+SLA, técnicos+status, alerta de OS nova, maximizar (lista translúcida no 4º quadrante) e legenda no rodapé.
Stack fixa: MapLibre GL + OpenFreeMap (sem provider novo, sem SKU, US$ 0 → não dispara junta-5).

Achado (junta de 3 pesquisas web ≥4 fontes 2024-2026): sistemas reais NÃO usam 3 colunas. Padrão = mapa full-bleed + UM
painel master colapsável (chamados) + detalhe em drawer/popover SOBRE o mapa; técnicos e chamados como MARCADORES no mapa
(cor/status), não coluna. Overlays translúcidos (glass) preservam o mapa; alerta de evento novo = toast + pin pulsante +
badge (Uber usa camada de foco que esmaece as demais). Proporção: mapa ~70-80% da largura; painel ~300-360px colapsável a ~56px.

Decisão: (1) matar o grid 3 colunas — mapa full-bleed 100% da largura útil; (2) chamados = rail de vidro navy à esquerda
ABERTO por default, colapsável; (3) técnicos = marcadores no mapa + rail de vidro à direita COLAPSADO por default; (4) alerta
via SSE = toast + pin pulsante + badge; (5) maximizar = stage fixed inset:0 + card glass no 4º quadrante (setPadding do
MapLibre evita pin oculto); (6) legenda no rodapé glass. Crítico: chamar map.resize() ~220ms após colapsar/maximizar.
Plano de implementação: agent-orchestration/omega/mapas/J-MAPAS-6-LAYOUT-redesign.md.

Fontes: Samsara KB Fleet Overview (lista à esquerda + preview do motorista sobre o mapa); ServiceTitan Dispatch Map 2.0
(técnicos/visitas como marcadores color-coded, filtros à esquerda); Onfleet Map & Sidebar (mapa/sidebar como abas + interação
no mapa); Uber "Scalable Map Interface" + system design (camada de foco no evento novo + serviço de notificação); Hicron +
heavyvehicleinspection (fleet dashboard = mapa central + 1 painel colapsável com badge); maplibre-glass-css + MapLibre docs
(painéis frosted-glass + center-offset/setPadding); Pencil&Paper UX dashboards (drawer preserva contexto espacial); Limo
Anywhere New Dispatch Grid (mapa colapsável toggle mapa↔lista).

---

## PD-006 — Alocação/despacho de técnico no Mapa (UX + distância/ETA) (2026-07-19)

Contexto: feedback do dono (itens D/E do Mapa) — rail esq. (chamados) → click abre detalhe + "Alocar técnico" com filtros
(disponível/distância/índice de conclusão); rail dir. (técnicos) → lista por linha + hover(localização/status) + click(popup +
seletor de chamado + distância/tempo previsto + alocar). Stack MapLibre+OpenFreeMap / Google JS (espelho), US$0 na Fase 1.

**UX (≥5 fontes 2024-2026 — Onfleet/Samsara/ServiceTitan/Verizon/Bringg/NetSuite):** sistemas reais NÃO usam modal cheio que
tapa o mapa. Detalhe leve = POPOVER ancorado ao pin/linha. Escolha do técnico = LISTA RANQUEADA (drawer lateral) por proximidade,
com DISTÂNCIA+ETA+disponibilidade por linha (Verizon "ordered by proximity"; Samsara mostra distância+tempo+disponibilidade;
Onfleet closest-driver; Bringg recommended Fastest/Cheapest). Ordenação = "melhor match" (disponível+próximo, desempate por
índice/rating) — "nearest available ≠ right tech" + skill. Técnicos como LINHAS color-coded; HOVER→tooltip skills/status/frescor
+ realça o pin; CLICK→popover com ações (ServiceTitan). Fluxo reverso (técnico→chamado→distância/ETA→alocar) = Samsara "Dispatch
a vehicle here". Fontes: onfleet.com/assignment-and-dispatching · fleet-help.verizonconnect.com (Dispatch Job Dialog) ·
kb.samsara.com (Dispatch a Vehicle) · help.servicetitan.com (Daily Dispatch Board) · help.bringg.com (Assign a Driver) ·
netsuite.com/dispatch-tips · eleken.co/map-ui-design.

**DISTÂNCIA/ETA (docs oficiais Google Pricing pág. 15/jul/2026):** haversine (linha reta) = client-side, erro ~0,3-0,5%,
US$0, sem ToS, LGPD (nada de coord em log) — basta p/ ordenar por proximidade e mostrar "~X km". ETA/distância POR ROTA tem
custo/infra: Google Routes Compute Route Matrix Pro/traffic-aware grátis 5k/mês depois **US$10/1000 elementos** (Essentials
US$5, Enterprise US$15); ToS PROÍBE cachear ETA (só lat/lng 30 dias) → não dá p/ pré-computar. OSRM/Valhalla self-host = grátis
mas infra ~US$1-3k/mês AWS + drill de restore. ORS hospedado grátis 2500/dia mas exporta coordenada (art.33 LGPD). **Decisão:**
Fase 1 = haversine "~X km (linha reta)" + tempo "~Y min (estimado, sem trânsito)" (dist÷~28km/h + disclaimer) — honesto,
completo, US$0, sem dep. ETA por rota real = **junta-5 + PD** (Fase 2, só se o dono quiser). Revalidar preço por WebFetch no dia do PR de Fase 2.

---

## PD-007 — Como desenhar a fila e o detalhe de "Aprovações" de OS num ERP multi-tenant de field service? (2026-07-21)

Contexto: a tela de Aprovações é uma FILA INTERNA de decisão (aprovador da organização decidindo despesa/desconto/
orçamento/compra/cancelamento ligado a OS, sob APPROVAL_LIMITS.md + RBAC). Dúvida: quais colunas/ações/estados usar; se
recusa exige motivo; se há aprovação em lote; como sinalizar SLA/atraso. Pesquisa `agente-pesquisador-web`, ≥3 fontes
independentes (docs oficiais > líderes de domínio > fórum). Método pedido pelo dono (agentes com pesquisa/concorrentes).

Achado (o análogo correto é aprovação INTERNA — ServiceTitan AP + SAP FSM — NÃO a aprovação do CLIENTE de
Jobber/Housecall/ServiceMax):
- Roteamento por ALÇADA/threshold com N níveis sequenciais (auto-aprova abaixo de X; escala acima) — ServiceTitan
  (<US$100 auto; Controller→CFO >US$10k), SAP (margem <X%), matriz DOA (autoridade no PAPEL, 3-4 níveis).
- MOTIVO OBRIGATÓRIO na recusa/devolução — ServiceTitan ("required comment"); a falta disso é a dor nº1 da comunidade
  Salesforce (resolvida na marra com campo obrigatório/LWC).
- Badge de IDADE/SLA + 2 lembretes + escalonamento automático ao estourar (Precoro/Cway/Cflow); fila ACIONÁVEL (ServiceTitan
  Production Queue), não lista morta. Lote com guard-rails (mesmo tipo, baixo risco, dentro da alçada) + Undo (Eleken).

**Restrição de HONESTIDADE (D-007) — recon do repo:** o DTO real de aprovação (`approval.controller.ts toApprovalDto`)
expõe SÓ: id, entity_type, entity_id, work_order_id, status, requested_by (UUID, sem nome), requested_at, pending_reason,
decided_by, decided_at, note, reason, safe_message. **NÃO existe** valor em R$, código APR, threshold/alçada numérica
(APPROVAL_LIMITS.md é só principiológico, sem número), centro de custo, itens, nem trilha multi-passo. O repo é in-memory e
só há endpoint de PENDENTES (sem histórico de aprovadas/recusadas).

Decisão (o que o WIRING entrega AGORA, honesto, US$0): ligar as 2 telas casca ao endpoint real com os 13 campos do DTO —
fila = [tipo (entityTypeLabel) · solicitante · OS (link) · status · pending_reason · **idade "Pendente há X"** de requested_at]
+ ações Aprovar / Recusar (motivo OBRIGATÓRIO, 400 sem ele) gated (paridade com o ApprovalPanel já vivo); detalhe lê
:approvalId; estados §7; audit-log real. REMOVER todo o mock fabricado (valor/alçada/threshold/centro-de-custo/trilha/tabs
de histórico). O "badge de idade" é honesto (tempo decorrido real de requested_at, como o SLA-proxy do mapa), NÃO um deadline.

Futuro (precisa de BACKEND novo → bloco próprio, não fabricar agora): valor/threshold por alçada (exige campo de valor +
regra numérica em APPROVAL_LIMITS + migration); histórico aprovadas/recusadas (persistência); lote com guard-rails;
SLA/escalonamento (worker interno); notificação/aprovação por e-mail/push (canal de notificação — se não existir, junta+PD);
resolução de nome do solicitante (requested_by hoje é UUID). Gap RBAC pré-existente: gate de UI usa `work_orders:approve`
(ausente do catálogo) → reduz-se a `cancel`; finance/inventory (approval-by-policy na matriz) não têm update/cancel →
registrar para reconciliação futura (fora do escopo do wiring).

Fontes: help.servicetitan.com (AP Approval Workflows + Production Queue) · help.sap.com (FSM request-approval + S/4HANA
flexible workflow) · trailhead.salesforce.com (rejection reason — dor da comunidade) · help.getjobber.com (Quote Approvals)
· help.housecallpro.com (Estimates approvals) · support.ptc.com ServiceMax + twopirconsulting.com · tallyfy.com
(approval-limits-matrix + delegation-of-authority) · moxo.com + tipalti.com (approval matrix) · eleken.co (bulk actions UX)
· precoro.com + cwaysoftware.com (approval SLA) · netsuite.com + reachoutsuite.com (FSM pain points).

---

## PD-Ω5P-NOTIF-SEND — Envio REAL das notificações legais (SNE/postal/edital/DJE) DIFERIDO Ω6 (informativo)

Rodada Ω5P · PR-09 (trilha de notificações legais I6) · 2026-07-27 · **NÃO dispara junta-5** (PR-09 não integra/chama
serviço externo — só registra o rito internamente).

Contexto: a Res. CONTRAN 1025/2026 (arts. 15/26) + CTB art. 328 + Lei 14.133/2021 (edital ≥15 d.u.) + Lei 14.440/2022
(SNE exclusivo a partir de 2027) definem O QUE notificar e QUANDO. PR-09 MATERIALIZA a trilha de forma auditável — marca
cada notificação como DEVIDA no vencimento (t0 + prazo do perfil), registra a EMISSÃO/DISPENSA (ato manual) e encadeia
cada marco na cadeia hash I2 (CustodyEvent NOTIFICATION). NÃO faz o **envio efetivo** ao destinatário.

Decisão: o **envio real** (integração ao SNE/plataforma postal/publicação de edital em DOU-DJE) fica **DIFERIDO à Ω6**
(§11 do ESTUDO + D-Ω5P-05). O campo `channel` (POSTAL|SNE|EDICT|IN_PERSON) já parametriza o meio, e `issued_at` carimba
o registro de emissão — o adapter de envio (quando existir) preenche/valida esses campos. Por que NÃO agora: (1) exige
credencial/contrato com serviço externo (SNE gov / correios / diário oficial) — fora do MVP US$0; (2) o SNE exclusivo só
vale a partir de 2027 (Lei 14.440/2022) — canal mantido parametrizado; (3) PR-09 entrega o que é imprescindível ao rito
probatório (trilha DEVIDO→ISSUED/WAIVED tamper-evident + predicado `isNotificationTrailComplete`) sem depender do canal.

Por que NÃO é junta-5: PR-09 **não chama nenhum serviço externo tarifado/pago nem contrata credencial** — apenas registra
o rito administrativo internamente. Quando a integração de ENVIO for construída (Ω6), aí sim dispara a junta-de-5 +
possível PD de custo/credencial (política D-SAN-AUTONOMIA §1: chamada a serviço externo tarifado = decisão crítica unânime).

Escopo do que PR-09 entrega vs. difere: ENTREGA = `ProcessNotification` (projeção) + motor de prazos puro
(`computeNotificationSchedule`/`isNotificationTrailComplete`) + sweep `impound.notify-due` (marcação DEVIDA idempotente/
fail-closed/DST-imune) + `appendNotificationEventTx` (cadeia I2 + cross-anchor) + rotas GET/issue/waive (`impound:read`/
`impound:notify`). DIFERE = envio real ao destinatário; a APLICAÇÃO do bloqueio de leilão sem trilha completa (guarda das
arestas AUCTION_PREP→LOTTED→AUCTIONED = PR-12/13, que consomem `isNotificationTrailComplete` + `verifyChain.valid`); o
edital de leilão ≥15 d.u. e a janela "acessível ≥10 dias" (relativos à DATA do certame — gate de leilão, não do t0).

## PD-Ω5P-SIGN — Assinatura eletrônica do EDITAL/leilão de veículos apreendidos exige ICP-Brasil no sistema de pátio? (2026-07-27)

Rodada Ω5P · PR-13 (realização do leilão) · **RESOLVIDO — NÃO dispara junta-5** (PR-13 não integra/chama serviço de assinatura externo — só registra a REFERÊNCIA do edital publicado fora). Pesquisa ≥5 fontes oficiais/jurídicas (regra da dúvida, D-SAN-AUTONOMIA §C7.3).

Contexto: decidir se o PR-13 modela o leilão SEM chamar serviço de assinatura pago (registrando só a referência do edital publicado externamente pelo leiloeiro/órgão), ou se PRECISA integrar assinatura ICP-Brasil (o que dispararia junta-5 + dono).

Achado:
1. A assinatura eletrônica exigida pela Res. CONTRAN 1025/2026 recai sobre a NOTA DE LEILÃO assinada pelo ARREMATANTE (art. 34 §2 — "avançada OU qualificada"), NÃO sobre o edital nem sobre o sistema de pátio.
2. Leilão conduzido por LEILOEIRO administrativo/oficial (art. 29) em PLATAFORMA HOMOLOGADA contratada pelo centro de custódia (art. 32); o leiloeiro registra leilão+docs no Sivec (art. 34). Edital e publicação são do órgão/leiloeiro, FORA do sistema de pátio.
3. Edital = regime de PUBLICIDADE (não de assinatura qualificada): Lei 14.133/2021 art. 54 (inteiro teor no PNCP + extrato no diário oficial + jornal; PNCP supre o diário salvo exigência expressa); Res. 1025 art. 31 (≥15 dias úteis, ampla publicidade); CTB art. 328/Lei 13.160/2015. Integridade vem da cadeia de publicação (Imprensa Nacional/PNCP, MP 2.200-2), não do pátio.
4. Lei 14.063/2020 art. 5: QUALIFICADA (ICP-Brasil) obrigatória SÓ (§2) para atos de Chefe de Poder/Ministro/titular de órgão constitucionalmente autônomo. Avançada gov.br (prata/ouro) = GRATUITA; ICP-Brasil (A1/A3) = paga + credencial externa. O art. 34 §2 admite expressamente avançada → ICP-Brasil não é imposta.

DECISÃO: OPÇÃO (A). PR-13 modela o leilão registrando a REFERÊNCIA do edital externo (nº, plataforma homologada, data, URL de publicação PNCP/diário, leiloeiro) + designação + resultado do certame — SEM serviço de assinatura pago. Assinatura/publicação = responsabilidade do leiloeiro/órgão, fora do sistema (mesmo padrão do pagamento manual e dos adapters diferidos SNE/Sivec de [[PD-Ω5P-NOTIF-SEND]]). NÃO dispara junta-5 (D-SAN-AUTONOMIA §1: nenhum serviço externo tarifado é contratado/chamado). Guard-rail: manter `edital_ref/channel` parametrizado para um adapter futuro de assinatura/publicação (Ω6) preencher/validar sem retrabalho.

REQUISITO herdado do PR-12 (R-omega5p-pr12-ciclo1): a reclassificação a DIRECT_RECYCLING (sucata) fica gated no AUCTION_EDICT emitido/registrado por rodada (≥15 d.u.) — o edital registrado (referência) é a prova de que um certame real foi designado antes de contar um strike DESERTED.

Reabertura → Ω6: só se o sistema de pátio for designado como a própria plataforma homologada (art. 32) emitindo a nota de leilão; ainda assim a avançada gov.br (gratuita) basta pelo art. 34 §2 — ICP-Brasil paga só por exigência específica do órgão (aí dispara junta-5 + dono).

Fontes: Res. CONTRAN 1025/2026 PDF oficial gov.br (arts. 29/31/32/34§2, 26/06/2026); CTB art.328/Lei 13.160/2015 (Planalto); Lei 14.133/2021 art.54 (TCU/TCE-SP); Lei 14.063/2020 art.5 (normas.leg.br/Planalto); gov.br Governo Digital (assinatura avançada gratuita).

## PD-Ω5P-CASCADE-ORDER — ordem exata da cascata de liquidação do art.328 §6º CTB (2026-07-27)

Rodada Ω5P · PR-14 (liquidação I7) · **RESOLVIDO — NÃO dispara junta-5** (nenhum serviço externo). Pesquisa ≥3 fontes primárias (regra da dúvida, D-SAN-AUTONOMIA §C7.3), pois o ESTUDO §2.1/§6 resume a ordem sem um tier.

Contexto: a distribuição do produto do leilão (I7) exige a ORDEM LEGAL exata dos beneficiários; o ESTUDO omite um tier.

Ordem confirmada (CTB art.328 §6º, Lei 13.160/2015): do TOPO **(0) custeio do leilão** (rateio proporcional ao valor de arrematação entre os veículos). Do remanescente, na ordem: **I** despesas de remoção e estada (custódia) · **II** tributos vinculados ao veículo · **III** créditos preferenciais (trabalhistas/tributários/garantia real — CTN art.186) · **IV** multas do órgão realizador do leilão · **V** demais multas do SNT em ordem cronológica · **VI** demais débitos por preferência legal. §12: o **saldo remanescente** vai a conta específica, o ex-proprietário é notificado em ≤30 dias e o saldo fica disponível por 5 anos; após, reverte ao Funset (art.320).

DIVERGÊNCIA registrada (não consolidar em silêncio): o ESTUDO_SIGPRV_PATIOS.md §2.1/§6 resume a cascata SEM o tier **II (tributos vinculados ao veículo)** como classe distinta. O estatuto o separa. **PR-14 adota a ordem confirmada acima** (com o tier II). beneficiary_kind: AUCTION_COST/REMOVAL_STORAGE/VEHICLE_TAXES/PRIORITY_CREDITORS/REALIZING_AGENCY_FINES/OTHER_SNT_FINES/OTHER_DEBITS/OWNER_BALANCE/FUNSET.

Decisão anti-dupla-contagem: os tiers de multa/tributo/credor são CLAIMS DECLARADOS no PR-14 (não derivados do módulo `fines` do Ω4C — float `valor:number` + keyed por vehicleId, e ImpoundProcess não tem FK ao Vehicle). O tier I (remoção/estada) é COMPUTADO pelo charging, CAPADO ao teto I4/CTB §10 (getCascadeExpenseClaim = settledTotal − Σ dailies sobre-acumuladas) — as dailies sobre-acumuladas (freeze retroativo) NÃO inflam o claim contra o saldo do ex-dono. A cascata NÃO escreve no ledger process_charges (AUCTION_CLOSED e RELEASED são terminais mutuamente exclusivos — o dono-paga via charging:settle nunca coexiste com a cascata do não-reclamado).

Fontes: CTB art.328 §6º/§12 — ctbdigital.com.br/comentario/comentario328/ ; jusbrasil.com.br (§6 art.328 Lei 9503/1997) ; modeloinicial.com.br/lei/CTB art-328. Base normativa Lei 13.160/2015; Funset art.320.

---

## PD-Ω5P-ANTIBOT — Anti-abuso do portal público SEM credencial/serviço externo é viável para o MVP?

Rodada Ω5P · Fase 5 (portais isolados, PR-16) · **RESOLVIDO — NÃO dispara junta-5 nem parada-para-o-dono no CÓDIGO** (nenhum serviço externo/credencial no anti-bot escolhido). Pesquisa ≥3 fontes (regra da dúvida, D-SAN-AUTONOMIA §C7.3), pois o portal exige CAPTCHA/anti-bot e um provedor gerenciado cruzaria a fronteira.

**Contexto:** a consulta pública placa+Renavam do owner-portal precisa de anti-enumeração + rate-limit + anti-bot (visão do dono). CAPTCHA de provedor gerenciado (reCAPTCHA/hCaptcha/Cloudflare Turnstile) exige conta/credencial externa → junta-5 unânime + parada-para-o-dono (D-SAN-AUTONOMIA). Pergunta: existe caminho robusto SEM credencial externa para o MVP?

**Achado / decisão:** **SIM — caminho sem credencial existe e é o adotado na Fase 5.** Anti-bot = **proof-of-work SHA-256 estilo Altcha reimplementado à mão com `node:crypto`** (challenge assinado server-side, resolvido no Web Worker do PWA, dificuldade progressiva pelo histórico de falhas) + **rate-limit token-bucket in-process** (por IP e por fingerprint de placa) + **resposta uniforme/tempo-constante** (OWASP: sucesso ≡ falha, `crypto.timingSafeEqual` no 2º fator). Tudo **zero-dep, zero-conta**, coerente com a cultura da casa (SVG-charts, scheduler in-process — todos zero-dep). **NÃO** adotar a biblioteca Altcha/mCaptcha como dependência (seria "dependência nova" → junta-5); reimplementar o algoritmo SHA-256 (trivial) evita esse gate. Provedor gerenciado (reCAPTCHA/Turnstile/hCaptcha) e portal nacional multi-tenant **deferidos a Ω6** (aí sim junta-5 + credencial).

**Fronteira de parada (clara):** (1) o anti-bot NÃO é parada — PR-16 procede autônomo. (2) É parada-para-o-dono só no **DEPLOY** (domínios públicos + TLS + hosting da superfície pública) — território de credencial/domínio externo e ativação de produção (fronteira humana, como a ativação cloud das rodadas anteriores). Todo o código/BFF/segurança/CI é construído e validado sem isso; a ativação fica como item de handoff ao dono ao fim da fase. (3) Deferido a Ω6: CAPTCHA gerenciado + portal nacional multi-tenant.

Fontes: Altcha (PoW self-hosted, MIT, no external calls) — github.com/altcha-org/altcha e altcha.org ; mCaptcha (PoW SHA-256 self-hosted, AGPL) — mcaptcha.org e github.com/mCaptcha/mCaptcha ; OWASP API4:2023 Unrestricted Resource Consumption (resposta padronizada + rate-limit por identidade/IP) — owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/ ; token-bucket zero-dep em Node/Express — oneuptime.com/blog/post/2026-01-25-token-bucket-rate-limiting-nodejs.

---

## PD-Ω5P-FOTOS — servir fotos de evidência ao proprietário (minimização + marca-d'água) sem dependência nova?

Rodada Ω5P · Fase 5 (PR-17) · **RESOLVIDO com CORTE** — o dossiê (PR-17) procede autônomo ZERO-dep; as FOTOS viram PR-17b (dependência nova = junta-5 unânime + esta PD; NÃO é parada-humana). Pesquisa ≥3 fontes (regra da dúvida).

**Contexto:** o owner-PWA deve mostrar as fotos da vistoria de recepção ao proprietário, MINIMIZADAS (resolução reduzida) + com MARCA-D'ÁGUA, §2.8 (nunca storage_key/bucket/URL assinada). Recon: não há variante thumbnail no storage (só full-res, `attachment.storage.ts:196` stream); NENHUMA lib de imagem no package.json.

**Achado (3 opções avaliadas):** (A) thumbnail pré-existente = INVIÁVEL (não existe). (B) minimização CLIENT-SIDE (canvas) = **INACEITÁVEL** — para redimensionar no browser o full-res precisa ser baixado inteiro primeiro (visível em DevTools/Network; a marca-d'água como overlay de DOM é removível e a imagem subjacente fica limpa) → NÃO minimiza, VAZA (LGPD art.6 / ESTUDO §7). (C) minimização SERVER-SIDE (jimp JS-puro ou sharp nativo) + marca-d'água assada nos pixels = correto, MAS ambos são **dependência NOVA** ⇒ D-SAN-AUTONOMIA §C7.1 junta-5 unânime + PD (dependência nova NÃO é parada-humana; só serviço pago/credencial é). Decodificar imagem em endpoint PÚBLICO é superfície de ataque própria (decompression-bomb) que merece revisão secops dedicada + cap de dimensão/bytes/timeout.

**Decisão (menor risco entregando valor):** CORTE em 2 fatias. **PR-17** (ZERO dep): dossiê completo (status/pátio/débitos itemizados/prazos/documentos exigidos) + solicitar liberação; fotos = placeholder honesto ("disponíveis mediante solicitação/no balcão, conforme LGPD"), nenhum byte de foto sai. **PR-17b** (gated): fotos minimizadas server-side (jimp JS-puro preferido — zero binário nativo, bom p/ Win dev + CI Linux + container) + marca-d'água nos pixels + proxy-stream por ref opaca da sessão → **junta-5 unânime + esta PD** (secops+avaliador+critico+coordenador + finops/dba pela derivação/cache/decode). **D-Ω5P-PR17-SPLIT** registra a divergência do PLANO (que punha fotos no PR-17) — não consolidar em silêncio (A2).

**Achado §2.8 para backlog (fora do escopo):** o DTO do console autenticado `toInspectionPhotoDto` (impound.intake.dto.ts:44) expõe `fileUrl = s3://bucket/key` — o owner-portal JAMAIS o reusa; candidato a D-record do time do console.

Fontes: client-side canvas baixa o full-res antes (medium.com/weekly-webtips how-to-resize-an-image-using-client-side-javascript-and-html5-canvas ; minipx.com/blog/client-side-image-compression-javascript) ; jimp (JS puro) vs sharp (libvips nativo) — reintech.io/blog/nodejs-image-processing-sharp-jimp-imagemagick ; npm-compare.com/image-size,jimp,pica,sharp.

---

## PD-Ω5P-AUTH-SCRYPT — hashing de senha da credencial da autoridade sem dependência nova?

Rodada Ω5P · Fase 5 (PR-18a) · **RESOLVIDO — NÃO dispara junta-5** (node:crypto scrypt é built-in, zero dep). Pesquisa ≥3 fontes (regra da dúvida).

**Contexto:** o authority-portal precisa de um login com senha (a autoridade é persona credenciada recorrente, ≠ posse do owner ≠ User do ERP). Hashing de senha exige um KDF resistente. bcrypt/argon2 NÃO estão no repo → seriam dependência nova (= junta-5 unânime, D-SAN-AUTONOMIA §C7.1). Pergunta: há caminho zero-dep?

**Achado/decisão:** **SIM — `crypto.scrypt` do node:crypto (built-in) com parâmetros OWASP.** scrypt é KDF de custo de memória, recomendado pela OWASP como alternativa quando argon2id não está disponível. Parâmetros: **N=2^17, r=8, p=1, keylen=32** (OWASP Password Storage Cheat Sheet). **GOTCHA crítico:** N=2^17·r=8 ≈ 128 MB excede o `maxmem` default (~32 MB) do Node → passar `maxmem` explícito ≥256 MB, senão o scrypt lança. Salt 16B por-hash (`randomBytes`); formato self-describing `scrypt$N$r$p$<saltB64>$<hashB64>`; verificação em TEMPO CONSTANTE (`timingSafeEqual` sobre os 32B derivados). argon2id seria o ideal, mas scrypt é o substituto zero-dep aprovado — o provedor gerenciado/argon2 fica para Ω6 se o dono quiser (aí junta-5 + dep). Registrado em D-Ω5P-AUTH-02.

Fontes: OWASP Password Storage Cheat Sheet (scrypt N=2^17/r=8/p=1) — cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html e github.com/OWASP/CheatSheetSeries (Password_Storage_Cheat_Sheet.md) ; comparativo Argon2/bcrypt/scrypt/PBKDF2 — guptadeepak.com/the-complete-guide-to-password-hashing ; node:crypto scrypt docs (maxmem default).

---

## PD-O6R-B01-ISOLAMENTO — estado da arte do isolamento de suites paralelas contra PostgreSQL (2026-08-18)

Rodada Ω6R · B-O6R-01 · **ciclo 3 (§C7.4): reabertura de premissa pelo crítico.** Pesquisa ≥5 fontes exigida
pela regra da dúvida (§C7.3) — registrada **antes** da conclusão. Dois ciclos trataram o problema como
sincronização (o ciclo 2 acrescentou `pg_advisory_xact_lock`; a junta vetou porque o lock não alcança todo
escritor). A pergunta que ninguém fez: **suítes que criam role, escrevem catálogo e rodam um statement sem
cláusula de escopo deveriam estar num lote paralelo contra UM banco compartilhado?**

### 1. O que eu MEDI (execução própria, nesta máquina, 2026-08-18/19)

Ambiente: Windows 11, Node **20.19.5**, `os.availableParallelism() = 8`, PostgreSQL **16.14** (contêiner
local), base de desenvolvimento do dono (294 organizações, 274 usuários, 81 roles não-sistema). Forma
reproduzida: bloco `env:` do job `backend-postgres`, `pipefail` + `tee`, exit lido de `PIPESTATUS[0]`.

**M1 · `node --test` roda ARQUIVOS em paralelo, e o teto é o hardware.** 6 arquivos-fixture de 1,5 s →
6 PIDs distintos, todos iniciados dentro de 74 ms, `duration_ms 2252`. Com 24 arquivos: 4 ondas, teto
**7 = `availableParallelism() - 1`**. O teto **não está fixado** em `.github/workflows/ci.yml` nem em
`scripts/run-backend-tests.mjs`. (A doc do Node descreve o default `false` da API `run()`; o **CLI não segue
isso** — medido, não lido.)

**M2 · Não reproduzi o vermelho: 12/12 VERDE** no lote dos 23, denominador constante em **145** (bate com o
da cadeira). A cadeira mediu 4/12 vermelho; o orquestrador, 1/4. **Verde é ausência de evidência** — isto não
refuta o veto. Prova outra coisa: o mesmo commit, na mesma forma, dá 4/12 numa medição e 0/12 noutra.

**M3 · A prova determinística, que dispensa vermelho.** Sonda **somente-leitura** executando APENAS o SELECT
do CTE `missing` do backfill (sem os INSERTs), amostrando a 15 ms, classificando o alvo por dono:

| arranjo | amostras | instantes com linha de TERCEIRO | pico | donos atingidos |
|---|---|---|---|---|
| lote dos 23 (job `backend-postgres`) | 6659 | **2589 — 38,9 %** | 22 linhas, **100 % de terceiros** | `anon-*`, `org-b-*`, `role-authority-db-*` |
| suíte inteira, 246 arquivos (job `backend`) | 9206 | **934 — 10,1 %** | 16 linhas, **100 % de terceiros** | ≥8 suítes: `rls-tenant-*`, `checklist-db-*`, `anon-*`, `sess-*`, `notif-*`, `chg-*`, `chk-run-conc-*`, `chk-lifecycle-*` |

"Escreve fora do próprio escopo" deixa de ser inferência sobre um vermelho ocasional: **é o conjunto-alvo do
statement, medido.**

**M4 · O dano não é flake — é permanente e monotônico.** `auth_identity_link_events` na base do dono:
**508 linhas, 231 (45,5 %) apontam para organização que não existe mais, e as 231 são `event='backfill'`** —
zero de `religacao`/`desvinculo`. Na janela de 1 h que contém as 12 rodadas: **12 linhas criadas, 12 órfãs
(100 %)** ⇒ ≈1 linha indelével por rodada. A tabela é append-only por trigger (UPDATE/DELETE/TRUNCATE):
**nenhum teardown conserta, por desenho.** O artefato que o bloco criou para ser inviolável está 45 %
preenchido por escrita fora de escopo.

**M5 · TERCEIRA causa, independente, que ninguém mediu — e que é ANTERIOR ao B-O6R-01.**
`tests/checklist-applicability-prisma-db.test.ts:355/373` executa
`ALTER TABLE checklist_applicability_rules RENAME COLUMN notes TO notes_tmp` (e de volta) — DDL sobre tabela
**compartilhada**, dentro do lote dos 23, enquanto `checklist-applicability-schema-db.test.ts` e
`work-order-checklists-junction-schema-db.test.ts` (**mesmo lote**) usam essa tabela. Sonda somente-leitura
durante o lote: 19081 amostras, **6 janelas em que a coluna `notes` NÃO EXISTIA, de 17 a 20 ms cada**
(`42703 undefined_column` para quem cair nelas), ≈1 janela por rodada. Um lote de 4 arquivos com as suítes
vizinhas deu **10/10 verde** — de novo, verde não é ausência de perigo.

**M6 · O "quinto escritor de catálogo" são SEIS prefixos, e o varredor conhece UM.**

| prefixo de role | arquivo que cria | toma o lock? | varrido? | órfãs vivas na base do dono |
|---|---|---|---|---|
| `o6r_b01_` | `tests/helpers/auth-identity-fixture.ts` | **sim** | **sim** | 0 |
| `o6r_clone_owner_` | `tests/auth-login-candidates-fn-db.test.ts` | não | não | 5 |
| `rls_test_` | `tests/rls-tenant-isolation.test.ts` | **sim** | não | **68, todas com LOGIN, até 460 privilégios de tabela** |
| `audit_rls_` | `tests/audit-security.test.ts` | não | não | 0 |
| `vid_link_rls_` | `tests/impound-process-checklist-link-schema.test.ts` | não | não | 1, com LOGIN, 460 privilégios |
| `vid_rls_test_` | `tests/vehicle-identity-schema.test.ts` | não | não | 0 |

Mais DDL de catálogo não-role: `CREATE TABLE`/`CREATE TRIGGER`/`ALTER TABLE … OWNER TO`
(`auth-identity-link-events-db`, **dentro** do lock) · `CREATE FUNCTION`/`ALTER FUNCTION … OWNER TO`
(`auth-login-candidates-fn-db`, **fora**) · `ALTER TABLE … RENAME COLUMN` sobre tabela compartilhada
(`checklist-applicability-prisma-db`, **fora**). Total na base do dono: **81 roles não-sistema, 74 com LOGIN**.

**M7 · A superfície real.** 246 arquivos `*.test.ts`; **66 tocam `DATABASE_URL`**; **22 escrevem
`public.users`** — a tabela que o backfill varre — dos quais **11 estão no lote dos 23 e 11 estão FORA dele**,
encontrando o backfill **apenas no job `backend`**; **49 escrevem `public.tenants`**.

**M8 · O job `backend` também roda o backfill, e ninguém o mediu.**
`CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/auth-identity-backfill-db.test.ts` →
**5 testes, 0 pulados**. A suíte só se auto-pula por ausência de `DATABASE_URL`, e o job `backend` a define
(`ci.yml:15`). Consequência: **toda suíte `-db` roda DUAS vezes por CI**, em dois arranjos diferentes — um
semeado (`backend-postgres`), outro não (`backend`) — e dois ciclos mediram só um.

**M9 · As TRÊS formas divergem em variáveis load-bearing.** `npm test` local: 2567 testes, pass 2557,
fail 0, skipped 10, exit 0, 224,9 s. Diferenças medidas: (a) `backend-postgres` roda `db:seed`, `backend` não,
o local não; (b) a base do dono carrega 294 organizações / 274 usuários / 81 roles acumuladas — a da CI nasce
vazia a cada job; (c) o teto de arquivos simultâneos é `availableParallelism()-1`, **7 aqui**, não medido no
runner da CI. **Taxa de flake medida numa forma não transfere para as outras.**

**M10 · A casa já pagou por este arranjo, e remendou.** `ci.yml:106-111` registra por escrito: a variável
`RBAC_DB_PARITY` existe porque a versão anterior "tentava DEDUZIR o provisionamento olhando se a tabela
`roles` estava vazia — sentinela que o paralelismo do `npm test` polui (várias suítes criam papéis)". Mesmo
arranjo, mesma classe, resposta anterior = variável de ambiente.

**M11 · O plano vinculante se contradiz — e é daí que a caçada nasceu.** `B-O6R-01-plano-v6-aprovado.md` §7
manda role efêmera `NOSUPERUSER` (que **só existe mudando catálogo**), proíbe "jamais
`ALTER TABLE … DISABLE TRIGGER` (ACCESS EXCLUSIVE + catálogo global + paralelismo do `npm test`)" — e a seção
de CI (linha 277) afirma **"nenhuma suíte muda catálogo"**. A entrega muda catálogo em 6 prefixos de role
+ tabela + trigger + função, e `auth-identity-link-events-db.test.ts:227` usa o
`ALTER TABLE … DISABLE TRIGGER` proibido (sobre tabela scratch própria — a letra da regra é violada; o perigo
que ela nomeava, não). **O plano previu este modo de falha na própria frase que o proibiu.**

### 2. O estado da arte (pesquisa, ≥5 fontes) — o que cada técnica custa e o que ela NÃO resolve

| técnica | custo | **não** resolve |
|---|---|---|
| **Transação + ROLLBACK por teste** | o mais barato; sem re-seed | dado **commitado**, segunda **conexão** (a role efêmera é outra conexão), DDL, trigger de statement, concorrência real — ou seja, **nada** do que este bloco prova |
| **Schema por worker** (`search_path`) | barato; migrações por schema | roles (`pg_authid` é de **cluster**), advisory locks de cluster, e statement com nome qualificado — o backfill diz `public.users` **literalmente** |
| **Banco por worker** (mesmo cluster) | migrações × N, ou template | **roles continuam globais ao cluster** — resolve 23503/23505, não resolve o `XX000` de `CREATE ROLE`/`GRANT` |
| **Template database** (`CREATE DATABASE … TEMPLATE`) | torna o anterior barato (migra 1×) | **nenhuma sessão pode estar conectada ao template durante a cópia** (doc oficial); roles seguem globais |
| **Cluster/contêiner efêmero por worker** | ~3 s de arranque por worker + imagem | é o **único** que isola `pg_authid`; não isola nada se os workers compartilharem cluster |
| **`pg_advisory_lock`** | ~zero | **não alcança quem não o toma.** Tom Lane o chama de *workaround*: "you could consider using an application-managed advisory lock" — a saída que ele prefere é não haver escritores concorrentes do mesmo objeto |

**Por que o Postgres se comporta assim (fonte primária):** "You can't corrupt the database with concurrent
updates on such a row, you'll just get a 'tuple concurrently updated' error from all but the first-to-arrive
update" — o catálogo de objetos representados por **uma linha** (roles, funções) **não tem locking de DDL**;
é decisão de projeto, não bug, e não há versão do Postgres em que isto deixe de valer.

**Conclusão da pesquisa:** **nenhuma técnica isolada cobre as três classes deste lote** — (i) linhas de
tabela, (ii) catálogo de role, que é de **cluster**, (iii) esquema de tabela compartilhada. A indústria
combina banco/cluster por worker para os dados **com** ausência (ou serialização explícita) de escrita em
objeto de cluster. **Acrescentar mais um lock nunca fecha a classe, porque a classe é "escritor que não sabe
que deveria tomar o lock" — e ela cresce a cada suíte nova.**

### 3. O que eu NÃO medi (e por quê)

- **A CI.** Não rodei nenhum job. Não sei `availableParallelism()` do runner, nem a taxa de vermelho lá, nem
  o tempo dos jobs. Tudo acima é desta máquina.
- **`npm run db:seed`.** A cadeira rodou; eu não, para não escrever na base do dono além do que os próprios
  testes escrevem. Minha forma difere da dela **neste ponto** — declarado, não escondido.
- **Vermelho.** 0/12 no lote dos 23, 0/1 na suíte inteira, 0/10 no lote de 4. **Nenhum** `XX000`/`23503`/
  `23505` hoje.
- **Custo real das alternativas neste repositório.** Só li o custo que a literatura reporta; não instrumentei
  banco-por-worker nem contêiner efêmero aqui.
- **Conexão efetiva dos 66 arquivos.** A classificação (22 escritores de `users`, 49 de `tenants`) é por
  padrão de código, não por execução instrumentada.
- **Origem das 68 roles `rls_test_`** (aborto × execução antiga) — não discriminei.

### 4. Fontes

1. Tom Lane, pgsql-general — *'tuple concurrently updated' error when granting permissions*:
   postgresql.org/message-id/3473.1393693757%40sss.pgh.pa.us (catálogo de linha única sem locking de DDL;
   advisory lock como workaround; group role como saída melhor).
2. Thread completa do mesmo defeito em `GRANT`/`REVOKE` concorrentes:
   postgresql.org/message-id/CAFoTioX5gRjxf927ysQTRarP0rQOk4Wkp1exAtLDiqMK0Pg2jw%40mail.gmail.com e
   postgresql.org/message-id/20150624155128.GW4797%40alap3.anarazel.de (9.2.13, mesma classe).
3. PostgreSQL 16 — *Template Databases*: postgresql.org/docs/16/manage-ag-templatedbs.html
   ("no other sessions can be connected to the source database while it is being copied").
4. Node.js — *Test runner*: nodejs.org/api/test.html (`concurrency: true` ⇒ `os.availableParallelism() - 1`
   arquivos em paralelo; **o default do CLI foi medido aqui, não lido**).
5. WebbyLab — *Parallel, Isolated Jest-Enhanced Testing (III): test isolation methods*:
   webbylab.com/blog/pijet-parallel-isolated-jest-enhanced-testing-part-iii-test-isolation-methods/
   (comparativo rollback × schema-por-worker × banco-por-worker).
6. `parallel_tests` (Rails/Ruby) — github.com/grosser/parallel_tests: **1 banco por processo** via
   `TEST_ENV_NUMBER`; é o default da indústria quando o teste precisa de dado commitado.
7. Testcontainers para Postgres em Node — qaskills.sh/blog/testcontainers-postgres-node-guide e
   baeldung.com/spring-boot-testcontainers-integration-test (~3 s de arranque; um contêiner **por worker**,
   chaveado pelo worker id; contêiner por teste é inviável).
8. Selim B. — *Speedy Prisma and PostgreSQL Integration Tests*: selimb.hashnode.dev/speedy-prisma-pg-tests
   (template database para baratear banco-por-worker com Prisma).
9. Sebastián Chikán — *Jest integration tests in parallel using isolated SQL schemas*:
   medium.com/@sebastinchikn/how-to-run-jest-integration-tests-in-parallel-using-isolated-sql-schemas-f4c5e534030a
   (limites do isolamento por schema).

### 5. Veredito de premissa

**O defeito é de ARRANJO, não dos dois arquivos.** Provas: o alvo do statement global contém linha de
terceiro em 10–39 % dos instantes (M3); a poluição é irreversível por desenho (M4); existe uma terceira
causa, anterior ao bloco, do mesmo formato (M5); os escritores de catálogo são seis e o mecanismo alcança
dois (M6); metade dos concorrentes só encontra o backfill num job que ninguém mediu (M7/M8); e a casa já
remendou esta mesma classe uma vez (M10). Enquanto o lote for "todo mundo contra um banco só", cada suíte
nova é um escritor a mais que precisa **lembrar** de tomar um lock — e é isso que não escala.

**Escolha de arranjo é de quem planeja** (`D-JUNTA-SEPARACAO-DE-PAPEIS`): esta PD registra o custo e o limite
de cada opção, não elege uma.

---

## PD-O6R-B07B-MAGIC-BYTES — tabela de assinaturas do sniff in-house (JPEG/PNG/WebP/PDF) (2026-09-06)

Rodada Ω6R · B-O6R-07b · **RESOLVIDO — NÃO dispara junta-5** (módulo in-house, ZERO dependência, nenhum
serviço externo). Pesquisa `agente-pesquisador-web`, 11 fontes (≥3 normativas), regra da dúvida §C7.3,
registrada **antes** da decisão e antes da primeira linha de `content-sniff.ts`.

**Contexto:** o bloco entrega um sniff de magic bytes próprio que reconhece **exatamente 4** tipos e devolve
`undefined` para todo o resto. As dúvidas: quantos bytes por assinatura, se o 4º byte do JPEG entra, se IHDR
(PNG) e o fourCC do chunk (WebP) entram, se o `%PDF-` exige offset 0 ou tolera lixo à frente, se vale checar
trailer, e o que fica de fora.

### 1. Achados, um por pergunta

**(1) JPEG — a assinatura é `FF D8 FF`, e o 4º byte NÃO entra.** Três referências independentes convergem:
o WHATWG define o padrão como `FF D8 FF` / máscara `FF FF FF` — três bytes, "o marcador SOI do JPEG seguido
do byte indicador de outro marcador"; o `file(1)` tem a entrada catch-all
`0 belong&0xffffff00 0xffd8ff00 JPEG image data`, cuja máscara **zera deliberadamente o 4º byte**; e o
`file-type` (líder do domínio em JS) faz `check([0xFF,0xD8,0xFF])` e só consulta o offset 3 para desempatar
JPEG-LS, nunca para aceitar/rejeitar JPEG. Se o 4º byte fosse exigido, a allowlist honesta não seria {E0,E1}:
teria de conter todo marcador legal — `E0` JFIF, `E1` Exif/XMP, `E2` ICC, `EE` Adobe/APP14, `DB` DQT-primeiro,
`C0`–`CF` SOF/DHT, `FE` COM-primeiro, `DD` DRI — **e ainda `FF`**, porque T.81 §B.1.1.2 permite qualquer
número de *fill bytes* `0xFF` antes de um marcador. Ou seja: a allowlist correta é "quase tudo", e a incorreta
rejeita JPEGs legítimos. Valor de segurança: **nulo** — o 4º byte é escolhido pelo atacante ao custo de 1 byte.

**(2) PNG — os 8 bytes da assinatura; IHDR NÃO entra.** RFC 2083 §3.1: "The first eight bytes of a PNG file
always contain the following (decimal) values: 137 80 78 71 13 10 26 10" = `89 50 4E 47 0D 0A 1A 0A`. O W3C
PNG 3rd ed. §5.2 repete os mesmos 8 bytes; §11 acrescenta "The IHDR chunk shall be the first chunk in the PNG
datastream". **Custo/benefício da checagem de IHDR:** custo = min-buffer sobe de 8 → 16; benefício de
segurança = **zero**, porque esses 8 bytes extras são copiáveis pelo atacante com o mesmo esforço dos 8
primeiros. O WHATWG, o `file(1)` e o `file-type` param na assinatura de 8 bytes.

**(3) WebP — 14 bytes (WHATWG), com `VP` em 12-13.** A spec do contêiner (Google) fixa: offsets 0-3 = `RIFF`,
4-7 = tamanho uint32 **little-endian** (variável), 8-11 = `WEBP` — cabeçalho de 12 bytes. Em 12-15 vem o
fourCC do primeiro chunk, e a spec é explícita: os três canônicos são **`VP8 `** (`56 50 38 20` — "the fourth
character in the 'VP8 ' FourCC is an ASCII space (0x20)"), **`VP8L`** (`56 50 38 4C`) e **`VP8X`**
(`56 50 38 58`). O WHATWG resolve sem allowlist: padrão de 14 bytes com os 4 do tamanho curinga e **`56 50`
(`VP`) em 12-13** — dois bytes comuns aos três fourCC, que cobrem os três com uma comparação só, não quebram
em variante futura `VP8?`, e ainda são 2 bytes mais estritos que o `file-type` (que só verifica `WEBP` no 8).

**(4) PDF — `%PDF-` em offset 0 ESTRITO. Sem tolerância.** ISO 32000-1 §7.5.2: *"The first line of a PDF file
shall be a header consisting of the 5 characters %PDF– followed by a version number of the form 1.N"* — a
norma diz **primeira linha**, isto é, offset 0. A tolerância de ~1024 bytes é **leniência histórica de
leitor** (nota da Adobe: "Acrobat viewers require only that the header appear somewhere within the first 1024
bytes"), não requisito de conformidade — e é precisamente ela que a Glasswall documenta como o habilitador dos
poliglotas imagem+PDF: *"Due to this tolerance in the header location, it opens the door to other file headers
being introduced within the first 1KB."* As duas referências de implementação concordam com o offset 0: o
WHATWG lista o padrão `25 50 44 46 2D` com **"Leading bytes to be ignored: None"**, e o `file-type` faz
`checkString('%PDF')` na posição 0, sem varredura.
**O argumento decisivo é de tipo, não de compatibilidade:** varrer 1024 bytes faz um arquivo que começa com
`FF D8 FF` — JPEG válido pela nossa própria tabela — casar **também** com PDF. Quem perguntar "é imagem?" ouve
sim; quem perguntar "é PDF?" ouve sim. Isso é confusão de tipo fabricada pelo próprio validador. Com offset 0
em todas as quatro entradas, **os primeiros bytes ficam mutuamente exclusivos** (`FF` · `89` · `52` · `25`):
nenhum buffer casa com dois tipos, a ordem da tabela vira irrelevante e o poliglota
imagem-com-cabeçalho-PDF-deslocado é rejeitado sem regra especial.
*Consequência aceita e declarada:* PDFs com lixo à frente (que o Acrobat abriria) são rejeitados. É o
comportamento desejado — arquivo não conforme à §7.5.2 não deve entrar por um caminho de upload.

**(5) Trailer (`FF D9` / `IEND`) — NÃO entra.** Três razões, em ordem de peso:
- **Falso-positivo é a regra, não a exceção.** A spec Exif/DCF determina que leitores operem sem interrupção
  mesmo havendo dado gravado após o EOI da imagem primária, e que dado desconhecido após o EOI seja pulado.
  Na prática: thumbnails embutidos produzem múltiplos pares SOI/EOI; aparelhos OPPO gravam duas estruturas
  JFIF completas; Google Motion Photo anexa um MP4 inteiro depois do EOI. "Bytes depois do `FF D9`" é **JPEG
  legítimo de câmera**, não indício de ataque.
- **Valor de segurança quase nulo contra o que existe.** As classes de poliglota documentadas pela Glasswall
  põem a carga **dentro** de estruturas legítimas — chunk `tEXt` do PNG, segmento `COM` do JPEG, bloco de
  comentário do GIF — todas **antes** do trailer. Uma checagem de trailer não vê nenhuma delas.
- **Custo real de arquitetura.** Exige o buffer inteiro em memória (ou um segundo seek até o fim), quebrando
  um sniff de cabeça (14 bytes) e o caminho de streaming do upload.
A defesa correta contra carga anexada é outra camada: re-encode/CDR, `Content-Disposition: attachment`,
`X-Content-Type-Options: nosniff` e servir de origem sem script — nunca 2 bytes no fim do arquivo.

**(6) O que NUNCA entra — e por quê.**
- **SVG (`image/svg+xml`)** — dois vetos independentes. (a) *Não é sniffável por prefixo*: é XML, pode começar
  com BOM, `<?xml`, comentário, DOCTYPE, whitespace arbitrária ou direto `<svg`; o WHATWG **não tem padrão
  algum** para `image/svg+xml`. (b) *É scriptável*: carrega `<script>`, handlers e XXE — o próprio WHATWG
  registra que "it is critical that the rules for distinguishing if a resource is text or binary never
  determine the computed MIME type to be a scriptable MIME type, as this could allow a privilege escalation
  attack".
- **HTML** — mesmo veto (b). Além disso, os padrões de HTML do WHATWG são os únicos da tabela que **ignoram
  whitespace à frente**, ou seja, exigiriam abandonar a regra de offset 0 que sustenta a exclusividade mútua.
- **HEIC/HEIF/AVIF** — não é prefixo. O `ftyp` fica no **offset 4**, precedido de um tamanho de box big-endian
  de 4 bytes (byte 0 não é constante → destrói a exclusividade mútua), e a identificação exige ler a *major
  brand* **e** a lista de *compatible brands* — é caminhada de box ISO-BMFF, não comparação de prefixo.
- **GIF** — fora dos 4 tipos exigidos; e é o cavalo de batalha histórico do poliglota (GIFAR; blocos de
  comentário que podem aparecer "at any point in the Data Stream").
- **ZIP (`50 4B 03 04`)** — contêiner de entradas arbitrárias (DOCX/XLSX/JAR/APK), logo casar o prefixo **não
  diz nada** sobre o conteúdo. Pior: ZIP é lido a partir do **fim** (central directory), então a checagem de
  prefixo é estruturalmente irrelevante para o que o descompactador vai fazer.
- **`MZ` (`4D 5A`, executável PE)** — o motivo é **de modelo, não de tipo**: este módulo é uma **allowlist**, e
  tudo que não está nela já retorna `undefined`. Acrescentar `MZ` como entrada "conhecida e rejeitada"
  transformaria a allowlist em denylist — inversão do modelo de segurança e superfície infinita de bypass.

**(7) Buffer menor que a assinatura → `undefined`. Confirmado.** É o que a norma manda: o algoritmo de *pattern
matching* do WHATWG começa com **"If input's length is less than pattern's length, return false."** Guard de
comprimento **explícito, antes de qualquer indexação** — em JS ler além do fim de um `Buffer` devolve
`undefined` em vez de lançar, então uma comparação ingênua "funcionaria por acidente" e quebraria no dia em que
alguém trocasse por `subarray()`/`readUInt32BE()`. Nunca lançar exceção: retornar `undefined`.

### 2. Limite honesto desta decisão

OWASP é explícito sobre o teto: *"In conjunction with content-type validation, validating the file's signature
can be checked and verified against the expected file that should be received. **This should not be used on
its own, as bypassing it is pretty common and easy.**"* Este sniff é **uma** camada — vale como allowlist de
tipo e como recusa do `Content-Type` do cliente (que "is provided by the user, and as such cannot be trusted,
as it is trivial to spoof"). Ele **não** prova que o arquivo é válido, **não** prova que não é poliglota e
**não** substitui armazenamento fora do document root, `nosniff` + `Content-Disposition` na entrega, nem
re-encode/CDR. Registrar isso é parte da decisão.

### 3. Fontes (o que cada uma fundamentou)

1. **WHATWG MIME Sniffing Standard** (mimesniff.spec.whatwg.org) — padrão `FF D8 FF`/máscara `FF FF FF`
   (JPEG, 3 bytes); assinatura PNG de 8 bytes; padrão WebP de 14 bytes com máscara curinga no tamanho e `VP`
   em 12-13; padrão PDF `25 50 44 46 2D` com **"Leading bytes to be ignored: None"**; ausência total de padrão
   para `image/svg+xml` e HEIC; whitespace ignorada só nos padrões de HTML; a regra "input's length < pattern's
   length ⇒ return false"; e a justificativa de segurança do *sniff-scriptable* flag. Também a assinatura ZIP.
2. **RFC 2083 §3.1 (PNG)** (rfc-editor.org/rfc/rfc2083.txt) — os 8 bytes `137 80 78 71 13 10 26 10` e a
   exigência de IHDR como primeiro chunk.
3. **W3C PNG (3rd ed.) §5.2/§11** (w3.org/TR/png-3/) — confirmação normativa moderna: mesma assinatura de 8
   bytes; "The IHDR chunk shall be the first chunk"; layout do IHDR — base do custo/benefício que o rejeitou.
4. **Google — WebP Container Specification** (developers.google.com/speed/webp/docs/riff_container) — layout
   exato `RIFF`(0-3) + tamanho LE(4-7) + `WEBP`(8-11); os três fourCC canônicos, com a nota explícita de que o
   4º caractere de `VP8 ` é espaço ASCII 0x20.
5. **`file(1)` / libmagic — `magic/Magdir/jpeg`** (github.com/file/file) — a entrada catch-all
   `0 belong&0xffffff00 0xffd8ff00`, cuja máscara zera o 4º byte: prova de que a ferramenta de referência do
   domínio **não** testa o 4º byte para identificar JPEG.
6. **`file-type` v19.6.0** (github.com/sindresorhus/file-type) — produto líder do domínio em JS:
   `check([0xFF,0xD8,0xFF])` com o offset 3 só para JPEG-LS; PNG de 8 bytes; `WEBP` no offset 8; e
   **`checkString('%PDF')` em offset 0, sem varredura** — nenhuma implementação de referência aplica a
   tolerância de 1024 bytes.
7. **ISO 32000-1:2008 §7.5.2** (via PDF Association / LoC FDD000277) — *"The first line of a PDF file shall be
   a header consisting of the 5 characters %PDF–…"*: a base normativa do offset 0; e a leniência "within the
   first 1024 bytes" como comportamento de **leitor Acrobat**, não de conformidade.
8. **Glasswall — "Polyglot files: unmasking images & PDF"** — a tolerância de 1KB como habilitador direto do
   poliglota; e que a carga real mora **dentro** de `tEXt`/`COM`/comentário — argumento que derrubou o trailer.
9. **Exif/DCF + prática de câmeras** (media.mit.edu deepview; NVISO Labs) — dado após o EOI é **legítimo e
   comum** (thumbnails com múltiplos SOI/EOI, duplo JFIF de OPPO, MP4 do Motion Photo), e a spec manda pular.
10. **OWASP File Upload Cheat Sheet** — allowlist obrigatória; `Content-Type` do cliente não é confiável; e o
    teto explícito ("should not be used on its own").
11. **ITU-T T.81 §B.1.1.2** (w3.org/Graphics/JPEG/itu-t81.pdf) — marcador = `FF` + byte ≠ `00` e ≠ `FF`,
    **mas** qualquer marcador pode ser precedido de *fill bytes* `0xFF`: até `FF` seria um 4º byte legal, o que
    fecha o caso contra a allowlist de 4º byte.

### 4. DECISÃO

Módulo **allowlist**, ZERO dependência, **offset 0 estrito em todas as entradas**, sem checagem de trailer,
sem tolerância de deslocamento, retorno `undefined` (nunca exceção) para tudo o mais.
**Cabeça a ler do arquivo: 14 bytes** (a maior assinatura). Cada entrada confere o próprio comprimento antes
de indexar.

| Tipo devolvido | Offset | Bytes exatos (hex) | ASCII | Bytes comparados | Min. buffer | 4º byte / chunk |
|---|---|---|---|---|---|---|
| `image/jpeg` | 0 | `FF D8 FF` | — | 3 | **3** | **NÃO se verifica.** Qualquer valor em `buf[3]` é aceito (inclusive `00` e `FF`). |
| `image/png` | 0 | `89 50 4E 47 0D 0A 1A 0A` | `\x89PNG\r\n\x1a\n` | 8 | **8** | **IHDR NÃO se verifica.** Bytes 8-15 ignorados. |
| `image/webp` | 0 | `52 49 46 46` · `?? ?? ?? ??` · `57 45 42 50` · `56 50` | `RIFF` + 4 curingas + `WEBP` + `VP` | 10 (offsets 0-3, 8-11, 12-13) | **14** | Offsets 4-7 = **curinga** (tamanho uint32 LE). Offsets 12-13 = `56 50` (`VP`) obrigatórios; 14-15 **NÃO se verificam** — `VP` já cobre `VP8 `, `VP8L` e `VP8X`. |
| `application/pdf` | 0 | `25 50 44 46 2D` | `%PDF-` | 5 | **5** | Versão (`1.N` / `2.0`) **NÃO se verifica**. **Offset 0 estrito** — nenhuma varredura, nenhum byte ignorado à frente. |

**Regras do módulo:**
1. `buffer.length < min. buffer da entrada` ⇒ aquela entrada não casa. Nada casou ⇒ **`undefined`**. Nunca
   lançar.
2. **Ordem de avaliação é irrelevante** — os primeiros bytes das 4 entradas são mutuamente exclusivos
   (`FF` · `89` · `52` · `25`), logo nenhum buffer casa com duas entradas. Primeiro casamento vence.
3. Guard de comprimento **explícito**, antes de qualquer indexação.
4. A função decide **só pelos bytes**: não lê nome de arquivo, extensão nem `Content-Type` declarado.
5. WebP: os offsets 4-7 nunca são comparados (tamanho, uint32 **little-endian**).

**O QUE NÃO ENTRA**

| Não entra | Motivo determinante |
|---|---|
| **4º byte do JPEG** (E0/E1/DB/EE/E2-EF/C0…) | A allowlist correta seria "quase todo marcador" + `FF` (fill bytes, T.81 §B.1.1.2) ⇒ só gera falso-negativo. `file(1)` mascara esse byte; WHATWG e `file-type` não o usam. Valor de segurança nulo. |
| **`IHDR` do PNG** (offsets 8-15) | Min-buffer 8→16 sem ganho: os 8 bytes extras são tão forjáveis quanto os 8 primeiros. |
| **fourCC completo do WebP** (offsets 14-15) | `VP` em 12-13 já cobre os 3 canônicos, sem allowlist para manter. |
| **Tolerância de offset no PDF (1024 bytes)** | Leniência de leitor Acrobat, não conformidade ISO 32000-1 §7.5.2. É o habilitador documentado do poliglota imagem+PDF e destruiria a exclusividade mútua dos primeiros bytes. |
| **Versão do PDF (`1.N` / `2.0`)** | Rejeitaria PDF 2.x e futuros. |
| **Trailer `FF D9` (JPEG EOI) / `IEND` (PNG)** | Falso-positivo garantido (Exif/DCF permite e manda pular dado após EOI). Não vê os poliglotas reais, que ficam em `tEXt`/`COM`. Exige o arquivo inteiro em memória. |
| **`image/svg+xml`** | Não tem prefixo fixo — WHATWG não tem padrão para ele; e é **scriptável** (XSS/XXE), classe que a norma proíbe alcançar por sniffing. |
| **`text/html`** | Scriptável; e seus padrões ignoram whitespace à frente, incompatível com a regra de offset 0. |
| **HEIC/HEIF/AVIF** | `ftyp` no offset 4 atrás de um tamanho de box arbitrário (byte 0 não constante ⇒ quebra a exclusividade mútua) e exige ler major brand + compatible brands. |
| **GIF** | Fora dos 4 tipos exigidos; historicamente o veículo de poliglota (GIFAR). |
| **ZIP (`50 4B 03 04`)** | Contêiner de conteúdo arbitrário; é lido a partir do **fim** ⇒ o prefixo não diz nada sobre o que será extraído. |
| **`MZ` (`4D 5A`, PE)** | Motivo de **modelo**: a tabela é allowlist e tudo fora dela já é `undefined`. Entrada "conhecida e rejeitada" viraria denylist. |

**Limite declarado (OWASP):** este sniff é **uma** camada. Não prova validade nem ausência de poliglota, e não
substitui armazenamento fora do document root, `X-Content-Type-Options: nosniff`,
`Content-Disposition: attachment`, origem sem script e/ou re-encode/CDR.

**Onde a decisão foi implementada:** `src/modules/evidence/content-sniff.ts` (B-O6R-07b). As quatro
divergências entre a tabela PROVISÓRIA do plano (§3.3) e esta decisão estão anotadas no cabeçalho do módulo.

---

## PD-O6R-B07B-DISPOSITION — `Content-Disposition` seguro ao servir arquivo de storage: nome não-ASCII, header injection e sniffing (2026-09-06)

Rodada Ω6R · B-O6R-07b · **RESOLVIDO — NÃO dispara junta-5** (nenhuma dependência nova, nenhum serviço
externo: tudo é header de resposta + built-in do `node:`). Pesquisa `agente-pesquisador-web`, **13 fontes** —
normativas (RFC 6266 / 8187 / 9110, WHATWG Fetch+HTML) > produto líder do domínio
(`jshttp/content-disposition`, que é o motor do `res.download`/`res.attachment` do Express; helmet) >
MDN/MS Learn. Regra da dúvida §C7.3, registrada antes da primeira linha de `serve-verified-file.ts`.

**Contexto:** o helper `sendVerifiedFile` serve bytes vindos do storage e precisa fechar o vetor "bytes hostis
servidos **inline** com o MIME que o **cliente** declarou". O nome do arquivo é dado de usuário (upload) e vai
para dentro de um header — logo, é entrada não-confiável num canal com framing por CRLF.

### 1. O que pode e o que NUNCA pode dentro das aspas

RFC 6266 §4.1: `filename-parm = "filename" "=" value | "filename*" "=" ext-value`, com
`value = token / quoted-string`. A `quoted-string` é a do HTTP (RFC 9110 §5.6.4):

```
quoted-string = DQUOTE *( qdtext / quoted-pair ) DQUOTE
qdtext        = HTAB / SP / %x21 / %x23-5B / %x5D-7E / obs-text
quoted-pair   = "\" ( HTAB / SP / VCHAR / obs-text )
```

**Cabe sem escape:** HTAB, SP, `!`, %x23–%x5B, %x5D–%x7E, obs-text (%x80–FF). **Só via `quoted-pair`:** `"` e
`\`.

**NUNCA podem aparecer — é aqui que mora o header injection.** RFC 9110 §5.5: *"Field values containing CR,
LF, or NUL characters are invalid and dangerous… a recipient of CR, LF, or NUL within a field value MUST
either reject the message or replace each of those characters with SP before further processing."* CR/LF/NUL
permitem **response splitting** (fabricar um segundo header a partir do nome do arquivo). Também ficam fora do
`qdtext` os demais controles %x01–%x1F e %x7F. O `setHeader` do Node lança para valor fora de latin1 —
**isso é a última linha de defesa, não a primeira**: quem saneia é o helper.

**Além da gramática, o que a interoperabilidade proíbe (RFC 6266 Apêndice D):** evitar `\` (*"not all user
agent implementations unescape it correctly"*) e evitar `%` seguido de dois hex-dígitos (*"as it can be
interpreted as a percent-encoded sequence"* — MDN mede a divergência: Firefox e Chrome decodificam, Safari
não). Somar o conselho do RFC 2183 §5 citado pela MDN: *"Any path information should be stripped."*

**Consequência de projeto (é a decisão, não um detalhe):** em vez de escapar `"` e `\` com `quoted-pair`,
**sanear o fallback para um conjunto que nunca precisa de escape** — assim nenhum `quoted-pair` é emitido e o
conselho do Apêndice D é cumprido por construção, não por disciplina.

**`attr-char` (RFC 8187 §3.2.1, que OBSOLETA o RFC 5987)** — o que **não** precisa de percent-encoding no
`filename*`: `ALPHA / DIGIT / "!" / "#" / "$" / "&" / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~"`. Todo o
resto vira bytes UTF-8 percent-encoded. **Armadilha de JS medida contra a ABNF:** `encodeURIComponent` **não**
codifica `! ~ * ' ( )`. `!` e `~` são `attr-char` (podem ficar crus); **`* ' ( )` NÃO são** → precisam de
codificação manual. Na direção oposta, ele **super-codifica** `# $ & + ^ | \`` — inofensivo.

### 2. Ordem dos parâmetros — `filename` ANTES de `filename*`

RFC 6266 §4.3: *"When both 'filename' and 'filename*' are present… recipients SHOULD pick 'filename*' and
ignore 'filename'"* — o fallback nunca "vence" num UA moderno. E o Apêndice D é explícito sobre a ordem: o
`filename` **deve vir antes** do `filename*`, *"due to parsing problems in some existing implementations"*. O
`jshttp/content-disposition` faz exatamente isso.

### 3. Fallback ASCII quando o nome é 100% não-ASCII

O Apêndice D manda gerar o `filename` *"by substituting the US-ASCII equivalents"*, mas não diz o que fazer
quando não sobra nada. O `jshttp/content-disposition` resolve com `replace(NON_LATIN1_REGEXP, '?')` — **e isso
é um defeito para o nosso caso**: `?` é **reservado em nome de arquivo no Windows** (MS Learn lista
`< > : " / \ | ? *`). Decisão: substituir por **`_`**; e se o fallback ficar vazio, reduzir-se a
`_`/`.`/espaço, ou bater num **nome de dispositivo reservado** (`CON PRN AUX NUL COM1-9 LPT1-9`), usar
**`arquivo`**, preservando a extensão quando ela for ASCII-alfanumérica. Nunca terminar em `.` nem em espaço.

### 4. Efeito de `attachment` — CONFIRMADO: inerte em `fetch()`/XHR, ativo em navegação

- **Navegação:** o HTML Standard põe o download no algoritmo de navegação — *"servers can respond with 204 or
  205 status codes or with `Content-Disposition: attachment` headers, which cause navigation to abort"*.
- **`fetch()`/XHR:** o Fetch Standard **não processa `Content-Disposition` em passo nenhum**. O corpo chega ao
  JS como bytes; o header é **inerte para comportamento**.
- **Corolário de segurança, que é o que importa aqui:** `attachment` protege **navegação**, não **subrecurso**.
  `<img src>`, `<script src>`, `<link rel=stylesheet>` ignoram o header por completo. Portanto **`attachment`
  sozinho NÃO fecha o vetor** — quem fecha é `Content-Type` derivado dos bytes + `nosniff`.

### 5. `X-Content-Type-Options: nosniff` — o que impede, e o encaixe com ORB/CORB

MDN / Fetch §3.6.1: bloqueia a resposta quando o destino é `script` e o MIME não é JavaScript, ou `style` e o
MIME não é `text/css`; e *"prevents MIME type sniffing for all other response types, causing the browser to
use the declared Content-Type without examining the response content."* É **ele** que torna o nosso
`application/octet-stream` vinculante.

**ORB (sucessor do CORB) — o caso do `<img src>` de origem cruzada:** requisição de `<img>` é `no-cors`, e o
ORB decide se os bytes chegam ao processo do atacante. Safelist = JavaScript MIME, `text/css`,
`image/svg+xml`; blocklist = HTML/JSON/XML; e há a lista *opaque-blocklisted-never-sniffed* (inclui
`application/pdf`, `application/zip`, `text/csv`) que **nunca** é sniffada. O `nosniff` entra em dois pontos do
algoritmo, e o efeito é **remover o escape-hatch de sniffing**: uma resposta nossa não pode mais ser
"resgatada" para dentro de um `<img>` por parecer uma imagem.

**Vale setar explicitamente mesmo com helmet global? SIM** — helmet o seta por default, e ainda assim: (a) o
helper pode ser montado em router/harness onde helmet não está — garantia que só existe numa composição é
garantia que não se testa por resposta; (b) torna a promessa **local e asseverável**; (c) `res.setHeader` com
o mesmo valor é idempotente; (d) blinda contra mudança futura de ordem de middleware. O mesmo vale para
`Cross-Origin-Resource-Policy: same-origin`.

### 6. `Content-Security-Policy: sandbox` — ENTRA, com `allow-downloads`

**O que compra:** o `sandbox` **pelado** aplica restrição máxima: sem `allow-same-origin` o documento recebe
**origem opaca**, sem `allow-scripts` **não executa script**. A ameaça coberta: bytes que são HTML/SVG servidos
com `Content-Type` não-HTML e alcançados por um caminho onde o `attachment` não se aplica ou foi removido
(proxy, extensão, visualizador, futura rota de *preview*). Com origem opaca, mesmo renderizado o documento
**não lê cookie/localStorage da origem do app nem scripta nela**. É literalmente o header que o
`raw.githubusercontent.com` usa para servir conteúdo de usuário.

**A armadilha (por isso NÃO é `sandbox` pelado):** `sandbox` sem `allow-downloads` **bloqueia download** — a
MDN documenta o token `allow-downloads`, e o Chrome 83 passou a bloquear download sob flag de sandbox. Como a
razão de existir do helper é **fazer o download acontecer**, `sandbox` pelado trocaria defesa em profundidade
por quebra de funcionalidade.

**Ressalva honesta registrada:** não se encontrou frase normativa fixando se a CSP `sandbox` da **própria**
resposta bloqueia o download **dessa mesma** resposta — o comportamento documentado do Chrome fala do *frame
que inicia* o download. O `allow-downloads` torna a pergunta irrelevante a custo zero.

### 7. `Content-Length`

RFC 9110 §8.6: indica *"the size of the representation data in octets"*; SHOULD ser enviado quando o tamanho é
conhecido. Valor que **discorda do corpo real é erro de framing** — truncamento/dessincronização, primitiva
clássica de request smuggling/desync. Node: com `response.strictContentLength = true` a divergência lança
`ERR_HTTP_CONTENT_LENGTH_MISMATCH`.

### 8. O que NÃO foi medido

- **Nada foi executado** pela pesquisa: zero teste de browser, zero requisição. Tudo é leitura de norma/doc.
- **`test.greenbytes.de/tech/tc2231/`** (a matriz de interop de `Content-Disposition`) ficou **inacessível**
  (certificado TLS). As afirmações de interop repousam no RFC 6266 Apêndice D e na MDN, não em matriz.
- A interação CSP-`sandbox` × download da própria resposta não foi fixada por fonte normativa (§6).
- Comportamento de UA legado com o fallback `_` versus `?` não foi verificado em navegador.

### 9. Fontes

RFC 6266 · RFC 8187 · RFC 9110 (§5.5, §5.6.4, §8.6) · WHATWG Fetch Standard (§3.6 nosniff; algoritmo ORB) ·
annevk/orb · WHATWG HTML Standard (browsing-the-web) · MDN (`Content-Disposition`, `X-Content-Type-Options`,
`CSP: sandbox`) · `jshttp/content-disposition` 0.5.4 (fonte) · Microsoft Learn (Naming Files, Paths, and
Namespaces) · Node.js `http` docs (`setHeader`, `strictContentLength`) · helmet.js.org (headers default) ·
content-security-policy.com/sandbox · RFC 2183 §5 (via MDN).

### 10. DECISÃO

**(a) A string do `Content-Disposition` e a regra de escape/percent-encoding**

```
Content-Disposition: attachment; filename="<fallback ASCII saneado>"; filename*=UTF-8''<pct-encoded UTF-8>
```

Regra (nenhum `quoted-pair` é jamais emitido — o escape é substituído por SANEAMENTO):

```
0) name = NFC(raw); name = ultimo segmento de split(name, /[\/\\]/)   # basename: mata "../" e "C:\"
   name = remove(name, /[\u0000-\u001F\u007F]/)                       # MATA CR/LF/NUL (RFC 9110 §5.5)
   name = trim(name)
1) ext = encodeURIComponent(name)
   ext = replace(ext, /['()*]/, c -> "%" + hex2upper(codePoint(c)))   # ' ( ) * NAO sao attr-char
2) fb = replace(name, /[^\x20-\x7E]/, "_")        # nao-ASCII -> "_"  (NUNCA "?": reservado no Windows)
   fb = replace(fb,   /["\\%\/<>:|?*]/, "_")      # " \ sairiam do qdtext; % e ambiguo; o resto e reservado
   fb = colapsa espacos; tira "." e espaco das pontas; trunca a 100 preservando ".ext"
   se a BASE de fb (antes da ultima extensao) for vazia/so [._ ], ou fb for nome reservado do Windows:
      fb = "arquivo" + (extensao ASCII-alfanumerica de name, se houver)
3) return 'attachment; filename="' + fb + '"; filename*=UTF-8\'\'' + ext
```

*(Ajuste feito na implementação, sobre a redação original desta PD: a checagem de degeneração olha a **BASE**
do nome, não o nome inteiro — senão `🚚📸.png` produziria `filename="____.png"`, uma fileira de placeholders
tão pouco informativa quanto `____`. O nome íntegro continua no `filename*`.)*

Invariantes asseridos por teste: o header nunca contém `\r`, `\n`, `\0`; nunca contém `\` nem `%` dentro das
aspas; `filename=` aparece **antes** de `filename*=`; nome só-emoji produz `arquivo[.ext]`; nome com `"` ou
`..\..\` produz fallback sem aspas e sem separador de caminho.

**(b) Headers que o helper seta, nesta ordem** (a ordem entre campos de nomes diferentes não tem efeito
semântico — RFC 9110 §5.3; é ordem de documentação e de teste):

| # | Header | Valor | Por quê |
|---|---|---|---|
| 1 | `Content-Type` | tipo **derivado dos bytes verificados**; `application/octet-stream` quando não há assinatura | **nunca** o MIME declarado pelo cliente — é o vetor do bloco |
| 2 | `X-Content-Type-Options` | `nosniff` | torna o (1) vinculante; fecha o escape-hatch de sniffing do ORB |
| 3 | `Content-Disposition` | `attachment; filename="…"; filename*=UTF-8''…` | força download em navegação; nome íntegro sem injeção |
| 4 | `Content-Security-Policy` | `default-src 'none'; sandbox allow-downloads` | origem opaca + sem script se algum dia renderizar |
| 5 | `Cross-Origin-Resource-Policy` | `same-origin` | mata embed de origem cruzada antes da heurística de ORB |
| 6 | `Cache-Control` | `private, no-store` | arquivo é tenant-scoped e auth-gated |
| 7 | `Content-Length` | tamanho conhecido | RFC 9110 §8.6 |

Os itens 2 e 5 já são default do helmet: são setados **explicitamente mesmo assim** (idempotente, custo zero).

**Divergência declarada entre a PD e a implementação, e por quê.** A PD recomenda setar `Content-Length`
**só** a partir do buffer em mãos, e **omiti-lo** quando o corpo for um fluxo. A implementação preserva o
§3.5(5) do plano ("`Content-Length` de `sizeBytes` quando conhecido") **e** fecha o risco que a PD nomeia com
o mecanismo que a própria PD cita: liga `response.strictContentLength = true` sempre que declara o header, de
modo que divergência entre o declarado e o corpo real vira `ERR_HTTP_CONTENT_LENGTH_MISMATCH` e a resposta
morre, em vez de entregar bytes dessincronizados. Motivo de manter o header: o aceite D1 do plano exige
`content-length` nas 4 rotas, e o provider local devolve fluxo. Registrado aqui em vez de escolhido em
silêncio (§A2).

**(c) CSP `sandbox`: ENTRA** — como `default-src 'none'; sandbox allow-downloads`. É a única camada que
continua valendo se o `Content-Disposition` for ignorado no caminho; `default-src 'none'` corta qualquer
subrecurso (sem canal de exfiltração). **Não pelado:** `sandbox` sem `allow-downloads` bloqueia o download,
que é a função do helper; `allow-downloads` neutraliza isso sem devolver `allow-scripts` nem
`allow-same-origin`, que são os tokens que importam para a defesa.

**Onde a decisão foi implementada:** `src/modules/evidence/serve-verified-file.ts` (B-O6R-07b), usado pelos 4
routers de download (E1–E4). E5 (owner-portal) não é tocada — ela já re-codifica os bytes por Jimp.
