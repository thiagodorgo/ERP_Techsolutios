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

## PD-GOV-PORTEIRO-RECIBO — o que prova que um artefato veio de um PROCESSO, e não do autor? (2026-08-24)

Rodada GOV-PORTEIRO-PRE-MERGE · **ciclo 3 do protocolo de dificuldade (§C7.4)** — reabertura de premissa
pelo crítico, ≥5 fontes exigidas. Pesquisa: `agente-pesquisador-web`. **NÃO dispara junta-5** (nenhum serviço
externo tarifado é decidido aqui — esta PD registra estado da arte, custo e limite).

**Dúvida:** o porteiro emite um recibo JSON (runtime, modelo, identidade do agente, veredito) que um script de
gate confere. Autor e porteiro rodam na MESMA máquina, no MESMO repositório, com o MESMO acesso a disco — e um
achador produziu recibo válido com `node -e`, sem modelo nenhum. Existe construção que o autor NÃO consiga
forjar?

### 1. A norma já classificou este caso: SLSA Build **L1**

| nível | frase normativa (verbatim) |
|---|---|
| Build **L1** | "Package has provenance showing how it was built. **Can be used to prevent mistakes but is trivial to bypass or forge.**" |
| Build **L2** | "**Forging the provenance or evading verification requires an explicit 'attack', though this may be easy to perform.**" |
| Build **L3** | "Forging the provenance (…) requires **exploiting a vulnerability that is beyond the capabilities of most adversaries**." |

**Esta tabela É a distinção tripwire × muro, em fonte normativa e graduada.**

A regra que o recibo viola (SLSA v1.2, build-requirements, verbatim):
> "**Every field in the provenance MUST be generated or verified by the build platform in a trusted control
> plane. The user-controlled build steps MUST NOT be able to inject or alter the contents.**"

**Consequência, e é fato e não interpretação:** um recibo escrito por um passo que o autor controla, num disco
que o autor controla, é **L1 por definição**. O `node -e` não é um furo do formato — é a caracterização do
nível. Nenhum campo adicional no JSON muda isso, porque todos os campos nascem do lado controlado. **O que
muda de nível é a MÃO que gera, não o CONTEÚDO gerado.**

### 2. No GitHub, o que é muro e o que é enfeite

- **Required status check com workflow no PRÓPRIO repo NÃO é muro.** Branch da mesma origem roda com secrets
  e executa o workflow do merge commit — editável pelo autor (GitHub Security Lab, "Preventing pwn requests").
- **A única construção que o autor com `write` não altera:** ruleset **de organização**, regra `workflows`,
  apontando workflow em **outro repositório**, **pinado a SHA**, bypass list **vazia**.
- **Assinatura só vale se a chave for inalcançável pelo passo atestado:** OIDC (`id-token: write`) → Fulcio,
  e o verificador **pina `workflow_ref`**, não o formato. Isso dá **SLSA Build L2** — declarado pelo próprio
  GitHub.
- **Se autor e org owner forem a mesma pessoa, nenhum controle do GitHub é muro** — é o "malicious insider"
  que o SLSA declara fora de escopo até L3.

### 3. Provar que um MODELO específico respondeu: **não existe**

Para API comercial fechada, hoje não há forma de provar que uma resposta veio do modelo X. AEX
(arXiv:2603.14283, 15/03/2026): "the API boundary **still offers little direct evidence** that a returned
output actually corresponds to the client-visible request"; TEE e fingerprinting "either remain inferential or
**answer different questions**". ZK de inferência custa minutos por consulta e foi demonstrado em modelos
pequenos.

**Corroboração de mercado:** o GitHub, no próprio produto, **recusa que revisão de IA satisfaça o portão
humano** — Copilot "always leaves a '**Comment**' review, not an 'Approve' review (…) **do not count toward
required approvals**". O maior fornecedor decidiu que revisão de IA é **sinal**, não **portão**.

### 4. Divergências registradas (A2 — não consolidar em silêncio)

1. **"unfalsifiable" × SLSA L2.** A mesma página do GitHub diz que as attestations são "**unfalsifiable**" e
   que entregam "SLSA Build Level 2" — e o SLSA define L2 como forjável "com um ataque explícito, que pode ser
   fácil de executar". As duas frases não são compatíveis. **Na dúvida, vale a graduação do SLSA.**
2. **Inferência verificável: fornecedor × academia.** Provedores TEE anunciam "prove which model ran"; o paper
   de mar/2026 diz que TEE atesta ambiente, não a correspondência requisição↔resposta.
3. **Bypass list.** O GitHub apresenta a regra de workflows como enforcement organizacional e documenta a
   bypass list como recurso normal ("break the glass"). Controle com bypass povoada não é o controle que o
   diagrama sugere.

### 5. Respostas diretas

**(a) É possível um gate que o autor do PR não consiga forjar?** Sim — com ressalva de raiz de confiança:
ruleset de **organização** + workflow em repo separado pinado a SHA + assinatura OIDC + verificador que pina
identidade. Nível atingido: **L2, não L3**. **Este repositório é de USUÁRIO, não de organização** — a regra
`workflows` de ruleset é org/Enterprise e **não existe aqui**.

**(b) Existe forma de provar que uma resposta veio de um modelo específico?** **Não**, para API comercial
fechada. O campo `model` de qualquer recibo é autodeclaração, em qualquer formato, com qualquer assinatura —
a assinatura prova quem escreveu o arquivo, nunca quem computou o conteúdo.

**(c) Onde a fronteira de confiança tem que ficar?** Fora do escopo de escrita de quem é controlado. Faltando
isso, o controle é L1: "can be used to prevent mistakes but is **trivial to bypass or forge**".

### 6. O que esta PD NÃO faz

Não escolhe arranjo e não opina sobre a implementação vigente. **Escolha de arranjo é de quem planeja**
(`D-JUNTA-SEPARACAO-DE-PAPEIS`).

### 7. Fontes

SLSA v1.1 Security levels · SLSA v1.2 Build requirements · SLSA v1.0/v1.2 Threats & mitigations · GitHub Docs
Artifact attestations · GitHub Docs OIDC reference · GitHub Security Lab "Preventing pwn requests" · GitHub
Docs Events that trigger workflows · GitHub Blog "Enforcing code reliability by requiring workflows with
repository rules" (11/10/2023) · GitHub Docs Available rules for rulesets · GitHub Docs Copilot code review ·
GitHub Docs Manage environments (Prevent self-review) · GitHub Docs About protected branches · Sigstore Fulcio
overview · in-toto Attestation Specification · arXiv:2603.14283 (AEX) · arXiv:2501.16007 (TOPLOC) ·
NIST SP 800-53 r5 AC-5 Separation of Duties.
