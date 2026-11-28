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

---

## PD-O6R-B06-OUTBOX-IN-DB — Captura transacional sem relay, `ON CONFLICT DO NOTHING` como idempotência e chave derivada da entidade (2026-09-06)

Rodada Ω6R · B-O6R-06 · Pesquisa `agente-pesquisador-web`, **16 fontes** (docs primárias PostgreSQL/Prisma >
catálogo de padrões microservices.io/AWS > produtos líderes de idempotência: Stripe, Shopify, AWS Builders'
Library). Regra da dúvida §C7.3. **BLOQUEIA:** `src/modules/cloud-usage/cloud-usage.outbox.ts`.
**Não decide o desenho** — levanta o que a evidência externa diz. Onde a fonte contraria o plano, está dito
com todas as letras.

> **Nota de proveniência (§A2).** A pesquisa foi executada pelo `agente-pesquisador-web`, que nesta sessão
> **não tinha ferramenta de escrita** (`Read`/`WebSearch`/`WebFetch` apenas). O texto abaixo é o devolvido por
> ela, **gravado pelo orquestrador**. Nenhuma fonte foi acrescentada nem removida na transcrição; quem ler
> deve saber que a transcrição é de terceiro, como já se registrou nos pareceres do `B-O6R-02` c5.

### 0. Como ler esta PD

**FATO** = o que a fonte diz, com citação. **RECOMENDAÇÃO** = conclusão do pesquisador, sem autoridade de
junta. **CONTRA-O-PLANO** = onde a evidência externa não sustenta uma afirmação do `B-O6R-06-plano.md`.

### 1. Transactional outbox sem relay — o que se ganha e o que se perde

**FATO (microservices.io).** O padrão resolve *"How to atomically update the database and send messages to a
message broker?"*. Garantias listadas: *"Messages are guaranteed to be sent if and only if the database
transaction commits"* e *"Messages are sent to the message broker in the order they were sent by the
application"*. O relay é constitutivo: *"The Message relay might publish a message more than once. It might,
for example, crash after publishing a message but before recording the fact that it has done so."*

**FATO (AWS Prescriptive Guidance).** A intenção é nomeada assim: *"The transactional outbox pattern resolves
the dual write operations issue that occurs in distributed systems when a single operation involves both a
database write operation and a message or event notification."* Entre "Issues and considerations":
*"Duplicate messages: … we recommend that you make the consuming service idempotent by tracking the processed
messages"*; *"Order of notification: Send messages or events in the same order in which the service updates
the database"*; *"Transaction rollback: Do not send out an event notification if the transaction is rolled
back."*

**CONTRA-O-PLANO (nomenclatura).** As duas fontes definem o padrão pelo **dual write para um segundo
sistema**. No desenho do §3.1 não há segundo sistema: o efeito é uma linha na mesma base, na mesma transação.
Logo **não é um Transactional Outbox** — é uma escrita atômica com chave única. A tabela do §3.4 ("Outbox → a
linha faturável") **redefine o termo do aceite** (`PLANO_O6R.md:12`), não o implementa. Isso não diz que o
desenho é pior: **para o problema do dual write, é estritamente mais forte** (não existe janela entre commit
e publicação porque não existe publicação). Diz que o plano não pode invocar a literatura do outbox como se
ela chancelasse a ausência de relay — a literatura só descreve o caso em que o relay existe. Quem julga o
aceite tem de julgar a **propriedade**, não a palavra.

**FATO — o que se perde ao não haver relay, item a item.**

- **Ordering** — o outbox entrega a ordem de publicação (fonte 1) e a AWS a trata como requisito de qualidade
  de dado. Sem tabela de eventos ordenada não há *replay ordenado* para nenhum consumidor futuro (motor de
  fatura, provedor externo de billing). Para `SUM` é irrelevante (soma é comutativa) — o plano acerta ao dizer
  que ordering não é dúvida **deste** desenho. Passa a ser dúvida no dia em que existir consumidor externo.
- **Retry desacoplado** — o relay converte falha de entrega em **nova tentativa**. Sem relay, a falha da
  escrita da métrica não tem retry próprio.
- **CONTRA-O-PLANO (acoplamento de disponibilidade, ausente do §10).** O §3.1 declara: *"se a medição falha, a
  run não commita e o chamador recebe erro"*. A consequência que o plano não escreve: **um defeito no
  faturamento passa a derrubar a operação de campo**. Qualquer exceção no caminho novo — `validateInput`
  lançando, `sanitizeCloudUsageMetadata` lançando, policy RLS negando `INSERT` em `cloud_usage_events` para o
  papel da aplicação, constraint futura — impede o técnico de **criar ou concluir uma vistoria**. Antes, o
  `.catch(warn)` degradava o faturamento e preservava a operação; depois, degrada os dois. É exatamente o
  acoplamento que o relay existe para evitar. A matriz de risco do §10 não tem linha para isso.

**RECOMENDAÇÃO.** (a) Julgar a entrega pela propriedade "nenhuma run commitada sem unidade faturável", não
pelo rótulo "outbox"; e **renomear** o arquivo/contrato para algo que descreva o que ele faz (captura
transacional / medição na transação), para não fixar no repositório um nome que a literatura reserva para
outra coisa. (b) Acrescentar ao §10 a linha de risco do acoplamento, com mitigação testável: o `build…` deve
ser **total** (nunca lançar para run válida) e o `append…` só pode falhar por indisponibilidade do banco — que
já derrubaria a run de qualquer forma. Um teste que injete `validateInput` lançando e prove que a run **não**
é criada é o vermelho honesto desse risco (hoje o §7 não tem esse caso).

### 2. `INSERT … ON CONFLICT DO NOTHING` como idempotência — armadilhas documentadas

**FATO (PostgreSQL, INSERT).** *"`ON CONFLICT DO NOTHING` simply avoids inserting a row as its alternative
action."* · *"For `ON CONFLICT DO NOTHING`, it is optional to specify a `conflict_target`; when omitted,
conflicts with **all usable constraints (and unique indexes)** are handled."* · sobre `RETURNING`: *"Only rows
that were successfully inserted or updated will be returned."*

**FATO (PostgreSQL, Transaction Isolation §13.2.2).** *"INSERT with an ON CONFLICT DO NOTHING clause may have
insertion not proceed for a row due to the outcome of another transaction whose effects are not visible to the
INSERT snapshot. Again, this is only the case in Read Committed mode."* Em **READ COMMITTED** (default do
PostgreSQL e do Prisma) o `DO NOTHING` é seguro sob concorrência; fora dele o mesmo statement pode devolver
`40001 serialization_failure` em vez de pular.

**FATO (PostgreSQL, tipos seriais).** *"A value allocated from the sequence is still 'used up' even if a row
containing that value is never successfully inserted into the table column."*

**FATO — ele mascara colisão legítima? SIM, em três formas.**

1. **Sem `conflict_target`, mascara conflito em QUALQUER unique/PK.** Um bug que gerasse `id` duplicado, ou uma
   unique nova adicionada por migração futura, seria engolido em silêncio pelo mesmo `DO NOTHING` que existe
   para dedup.
2. **Não distingue "já existia" de "não inseri"** — `RETURNING` só devolve linha inserida; `createMany`
   devolve só `{ count }`. O código **não consegue afirmar** pelo INSERT que a linha existe agora.
3. **Mascara divergência de payload.** Se a mesma chave for reescrita com `quantity` diferente (regra de run
   reaberta mudar; run reaberta e concluída de novo), o segundo INSERT é **descartado** e a quantidade
   **antiga** permanece — valor errado, silencioso, em coluna de dinheiro. Mesma classe de defeito que o bloco
   fecha, só relocada.

**CONTRA-O-PLANO (divergência concreta e verificável).** O §3.1 escreve a prosa como
`INSERT … ON CONFLICT (tenant_id, idempotency_key) DO NOTHING` mas **autoriza como equivalente**
`createMany({ data, skipDuplicates: true })`. **Não são equivalentes.** A doc oficial do Prisma mostra o SQL
gerado verbatim: `INSERT INTO "public"."User" (...) VALUES (...), (...) ON CONFLICT DO NOTHING` — **sem
conflict target**. A opção "A" do plano cai na armadilha (1). A "prova no log de query" que o §3.1 pede
confirmaria a **presença** da cláusula, não a **especificidade** — e é a especificidade que separa dedup de
mascaramento.

**RECOMENDAÇÃO.** Preferir `$executeRaw` com **alvo explícito** (`ON CONFLICT (tenant_id, idempotency_key) DO
NOTHING`), como já faz `createRunWithClientKey`. Se `createMany` for escolhido mesmo assim, registrar em
comentário e em teste que a cláusula é genérica, e acrescentar um caso que prove que colisão de `id` **não** é
silenciada (ou aceitar por escrito que é). Verificar se `cloud_usage_events` tem coluna com `DEFAULT
nextval()` — isso se mede, não se supõe. E fixar por asserção que a transação da run roda em **READ
COMMITTED**: um teste que suba o nível de isolamento troca "pula" por `40001`.

### 3. Por que `create` do Prisma seria pior aqui — CONFIRMADO, com o mecanismo correto

**FATO (PostgreSQL).** `23505 unique_violation` e `25P02 in_failed_sql_transaction` são condições nomeadas do
catálogo. O tutorial é explícito: *"`ROLLBACK TO` is the only way to regain control of a transaction block that
was put in aborted state by the system due to an error, short of rolling it back completely and starting
again."*

**FATO (Prisma).** Transação interativa: *"The transaction commits when the callback returns and rolls back
when it throws"* e *"Nothing inside the callback survives an error."* O issue `prisma/prisma#12862` documenta
que, sob transação interativa, o erro chega **obfuscado** — o chamador vê o `25P02` em vez do `P2002`,
tornando o `catch (P2002)` não confiável dentro da tx.

**Veredito.** A afirmação do plano está **correta no efeito**, mas o mecanismo a citar é do **PostgreSQL**, não
do Prisma: o erro põe a transação em estado abortado e todo comando seguinte falha até `ROLLBACK`. Prisma não
expõe `SAVEPOINT` em transação interativa, então não há como capturar o `23505` e continuar. `findUnique` +
`create` continua proibido por corrida.

### 4. Chave derivada da entidade vs UUID — a evidência está DIVIDIDA, e o plano cita só um lado

**FATO (Stripe).** *"How you create unique keys is up to you, but we suggest using V4 UUIDs, or another random
string with enough entropy to avoid collisions."* · *"You can remove keys from the system automatically after
they're at least 24 hours old."*

**FATO (Shopify).** *"Shopify tracks idempotency keys for 24 hours from the original request"*; para casos
determinísticos, sugere **UUID v5** derivado dos parâmetros.

**FATO (AWS Builders' Library).** O token e as mutações têm de ser **ACID juntos**: *"the process that combines
recording the idempotent token and all mutating operations related to servicing the request must meet the
properties for an atomic, consistent, isolated, and durable (ACID) operation."* E — **contra a chave
derivada** — prefere token **fornecido pelo chamador**, porque derivar *"doesn't work in all cases"*: um
cliente pode legitimamente querer duas requisições idênticas processadas separadamente.

**FATO (Gunnar Morling).** Contra o UUID aleatório: *"They require the consumer to store the UUIDs of all the
previous messages it ever has received in order to reliably identify a duplicate"* — recomenda chave
determinística.

**FATO (microservices.io, Idempotent consumer).** *"a consumer must be idempotent: the outcome of processing
the same message repeatedly must be the same as processing the message once"*, materializado por PK
`(subscriberId, messageID)`.

**Reconciliação honesta.** As duas recomendações não colidem: falam de **objetos diferentes**.
Stripe/Shopify/AWS descrevem **chave de idempotência de requisição HTTP do cliente** — por isso aleatória e com
TTL de 24 h. O plano cria **chave natural determinística de um fato derivado** (uma unidade faturável por
`(run, métrica)`), que não é requisição e não expira. Para esse objeto, Morling e o Idempotent Consumer
sustentam a chave derivada; e o estado **atual** do código (`idempotencyKey` a partir de `event.id =
randomUUID()` por emissão) é literalmente o modo de falha que Morling nomeia: chave nova a cada emissão
**nunca deduplica**.

**FATO — o que a evidência NÃO sustenta.** (a) **TTL:** Stripe/Shopify podam em 24 h; a chave derivada é
**permanente** — e precisa ser. Significa que a tabela **nunca** poderá ter poda por idade sem quebrar a
idempotência. Registrar. (b) A objeção da AWS aplica-se ao **script de reconciliação**, não ao append: o plano
já resolve deduplicando por `(source_type, source_id, metric_key)` e não pela chave nova — **correto**, e é a
decisão de desenho mais fina do §3.1. (c) **Coexistência:** linhas legadas (chave `event.id`) e novas (chave
estável) **não se deduplicam entre si**. O corolário que o plano não escreve: enquanto qualquer caminho legado
puder emitir, a mesma run pode ter **duas** linhas da mesma métrica — **dobra de cobrança**. O aceite C1 (o
ramo antigo não grava mais) é o que impede isso, e por isso é o teste mais importante do bloco.

### 5. "Exactly-once efetivo" — a expressão é defensável, com uma ressalva

**FATO.** As duas fontes de padrão dizem o mesmo: entrega at-least-once + consumidor idempotente. O termo
corrente é **effectively-once**; "exactly-once" estrito é demonstradamente impossível para entrega de mensagem.

**Ressalva.** No §3.1 **não há entrega nenhuma**, logo não há at-least-once. A propriedade obtida é uma
**invariante de banco** — no máximo uma linha por `(tenant_id, chave)` por unique constraint, e ao menos uma
por atomicidade da transação. Isso é **mais forte** que effectively-once; descrever com o vocabulário mais
fraco subvende a entrega e convida ataque.

**RECOMENDAÇÃO.** No `API_CONTRACTS.md`, documentar a invariante em linguagem de banco (unique + atomicidade),
citando "at-least-once + idempotência" apenas como analogia.

### 6. O que NÃO foi medido por esta PD

- **Nada foi executado.** Zero query, zero teste, zero leitura da base.
- **`debezium.io`** devolveu **HTTP 403** — a posição do Debezium sobre relay/CDC não veio de fonte primária.
- O **SQL efetivamente emitido** pelo `createMany` na versão **7.8.0** instalada não foi observado; a citação
  vem da doc oficial. Confirmar por log de query é obrigação do dev — e o que ele precisa conferir é o
  **alvo**, não a cláusula.
- Não foi encontrada fonte normativa que discuta o caso "consumidor é o mesmo banco" — a ausência é ela própria
  o achado do item 1.

### 7. Fontes

1. **microservices.io — Transactional outbox** — https://microservices.io/patterns/data/transactional-outbox.html (2026-09-06). Definição, papel constitutivo do relay, ordering, "publish more than once". Base do §1.
2. **microservices.io — Idempotent consumer** — https://microservices.io/patterns/communication-style/idempotent-consumer.html (2026-09-06). Dedup por PK na mesma transação do efeito. Base de §4 e §5.
3. **AWS Prescriptive Guidance — Transactional outbox** — https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html (2026-09-06). "dual write issue", duplicatas, ordem, rollback.
4. **PostgreSQL 18 — INSERT** — https://www.postgresql.org/docs/current/sql-insert.html (2026-09-06). `DO NOTHING`; conflict_target opcional ⇒ "all usable constraints"; `RETURNING`. Base de §2.
5. **PostgreSQL 18 — Transaction Isolation** — https://www.postgresql.org/docs/current/transaction-iso.html (2026-09-06). `DO NOTHING` sob concorrência só em Read Committed.
6. **PostgreSQL 18 — Numeric Types** — https://www.postgresql.org/docs/current/datatype-numeric.html (2026-09-06). Sequência "used up".
7. **PostgreSQL 18 — Error Codes** — https://www.postgresql.org/docs/current/errcodes-appendix.html (2026-09-06). `23505`, `25P02`, `40001`.
8. **PostgreSQL 18 — Transactions (tutorial)** — https://www.postgresql.org/docs/current/tutorial-transactions.html (2026-09-06). Estado abortado e `ROLLBACK TO`. Base de §3.
9. **Prisma ORM — Transactions** — https://www.prisma.io/docs/orm/prisma-client/queries/transactions (2026-09-06). "Nothing inside the callback survives an error".
10. **Prisma ORM — Client API reference (`createMany`)** — https://www.prisma.io/docs/orm/reference/prisma-client-reference (2026-09-06). `skipDuplicates`.
11. **Prisma ORM — CRUD, SQL gerado por `createMany`** — https://www.prisma.io/docs/orm/v6/prisma-client/queries/crud (2026-09-06). O verbatim `ON CONFLICT DO NOTHING` **sem conflict target**. **Fonte da divergência CONTRA-O-PLANO do §2.**
12. **prisma/prisma#12862** — https://github.com/prisma/prisma/issues/12862 (2026-09-06). Erro obfuscado sob transação interativa.
13. **Stripe — Idempotent requests** — https://docs.stripe.com/api/idempotent_requests (2026-09-06). UUID v4 e poda em 24 h.
14. **Shopify — Implementing idempotency** — https://shopify.dev/docs/api/usage/implementing-idempotency (2026-09-06). Janela de 24 h; UUID v5 determinístico como exceção.
15. **AWS Builders' Library — Making retries safe with idempotent APIs** — https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/ (2026-09-06). Token + mutações ACID juntos; preferência por token do chamador.
16. **Gunnar Morling — On Idempotency Keys** — https://www.morling.dev/blog/on-idempotency-keys/ (2026-09-06). Contrapeso a 13/14/15.

---

## PD-O6R-B06-SUM-NUMERIC-RLS — `SUM`/`GROUP BY` no banco sobre coluna monetária, sob `FORCE ROW LEVEL SECURITY`, via Prisma 7 + `@prisma/adapter-pg` (2026-09-06)

Rodada Ω6R · B-O6R-06 · Pesquisa `agente-pesquisador-web`, **14 fontes**. Regra da dúvida §C7.3.
**BLOQUEIA:** `summarizeLineItems` (`aws-cur-prisma.repository.ts`) e `sumUsageBasis`
(`cloud-cost-allocation-prisma.repository.ts`). Mesma nota de proveniência da PD anterior.

**Terreno medido para esta PD** (leitura de `package.json` no worktree `b06`): `@prisma/client ^7.8.0` **e
`@prisma/adapter-pg ^7.8.0`**. O plano **não menciona** o driver adapter, e ele muda o caminho do `numeric` —
§1.3.

### 1. Precisão: `SUM` sobre `numeric` e o caminho até o JS

**1.1 FATO (PostgreSQL, funções de agregação).** `sum ( numeric ) → numeric` · `sum ( bigint ) → numeric` ·
`sum ( real ) → real` · `sum ( double precision ) → double precision`. Somar `numeric` **devolve `numeric`** —
não há promoção a ponto flutuante.

**1.2 FATO (PostgreSQL, tipos numéricos).** *"The type `numeric` … is especially recommended for storing
monetary amounts and other quantities where exactness is required."* E: *"The data types `real` and `double
precision` are **inexact**… If you require exact storage and calculations (such as for monetary amounts), use
the `numeric` type instead."* Contrapartida honesta, na mesma página: *"calculations on `numeric` values are
very slow compared to the integer types, or to the floating-point types."*

**Conclusão do item.** Somar no banco em `Decimal(20,6)` é **exato**. Acumular em `number` no processo — que é
o que `sumCosts` faz hoje (`total += line.unblendedCost`) — é inexato **por tipo**, independentemente do teto
de 10.000 linhas. **O DIN-007 tem dois defeitos superpostos:** o truncamento (que o achado nomeia) e a
acumulação em float (que ele **não** nomeia). Fechar só o primeiro deixa o segundo.

**1.3 FATO (Prisma + driver adapter).** `Decimal` no Prisma é **decimal.js**: *"`Decimal` fields are
represented by the `Decimal.js` library."* Em Prisma 7 o driver adapter é obrigatório; para PostgreSQL é
`@prisma/adapter-pg` (node-postgres). O issue `prisma/prisma#23505` documenta que o adapter **registra type
parsers globais do node-postgres**, sobrepondo os nativos — valores passam a chegar **como string**. Somado ao
princípio do node-postgres (*"node-postgres will convert a database type to a JavaScript string if it doesn't
have a registered type parser"*) e ao fato de `numeric` (OID 1700) não ter parser numérico por default, o
caminho é: **`numeric` → texto no wire → `Decimal` no client**. **Não há `float` no meio.**

**FATO — onde a precisão SE PERDE, então.** Só na conversão final para `number`. `decimal.js` documenta que
`toNumber()` cai no double de 64 bits. E há uma armadilha adicional **não citada pelo plano**: o `precision` de
decimal.js tem **default 20 dígitos significativos** e *"All functions which return a Decimal will round the
return value to `precision` significant digits"* — as exceções **não incluem** `plus`, `minus` nem `times`.
**Somar `Decimal` em JS também arredonda**, a 20 significativos. Não é problema para `Decimal(20,6)`, mas
destrói a ideia de que "somar Decimal em JS é seguro por definição".

**RECOMENDAÇÃO.** Somar **no banco** (o plano acerta). Manter coluna e retorno do repositório em
`Decimal`/string até a borda HTTP; converter **uma vez**, no serializador. Registrar o teto do `number`: com 6
casas decimais, um total ≥ ~1e10 já ultrapassa os ~15-16 dígitos significativos exatos do double — o risco #6
do §10 está na **ordem de grandeza certa** e é conservador. Um teste com total acima do teto, provando que
`Decimal.toString()` bate com o SQL e que o `number` **não** bate, é o vermelho honesto dessa linha.

### 2. `groupBy`/`aggregate` do Prisma: há truncamento implícito?

**2.1 FATO (SQL gerado, doc oficial).** A doc mostra o SQL do `groupBy`: `SELECT …, SUM(…), COUNT(*) FROM … 
WHERE 1=1 GROUP BY … HAVING AVG(…) >= $1 ORDER BY … OFFSET $2`. `SUM`/`COUNT`/`GROUP BY`/`HAVING` **no
banco**, sem reduce no cliente. A premissa do §3.2/§3.3 está sustentada por SQL verbatim.

**2.2 FATO — não há `take` implícito, mas há armadilha de versão.** `take`/`skip` são opções **explícitas**;
nada indica limite default. Mas a nota de release `v8.0.0-rc.4-dev.12` (fix #30067) revela o comportamento das
versões anteriores — e **7.8.0 está entre elas**: *"The window the caller asked for was discarded silently — no
error, no warning, just a confident wrong number"*, e *"**Behaviour change.** Any existing chain combining
`take` / `skip` / `cursor` / `distinct` / `distinctOn` with a root `.aggregate()` returns a different number
after this merges — the correct one."*

**Leitura para este bloco.** Em **7.8.0**, `aggregate()` **ignora** `take`/`skip` — o total é o do `where`
inteiro, que é o que o bloco quer. Mas é **comportamento pinado na versão**: se um `take` entrar por descuido
no `aggregate` do resumo, hoje não faz nada e **no upgrade para Prisma 8 passa a fazer** — e o total de
faturamento muda sem que uma linha do bloco seja tocada. `groupBy`, ao contrário, **honra** `take`/`skip`.

**RECOMENDAÇÃO.** Além de "não passar `take`", **asseverar por teste** que o objeto de argumentos de
`aggregate`/`groupBy` não contém `take`/`skip`/`cursor`/`distinct` — asserção barata que sobrevive ao upgrade
de major. Anotar a dependência de versão no comentário do repositório.

**2.3 O que NÃO foi possível confirmar.** Não há fonte oficial sobre limites de `where` complexo em agregação
nem sobre teto de número de grupos. **Ausência de limite documentado não é prova de ausência de limite** — se o
desenho depender disso, mede-se por execução com N grande.

### 3. RLS e agregação — a armadilha é silenciosa e é da mesma família do defeito que o bloco fecha

**3.1 FATO (PostgreSQL, Row Security Policies).** *"Superusers and roles with the `BYPASSRLS` attribute
**always** bypass the row security system when accessing a table. Table owners **normally bypass** row security
as well, though a table owner can choose to be subject to row security with `ALTER TABLE … FORCE ROW LEVEL
SECURITY`."* Sobre a ordem: *"This expression will be evaluated for each row **prior to any conditions or
functions coming from the user's query**… Rows for which the expression does not return `true` will not be
processed."* E: *"If no policy exists for the table, a default-deny policy is used."*

**3.2 FATO (PostgreSQL, CREATE POLICY).** *"Any rows for which the expression returns false **or null** will
not be visible to the user (in a `SELECT`)… Typically, such rows are **silently suppressed; no error is
reported**."*

**Consequência direta para `SUM`.** A policy filtra **antes** da agregação. Um `SUM` sob RLS soma apenas as
linhas visíveis e devolve número **menor, sem erro e sem aviso** — literalmente a mesma classe de defeito do
`take: 10_000` que o DIN-007 acusa, movida da camada de aplicação para a de segurança. **Trocar truncamento
por RLS mal contextualizada não é conserto; é troca de causa.**

**3.3 FATO (contexto por GUC).** `current_setting(name, missing_ok)`: *"If there is no such setting,
`current_setting` throws an error unless `missing_ok` is supplied and is `true` (in which case NULL is
returned)."* `SET LOCAL`: *"The effects of `SET LOCAL` last only till the end of the current transaction"* ·
*"Issuing this outside of a transaction block emits a warning and otherwise has no effect."*

**Os três modos de falha, todos silenciosos:**

- **GUC não setada** → `current_setting(…, true)` = NULL → policy não retorna true → **zero linhas**. Para
  `sumUsageBasis` vira `[]` → `missing_usage_basis` → custo `unallocated`. **Faturamento sem erro e sem
  número.**
- **`SET` sem `LOCAL` em pool de conexões** → o valor **sobrevive** à requisição e contamina a próxima que
  pegar a mesma conexão → **vazamento entre organizações** numa consulta de dinheiro. É pior.
- **`SET LOCAL` fora de transação** → warning e **nenhum efeito** → volta ao primeiro caso.

**3.4 CI × produção — confirmado que a suíte, como configurada, NÃO consegue provar o caminho.** O §2.4-b do
plano afirma que dev/CI rodam como `postgres` (superusuário). Cruzado com 3.1: **todo teste de RLS que rode
como `postgres` passa por bypass** e não exerce a policy — nem com `FORCE ROW LEVEL SECURITY`, porque `FORCE`
sujeita o **dono**, não o superusuário. O drill do §8.2 com papel **sem `BYPASSRLS` e não-superusuário** não é
rigor extra: é a **única** configuração em que o resultado significa alguma coisa. **A hipótese do plano está
corroborada pela doc.**

**3.5 Nota de desenho.** Sob contexto RLS de um único tenant, o `groupBy({ by: ["tenant_id", …] })` do §3.2 é
redundante — inofensivo, e útil como **canário**: mais de um `tenant_id` num grupo prova que o contexto não
estava aplicado. **RECOMENDAÇÃO:** afirmar isso por asserção, e tratar `[]` como **suspeita**, não como "tenant
sem uso" — hoje os dois estados são indistinguíveis, e um deles é bug de cobrança.

### 4. `NULL` em agregação — a armadilha clássica de cobrança, e contradiz um tipo do plano

**4.1 FATO (PostgreSQL).** *"It should be noted that except for `count`, these functions return a null value
when no rows are selected."* E: *"In particular, `sum` of no rows returns **null, not zero as one might
expect**… The `coalesce` function can be used to substitute zero…"*

**4.2 FATO (Prisma, mudança na 2.21.0 — `prisma/prisma#6320`).** *"All aggregated fields, whether they are
nullable or not, **will be nullable**. They will return null when there's either no record in the database, or
if all the aggregated records are null."* E: *"The only exception is `count`, which will **still always return
0**."* O Prisma 7 do repo está do lado do `null`.

**CONTRA-O-PLANO.** O §3.3 declara `summarizeLineItems(filters): Promise<CloudCostSummaryRows>` com
**`{ total: Decimal|string, … }`** — tipo **não-nulável**. Pela evidência acima,
`aggregate({ _sum: { unblended_cost: true } })` devolve **`_sum.unblended_cost === null`** sempre que o filtro
não casar nenhuma linha (período novo, organização sem custo, `serviceCode` inexistente) — estado **normal**,
não excepcional. Idem `_sum.quantity` em `sumUsageBasis`. Desfechos possíveis, todos ruins e todos vistos em
produção de billing: `null` vazando para o JSON e o painel exibindo `R$ NaN`; `Number(null) === 0` mascarando a
diferença entre "sem custo" e "sem dado"; ou um `?? 0` sem distinção — que é **exatamente** o `|| 0` que a
`feedback-honest-kpi-dashboard` já registrou como fabricador de número falso **neste** repositório.

**RECOMENDAÇÃO.** (a) Tipar o retorno como **nulável** e decidir por contrato o que `total = null` significa
(sugestão: `total: "0"` **só** quando `lineItemCount === 0`, e **erro** se `lineItemCount > 0` e `total` for
`null` — combinação impossível que denuncia bug). (b) `_count._all` devolve `0` (nunca `null`) e por isso é o
**discriminador** correto entre "janela vazia" e "soma nula". (c) Caso de teste com período vazio, asseverando
a forma exata da resposta, é obrigatório. (d) `COALESCE` no SQL **apaga a distinção**; preferir tratar no
repositório, onde ela ainda existe.

### 5. O que NÃO foi medido por esta PD

- **Nada foi executado.** Nenhuma query, nenhum `EXPLAIN`, nenhum contato com banco.
- O exemplo oficial de RLS do Prisma caiu por `socket hang up`; §3.3 repousa **só** nas docs do PostgreSQL — a
  fonte mais forte disponível.
- O `conversion.ts` do `@prisma/adapter-pg` devolveu **404**; o caminho `numeric → texto → Decimal` do §1.3 está
  sustentado pelo issue #23505 + princípio do node-postgres, **não** por leitura do parser.
- Não foi medido `groupBy` com `where` relacional complexo, nem teto de nº de grupos.
- Não foi verificado qual papel de banco a produção usa (o plano já declara isso como não medido).

### 6. Fontes

1. **PostgreSQL 18 — Aggregate Functions** — https://www.postgresql.org/docs/current/functions-aggregate.html (2026-09-06). `sum(numeric) → numeric`; *"sum of no rows returns null"*. Base de §1.1 e §4.1.
2. **PostgreSQL 18 — Numeric Types** — https://www.postgresql.org/docs/current/datatype-numeric.html (2026-09-06). `numeric` exato para dinheiro; float inexato; "very slow".
3. **PostgreSQL 18 — Row Security Policies** — https://www.postgresql.org/docs/current/ddl-rowsecurity.html (2026-09-06). `BYPASSRLS` sempre bypassa; `FORCE` sujeita o dono; policy antes das condições; default-deny.
4. **PostgreSQL 18 — CREATE POLICY** — https://www.postgresql.org/docs/current/sql-createpolicy.html (2026-09-06). *"silently suppressed; no error is reported"*.
5. **PostgreSQL 18 — SET** — https://www.postgresql.org/docs/current/sql-set.html (2026-09-06). `SET LOCAL` fora de transação: warning e nenhum efeito.
6. **PostgreSQL 18 — System Administration Functions** — https://www.postgresql.org/docs/current/functions-admin.html (2026-09-06). `current_setting(…, true)` → NULL.
7. **Prisma ORM — CRUD (reference)** — https://www.prisma.io/docs/orm/v6/prisma-client/queries/crud (2026-09-06). SQL verbatim do `groupBy`.
8. **Prisma ORM — Client API reference** — https://www.prisma.io/docs/orm/reference/prisma-client-reference (2026-09-06). `take`/`skip` explícitos em `aggregate`/`groupBy`.
9. **prisma/prisma — release `v8.0.0-rc.4-dev.12` (fix #30067)** — https://github.com/prisma/prisma/releases/tag/v8.0.0-rc.4-dev.12 (2026-09-06). *"discarded silently"*; behaviour change de `aggregate()`.
10. **prisma/prisma#6320** — https://github.com/prisma/prisma/issues/6320 (2026-09-06). Todo campo agregado **nulável** desde 2.21.0; `count` continua 0. **Fonte do CONTRA-O-PLANO do §4.**
11. **Prisma ORM — Fields & types** — https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types (2026-09-06). `Decimal` = decimal.js.
12. **decimal.js — API docs** — https://mikemcl.github.io/decimal.js/ (2026-09-06). `precision` default 20; arredondamento em `plus`/`minus`/`times`; perda em `toNumber()`.
13. **prisma/prisma#23505** — https://github.com/prisma/prisma/issues/23505 (2026-09-06). Adapter registra parsers **globais**; valores chegam como string.
14. **Prisma ORM — Upgrade to Prisma ORM 7** — https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7 (2026-09-06). Driver adapter obrigatório; `@prisma/adapter-pg`.

---

## PD-O6R-B07B-CLAMD-INSTREAM — antivírus real para o gate de upload: protocolo INSTREAM do clamd, limites que dão "limpo" por engano, deploy, licença, custo e semântica fail-closed (2026-09-11)

> **Adendo executado em 2026-10-31 — B-AV-REAL.** Imagem escolhida:
> `clamav/clamav:1.4.6@sha256:982e28f90061d0e66eb03276419f589a47c9fa601e985e472fc2f6c64b497ca0`
> (~~OCI multi-arquitetura~~ manifesto `linux/amd64` + atestação (`docker manifest inspect`): **só amd64**; Graviton/ARM exige tag `-debian` com digest próprio (PD S8); linux/amd64 `sha256:6ba4e78b…b0e6a3`). Config efetiva: `StreamMaxLength
> 110M`, `MaxFileSize 120M`, `MaxScanSize 200M` no serviço normal; `3M`/`1M`/`2M` no serviço de
> limites; `AlertExceedsMax yes` nos dois. O digest não detectou EICAR meramente anexado a PNG, então
> a prova HTTP usa a alternativa B planejada: HDB de teste determinística, montada somente em dev/CI;
> o mesmo daemon provou a fixture como `FOUND` antes de a via V1 responder 422. Medição real também
> confirmou que o excesso de INSTREAM chega sem prefixo: `INSTREAM size limit exceeded. ERROR\0`.

> **Origem e consumidor.** Pesquisa do `agente-pesquisador-web` (sessão em Opus 5), 2026-09-11, **54 fontes**,
> todas acessadas nessa data. Consumidor: o bloco `B-AV-REAL`, que fecha o residual do `Ω6R-SEC-004`
> (`P-O6R-B07B-SCANNER-AV-REAL`: com `NODE_ENV=production` a factory do scanner só tem `noop` ou
> `unavailable`, e **todo upload de produção e staging responde 503** nas 5 vias). **Esta PD não decide
> nada.** Serviço novo com custo recorrente é decisão de **junta unânime de 5** (§C7.1); esta página é o insumo
> dela, registrado **antes** da decisão (§C7.3).
>
> **Transcrição.** O `agente-pesquisador-web` só tem WebSearch, WebFetch e Read — não grava arquivo, e o
> arquivo de saída da tarefa ficou vazio. O texto abaixo é o **retorno final do agente**, transcrito pelo
> orquestrador **sem edição de conteúdo** (só `&lt;`/`&gt;` convertidos para `<`/`>`). Legenda do próprio
> agente: **[F]** fato documentado · **[I]** inferência · `Sn` = fonte na §10.

### 0. Síntese
1. **INSTREAM:** `zINSTREAM\0`, depois chunks `<uint32 big-endian><dados>`, terminando em `00 00 00 00`. A resposta é `stream: OK`, `stream: <assinatura> FOUND` ou `stream: <msg> ERROR`, terminada em `\0`. Health check: `zPING\0` responde `PONG` (S1, S2).
2. **Dá para aceitar "limpo" por engano.** Acima de MaxFileSize/MaxScanSize a varredura para no limite e o arquivo sai como **OK**, a menos que `AlertExceedsMax yes` esteja ligado (S6). Acima de StreamMaxLength o clamd responde ERROR e fecha a conexão (S2, S46).
3. **RAM oficial:** mínimo 3 GiB, ideal 4 GiB (cerca de 1,2 GiB só para carregar as assinaturas e 2,4 GiB durante o reload). O boot pode levar minutos: o healthcheck da imagem espera até 6 min (S7, S9).
4. **Fly:** app privada na rede 6PN (WireGuard, `.internal`), cerca de US$ 25,51/mês com shared-cpu-2x de 4 GB em gru. **AWS:** Fargate em subnet privada com Service Connect TCP, cerca de US$ 38–73/mês, mais NAT se ainda não existir.
5. **Licença:** GPLv2 falada por socket é tratada como programa separado pelo FAQ da FSF, e a GPLv2 não restringe a execução (S18, S19). Isto não é parecer jurídico.
6. **Fail-closed:** veredito que depende só do arquivo (FOUND, incluindo `Heuristics.Limits.Exceeded`) vira 422. Falha de infraestrutura ou de protocolo vira 503 com Retry-After. Nunca se deduz OK.
7. **Recomendação:** ClamAV 1.4 (LTS) com configuração explícita e cliente `node:net` estrito. O GuardDuty S3 é assíncrono e fica só como comparação.

### 1. Protocolo INSTREAM e limites
- **[F] Framing:** o prefixo `z` usa NUL como terminador (recomendado) e o `n` usa newline. O daemon responde no mesmo estilo; comandos sem prefixo são legado (S1). Depois de `zINSTREAM\0` vêm chunks "4-byte unsigned length in network byte order, followed by that many bytes", e o fim é um chunk de tamanho zero `00 00 00 00` (S1, S2).
- **[F] Formato das respostas:** os exemplos oficiais são `stream: OK`, `stream: Eicar-Signature FOUND` e `stream: Access denied ERROR` (S1).
- **[F] Comandos auxiliares:**
  - `PING` responde `PONG`.
  - `VERSION` mostra a versão do programa e do banco; pode ser desligado com `EnableVersionCommand`.
  - `RELOAD` exige `EnableReloadCommand`.
  - Dentro de `IDSESSION` as respostas podem chegar fora de ordem (S1).
  - Um formato de VERSION visto na prática é `ClamAV 1.0.7/27547/Wed Feb 12 18:40:34 2025` (versão/daily/data). Isso veio de um trecho de fórum num resultado de busca, fonte secundária.
- **[I]** Usar uma conexão por varredura, sem IDSESSION. Ler a data que o VERSION devolve para medir a idade do banco.
- **[F] StreamMaxLength excedido:** o clamd "will reply with INSTREAM size limit exceeded and close the connection" (S2). A string que chega no socket é `INSTREAM size limit exceeded. ERROR`. Um cliente que continua escrevendo leva EPIPE antes de conseguir ler a resposta (S46).
  - Com clientes Node aparece "INSTREAM: Size limit reached, (requested: 65536, max: 0)" (issue aberta, sem resolução, S47).
- **[F] Defaults do ClamAV 1.4.x** (S3, iguais no `clamd.conf.sample` da main, S4):

  | Opção | Default |
  |---|---|
  | StreamMaxLength | 100M |
  | MaxFileSize | 100M |
  | MaxScanSize | 400M |
  | MaxRecursion | 17 |
  | MaxFiles | 10000 |
  | MaxScanTime | 120000 ms |
  | ReadTimeout | 120 s |
  | CommandReadTimeout | 30 s |
  | SendBufTimeout | 500 ms |
  | MaxThreads / MaxQueue | 10 / 100 |
  | SelfCheck | 600 s |
  | ConcurrentDatabaseReload | yes |
  | AlertExceedsMax | **no** |

  Versões antigas tinham outros valores; ver C1 e C2 na §7.
- **[F] Limite excedido não gera erro, gera OK.** Texto do man page do clamdscan 1.5.4: "If a file or an archive is larger than the default or configured size (see MaxFileSize and MaxScanSize options in clamd.conf) scanning will abort at the limit, and the file will be marked as "OK"." Com `AlertExceedsMax` ligado, o resultado passa a ser `Heuristics.Limits.Exceeded... FOUND`, e "such a FOUND message does not imply infection" (S6). O alerta cobre MaxFileSize, MaxScanSize e MaxRecursion (S3, S4).
- **[F] Bugs conhecidos do AlertExceedsMax:**
  - #670: devolvia "Can't allocate memory ERROR" no lugar da heurística; foi fechada pelo PR #999 (S44).
  - #1147: na 1.4.3, estouro de MaxScanTime aparecia como MaxScanSize. Isso vem do resumo de busca; não li a issue inteira (S45).
- **[F]** A seção "Limits" do clamd.conf existe para "protect your system against Denial of Service attacks using archive bombs" (S4).
- **[I] Resposta direta à pergunta 1:**
  - Com a configuração default, **sim**, um arquivo pode sair "limpo" por engano.
  - O caminho não é o StreamMaxLength (esse dá ERROR). É o MaxFileSize, o MaxScanSize, o MaxRecursion e, provavelmente, o MaxScanTime quando `AlertExceedsMax` está desligado.
  - PDF é contêiner (streams comprimidos, anexos), então MaxScanSize e MaxRecursion valem mesmo para arquivos de 10–20 MB.
  - Defesa em três camadas:
    - (a) o ERP recusa o arquivo acima do próprio limite antes de abrir o socket;
    - (b) StreamMaxLength fica acima do limite do ERP com margem, e MaxFileSize fica acima do StreamMaxLength;
    - (c) `AlertExceedsMax yes`, com o cliente tratando `Heuristics.Limits.Exceeded*` como não-limpo.

### 2. Deploy
**2.1 Imagem oficial**
- **[F] Tags na API do Docker Hub:**
  - `latest`, `stable`, `1.5` e `1.5.4` apontam para a mesma imagem (158,7 MB, atualizada em 07/09/2026).
  - `1.4` aponta para a `1.4.6` (155,2 MB).
  - As variantes `_base` vêm sem banco (45,9 MB).
  - As imagens Alpine são **só amd64**; as variantes `-debian` têm amd64, arm64 e ppc64le (S8).
- **[F] Banco embutido:** só as tags `_base` vêm sem banco. "The non-base version will only ever be updated to have newer signature databases" (S7).
- **[F] Tag recomendada:** a documentação manda escolher a tag da feature release (ex.: `clamav/clamav:1.4`) e desaconselha `latest`/`stable` em produção sem avaliação (S7).
- **[F] Ciclo de vida:**
  - A 1.4 é a LTS atual: publicada em 15/08/2024, EOL em 15/08/2027.
  - A 1.5 é feature release de 07/10/2025, não-LTS.
  - Versões até a 0.105 são bloqueadas no CDN (S12, S16).
  - A 1.5 passou a aceitar arquivos `.cvd.sign`; quando eles não existem, volta à verificação antiga (S16).
- **[F] Container:** roda como `clamav` (UID 100) e expõe as portas 3310 e 7357. O HEALTHCHECK usa `clamdcheck.sh` (manda PING, espera PONG) com start-period de 6 min (S9, S11).
- **[F] Entrypoint:**
  - Se não há banco, roda o freshclam antes de subir o clamd.
  - Depois sobe `freshclam --checks=${FRESHCLAM_CHECKS:-1} --daemon`.
  - Espera o socket do clamd até `CLAMD_STARTUP_TIMEOUT`, default 1800 s (S7, S10).
  - `CLAMAV_NO_FRESHCLAMD` desliga o freshclam (S7).
- **[F] Sem proteção na rede:** "Extreme caution is to be taken when using clamd over TCP as there are no protections on that level. All traffic is un-encrypted." (S7).

**2.2 Memória, boot e reload**
- **[F] RAM:** "Minimum: 3 GiB; Preferred: 4 GiB". São cerca de 1,2 GiB só para carregar as assinaturas e cerca de 2,4 GiB por um período curto, uma vez por dia, ao carregar novas definições (S7).
- **[F] Reload:**
  - Com `ConcurrentDatabaseReload yes` (default), o clamd carrega um segundo motor enquanto continua varrendo com o primeiro (S4).
  - Com `no`, economiza RAM, mas a varredura fica bloqueada durante o reload (S7).
  - `TestDatabases no` no freshclam reduz RAM, com o risco de manter um banco quebrado (S7, S15).
- **[F] Atualização:**
  - No freshclam.conf 1.4.4, `Checks` tem default de 12 por dia.
  - `NotifyClamd` avisa o clamd para recarregar (S15).
  - O `SelfCheck` do clamd verifica o banco a cada 600 s (S3).
- **[F] CDN:**
  - HTTP 429 significa rate limit.
  - 403, 503 e 1020 significam bloqueio, versão EOL ou download feito do jeito errado.
  - Scripts com curl/wget são recusados (S13).
  - Espelho privado: cvdupdate com `DatabaseMirror` ou `PrivateMirror` (S14).
  - A documentação pede volume persistente para não baixar o banco inteiro repetidamente (S7).
- **[I] Tempo de boot:** não há número oficial. Os valores do próprio empacotamento (start-period de 6 min, timeout de 1800 s) indicam que minutos são esperados. É preciso medir, e não dá para usar autostop nem scale-to-zero.

**2.3 Fly.io (gru)**
- **[F] Rede 6PN:**
  - Malha WireGuard em IPv6 entre as apps da mesma organização.
  - Nomes `<app>.internal`, `<região>.<app>.internal` e `top<N>.nearest.of.<app>.internal`.
  - Outras organizações ficam bloqueadas.
  - O serviço precisa escutar em `fly-local-6pn`.
  - App sem IP público fica privada (S20).
- **[F] IPv6 no clamd:** o `TCPAddr` "can be specified multiple times... IPv6 is now supported" (S4).
- **[F] Flycast:** exige bind em `0.0.0.0` e diz "Flycast is HTTP-only" (S21). Mas o Fly Proxy "If you don't specify handlers, we just forward TCP to your app as-is" (S22). Ver C5.
- **[F] Máquinas:**
  - A região gru está disponível (S26).
  - CPU compartilhada tem baseline de 6,25% por vCPU, com burst de até 500 s acumulados (S24).
  - O máximo de RAM é 2 GB por CPU compartilhada (S25).
- **[I] Desenho:**
  - Uma app separada (`erp-clamav`), sem `[[services]]` e sem IP público.
  - `TCPAddr` em IPv6 na porta 3310.
  - Volume montado em `/var/lib/clamav` e uma máquina sempre ligada.
  - O backend conecta em `erp-clamav.internal:3310`, o que evita a ambiguidade do Flycast.

**2.4 AWS (ECS/Fargate)**
- **[F] Fargate:**
  - O modo de rede `awsvpc` é obrigatório.
  - Em subnet privada, puxar a imagem exige NAT ou endpoint do ECR.
  - ARM64 é suportado (S29).
  - Combinações válidas: 0,5 vCPU com 1–4 GB e 1 vCPU com 2–8 GB (S29).
  - 20 GB de disco efêmero estão incluídos; a cobrança é por segundo, com mínimo de 1 min (S30).
- **[F] Service Connect:**
  - Usa um namespace do Cloud Map.
  - O proxy roda dentro da task e divide CPU/RAM com ela.
  - Não tem custo adicional; TLS é opcional e usa AWS Private CA, que é paga (S27).
  - Com protocolo TCP só existe `idleTimeout` (default 1 h); não há `perRequestTimeout` (S28).
- **[F]** Endpoint de gateway para S3 não é cobrado (S32).
- **[I] Desenho:**
  - Security Group de entrada na porta 3310 só a partir do SG do backend (prática padrão da AWS, não pesquisei).
  - O timeout de cada varredura fica no cliente, porque o Service Connect não oferece.
  - O freshclam sai pela NAT ou por um espelho cvdupdate servido de S3 via endpoint de gateway.
  - Em Graviton é preciso a tag `-debian`, porque a Alpine é só amd64 (S8).

### 3. Licença e custo
- **[F] Licença:** "ClamAV is licensed... under the GNU General Public License, Version 2 (GPLv2)". O unrar é carregado em tempo de execução, não linkado (S17).
- **[F] O que a GPLv2 diz:**
  - §0: "The act of running the Program is not restricted".
  - §2: juntar outra obra num mesmo meio de armazenamento ou distribuição não traz essa obra para o escopo da licença (S19).
- **[F] FAQ da FSF:** "Pipes, sockets and command-line arguments are communication mechanisms normally used between two separate programs..." Ressalva: "if the semantics of the communication are intimate enough, exchanging complex internal data structures, that too could be a basis to consider the two parts as combined" (S18).
- **[I] Aplicado ao ERP:**
  - Container oficial sem modificação, falando um protocolo textual (bytes do arquivo e uma string de veredito), são programas separados, sem obrigação para o código do ERP.
  - (a) Escrever o cliente a partir da documentação, sem copiar código GPL.
  - (b) Se o ERP um dia **distribuir** a imagem (on-prem ou white-label), as obrigações da GPL passam a valer para o ClamAV distribuído.
  - (c) Não é parecer jurídico.

**Custos** (mês de 730 h):

| Opção | Base | US$/mês |
|---|---|---|
| Fly gru shared-cpu-2x 4 GB | S23 | 25,51 |
| Fly gru shared-cpu-4x 4 GB | S23 | 27,17 |
| Fly gru performance-1x 4 GB | S23 | 66,24 |
| Volume de 1 GB na Fly | S23 (US$ 0,15/GB, preço de referência) | ~0,15 |
| Fargate sa-east-1 ARM, 0,5 vCPU / 4 GB | S31: US$ 0,0557 por vCPU-h e 0,0061 por GB-h | ~38,1 |
| Fargate sa-east-1 ARM, 1 vCPU / 4 GB | S31 | ~58,5 |
| Fargate sa-east-1 x86, 1 vCPU / 4 GB | **não confirmado** (C6) | ~43–73 |
| NAT Gateway sa-east-1, se ainda não existir | S33 (fonte secundária): US$ 0,093/h + 0,093/GB | ~67,9 + tráfego |

**[I]** Com CPU compartilhada, o reload diário e os PDFs grandes consomem o burst. Se a fila crescer, performance-1x.

### 4. Semântica fail-closed
**[F] Base normativa:**
- **ASVS 4.0.3:** 12.4.2 (níveis L1–L3) exige varrer arquivos vindos de fonte não confiável; 12.1.1 exige recusar arquivos grandes; 12.2.1 exige validar o tipo pelo conteúdo (S52).
- **OWASP:** fail safe é negar por padrão quando há erro (S54). O cheat sheet de upload recomenda antivírus, sandbox ou CDR e limite de tamanho (S53).
- **RFC 9110:** 503 é "temporariamente incapaz" e SHOULD trazer Retry-After; 422 é "entendi, mas não consigo processar"; 413 é "conteúdo grande demais" (S51).
- **Node.js:** o timeout de socket "will not be severed"; é preciso chamar `destroy()` (S50).

| Situação | Fonte | Classe [I] | HTTP [I] |
|---|---|---|---|
| `stream: OK` exato, arquivo dentro do limite do ERP, `AlertExceedsMax yes` | S1, S6 | limpo | segue |
| `stream: <assinatura> FOUND` | S1 | rejeitado (malware) | 422 |
| `stream: Heuristics.Limits.Exceeded* FOUND` | S3, S6 | rejeitado (não verificável), com motivo distinto de malware | 422, terminal |
| Arquivo acima do limite do ERP | S52, S51 | recusado antes do scanner | 413 (ou o 422 do contrato) |
| `INSTREAM size limit exceeded. ERROR`, ou EPIPE/ECONNRESET no meio do envio | S2, S46 | configuração divergente; indisponível e dispara alarme | 503 |
| Qualquer outro `… ERROR` | S1, S44 | indisponível | 503 + Retry-After |
| Timeout do cliente (com `destroy()`) | S50 | indisponível | 503 |
| Conexão recusada ou falha de DNS | — | indisponível | 503 |
| Resposta vazia, sem `\0`, fora do padrão, ou chegando antes do fim do envio | S1 | indisponível; nunca deduzir OK | 503 |
| `PING` não devolve `PONG` | S1, S11 | indisponível | 503 |
| Banco mais velho que o limite de idade (data do VERSION) | S1, S15 | indisponível por política | 503 (limite a votar) |

**[I] Regras do cliente e do contrato:**
- Aceitar só três regex, aplicadas à resposta até o `\0`: `^stream: OK$`, `^stream: (.+) FOUND$`, `^stream: (.+) ERROR$`. Qualquer outra coisa é 503.
- Para o app offline-first, 503 significa tentar de novo e 422 significa resultado final. Um limite estourado dentro do clamd dá o mesmo resultado a cada reenvio, então vai para 422; se fosse 503, o app reenviaria para sempre.
- Baixar o `MaxScanTime` para 30–60 s e dar ao cliente um prazo um pouco maior que isso.

### 5. Teste
- **[F] EICAR:**
  - São 68 bytes que precisam estar no início do arquivo.
  - Pode haver espaço em branco depois, até 128 bytes no total.
  - A EICAR afirma que o arquivo "is not a virus" (S41).
- **[F] Como o ClamAV detecta o EICAR:**
  - Por assinatura de hash (`Win.Test.EICAR_HDB-1`), que "will only ever match the exact file - ie, a file or stream consisting of the exact 68 bytes".
  - Só a assinatura bytecode `Eicar-Signature` pega o EICAR dentro de dados maiores (S42, 2022).
  - A doc do protocolo usa `stream: Eicar-Signature FOUND` como exemplo (S1).
  - Na issue #1161, a 1.2.1 devolveu `stdin: OK` para o EICAR enviado pela entrada padrão (S43).
- **[I] Como testar:**
  - Montar a string em tempo de execução, juntando duas metades, para que o repositório nunca contenha o arquivo. Exatamente 68 bytes, sem quebra de linha no fim.
  - Afirmar só que a resposta termina em ` FOUND`, sem fixar o nome da assinatura.
  - Ter também: um teste de OK com bytes inofensivos, um teste de limite com StreamMaxLength pequeno e um servidor falso em `node:net` que devolve resposta malformada.
  - Como o gate faz o sniff antes do scanner, um EICAR em texto puro é barrado antes de chegar ao ClamAV. Então o cliente é testado direto contra o clamd real, e o gate é testado com um scanner falso.
- **[F] GitHub Actions:**
  - Service containers só rodam em runner Linux.
  - `options: --health-cmd … --health-interval … --health-retries` faz o job esperar o serviço ficar pronto (S49).
  - O runner padrão tem 2 vCPU e 8 GB de RAM em repositório privado, e 4 vCPU e 16 GB em público (S48).
- **[I] Configuração do job de CI:**
  - 8 GB comportam o clamd.
  - Usar a tag que já traz o banco (não a `_base`) e `CLAMAV_NO_FRESHCLAMD=true`, para não esbarrar no rate limit do CDN a partir dos IPs compartilhados do GitHub.
  - Healthcheck com `clamdcheck.sh` e start-period generoso.
  - Medir o boot no primeiro run.

### 6. Alternativas (só para comparação)
- **[F] GuardDuty Malware Protection for S3, funcionamento:**
  - Varre cada objeto novo e pode funcionar sem o GuardDuty completo (S34).
  - Baixa o objeto por PrivateLink e varre "in an isolated environment in the same Region", numa VPC sem internet; a cópia é apagada depois.
  - A entrega do resultado é at-least-once.
  - O resultado vai numa tag: NO_THREATS_FOUND, THREATS_FOUND, UNSUPPORTED, ACCESS_DENIED ou FAILED (S35, S36).
  - UNSUPPORTED inclui arquivo com senha, compressão extrema e estouro de cota. O objeto pode ter até 100 GB (S36, S37).
- **[F] GuardDuty Malware Protection for S3, preço:**
  - US$ 0,09 por GB mais US$ 0,215 por 1.000 objetos, com base em us-east-1 (São Paulo não aparece).
  - Free tier de 1.000 requisições e 1 GB por mês.
  - Tags, chamadas S3 e EventBridge são cobrados à parte (S38, S39).
- **[I] Avaliação do GuardDuty:**
  - 10.000 uploads de 5 MB por mês custariam cerca de US$ 6–7.
  - Mas a varredura é **assíncrona e acontece depois do upload**, então não cabe no gate síncrono atual.
  - Exigiria quarentena e um status "pendente" no contrato mobile, e as evidências precisariam estar em S3.
  - UNSUPPORTED, ACCESS_DENIED e FAILED têm que contar como não-limpo.
  - O dado sai do perímetro da conta, mas não da região.
- **[F] cdk-serverless-clamscan (awslabs):** Lambda com EFS rodando dentro da própria conta, definições atualizadas de hora em hora, disparado por upload no S3 (S40). **[I]** Também é assíncrono.
- **[F]** A OWASP alerta para vazamento de dados em serviços públicos de varredura como o VirusTotal (S53).

### 7. Contradições entre fontes
- **C1. Defaults dos limites:** o man page antigo da die.net traz 10M, 25M e 100M (S5); a 1.4.x e a main trazem 100M, 100M e 400M (S3, S4). Declarar tudo explicitamente no clamd.conf do ERP.
- **C2. Timeouts e recursão:** CommandReadTimeout é 5 s na versão antiga (S5) e 30 s na atual (S3, S4); MaxRecursion é 16 na antiga (S5) e 17 na atual (S4).
- **C3. Frequência do freshclam:** `Checks` tem default de 12 por dia (S15), mas a imagem sobe com 1 por dia (S7, S10). A imagem prevalece.
- **C4. EICAR:** a EICAR aceita espaço em branco até 128 bytes (S41), mas o hash do ClamAV só pega os 68 bytes exatos (S42). E a issue #1161 mostra OK via stdin (S43), contra o exemplo FOUND do protocolo (S1).
- **C5. Flycast:** a página diz "HTTP-only" (S21), mas o Fly Proxy repassa TCP cru quando não há handlers (S22). Não resolvido; usar 6PN direto.
- **C6. Preço do Fargate x86 em sa-east-1 (não resolvido):**
  - Uma leitura da tabela oficial de preços deu US$ 0,0408 por vCPU-h e 0,0045 por GB-h, que são praticamente os números de us-east-1.
  - A segunda leitura não achou linhas x86 (arquivo truncado).
  - O ARM saiu US$ 0,0557 e 0,0061, o que contradiz o ARM ser cerca de 20% mais barato (S30).
  - [I] O x86 real deve estar em torno de 0,0696 e 0,0076, mas **não verifiquei**; confirmar na AWS Pricing Calculator antes do voto.
- **C7. Texto do erro de tamanho:** o man page escreve "INSTREAM size limit exceeded" (S2); o que chega no socket é "… . ERROR" (S46). O cliente deve reconhecer pelo sufixo ` ERROR`, não pelo texto exato.
- **C8. AlertExceedsMax:** a documentação descreve o alerta (S3, S4, S6), mas há bugs em que ele não sai (S44, S45). A primeira defesa é o limite do próprio ERP.
- **C9. NAT em São Paulo:** a página oficial só mostra Ohio (US$ 0,045, S32); o valor de São Paulo (US$ 0,093) vem de fonte secundária (S33).

### 8. Recomendação
Aprovar o ClamAV (clamd) como serviço separado, com cliente INSTREAM próprio em `node:net`, sem dependência npm:
1. **Imagem:** `clamav/clamav:1.4` (LTS até 15/08/2027), fixada por digest; `1.4-debian` se for ARM.
2. **clamd.conf explícito:**
   - `StreamMaxLength` igual ao limite do ERP mais margem (ex.: 25M para um limite de 20M).
   - `MaxFileSize` maior ou igual ao StreamMaxLength e `MaxScanSize` em torno de 100M.
   - **`AlertExceedsMax yes`** e `MaxScanTime` entre 30000 e 60000.
   - `ConcurrentDatabaseReload yes` com 4 GB e `TCPAddr` restrito.
   - [I] Desligar comandos administrativos que o ERP não usa; os nomes das opções na 1.4 ainda precisam ser conferidos.
3. **Cliente:**
   - `zINSTREAM\0`, chunks de até 64 KiB respeitando o evento `drain`.
   - Prazo por varredura com `destroy()` e leitura até o `\0`.
   - Regex estrito; resposta antecipada ou EPIPE é falha.
   - Prontidão por `zPING\0` e idade do banco por `zVERSION\0`.
4. **Contrato de respostas:** a tabela da §4.
5. **Implantação agora:** app Fly privada em gru pela rede 6PN (shared-cpu-2x 4 GB). **Destino AWS:** Fargate em subnet privada com Service Connect TCP e Security Group aberto só para o backend.
6. **CI:** service container com a tag que traz o banco, freshclam desligado e EICAR montado em tempo de execução.

### 9. Riscos para a junta-5 votar
- **R1. Custo recorrente de serviço 24×7:** cerca de US$ 26–67/mês na Fly, ou US$ 38–73/mês no Fargate mais NAT. O C6 continua pendente.
- **R2. "Limpo" por engano** pelos limites de varredura e pelos bugs do AlertExceedsMax.
- **R3. clamd sem autenticação e sem TLS:** a rede privada é o único controle de acesso. Qualquer vizinho na rede consegue causar DoS ou mandar comandos administrativos.
- **R4. Banco desatualizado:** rate limit do CDN, somado ao limite de idade que vira 503 e derruba todos os uploads. Votar o limite de idade e o alarme.
- **R5. Ponto único de falha:** com fail-closed, se o clamd cair as 5 vias respondem 503. O boot leva minutos, e duas instâncias dobram o custo.
- **R6. CPU compartilhada na Fly** (6,25% por vCPU): risco de timeouts, que viram 503.
- **R7. Ambiguidade do Flycast:** evitada usando o 6PN.
- **R8. Ganho limitado para JPEG/PNG/WebP:** o antivírus é exigência do ASVS, não resolve tudo; CDR para PDF está fora do escopo.
- **R9. Premissa de licença sem parecer jurídico:** o quadro muda se o ERP distribuir a imagem.
- **R10. EICAR só com os 68 bytes exatos:** o precedente da #1161 obriga o CI a provar o FOUND via INSTREAM na versão fixada. Se não detectar, é um achado, não um teste pulado.
- **R11. Migração para AWS:** o freshclam precisa de NAT ou espelho privado, e o Service Connect não tem timeout por requisição em TCP.

### 10. Fontes (acesso em 2026-09-11)
- S1 [ClamD Protocol](https://docs.clamav.net/manual/Usage/ClamdProtocol.html): framing z/n, INSTREAM, formato das respostas, PING/VERSION/RELOAD, IDSESSION.
- S2 [clamd(8), Debian 1.4.4](https://manpages.debian.org/testing/clamav-daemon/clamd.8.en.html): texto do INSTREAM, erro de tamanho que fecha a conexão, recomendação do prefixo `z`.
- S3 [clamd.conf(5), Debian 1.4.5](https://manpages.debian.org/testing/clamav-daemon/clamd.conf.5.en.html): defaults dos limites e timeouts, AlertExceedsMax.
- S4 [clamd.conf.sample (main)](https://github.com/Cisco-Talos/clamav/blob/main/etc/clamd.conf.sample): defaults, TCPAddr com IPv6, ConcurrentDatabaseReload, limites como proteção contra DoS.
- S5 [clamd.conf, die.net (versão antiga)](https://linux.die.net/man/5/clamd.conf): defaults antigos (C1, C2).
- S6 [clamdscan(1), openSUSE 1.5.4](https://manpages.opensuse.org/Tumbleweed/clamav/clamdscan.1.en.html): arquivo acima do limite sai "OK"; AlertExceedsMax; FOUND não implica infecção.
- S7 [Docker, docs ClamAV](https://docs.clamav.net/manual/Installing/Docker.html): tags, RAM de 3/4 GiB, variáveis de ambiente, TCP sem criptografia, tag recomendada.
- S8 [Docker Hub, API de tags](https://hub.docker.com/v2/repositories/clamav/clamav/tags?page_size=40): versões, tamanhos, arquiteturas.
- S9 [Dockerfile 1.5 alpine](https://github.com/Cisco-Talos/clamav-docker/blob/main/clamav/1.5/alpine/Dockerfile): HEALTHCHECK de 6 min, usuário, portas.
- S10 [docker-entrypoint.sh](https://github.com/Cisco-Talos/clamav-docker/blob/main/clamav/1.5/alpine/scripts/docker-entrypoint.sh): sequência de boot, `--checks`, timeout de espera.
- S11 [clamdcheck.sh](https://github.com/Cisco-Talos/clamav-docker/blob/main/clamav/1.5/alpine/scripts/clamdcheck.sh): health check por PING/PONG.
- S12 [Política de EOL](https://docs.clamav.net/faq/faq-eol.html): 1.4 LTS, 1.5, bloqueio de versões antigas.
- S13 [FAQ do FreshClam](https://docs.clamav.net/faq/faq-freshclam.html): 429 e 403 do CDN.
- S14 [Espelho privado](https://docs.clamav.net/appendix/CvdPrivateMirror.html): cvdupdate, DatabaseMirror, PrivateMirror.
- S15 [freshclam.conf(5), Debian 1.4.4](https://manpages.debian.org/testing/clamav-freshclam/freshclam.conf.5.en.html): Checks 12, NotifyClamd, TestDatabases.
- S16 [Anúncio do ClamAV 1.5.0](https://blog.clamav.net/2025/10/clamav-150-released.html): data e verificação `.sign`.
- S17 [README do ClamAV](https://github.com/Cisco-Talos/clamav/blob/main/README.md): GPLv2 e unrar.
- S18 [FAQ da GPL](https://www.gnu.org/licenses/gpl-faq.html#MereAggregation): pipes e sockets como programas separados, com a ressalva.
- S19 [Texto da GPLv2](https://opensource.org/license/gpl-2-0): execução livre, agregação.
- S20 [Fly: rede privada](https://fly.io/docs/networking/private-networking/): 6PN, `.internal`, `fly-local-6pn`.
- S21 [Fly: Flycast](https://fly.io/docs/networking/flycast/): bind em 0.0.0.0, "HTTP-only".
- S22 [Fly: serviços](https://fly.io/docs/networking/services/): TCP cru sem handlers.
- S23 [Fly: preços](https://fly.io/docs/about/pricing/): preços em gru.
- S24 [Fly: desempenho de CPU](https://fly.io/docs/machines/cpu-performance/): 6,25% e burst de 500 s.
- S25 [Fly: dimensionamento](https://fly.io/docs/machines/guides-examples/machine-sizing/): limites de RAM.
- S26 [Fly: regiões](https://fly.io/docs/reference/regions/): gru disponível.
- S27 [ECS Service Connect](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect.html): Cloud Map, proxy, custo.
- S28 [ECS TimeoutConfiguration](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_TimeoutConfiguration.html): idle de 1 h em TCP, sem timeout por requisição.
- S29 [Fargate: definição de task](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html): CPU/RAM, awsvpc, NAT/ECR.
- S30 [Fargate: preços](https://aws.amazon.com/fargate/pricing/): cobrança por segundo, 20 GB, desconto do Graviton.
- S31 [Tabela de preços AWS, sa-east-1](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonECS/current/sa-east-1/index.csv): ARM a 0,0557/0,0061 (publicada em 2026-09-11); x86 não resolvido.
- S32 [VPC: preços](https://aws.amazon.com/vpc/pricing/): endpoint de gateway grátis, NAT em Ohio.
- S33 [costgoat, NAT (secundária)](https://costgoat.com/pricing/aws-nat-gateway): NAT em sa-east-1 a US$ 0,093.
- S34 [GuardDuty S3](https://docs.aws.amazon.com/guardduty/latest/ug/gdu-malware-protection-s3.html): uso independente.
- S35 [GuardDuty S3: funcionamento](https://docs.aws.amazon.com/guardduty/latest/ug/how-malware-protection-for-s3-gdu-works.html): PrivateLink, mesma região, tags.
- S36 [GuardDuty S3: resultados](https://docs.aws.amazon.com/guardduty/latest/ug/monitoring-malware-protection-s3-scans-gdu.html): significado de cada status.
- S37 [GuardDuty S3: cotas](https://docs.aws.amazon.com/guardduty/latest/ug/malware-protection-s3-quotas-guardduty.html): 100 GB.
- S38 [GuardDuty: preços](https://aws.amazon.com/guardduty/pricing/): US$ 0,09/GB e 0,215 por mil objetos.
- S39 [GuardDuty S3: custos](https://docs.aws.amazon.com/guardduty/latest/ug/pricing-malware-protection-for-s3-guardduty.html): free tier e custos extras.
- S40 [cdk-serverless-clamscan](https://github.com/awslabs/cdk-serverless-clamscan): alternativa dentro da própria conta.
- S41 [EICAR](https://www.eicar.org/download-anti-malware-testfile/): a string e as regras de formato.
- S42 [clamav-users: INSTREAM + EICAR](https://www.mail-archive.com/clamav-users@lists.clamav.net/msg51667.html): hash só pega os 68 bytes exatos.
- S43 [Issue #1161](https://github.com/Cisco-Talos/clamav/issues/1161): EICAR sai OK via stdin.
- S44 [Issue #670](https://github.com/Cisco-Talos/clamav/issues/670): bug do AlertExceedsMax.
- S45 [Issue #1147](https://github.com/Cisco-Talos/clamav/issues/1147): heurística de limite reportada errada.
- S46 [python-clamd #24](https://github.com/graingert/python-clamd/issues/24): string exata do erro e EPIPE.
- S47 [Issue #1319](https://github.com/Cisco-Talos/clamav/issues/1319): erro "max: 0" com clientes Node.
- S48 [GitHub: runners hospedados](https://docs.github.com/en/actions/reference/runners/github-hosted-runners): 8 e 16 GB de RAM.
- S49 [GitHub: service containers](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers): opções `--health-*`.
- S50 [Node.js net](https://nodejs.org/api/net.html): setTimeout não fecha a conexão; `drain`.
- S51 [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html): 503, 422, 413.
- S52 [OWASP ASVS 4.0.3 V12](https://github.com/OWASP/ASVS/blob/v4.0.3/4.0/en/0x20-V12-Files-Resources.md): 12.1.1, 12.2.1, 12.4.2.
- S53 [OWASP: cheat sheet de upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html): antivírus, CDR, vazamento em serviços públicos.
- S54 [OWASP Developer Guide: princípios](https://devguide.owasp.org/en/02-foundations/03-security-principles/): fail safe.

---

## PD-TRC-616 — Traccar 6.16.0 como servidor de rastreamento: versão, imagem, licença, CVEs e o forward (2026-10-11)

**Contexto:** a trilha do Traccar (`docs/revisoes/TRACCAR/PLANO_TRACCAR.md`, v2.1 + emendas v2.2 e v2.3) precisa de uma
versão fixada, de uma imagem verificável e da semântica do forward conferida no código, antes do B-TRC-01. A
`D-TRC-DECISOES-DO-DONO-2026-10-11` (item 7) trocou a junta de 5 da PD pela pesquisa e pela aprovação escrita do dono.
**Pesquisa completa:** `docs/revisoes/TRACCAR/G-TRC-PD-pesquisa.md` (`agente-pesquisador-web`, ≥3 fontes por fato quando
houve, código-fonte da tag como fonte primária; acesso em 2026-10-11).

**Fontes principais:**
- `https://api.github.com/repos/traccar/traccar/releases/latest`: `v6.16.0`, de 2026-09-27, `prerelease=false`. A tag
  aponta para o commit `cfab560c79ee9c9eaa41c79c6df351e820d6284b`.
- `https://hub.docker.com/v2/repositories/traccar/traccar/tags/6.16.0` e o cabeçalho `docker-content-digest` do
  registro: o digest do índice multiplataforma é `sha256:03ebb7ed2b219d4f25c326873bd022f5062f80bcae622a9d9422846b51951eda`.
- `https://api.github.com/repos/traccar/traccar/commits/acd55bd0feebd9189213af362bbccbd01da62d29`: o commit "Limit
  forwarding headers to configured URL". Só a partir da 6.16.0 o `forward.header` vai apenas à URL global.
- `https://www.traccar.org/blog/traccar-6-16/`: as notas oficiais. O `LICENSE.txt` da tag é Apache-2.0.

**Achado:**
- A 6.16.0 é a versão estável mais recente, e a única segura para o forward com token.
- A imagem oficial do projeto é construída pelo CI dele, com atestação SLSA. Ela não é assinada e roda como root.
- A licença é Apache-2.0: o uso comercial em SaaS é permitido, e rodar a imagem não gera obrigação.
- Há duas CVEs médias sem correção (CVE-2026-108737 e CVE-2026-108738). São neutralizadas sem SMTP, sem OIDC, sem
  usuário extra e sem porta pública além das de protocolo.

**Decisão:** aprovada por escrito pelo dono em 2026-10-11, com OsmAnd e GT06, sem SMTP, sem OIDC, sem porta pública
além das de protocolo e só com a conta de serviço do ERP. As condições estão em `controle/decisoes.md`
(`D-TRC-PD-APROVADA-2026-10-11`). Revisar quando sair a 6.16.1.

---

## PD-ASS-PAGAMENTO-NOTA — portas de pagamento e NFS-e para a assinatura do ERP (2026-11-03)

### 0. Síntese

Pesquisa `pesquisador-pagamento-nota` de 31/10/2026, somente documental: nenhuma conta criada e nenhuma API chamada. Fonte de produto: falas literais do dono registradas em `D-PAGAMENTO-NOTA-PRONTOS`, `D-COFRE-CREDENCIAIS`, `D-TESTES-FALSOS-SAO-FINAIS`, `D-CANAL-NO-B-ASSINATURA`, `D-COBRANCA-RESPOSTAS-3110` e `D-P14-ASAAS-FOCUS`. O canal pertence ao pacote B-ASS, nasce desligado e não faz chamada externa durante os testes.

### 1. Decisão e dono

- Pagamento: porta comum, com Asaas no portão inicial; adaptadores posteriores pertencem ao `B-ASS-15`.
- NFS-e: porta comum, com Focus NFe no portão inicial; adaptadores posteriores pertencem ao `B-ASS-15`.
- Cofre e configuração fail-closed: `B-ASS-05`; adaptadores locais: `B-ASS-06` e `B-ASS-07`; outbox, webhooks e reconciliação: `B-ASS-08`.
- Habilitar o canal e cadastrar credenciais são atos do dono, fora deste PR documental.
- Dados e condições comerciais: **(valores fora do repositório público)**.

### 2. Escolha técnica de Asaas e Focus NFe

- **Asaas:** foi escolhido para o primeiro adaptador porque a mesma API cobre Pix, cartão e boleto, publica webhook com token e fila de reenvio, e permite reconciliar a referência estável do ERP pelo filtro `GET /v3/payments?externalReference=`. A ausência de cabeçalho idempotente exige persistir a intenção e consultar antes de repetir.
- **Focus NFe:** foi escolhido para o primeiro adaptador fiscal porque documenta a rota Nacional `POST /v2/nfsen?ref=`, ambiente de homologação separado, consulta/cancelamento por referência e campos do leiaute de IBS/CBS. A emissão é assíncrona e sempre precisa de reconsulta.
- Outros adaptadores pesquisados continuam fora do portão inicial. Esta PD não registra preço, valor de franquia, margem, cliente nem estratégia comercial.

### 3. Critérios técnicos

1. Credenciais cifradas em repouso, chave fora do banco e resposta pública apenas mascarada.
2. Canal desligado por padrão; sem flag, credencial válida e habilitação, nenhuma chamada de rede e webhook com aparência de rota inexistente.
3. Toda baixa originada por provedor exige reconsulta do recurso; o corpo do webhook nunca define organização ou valor confiável.
4. Idempotência usa referência própria estável, outbox persistida e reconciliação antes de repetir chamada incerta.
5. Nota fiscal é assíncrona; resposta de emissão não equivale a autorização. Cancelamento, rejeição e reemissão têm estados próprios.
6. Testes usam servidores falsos locais, incluindo erro, limite, timeout, replay e webhook autenticado. Hosts reais são proibidos na CI.
7. Segredo, token, certificado, corpo de webhook e dados internos de armazenamento não entram em resposta, log ou auditoria.

### 4. Autenticidade e idempotência

Mesmo quando existe assinatura autenticada, o processamento reconsulta o recurso antes de alterar dinheiro. Replay do mesmo evento é aceito uma vez; evento repetido não produz segunda baixa.

- **Asaas:** não documenta cabeçalho idempotente. O ERP grava `externalReference` antes da chamada e, depois de timeout, consulta `GET /v3/payments?externalReference=<id>` antes de repetir. Para cartão, `PAYMENT_CONFIRMED` confirma o pagamento; `PAYMENT_RECEIVED` pode chegar depois. `PAYMENT_RECEIVED`, `RECEIVED_IN_CASH` e `DUNNING_RECEIVED` também representam recebimento; eventos `CHARGEBACK_*` abrem a transição de chargeback, nunca uma segunda baixa.
- **Iugu:** `Idempotency-Key`; **Mercado Pago:** `X-Idempotency-Key`. No Mercado Pago, o `ts` de assinatura aparece com 10 dígitos na documentação de webhooks e 13 dígitos na de Orders; o adaptador normaliza pela quantidade de dígitos e registra a contradição para homologação.
- **Focus NFe:** `?ref=` é a referência idempotente; repetição retorna conflito. **NFE.io:** `externalId`. **PlugNotas:** `idIntegracao`. Em todos, emissão aceita não significa nota autorizada.

### 5. Regra fiscal

Regime, município e enquadramento fiscal são dados fornecidos pelo dono com o contador e configurados fora do repositório. Enquanto faltarem, a emissão falha fechada com motivo visível; pagamento e demonstrativo continuam operando. Regras com data ficam em código testado, não em texto livre.

- ME/EPP do Simples usa o Emissor Nacional desde **1º/11/2026**, conforme a Resolução CGSN 191/2026.
- O cronograma pesquisado exige IBS/CBS na NFS-e em **1º/10/2026** para serviços em geral, em **1º/12/2026** para os subitens 1.03 e 1.05 ligados a software e em **1º/01/2027** para optantes do Simples. O enquadramento do serviço é do contador.
- Há contradição documentada: páginas de provedores marcam o grupo IBS/CBS como obrigatório, enquanto o portal Nacional informa que a omissão não rejeita a nota e que, se o grupo for informado, todos os códigos passam a ser obrigatórios. O plano omite antes da data aplicável e exige o conjunto completo depois; divergência na homologação vira emenda.

### 6. Contradições entre fontes

- Asaas: respostas `200` versus `2xx` na descrição da fila; o adaptador aceita a família de sucesso documentada e confirma pela consulta.
- Mercado Pago: `cancelled` versus `canceled`; configuração pelo painel versus `notification_url`; `ts` em segundos versus milissegundos.
- Focus NFe: `caminho_xml` sem host completo e `numero_dps` sem autoridade de numeração explícita; a plataforma mantém sequência própria.
- Focus NFe/NFE.io versus portal Nacional: obrigatoriedade do grupo IBS/CBS versus omissão sem rejeição.

### 7. Riscos e pendências

- Formato real diferente do servidor falso: conserto por emenda, sem ligar produção até a homologação.
- Credencial ausente ou ilegível: provedor indisponível, sem degradar o fluxo manual.
- Webhook perdido: polling e reconsulta cobrem a lacuna.
- Integração nova: entra somente após validação da plataforma e gate aplicável.
- Homologação real: `P-ASS-SANDBOX-REAL`; dados fiscais: `P-COBRANCA-P3-DADOS-FISCAIS-DO-EMISSOR`; chave gerenciada na AWS: `P-ASS-SECRETS-MANAGER`.

### 8. Fontes públicas consultadas

1. Asaas — idempotência e reconsulta: https://docs.asaas.com/docs/retries-e-idempotência.md e https://docs.asaas.com/reference/listar-cobrancas.md
2. Asaas — eventos de cobrança: https://docs.asaas.com/docs/webhook-para-cobrancas.md e https://docs.asaas.com/reference/recuperar-uma-unica-cobranca.md
3. Focus NFe — emissão Nacional: https://doc.focusnfe.com.br/reference/emitir_dps_nacional e https://campos.focusnfe.com.br/nfse_nacional/EmissaoDPSXml.html
4. Portal Nacional — preenchimento IBS/CBS e NT 009: https://www.gov.br/nfse/pt-br/noticias/nfs-e-nacional-confira-oas-rientacoes-sobre-leiaute-em-producao-regras-de-preenchimento-de-ibs-cbs-e-status-da-nota-tecnica-009
5. Cronograma do Ato Conjunto RFB/CGIBS nº 4: https://mrsadvogados.com/publicado-ato-conjunto-rfb-cgibs-no-4-2026-definido-o-cronograma-de-obrigatoriedade-dos-documentos-fiscais-eletronicos-do-ibs-e-da-cbs/
6. Simples Nacional e Resolução CGSN 191/2026: https://fenacon.org.br/reforma-tributaria/simples-nacional-nfs-e-nacional-sera-obrigatoria-para-me-e-epp-a-partir-de-1o-de-novembro-de-2026/

### 9. Conteúdo comercial deliberadamente omitido

Foram omitidos desta PD pública preços de provedores, valores de planos e franquias, cálculo ou percentual comercial, projeções econômicas e estratégia comercial. A marca aplicável é **(valores fora do repositório público)**.

---

## PD-MERCADO-2211 — o mercado brasileiro de guincho e pátio (2026-11-22)

### 0. Síntese e limite

Pesquisa documental de 22/11/2026, com buscas e páginas de fornecedores e órgãos públicos. Ela encontrou soluções especializadas em operação de guincho ou em pátio e uma oferta simples que reúne os dois domínios. A busca não esgota o mercado e não prova ausência de concorrente.

Todo conteúdo comercial foi deliberadamente omitido. Onde as fontes tratam de preço, vale: **preço público consultado em 22/11; fica fora do repositório público**. Também ficam fora valores, faixas, franquias, limites de gratuidade e hipóteses de posicionamento comercial.

### 1. Fatos observados

- Há produtos focados na operação de guincho, com despacho, aplicativo de campo, checklist, mapa, faturamento e comissões.
- Há produtos focados em pátios, com entrada, estadia, liberação e leilão, inclusive ofertas voltadas a órgãos públicos.
- A amostra encontrou uma solução que reúne guincho e pátio, mas sua página não descreve leilão nem integração com órgão de trânsito.
- A Infornet descreve integração do WebPrestador com centrais de assistência por meio do WebAssist.
- As fontes públicas consultadas indicam exigências de informatização e integração para pátios credenciados; os documentos normativos não foram todos lidos integralmente nesta pesquisa.

### 2. Hipóteses, não conclusões

- A combinação de pátio credenciado completo, aplicativo do guincheiro, despacho, mapa e cobrança multiempresa pode diferenciar o ERP; a pesquisa não comprova exclusividade.
- Integrações com centrais de assistência, associações e órgãos estaduais podem reduzir digitação e ampliar a utilidade operacional.
- A homologação e a integração com órgãos de trânsito podem variar por estado e exigir trabalho específico.

### 3. Concorrentes e cobertura declarada

1. **CheckGuincho** — aplicativo de campo, checklist com fotos, despacho, mapa, financeiro, NFS-e, atendimento por mensagem e portal do cliente; a página não descreve pátio. Fonte: https://appcheckguincho.com/
2. **ConfisCAR** — remoção, fotos, vídeo, localização, assinatura, entrada e saída de pátio, diárias e financeiro; a página não descreve leilão nem integração com órgão de trânsito. Fonte: https://confiscar.app/
3. **App Guincho** — aplicativo do motorista, checklist, pátio com diária, mapa, comissão, faturamento e acompanhamento do cliente. Fonte: https://appguincho.com/
4. **Infornet WebPrestador** — recebimento de chamados de centrais de assistência, checklist por aplicativo, comissões, frota e faturamento. Fonte: https://www.infornet.com.br/blog/guincheiro-conte-com-o-melhor-sistema-do-mercado/
5. **controleAzul Guincho** — chamados, frota, faturamento, comissão e checklist no celular; a página não descreve pátio nem integração com seguradoras. Fonte: https://www.controleazul.com.br/controleazul-guincho-reboque.aspx
6. **Confisca** — entrada no pátio, checklist, diárias, liberação, leilão, processo judicial e consultas cadastrais. Fonte: https://www.confisca.com.br/
7. **DSIN** — pátio para órgãos públicos e empresas, com estadia, boletos e aviso ao proprietário antes do leilão. Fonte: https://www.dsin.com.br/oldsite/dsin_transito_patio.php
8. **IBS SisCRVL** — remoção, estadia, leilão e aplicativo com rastreamento do guincho; a página não abriu durante a pesquisa, portanto a cobertura veio do resumo da busca. Fonte: https://ibstecnologia.com/siscrvl/
9. **Shifton** — despacho, aplicativo do motorista, pátio, estadia, turnos e relatórios. Fonte: https://shifton.com/service/pt/industries/reboque-de-carros/
10. **Towbook** — referência internacional de despacho, pátio, faturamento e aplicativo do motorista; as fontes comerciais consultadas divergiram. Fonte: https://www.capterra.com/p/94188/Towbook-Management-Software/pricing/
11. **Hinova SGA** — gestão de associações de proteção veicular e aplicativo pelo qual o associado aciona assistência; hipótese da pesquisa: é canal de chamados, não concorrente direto. Fonte: https://cqcs.com.br/noticia/autoinsp-anuncia-integracao-ao-sistema-sga-do-grupo-hinova-durante-a-fenaprove/

### 4. Oportunidades

- Unificar guincho e pátio credenciado, com cadeia de custódia, liberação, leilão, aplicativo de campo, despacho e cobrança.
- Integrar a entrada de chamados de centrais de assistência e associações para evitar redigitação.
- Preparar conectores estaduais para requisitos de pátio e trânsito, mantendo as diferenças por jurisdição explícitas.
- Manter pagamentos digitais e emissão fiscal como capacidades integradas, pois já aparecem na oferta concorrente.

### 5. Riscos e limites

- Ofertas de entrada e produtos especializados elevam a expectativa funcional de empresas pequenas.
- Concorrentes já anunciam automação de atendimento, pagamentos digitais e integrações operacionais.
- Integrações estaduais podem variar, demorar e exigir homologação própria.
- Sem integração com centrais e associações, serviços podem continuar dependendo de digitação manual.
- Parte dos dados pode estar desatualizada; a página da Infornet é antiga, a fonte internacional diverge e alguns fornecedores não publicam condições comerciais.

### 6. Fontes públicas consultadas

As URLs de produto constam ao lado de cada concorrente. A referência normativa consultada foi a Resolução CONTRAN 1.025/2026: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao10252026c.pdf. A pesquisa também usou material público de órgão estadual, mas não leu integralmente todos os documentos; qualquer decisão de conformidade exige conferência da fonte primária aplicável.

---

## PD-ANTIVIRUS-BASE-PARADA-2026-11-28 — base diária do ClamAV parada na 28194: causa, prazo e o portão que recusa arquivo com base acima de 72 h (2026-11-28)

> **Origem e redação.** Pesquisa do fluxo `pesquisa-antivirus`, em 28/11/2026: **3 pesquisadores web**, **1 síntese**
> e **1 verificação adversarial** que releu as 47 fontes (**44 confirmadas, 2 derrubadas e 1 sem acesso**) — todos
> Claude. **Redação desta entrada:** `pd-antivirus-qw`, a partir da síntese e das correções da verificação. O
> redator não refez a pesquisa; conferiu apenas as 4 fontes trocadas ou completadas (F19, F26, F30 e F41) e as URLs
> que entraram no lugar das de terceiros (F3/F5, F17 e F44).
>
> **Esta PD não decide nada.** A e B (§6) são as opções do dono agora; D1 a D5 (§7) são desenho de portão para bloco
> futuro; a recomendação do §8 **não é padrão** — a decisão é do dono. Registro feito antes da decisão, como manda a
> regra da dúvida.

### 0. Pergunta, data e como ler

- **Pergunta.** A base diária do ClamAV parou na versão **28194**, de **25/11/2026**: por quê, até quando, e o que
  fazer com o portão que **recusa todo arquivo quando a base passa de 72 horas**?
- **Data.** Pesquisa e medições em **28/11/2026**. Horas em **UTC**; entre parênteses, quando útil, a hora de São
  Paulo (UTC-3, "SP"). "Lida em" é a data em que o pesquisador abriu a página.
- **Termos.** **daily** é a base diária de assinaturas (`daily.cvd`). **TXT** é o registro que o fornecedor publica
  no DNS com as versões mais novas. **CDN** é a rede que entrega os arquivos da base. **cdiff** é a atualização de
  uma versão para a seguinte. **freshclam** é o atualizador. **clamd** é o serviço que varre os arquivos.
  **zVERSION** é o comando que pergunta ao clamd a versão e a data da base carregada.
- **Repositório público.** Nenhuma URL desta entrada traz nome de usuário nem de empresa: três fontes de terceiros
  ficam **descritas** em vez de linkadas (F3/F6, F17 e F44), e as mensagens de lista são citadas **sem o nome de
  quem escreveu**.

### 1. Medições próprias de 28/11/2026 (M1 a M4)

Medidas pelo orquestrador das 02:14 às 02:40 SP (05:14 às 05:40 UTC).

- **M1.** O TXT de `current.cvd.clamav.net` diz `1.4.7:63:28194:1795842000:1:90:49192:339`. O 4º campo é o carimbo
  do registro: 28/11/2026 05:00 UTC (02:00 SP). O 3º campo, **28194**, é a versão da daily (F30).
  Fonte: consulta DNS do TXT de `current.cvd.clamav.net`, em 28/11/2026.
- **M2.** O cabeçalho da `daily.cvd` (512 bytes, pedidos com User-Agent ClamAV/1.4.7) diz
  `ClamAV-VDB:25 Nov 2026 06-26 +0000:28194:355842:90:...`, e o servidor responde
  `Last-Modified: Wed, 25 Nov 2026 06:26:00 GMT`.
  Fonte: https://database.clamav.net/daily.cvd, em 28/11/2026.
- **M3.** A atualização seguinte, `daily-28195.cdiff`, responde **404**: não existe.
  Fonte: https://database.clamav.net/daily-28195.cdiff, em 28/11/2026.
- **M4.** O sistema em produção usa **ClamAV 1.4.7**, com o clamd por TCP, e **recusa todo arquivo quando a base
  passa de 72 h**. Mede a idade pela data que o zVERSION devolve (a data de montagem da base diária; F24). Com a
  28194, isso acontece por volta de **28/11/2026 06:27 UTC (03:27 SP)**.
  Fonte: medição do orquestrador no sistema, em 28/11/2026.

### 2. Fatos, cada um com a fonte (F1 a F47)

O sistema usa a **1.4.7**. Um pesquisador leu o código na tag `clamav-1.4.7`; outro, no ramo `rel/1.4` e, em alguns
arquivos, no ramo `main`. Cada fato diz onde.

**A parada atual**

- **F1.** A lista oficial de avisos de publicação (clamav-virusdb) tem **24 avisos em novembro de 2026**: da 28171
  (01/11, 06:27:47 UTC) à **28194** (25/11, 06:27:12 UTC, ou 03:27 SP). Não há aviso depois, nem aviso de atraso.
  Um pesquisador releu a página duas vezes em 28/11.
  Fonte: https://lists.clamav.net/pipermail/clamav-virusdb/2026-November/date.html (lida em 28/11/2026).
- **F2.** O aviso da 28194 vem do publicador automático (`svc.clamav-publisher`): **0 assinaturas novas**, 1 removida
  e 40 ignoradas. A página tem link para a mensagem anterior (a 28193) e **nenhum** para uma seguinte.
  Fonte: https://lists.clamav.net/pipermail/clamav-virusdb/2026-November/009555.html (25/11/2026, 06:27:12 UTC).
- **F3.** O carimbo de montagem da 28194, em segundos, é **1795588019**: 25/11/2026 **06:26:59 UTC** (03:26:59 SP);
  a verificação refez a conta e confirma. Na lista clamav-users a mesma base aparece como
  `28194/Wed Nov 25 07:26:59 2026`; a hora a mais deve ser o fuso de quem escreveu (leitura do redator).
  Fontes: https://lists.clamav.net/pipermail/clamav-users/2026-November/014573.html (27/11/2026);
  https://database.clamav.net/daily.cvd (cabeçalho e `Last-Modified`, M2, 28/11/2026); e o registro público do CI de
  outro projeto, 27/11/2026 (URL omitida: repositório de terceiro com nome de empresa no caminho).
- **F4.** No GitHub oficial, a **issue #1949** foi aberta em 28/11/2026, às 03:07 UTC, por um usuário sem selo da
  equipe (`author_association: NONE`). Pede que a equipe confirme o estado da publicação depois da 28194 e diz que o
  TXT dá 28194 no Google Public DNS e na Cloudflare, que a lista termina na 28194 e que **três espelhos públicos**
  mostram a mesma versão. Está **sem resposta, sem rótulo e sem responsável**.
  Fonte: https://github.com/Cisco-Talos/clamav/issues/1949 (aberta e lida em 28/11/2026; hora conferida pela API).
- **F5.** *(corrigida pela verificação)* Na lista oficial clamav-users, em 27/11/2026, dois usuários mostram a 28194
  de 25/11: um no **ClamAV 1.5.4** (Ubuntu 26.04.1), outro no **1.5.3**. **Só o primeiro pede explicação**: pergunta
  se a versão pode ser aquela mesmo e, na mensagem seguinte, diz que o freshclam também dá 28194 como última versão
  remota e pede esclarecimento à equipe. **O segundo só cola a própria saída**
  (`ClamAV 1.5.3/28194/Wed Nov 25 07:26:59 2026`), sem pergunta nem pedido. Não há resposta da equipe no arquivo.
  Fontes: https://lists.clamav.net/pipermail/clamav-users/2026-November/014573.html (12:49:04 UTC);
  https://lists.clamav.net/pipermail/clamav-users/2026-November/014574.html (13:57:52 UTC);
  https://lists.clamav.net/pipermail/clamav-users/2026-November/014575.html (14:06:04 UTC) — todas de 27/11/2026,
  lidas em 28/11/2026 (ver V1).
- **F6.** No CI de outro projeto, em 27/11/2026, a checagem de frescor do antivírus **falhou**: a daily baixada era a
  28194, com **160.025 s** de idade (cerca de 44,5 h) contra um limite de 86.400 s, e o freshclam saindo com 0. Às
  03:46 UTC (00:46 SP), o Google Public DNS e a Cloudflare davam 28194 no TXT. O autor aponta a publicação como
  causa **provável**, sem confirmar.
  Fonte: o registro público do CI de outro projeto, 27/11/2026 (URL omitida: repositório de terceiro com nome de
  empresa no caminho).
- **F7.** Na **issue #1948**, em 27/11/2026: às 14:57 UTC o freshclam 1.4.7 dava a 28194 (main 63, bytecode 339)
  como em dia, e o TXT anunciava 28194 com carimbo das 14:29 UTC. Às **14:59:07 UTC** o CDN respondeu **HTTP 429**
  com `Retry-After` de **24680 s** (6 h 51 min). Nenhum mantenedor comentou. Detalhe útil: o mesmo relato diz que o
  1.4.7 gravou uma espera de só **21600 s (6 h)**, menor que o `Retry-After`.
  Fonte: https://github.com/Cisco-Talos/clamav/issues/1948 (27/11/2026; lida em 28/11/2026).
- **F8.** *(com ressalva da verificação)* Um pesquisador consultou o TXT por conta própria e achou o mesmo texto de
  M1. Pelo cálculo dele (a partir do serial do SOA de .net, 1795845193), a consulta foi depois de 05:53 UTC
  (02:53 SP). A resposta **não é autenticada por DNSSEC** (`AD: false`), e a consulta DS de clamav.net só devolve o
  SOA de .net. **Ressalva:** o carimbo do TXT muda a cada hora — na releitura da verificação veio
  `1.4.7:63:28194:1795845600:1:90:49192:339` (carimbo das 06:00 UTC de 28/11, ainda 28194, demais campos iguais aos
  de M1); o texto exato visto pelo pesquisador não se reproduz.
  Fontes: https://dns.google/resolve?name=current.cvd.clamav.net&type=TXT e
  https://dns.google/resolve?name=clamav.net&type=DS (28/11/2026).
- **F9.** O blog oficial **não fala da parada**. O post mais recente, de 18/11/2026, trata do lançamento da 1.5.5 e
  da 1.4.7 e não fala de atraso, pausa, CDN nem da base diária.
  Fonte: https://blog.clamav.net/2026/11/clamav-155-147-security-patch-release.html (publicado em 18/11/2026; lido em
  28/11/2026).
- **F10.** A lista oficial clamav-announce tem **4 mensagens em 2026** (de 04/03 a 18/11), todas sobre lançamentos da
  1.4.x e da 1.5.x. Nenhuma fala da base, de pausa ou do CDN.
  Fonte: https://lists.clamav.net/pipermail/clamav-announce/2026/date.html (lida em 28/11/2026).
- **F11.** A fala mais próxima de uma explicação oficial é **genérica e anterior à parada**. Na issue #1908, sobre a
  28173, uma conta que escreve "our daily build" (selo Contributor no GitHub; ver H8) disse: "On occasion our daily
  build does not run due to an unexpected error." Disse ainda que uma régua de 24 h é estrita demais: "You may wish
  to set it to 48 hours or even 72 hours."
  Fonte: https://github.com/Cisco-Talos/clamav/issues/1908 (comentário de 18/11/2026; lido em 28/11/2026).
- **F12.** Um pesquisador abriu **5 dailies de novembro** (28173, 28174, 28190, 28193 e 28194). **Nenhuma trouxe
  assinatura nova**: só remoções e assinaturas ignoradas. A 28190 saiu em 21/11, 06:27:19 UTC, e a 28193 em 24/11,
  06:27:56 UTC.
  Fontes: avisos da clamav-virusdb de 03/11 a 25/11/2026, por exemplo
  https://lists.clamav.net/pipermail/clamav-virusdb/2026-November/009554.html (28193) e o de F2 (28194); lidos em
  28/11/2026.

**Paradas anteriores**

- **F13. De 03 a 05/11/2026, cerca de 48 h.** A 28173 saiu em 03/11, 06:28:04 UTC, e a 28174 só em 05/11, 06:26:37
  UTC. O dia 04/11 ficou sem publicação. A issue #1907, aberta em 05/11 às 00:44 UTC, relatou o mesmo quadro de
  agora: base parada, `daily-28174.cdiff` dando 404 e TXT em 28173 no 1.1.1.1 e no 8.8.8.8. O próprio autor fechou a
  issue em 09/11, sem causa e sem comentário da equipe.
  Fontes: https://lists.clamav.net/pipermail/clamav-virusdb/2026-November/009534.html (03/11/2026);
  https://lists.clamav.net/pipermail/clamav-virusdb/2026-November/009535.html (05/11/2026);
  https://github.com/Cisco-Talos/clamav/issues/1907 (aberta em 05/11/2026, fechada em 09/11/2026).
- **F14. De 14 a 17/11/2025, cerca de 84,6 h, acima de 72 h.** A 27822 saiu em 14/11/2025, 09:08:34 UTC, e a 27823 só
  em 17/11/2025, 21:47:21 UTC. Um membro da equipe, escrevendo de endereço institucional do fornecedor, atribuiu a
  parada a uma falha no build agendado de sábado: "There was an issue during Saturday's scheduled CVD build, and the
  team resolved it." Segundo um dos relatos, essa primeira resposta (17/11, 17:44 UTC) dava as atualizações como
  normais e estava errada: a 27823 só saiu às 21:47 UTC. No dia seguinte (18/11, 15:00 UTC), veio a correção: "the
  daily was published last night at 5PM EST".
  Fontes: https://lists.clamav.net/pipermail/clamav-users/2025-November/014398.html (17/11/2025, 17:44 UTC);
  https://lists.clamav.net/pipermail/clamav-users/2025-November/014400.html (18/11/2025, 15:00 UTC);
  https://lists.clamav.net/pipermail/clamav-virusdb/2025-November/009208.html (27822, 14/11/2025);
  https://lists.clamav.net/pipermail/clamav-virusdb/2025-November/009209.html (27823, 17/11/2025).
- **F15. Outubro de 2025, cerca de 4,7 dias.** Um usuário relatou TXT e freshclam parados na 27780 desde 01/10/2025,
  23:13 no horário local dele. A equipe, em mensagem com assinatura institucional do desenvolvimento do fornecedor,
  disse que "something is wrong in between the build and publishing to database.clamav.net" e deu o caso por
  resolvido em 06/10/2025, 19:09 UTC. Nesse caso, a lista de avisos continuou (27782 em 04/10) enquanto o CDN não
  servia.
  Fontes: https://lists.clamav.net/pipermail/clamav-users/2025-October/014346.html (relato) e
  https://lists.clamav.net/pipermail/clamav-users/2025-October/014351.html (06/10/2025).
- **F16.** Em 2025, o feriado de Ação de Graças dos EUA **não parou a base**: no próprio dia (27/11/2025) saiu a
  27833, às 09:13:51 UTC, e a 27835 saiu em 29/11/2025.
  Fontes: https://lists.clamav.net/pipermail/clamav-virusdb/2025-November/009219.html (27/11/2025) e
  https://lists.clamav.net/pipermail/clamav-virusdb/2025-November/009221.html (29/11/2025).
- **F17.** Atraso entre montar e anunciar: em setembro de 2026, um projeto de terceiros registrou que a 28132 foi
  montada às 06:24 e só apareceu no DNS às 07:00 UTC, **cerca de 36 min depois**.
  Fonte: registro público de um projeto de terceiros, 23/09/2026 (URL omitida: repositório pessoal de terceiro).

**Ritmo normal de publicação**

- **F18.** A FAQ oficial diz que a base "is usually updated once or twice per day". Antes de publicar, a equipe testa
  se ela carrega nas duas últimas séries estáveis.
  Fonte: https://docs.clamav.net/faq/faq-cvd.html (lida em 28/11/2026).
- **F19.** *(fonte trocada pela verificação)* Em **27/07/2020, 22:09 UTC**, a equipe escreveu na lista que só publica
  uma vez por dia: "...we also only release updates once a day." A frase vinha citada a partir da resposta posterior
  de um usuário; a mensagem da equipe é a que anuncia o post do blog sobre freshclam, cdiffs e banda.
  Fonte: https://lists.clamav.net/pipermail/clamav-users/2020-July/009661.html (27/07/2020; lida em 28/11/2026).
- **F20.** O blog oficial diz que a daily é atualizada todo dia ("updated daily") e que o TXT de
  `current.cvd.clamav.net` traz a versão da última daily publicada.
  Fonte: https://blog.clamav.net/2021/03/clamav-cvds-cdiffs-and-magic-behind.html (publicado em 19/03/2021).
- **F21.** Medido na lista de avisos em 2026: **cerca de 1 publicação por dia**. Outubro teve 31 avisos em 31 dias (da
  28140, em 01/10 às 06:24:51 UTC, à 28170, em 31/10 às 06:24:54 UTC). Fevereiro teve 28 em 28 dias; maio, 30 em 31;
  junho, 30 em 30; julho, 31 em 31; agosto, 31 em 31; setembro, 30 em 30; janeiro, 32 (um dia com 2). O horário fica
  perto de 06:25 UTC (03:25 SP) desde abril, e perto de 07:25 UTC de janeiro a março.
  Fonte: https://lists.clamav.net/pipermail/clamav-virusdb/2026-October/date.html e as páginas dos outros meses no
  mesmo endereço, trocando o mês (`2026-<Mês>`); lidas em 28/11/2026.
- **F22.** Ressalva sobre a lista: em março de 2026 ela ficou muda depois de 08/03 (só 8 avisos, até a 27934), e abril
  começa na 27959 (02/04). Ou seja, **24 versões saíram sem aviso**, e a lista sozinha não prova falta de build.
  Agora, porém, TXT, CDN e lista param juntos na 28194.
  Fontes: https://lists.clamav.net/pipermail/clamav-virusdb/2026-March/date.html e
  https://lists.clamav.net/pipermail/clamav-virusdb/2026-April/date.html (lidas em 28/11/2026).

**Como o ClamAV mede e trata a idade da base**

- **F23.** O aviso de base velha do motor compara a hora atual com a data de montagem gravada no cabeçalho da daily.
  Ele dispara acima de **604800 s (7 dias)** e é **só um aviso**: não recusa a varredura. O mesmo trecho avisa se o
  carimbo estiver mais de 1 h no futuro.
  Fontes: https://raw.githubusercontent.com/Cisco-Talos/clamav/clamav-1.4.7/libclamav/cvd.c (tag 1.4.7) e
  https://raw.githubusercontent.com/Cisco-Talos/clamav/rel/1.4/libclamav/cvd.c (ramo rel/1.4); lidos em 28/11/2026.
- **F24.** A data que o VERSION do clamd devolve é a **data de montagem da daily carregada na memória**. Não é a data
  do arquivo em disco nem a da última conferência.
  Fonte: https://raw.githubusercontent.com/Cisco-Talos/clamav/rel/1.4/clamd/session.c, com o `libclamav/cvd.c` do
  mesmo ramo (rel/1.4; lidos em 28/11/2026).
- **F25.** O ClamAV só recusa por idade com a opção `FailIfCvdOlderThan` (`--fail-if-cvd-older-than`). Ela existe
  desde a 1.1.0, é medida em dias, vem desligada (-1) e traz **7** como exemplo. Ligada, faz o clamd **sair com erro
  na partida**.
  Fontes: https://raw.githubusercontent.com/Cisco-Talos/clamav/main/NEWS.md (nota da 1.1.0) e
  https://raw.githubusercontent.com/Cisco-Talos/clamav/clamav-1.4.7/etc/clamd.conf.sample (tag 1.4.7); lidos em
  28/11/2026.
- **F26.** *(fonte completada pela verificação)* No clamd 1.4, essa conferência roda **uma vez**, em `main()`, antes
  de `cl_load`, e **não se repete** enquanto o clamd atende; se falha, o processo sai com erro. A idade vem do
  cabeçalho, nunca da data do arquivo, e vale a da **base mais nova**: é `cl_cvdgetage`, em `libclamav/cvd.c`, que
  percorre o diretório, usa `s_time - cvd.stime` do cabeçalho e guarda o mínimo.
  Fontes: https://raw.githubusercontent.com/Cisco-Talos/clamav/rel/1.4/clamd/clamd.c,
  https://raw.githubusercontent.com/Cisco-Talos/clamav/rel/1.4/common/misc.c e
  https://raw.githubusercontent.com/Cisco-Talos/clamav/rel/1.4/libclamav/cvd.c (ramo rel/1.4; lidos em 28/11/2026).
- **F27.** O SelfCheck do clamd (padrão de 600 s, ou 10 min) recarrega a base quando os arquivos mudam. Se a recarga
  falha, o clamd **mantém a base anterior** ("Database reload failed, keeping the previous instance"). Ou seja, a base
  em disco pode estar nova e a carregada, velha.
  Fontes: https://raw.githubusercontent.com/Cisco-Talos/clamav/main/clamd/server-th.c (ramo main, não a 1.4.7); o
  padrão de 600 s está no `clamd.conf.sample` da tag 1.4.7 (link em F25) e no do ramo main; lidos em 28/11/2026.
- **F28.** Por padrão, o freshclam confere a base **12 vezes por dia** (a cada 2 h), pelo TXT de
  `current.cvd.clamav.net`.
  Fontes: https://raw.githubusercontent.com/Cisco-Talos/clamav/clamav-1.4.7/etc/freshclam.conf.sample (tag 1.4.7) e
  https://raw.githubusercontent.com/Cisco-Talos/clamav/main/etc/freshclam.conf.sample (main); lidos em 28/11/2026.
- **F29.** Na imagem Docker oficial, a verificação de saúde **só faz ping no clamd** e não olha a idade da base. O
  `FRESHCLAM_CHECKS` vem, por padrão, com **uma conferência por dia**.
  Fonte: https://docs.clamav.net/manual/Installing/Docker.html (lida em 28/11/2026).
- **F30.** *(fonte completada pela verificação)* O freshclam 1.4 lê o **4º campo** do TXT
  (`DNS_UPDATEINFO_RECORDTIME` vale 3), o carimbo. Se o registro tem mais de **12 h**
  (`DNS_WARNING_THRESHOLD_HOURS`), ele avisa ("DNS record is older than %d hours") e **descarta** a resposta do DNS.
  No 0.103, o limite era **3 h** (o código testa `> 10800`). A versão da daily fica no **3º campo** (índice 2), lido
  por `textrecordfield()`.
  Fontes: https://raw.githubusercontent.com/Cisco-Talos/clamav/rel/1.4/libfreshclam/libfreshclam.c,
  https://raw.githubusercontent.com/Cisco-Talos/clamav/rel/1.4/libfreshclam/libfreshclam_internal.h,
  https://raw.githubusercontent.com/Cisco-Talos/clamav/rel/1.4/libfreshclam/libfreshclam_internal.c e
  https://raw.githubusercontent.com/Cisco-Talos/clamav/rel/0.103/libfreshclam/libfreshclam_internal.c; lidos em
  28/11/2026.
- **F31.** Na 1.0.0, o fornecedor subiu esse limite para evitar falso alarme e passou a renovar o registro DNS com
  mais frequência. Ou seja, **um carimbo novo mostra que o sistema de publicação está vivo, não que saiu daily nova**.
  Fonte: https://raw.githubusercontent.com/Cisco-Talos/clamav/main/NEWS.md (nota da 1.0.0; lida em 28/11/2026).
- **F32.** Sem um DNS válido, o freshclam 1.4 lê a versão no cabeçalho da daily por HTTP. Ele dá a base como em dia
  quando a **versão local é maior ou igual** à do fornecedor. O critério do próprio atualizador é a versão, não a
  data.
  Fonte: https://raw.githubusercontent.com/Cisco-Talos/clamav/rel/1.4/libfreshclam/libfreshclam_internal.c (lido em
  28/11/2026).
- **F33.** *(com ressalva da verificação)* Quando confere e a base já está em dia, o freshclam **não grava carimbo nem
  arquivo**: só uma linha de log. O `freshclam.dat` guarda só a versão do formato, o UUID e o `retry_after`, que é a
  espera: 24 h depois de um HTTP 403; o `Retry-After` do servidor, ou 4 h, depois de um 429. **Ressalvas:** no ramo
  main, um `.sign` que falte (recurso da 1.5) é baixado mesmo com a base em dia; e a #1948 relata que o 1.4.7 gravou
  só 6 h depois de um 429 de 24680 s.
  Fontes: https://raw.githubusercontent.com/Cisco-Talos/clamav/main/libfreshclam/libfreshclam_internal.h e
  https://raw.githubusercontent.com/Cisco-Talos/clamav/main/libfreshclam/libfreshclam_internal.c (ramo main, não a
  1.4.7); a struct `freshclam_dat_v1` conferida também no rel/1.4; lidos em 28/11/2026.
- **F34.** *(com ressalva da verificação)* O código de saída 0 do freshclam vale tanto para "já estava em dia" quanto
  para "atualizou" ("0 : Database is up-to-date or successfully updated."). O 52 é problema de rede e o 59, espelhos
  fora de sincronia. O manual diz que o frescor da base é "the most important thing in anti-virus system".
  **Ressalva:** a mesma seção do manual permite trocar o código com `EXIT_n` (por exemplo,
  `--on-update-execute=EXIT_1`), o que **separa** "atualizou" (1) de "já estava em dia" (0) — isso enfraquece um dos
  contras da opção D2.
  Fonte: https://raw.githubusercontent.com/Cisco-Talos/clamav/rel/1.4/docs/man/freshclam.1.in (lido em 28/11/2026).
- **F35.** Não existe gancho para "conferiu e está em dia". O `OnUpdateExecute` só roda quando alguma base foi
  atualizada, e o `OnErrorExecute`, quando o resultado é pior que "em dia".
  Fonte: https://raw.githubusercontent.com/Cisco-Talos/clamav/rel/1.4/freshclam/freshclam.c (lido em 28/11/2026).
- **F36.** A FAQ do freshclam lista três formas de a atualização quebrar: rede fora, CDN fora e CDN servindo versão
  menor que a anunciada no DNS. Diz também que HTTP 429 é limite de pedidos e que o download por script (wget, curl)
  é negado.
  Fonte: https://docs.clamav.net/faq/faq-freshclam.html (lida em 28/11/2026).
- **F37.** Tolerância oficial: "The `freshclam` clients will tolerate being 1 version behind what was advertised on
  clamav.net."
  Fonte: https://docs.clamav.net/appendix/CvdPrivateMirror.html (lida em 28/11/2026).
- **F38.** A ferramenta oficial de espelho, o cvdupdate, grava a última conferência bem-sucedida (`last checked`) a
  cada consulta DNS válida, **mesmo sem versão nova**, e também no HTTP quando obtém a versão. Ela não confere o
  carimbo do TXT.
  Fonte: https://raw.githubusercontent.com/Cisco-Talos/cvdupdate/main/cvdupdate/cvdupdate.py (lido em 28/11/2026).

**Distribuição, CDN e fim de vida**

- **F39.** A 1.4 é LTS: lançada em 15/08/2024, último patch 1.4.7, suporte até 15/08/2027 e download da base até
  15/08/2028. Quem perde o download da base em 28/11/2026 é a **1.0 LTS**; a 1.3 saiu de suporte em 07/02/2026. O
  fornecedor pode bloquear um patch 4 meses depois de sair o seguinte. A página não anuncia mudança de distribuição
  em 2026.
  Fonte: https://docs.clamav.net/faq/faq-eol.html (lida em 28/11/2026).
- **F40.** *(corrigida pela verificação)* Houve mudanças de assinatura e de verificação, **nenhuma anunciada como
  pausa**: arquivos de assinatura externos (`.cvd.sign`) na **1.5.0** (07/10/2025), com volta ao método antigo quando
  eles faltam; verificação da CVD que passa a **ignorar arquivos de certificado no diretório de certificados quando o
  usuário não tem permissão de leitura**, **somente na 1.5.2** — a seção da 1.4.4 (04/03/2026) não trata disso, traz
  correções de segurança, TIFF/Rust, bytes e alinhamento; e sigtool que tenta de novo quando o MD5 do pacote começa
  com 00, na **1.5.5** (18/11/2026).
  Fontes: https://blog.clamav.net/2026/03/ (notas da 1.4.4 e da 1.5.2) e https://blog.clamav.net/ (posts de
  07/10/2025 e 18/11/2026); lidos em 28/11/2026.
- **F41.** *(fonte trocada pela verificação)* A aposentadoria de assinaturas — **anunciada em 18/11/2025** e feita em
  18/12/2025 — deixou a main.cvd e a daily.cvd **"roughly 50% smaller"** (main de 163 para cerca de 80 MB; daily de
  62 para cerca de 22 MB), com início previsto então para 16/12/2025. O anúncio também tira do registro de imagens as
  versões sem suporte, o que muda as **imagens**, não a base. O post de 18/12/2025 só diz que a aposentadoria foi
  implementada e dá os tamanhos atuais (main 85 MiB, daily 22 MiB). Mudou o conteúdo, **não o canal nem a
  frequência**.
  Fontes: https://blog.clamav.net/2025/11/ (18/11/2025) e https://blog.clamav.net/2025/12/ (18/12/2025); lidos em
  28/11/2026.
- **F42.** *(com ressalva da verificação)* Os HTTP 403 do CDN em novembro de 2026 (issues #1914 a #1938) foram
  explicados pela equipe como **bloqueio por região ou IP** (geolocalização e sanções dos EUA): IP em local bloqueado,
  faixas de IP que mudam de país e bloqueio intencional, repetido nas #1936 e #1937. **Ressalva:** a equipe dá isso
  como a **causa mais provável** da classe de erro, não como diagnóstico de cada caso, e a #1938 (19/11, 403) ficou
  sem comentário. É outro problema, não a base parada.
  Fontes: https://github.com/Cisco-Talos/clamav/issues/1920 (18/11/2026) e
  https://github.com/Cisco-Talos/clamav/issues?q=is%3Aissue%20sort%3Acreated-desc (issues de 06/11 a 19/11/2026;
  lidas em 28/11/2026).

**Como outras ferramentas medem**

- **F43.** O rspamd (módulo de antivírus) e o Amavis (configuração de referência) **não têm opção** de idade, frescor
  ou versão da base.
  Fontes: https://docs.rspamd.com/modules/antivirus/ e
  https://gitlab.com/api/v4/projects/amavis%2Famavis/repository/files/conf%2Famavisd.conf-default/raw (lidas em
  28/11/2026).
- **F44.** Um projeto comunitário que expõe o ClamAV como serviço REST mede **pela data**: manda alertar pela idade da
  `Signature_date` (exemplos de 24 h, 48 h ou 7 dias; o exemplo de tarefa agendada usa `MAX_AGE_SECONDS=172800`, ou
  48 h). O projeto irmão, de monitoramento de assinaturas, usa **26 h** por padrão.
  Fonte: README público desse projeto, lido em 28/11/2026 (URL omitida: repositório de terceiro com nome de usuário no
  caminho).
- **F45.** O check_clamav (plugin do Nagios que o Debian empacota) mede **pela versão**: compara a versão local com o
  3º campo do TXT (`$txtresults[2]`). Alerta com 1 versão atrás e dá crítico com 2. **Não tem estado
  "desconhecido"**, e falha de DNS só gera um aviso.
  Fonte: https://salsa.debian.org/nagios-team/nagios-plugins-contrib/-/raw/master/check_clamav/check_clamav (script
  versão 1.2; lido em 28/11/2026).
- **F46.** *(sem acesso: 403)* O check_clamav_time (Nagios) mede **pelo tempo de atraso**: quando vê versão atrasada,
  grava a hora e alerta se o atraso passar de N minutos. **Só o trecho do buscador foi lido; a página deu 403 para o
  pesquisador e também para a verificação**, e o domínio alternativo não resolve — o fato fica marcado como não
  confirmado na fonte primária.
  Fonte: https://exchange.nagios.org/directory/plugins/anti-2dvirus/clamav/check_clamav_time/details (lançamento
  listado em 18/06/2009; trecho lido em 28/11/2026; página com 403).
- **F47.** Na prática, quem monitora a "última conferência" **lê o log**: o Logwatch se apoia na linha "ClamAV update
  process started", e o log mostra "main.cvd database is up-to-date".
  Fonte: https://sourceforge.net/p/logwatch/bugs/123/ (aberto em 07/08/2025; lido em 28/11/2026).

### 3. Onde os relatos divergem (V1 a V6)

- **V1.** Hora da última mensagem na conversa da clamav-users de 27/11: **14:06 UTC** no arquivo oficial da lista
  (mensagem 014575) e **14:27 UTC** no espelho público ("06:27 -0800"). Não muda nada.
- **V2.** Hora em que vencem as 72 h: 06:27 UTC para o orquestrador e dois relatos; 06:26 UTC para um relato. O
  carimbo em segundos é 06:26:59 UTC (F3), então as duas são arredondamentos. O `Last-Modified` (06:26:00) e o
  cabeçalho (`06-26`) só trazem o minuto. M4 chama de "data de publicação" o que o código chama de **data de
  montagem** (F24); entre a montagem (06:26:59) e o aviso na lista (06:27:12) há 13 s.
- **V3.** Espera do 429 da #1948: "cerca de 6 h" num relato e "cerca de 6,9 h" no outro. O número exato é
  **24680 s, ou 6 h 51 min**.
- **V4.** Início da parada de novembro de 2025: 09:08:34 UTC pela lista de avisos (F14) e "por volta de 04:43 no
  horário local dele" (09:43 UTC) pelo relato de um usuário. São medidas diferentes (a publicação e a conferência do
  usuário). Dá 84,6 h ou cerca de 84 h; **as duas passam de 72 h**.
- **V5.** Frequência: a FAQ diz "uma ou duas por dia" (F18); a equipe, em 2020, disse "uma vez por dia" (F19); a
  medição de 2026 dá cerca de uma por dia (F21).
- **V6.** Desenho futuro do portão. Um relato propõe "versão local igual à anunciada no TXT, com teto absoluto de 7
  dias". Outro propõe tolerar 1 versão atrás, usar as 72 h pela data só quando faltar medição válida do fornecedor há
  mais de 24 h, e tratar os 7 dias como **aviso ao dono**, não como recusa. Divergem na tolerância (0 ou 1 versão) e
  no papel dos 7 dias (recusa ou aviso). Ver D4.

### 4. Hipóteses (H1 a H15) — nada abaixo foi confirmado por fonte oficial

- **H1. Hipótese (causa).** A falha está no **build ou na publicação**, do lado da equipe do fornecedor. Não é mudança
  de distribuição. Apoiam isso: TXT, CDN e lista param juntos na 28194 (M1 a M3, F1); o TXT segue renovado com a mesma
  28194 e o cdiff seguinte dá 404, então o DNS está vivo e a falha vem antes, onde a base é montada e publicada (M1,
  M3, F31); nada foi anunciado (F9, F10, F39); e o quadro é o das paradas de outubro e novembro de 2025 e de 03 a
  05/11/2026 (F13 a F15). Confiança média-alta, segundo um relato.
- **H2. Hipótese (feriado).** O feriado de Ação de Graças nos EUA (quinta, 26/11/2026) e o fim de semana podem estar
  **atrasando o conserto**, não causando a parada: em 2025, o feriado não parou a base (F16). A primeira publicação
  que faltou é a de 26/11. Em 2025, a falha de sábado só foi resolvida na segunda à noite, hora dos EUA (F14). Se
  isso se repetir, a base pode voltar só na **segunda, 30/11/2026**, com 4 a 5 dias de parada. Confiança baixa a
  média.
- **H3. Hipótese (janela fechada mesmo se voltar no horário).** Se o build voltar perto de 06:25 UTC de 28/11
  (03:25 SP), a régua de 72 h vence às 06:27 UTC, **antes** de a base nova chegar ao clamd. A base leva dezenas de
  minutos para aparecer no DNS (36 min em setembro, F17); o freshclam confere a cada 2 h no padrão, ou uma vez por dia
  na imagem Docker oficial (F28, F29); e o clamd recarrega a cada 10 min (F27). O portão deve passar algum tempo
  recusando. Depende da configuração local, que os pesquisadores não conheciam.
- **H4. Hipótese (pouca perda de detecção no curto prazo).** Nenhuma das 5 dailies de novembro abertas trouxe
  assinatura nova (F12), e a 28194 teve 0 novas (F2). Então a régua de 72 h barra **por política**, não porque a
  próxima base traria muitas detecções. A amostra é pequena e não vale para a main nem para o bytecode.
- **H5. Hipótese (a régua de 72 h dá falso alarme algumas vezes por ano).** Ela pode recusar arquivos mesmo quando não
  existe base mais nova em lugar nenhum. Em 14 meses, houve duas lacunas acima de 72 h: 84,6 h (F14) e cerca de
  4,7 dias (F15). Inferência a partir de dois casos.
- **H6. Hipótese (por que há poucos relatos).** O monitor comum compara a versão local com a do DNS, e as duas dizem
  28194, ou seja, "em dia". Só percebe quem mede a **idade**, como os CIs com limite de 24 a 72 h. O aviso de 7 dias
  do próprio ClamAV só deve aparecer por volta de **02/12/2026, 06:27 UTC** (03:27 SP); daí em diante, os relatos
  devem crescer.
- **H7. Hipótese fraca (coincidências de calendário).** O corte do download da base para a 1.0 LTS (28/11/2026, F39)
  e a mudança do sigtool (18/11/2026, F40) caem perto da parada. Um relato levanta a chance de uma mudança planejada;
  **nenhuma fonte liga as duas coisas**.
- **H8. Hipótese (quem falou na #1908).** A conta é tratada como da equipe porque escreve "our daily build", fecha
  issues de terceiros e tem o mesmo nome que assina os lançamentos no blog e na clamav-announce. O GitHub só mostra o
  selo "Contributor".
- **H9. Hipótese (o check_clamav falha aberto).** Pela leitura do código (F45), se o DNS falha, o campo da versão
  fica vazio (vale 0 em Perl), a diferença fica negativa e o estado vira **OK**. A verificação confirma que isso é
  leitura do código, não execução. Lição para o critério por versão: "não consegui medir o fornecedor" tem de virar
  **"não sei"**, nunca "em dia".
- **H10. Hipótese (a última conferência não prova a carga).** Uma recarga que falha mantém a base anterior (F27). Por
  isso, a versão local deve vir do **zVERSION**, que mostra o que está na memória, e não do código de saída do
  freshclam.
- **H11. Hipótese (o TXT pode ser falsificado).** Sem DNSSEC (F8), um TXT com versão antiga **esconde** a base velha
  (falha aberta), e um com versão nova **derruba** o portão (negação de serviço). Mitigação proposta: confirmar pelo
  cabeçalho HTTPS da `daily.cvd` e manter um teto pela data.
- **H12. Hipótese (consultar a cada arquivo seria abuso).** O CDN limita com 429 e 403 e impõe espera de 4 h a 24 h
  (F33). A medição tem de ficar **guardada em cache**, com no máximo uma consulta por hora. O TXT é DNS e não passa
  pelo CDN.
- **H13. Hipótese (a imagem Docker atrasa a base nova).** Com o `FRESHCLAM_CHECKS` padrão (uma vez por dia, F29), uma
  daily nova pode levar até cerca de **24 h e 10 min** para chegar ao clamd. A tolerância do critério por versão
  precisa cobrir isso, ou a conferência precisa ser mais frequente.
- **H14. Hipótese (variante mais rígida do critério por versão).** "Em dia" quando a versão é igual, ou está 1 atrás
  **há menos de N horas**. N sai da data de montagem no cabeçalho HTTPS da daily do fornecedor, como faz o
  check_clamav_time (F46, sem acesso). Isso pega a quebra em N horas, sem esperar o fornecedor publicar a versão
  seguinte.
- **H15. Hipótese (os números das propostas de desenho são propostas).** Os limiares sugeridos (24 h de prova, 1
  versão de tolerância, 7 dias de teto) se apoiam nos números do fornecedor: 12 h do TXT (F30), 2 h do freshclam
  (F28), 1 versão do espelho (F37) e 7 dias do clamd (F23). **Nenhum é norma do ClamAV para portão.**

### 5. O que não se achou

- Declaração oficial que explique a parada depois da 28194, em nenhum canal lido em 28/11/2026: blog, docs, GitHub,
  clamav-users, clamav-announce e clamav-virusdb. **Nenhuma previsão de volta.**
- Resposta da equipe na #1949, na #1948 ou na conversa da clamav-users.
- Explicação da equipe para a parada de 03 a 05/11/2026 (o autor fechou a #1907 sem comentário dela).
- Anúncio de pausa programada, troca de CDN ou de espelho, formato novo da base ou fim de suporte da 1.4.x em 2026.
- Anúncio próprio do corte do download da base para a 1.0 LTS em 28/11/2026: ele só aparece na tabela de fim de vida.
- Página oficial de status do ClamAV ou do CDN.
- Política oficial de publicação em feriados e fins de semana.
- Qualquer menção pública à daily 28195 ou ao arquivo `daily-28195.cdiff`.
- O fórum GitHub Discussions do projeto: a URL deu 404.
- Relatos fora das listas e do GitHub: nada no Hacker News (os 30 itens mais recentes até 27/11/2026), no Mastodon
  (tag #clamav no mastodon.social, de 11/11 a 27/11/2026) nem nas issues das imagens Docker oficiais (a mais recente,
  de 19/11, trata da falta de imagens da 1.5.5). No Reddit e no Stack Exchange as buscas não trouxeram nada, e a
  ferramenta não lê esses sites diretamente. No Bluesky, a busca deu 403. X/Twitter, Discord e redes sociais do
  fornecedor não foram consultados.
- Fóruns de painéis e aparelhos que usam ClamAV: só tópicos de 2006 a 2024 (busca genérica, sem nome de produto).
- Documentação oficial do 4º campo do TXT e de quantas vezes por dia ele é renovado: só há o código (limite de 12 h)
  e a nota da 1.0.0.
- Valor recomendado pelo ClamAV para o `FailIfCvdOlderThan`, ou orientação oficial para recusar arquivo pela idade da
  base. O único número oficial é o **aviso de 7 dias**.
- Registro da última conferência bem-sucedida feito pelo próprio freshclam (não existe no código), ou issue pública
  pedindo isso.
- Ferramenta de e-mail ou serviço de varredura que use a "última conferência bem-sucedida" como critério de portão:
  só o cvdupdate (`last checked`) e o Logwatch, que lê o log.
- Exportador Prometheus ou modelo Zabbix com métrica de idade da base.
- As páginas do check_clamav e do check_clamav_time no Nagios Exchange (403 ou falha de DNS) e um bug público de
  painel de rede que exige login.
- Nova medição de M2 e M3 por um pesquisador: um não consultou DNS nem CDN, porque a FAQ diz que o CDN nega download
  por script; outro refez só o TXT (F8).

### 6. Opções do dono agora (A e B)

Quando a redação da síntese começou (03:10 SP de 28/11), faltavam cerca de 17 min para o portão fechar (M4). As duas
opções valem com o portão ainda aberto **ou** já fechado.

**Vale para as duas:** não forçar o freshclam nem apagar a base local. Não existe base mais nova que a 28194 (M1, M3),
e insistir no CDN pode render um 429 com 6 h 51 min de espera (F7, F36), o que atrasaria pegar a 28195 quando ela
sair. Para acompanhar, bastam o TXT (DNS), a lista clamav-virusdb (o primeiro aviso novo marca a volta) e a issue
#1949. Evitar pedidos repetidos ao CDN por script.

**A. Subir o limite de idade para 168 h, provisório e com volta escrita**

O que muda:

- O portão aceita arquivos de novo, ou nem chega a fechar, varrendo com a 28194 até **02/12/2026 06:27 UTC**
  (03:27 SP), se nada novo sair antes. (Cálculo do redator: montagem da 28194, 25/11 às 06:26:59 UTC, mais 168 h.)
- **168 h é o número do próprio ClamAV**: o aviso de base velha (F23) e o exemplo do `FailIfCvdOlderThan` (F25).
- 168 h teria passado pelas **três paradas medidas**: 48 h (F13), 84,6 h (F14) e cerca de 4,7 dias, perto de 112 h
  (F15). A atual tinha cerca de 71 h na medição.
- A **volta precisa estar escrita**: retornar a 72 h quando o zVERSION mostrar uma daily acima da 28194, ou numa data
  fixa, o que vier primeiro.
- Não se mediu se o limite é configuração ou constante no código. Configuração muda em minutos; código pede PR, CI e
  deploy, e pode não ficar pronto a tempo.

Risco, à luz dos fatos:

- Se a falha fosse **nossa** (o freshclam local sem baixar), 168 h a esconderia por até 7 dias. Hoje os fatos apontam
  o fornecedor: TXT, CDN, lista e relatos de terceiros param na 28194 (M1 a M3, F1, F4 a F7). Para cobrir esse caso
  enquanto o limite valer: **conferir uma vez por dia se a versão do zVERSION é a mesma do TXT**.
- Um arquivo com ameaça que só a 28195 em diante pegaria entra agora e não é varrido de novo. O risco parece pequeno:
  nenhuma das 5 dailies de novembro abertas trouxe assinatura nova (F12, H4). A amostra é pequena.
- Se a parada passar de 7 dias, o portão fecha de novo em 02/12, às 03:27 SP. Nenhuma parada medida chegou a isso.
- Provisório sem volta escrita tende a ficar.
- É **mudança de segurança em produção**: segue o rito do contrato e pede a ordem do dono.

**B. Deixar o portão fechado até o fornecedor publicar**

O que muda:

- Nada na configuração. A partir de 28/11, 06:27 UTC (03:27 SP), **todo arquivo é recusado** até o clamd carregar uma
  daily acima da 28194.
- Não se sabe por quanto tempo. Mesmo se o build voltar no horário de costume, há uma janela fechada (H3). Se 2025 se
  repetir, a volta fica para segunda, 30/11 (H2). A maior parada medida durou cerca de 4,7 dias (F15).

Risco, à luz dos fatos:

- **Indisponibilidade:** todo envio de arquivo é recusado enquanto durar, por um prazo que ninguém sabe.
- **Perda de arquivo:** pelo contrato do app de campo, o arquivo só sai do aparelho quando o servidor confirma que o
  guardou; recusa, falha de varredura, revisão pendente, erro ou tempo esgotado o **preservam** (`CLAUDE.md` §6,
  B-108). Não se mediu se a recusa por base velha cai nesse caminho em produção, nem o que acontece no portal web.
- **Ganho de segurança pequeno agora:** não existe base mais nova que a 28194 (M1, M3). O que B ganha é adiar a
  varredura: um arquivo reenviado depois passa pela base nova, que deve trazer poucas assinaturas (H4).
- **A janela fechada passa da volta do fornecedor:** o DNS, o freshclam e o clamd ainda levam tempo para chegar à base
  nova (F17, F27 a F29), e mais tempo se vier um 429 (F7).

### 7. Opções de desenho do portão, para bloco futuro (D1 a D5)

**D1. Idade pela data de montagem (o critério de hoje), com outro limite**

- Como mede: pela data do zVERSION, que é a data de montagem da daily carregada (F24).
- Prós: simples; não depende de rede nem do fornecedor; mede o que está na memória do clamd.
- Contras: fecha à toa quando o fornecedor para (três paradas desde outubro de 2025, de 48 h a cerca de 112 h, duas
  acima de 72 h; H5). E só percebe uma falha nossa depois do limite inteiro.
- Referências de limite: o ClamAV só avisa com 7 dias (F23); o projeto comunitário de F44 sugere 24 h, 48 h ou 7
  dias, e o irmão dele usa 26 h; a conta da #1908, tida como da equipe (H8), sugeriu 48 h ou até 72 h (F11).
- Fontes: https://raw.githubusercontent.com/Cisco-Talos/clamav/rel/1.4/clamd/session.c;
  https://raw.githubusercontent.com/Cisco-Talos/clamav/clamav-1.4.7/libclamav/cvd.c;
  https://github.com/Cisco-Talos/clamav/issues/1908; as paradas de F13 a F15; e o README descrito em F44.

**D2. Última conferência bem-sucedida do atualizador**

- Como mede: pela última vez em que o atualizador conferiu o fornecedor com sucesso.
- Prós: não fecha quando o fornecedor para; percebe rápido rede, CDN ou bloqueio fora do ar.
- Contras: o freshclam não grava esse dado (F33); a saída 0 vale para "em dia" e para "atualizou" (F34); não há
  gancho para "conferiu e está em dia" (F35). Seria preciso ler o log, como o Logwatch (F47), ou usar outro
  atualizador: o cvdupdate grava `last checked` (F38). E não prova que o clamd carregou a base, porque uma recarga que
  falha mantém a anterior (F27, H10).
- Ressalva da verificação que **enfraquece um contra**: o manual permite `--on-update-execute=EXIT_1`, o que separa
  "atualizou" de "já estava em dia" (F34).
- Fontes: https://raw.githubusercontent.com/Cisco-Talos/clamav/rel/1.4/docs/man/freshclam.1.in;
  https://raw.githubusercontent.com/Cisco-Talos/clamav/rel/1.4/freshclam/freshclam.c;
  https://raw.githubusercontent.com/Cisco-Talos/clamav/main/libfreshclam/libfreshclam_internal.h;
  https://raw.githubusercontent.com/Cisco-Talos/clamav/main/clamd/server-th.c;
  https://raw.githubusercontent.com/Cisco-Talos/cvdupdate/main/cvdupdate/cvdupdate.py;
  https://sourceforge.net/p/logwatch/bugs/123/.

**D3. Versão carregada contra a versão anunciada pelo fornecedor**

- Como mede: compara a daily do zVERSION com o 3º campo do TXT de `current.cvd.clamav.net`.
- Prós: mede o que importa, a assinatura publicada que falta. Não fecha quando o fornecedor para, como agora. É o
  critério do próprio freshclam (versão local maior ou igual, F32) e do check_clamav (F45). O ClamAV tolera 1 versão
  atrás (F37). O TXT é DNS e não passa pelo CDN (H12).
- Contras: o TXT **não tem DNSSEC** e pode ser falsificado (F8, H11). É preciso descartar TXT com carimbo acima de
  12 h, como faz o freshclam (F30). Falha ao medir tem de virar "não sei", nunca "em dia": o check_clamav falha aberto
  (H9). A tolerância tem de cobrir o atraso normal até o clamd: até 2 h e 10 min no padrão do freshclam, e até cerca
  de 24 h e 10 min na imagem Docker oficial (H13). Se o CDN ficar atrás do DNS além da tolerância, o portão fecha sem
  haver o que baixar (F36; leitura do redator).
- Fontes: https://raw.githubusercontent.com/Cisco-Talos/clamav/rel/1.4/libfreshclam/libfreshclam_internal.c;
  https://raw.githubusercontent.com/Cisco-Talos/clamav/rel/1.4/libfreshclam/libfreshclam.c;
  https://docs.clamav.net/appendix/CvdPrivateMirror.html;
  https://salsa.debian.org/nagios-team/nagios-plugins-contrib/-/raw/master/check_clamav/check_clamav;
  https://dns.google/resolve?name=current.cvd.clamav.net&type=TXT;
  https://docs.clamav.net/faq/faq-freshclam.html.

**D4. Combinação (proposta dos dois relatos que trataram do desenho, com duas divergências, V6)**

- Proposta de um relato: versão local igual à anunciada no TXT, com teto absoluto de 7 dias pela data.
- Proposta do outro: a base é velha se (i) a versão do zVERSION está **mais de 1 versão abaixo** da do fornecedor, ou
  (ii) **não há medição válida do fornecedor há mais de 24 h**; só nesse caso vale a régua de 72 h pela data. Medição
  válida é o TXT com carimbo de até 12 h, ou o cabeçalho HTTPS da `daily.cvd`. A medição fica guardada, com no máximo
  uma consulta por hora. Falha ao medir é "não sei". Acima de 7 dias pela data, **avisa o dono** mesmo com a versão em
  dia.
- Variante (H14): igual, ou 1 atrás há menos de N horas, com N tirado da data de montagem no cabeçalho HTTPS da daily
  do fornecedor.
- Prós: não fecha à toa na pausa do fornecedor; pega rápido uma falha nossa; mantém a data como rede de segurança.
- Contras: mais peças (DNS, cache, HTTPS) e mais testes. A consulta ao CDN tem de ser rara (429 com até 6 h 51 min de
  espera, F7; 403 por região, F42). Leitura do redator: com tolerância 0, cada daily nova fecha o portão até o
  freshclam baixá-la (F28, F29); com tolerância 1 sem prazo, uma falha nossa fica escondida até o fornecedor publicar
  a versão seguinte, ou até o teto pela data, se ele parar.
- Fontes: as de D1 a D3, mais https://github.com/Cisco-Talos/clamav/issues/1948;
  https://github.com/Cisco-Talos/clamav/issues/1920;
  https://exchange.nagios.org/directory/plugins/anti-2dvirus/clamav/check_clamav_time/details (sem acesso, 403; F46);
  https://docs.clamav.net/manual/Installing/Docker.html.

**D5. A opção `FailIfCvdOlderThan` do próprio clamd não serve como portão por arquivo**

- Ela só roda na partida e faz o clamd sair com erro; **não se repete** enquanto ele atende (F25, F26). Serve, no
  máximo, para não subir um clamd com base muito velha.
- Fontes: https://raw.githubusercontent.com/Cisco-Talos/clamav/rel/1.4/clamd/clamd.c;
  https://raw.githubusercontent.com/Cisco-Talos/clamav/rel/1.4/libclamav/cvd.c;
  https://raw.githubusercontent.com/Cisco-Talos/clamav/main/NEWS.md.

### 8. Recomendação do redator (não é padrão; a decisão é do dono)

- **Agora, a opção A.** 168 h é a régua do próprio ClamAV (F23, F25), teria passado pelas três paradas medidas (F13 a
  F15), e fechar o portão quase não traz detecção a mais, porque **não existe base mais nova que a 28194** (M1, M3,
  F12, H4).
- **Com a volta escrita** (72 h assim que o clamd carregar uma daily acima da 28194), **conferência diária** de que o
  zVERSION mostra a versão do TXT, e **sem forçar o freshclam**.
- **Para o bloco futuro, a D4**, decidindo no plano a tolerância (0 ou 1 versão) e se os 7 dias recusam ou só avisam,
  pelo rito de segurança do contrato.
- Repetindo o limite desta PD: **isto não é padrão nem decisão.** A escolha entre A e B é do dono, e o desenho D1 a D5
  só vira código em bloco próprio, com plano, crítica e junta.

### 9. Correções aplicadas nesta redação (11)

A verificação adversarial releu as 47 fontes: **44 confirmadas, 2 derrubadas, 1 sem acesso**. O que esta entrada
mudou em relação à síntese:

1. **F5 (derrubada → corrigida).** Só **um** dos dois usuários da clamav-users pede explicação; o da 1.5.3 (mensagem
   014574, 13:57:52 UTC) só cola a própria saída.
2. **F40 (derrubada → corrigida).** A mudança dos certificados é **só da 1.5.2**, não da 1.4.4, e vale **só quando
   falta permissão de leitura** ao usuário.
3. **F46 (sem acesso).** O Nagios Exchange deu **403** para o pesquisador e para a verificação; o fato fica marcado
   como não confirmado na fonte primária (só trecho de buscador).
4. **F19 (fonte trocada).** A frase "...we also only release updates once a day" é **da equipe**, de **27/07/2020,
   22:09 UTC**, e não da resposta de um usuário do dia seguinte. Fonte conferida pelo redator:
   https://lists.clamav.net/pipermail/clamav-users/2020-July/009661.html (data e frase verificadas em 28/11/2026).
5. **F26 (fonte completada).** A prova de "cabeçalho" e "base mais nova" está em `cl_cvdgetage`, em
   `libclamav/cvd.c` (rel/1.4), acrescentada às fontes.
6. **F30 (fonte completada).** O índice 2 da daily está em `textrecordfield()`, em `libfreshclam_internal.c`
   (rel/1.4), acrescentado às fontes.
7. **F41 (fonte trocada).** Os "cerca de 50% menores" e o anúncio de 18/11/2025 estão em
   https://blog.clamav.net/2025/11/; o post de 18/12/2025 só confirma a implementação e dá os tamanhos atuais.
8. **F8 (ressalva).** O carimbo do TXT muda a cada hora: na releitura veio 1795845600 (06:00 UTC de 28/11), ainda
   28194. O texto exato visto pelo pesquisador não se reproduz.
9. **F33 (ressalva).** No ramo main, um `.sign` que falte é baixado mesmo com a base em dia; e a #1948 relata que o
   1.4.7 gravou só 6 h depois de um 429 de 24680 s.
10. **F34 (ressalva).** O `EXIT_n` do manual separa "atualizou" de "em dia", o que enfraquece um contra da D2 — a
    ressalva está registrada no fato e na opção.
11. **F42 (ressalva).** A equipe dá o bloqueio por região/IP como **causa mais provável da classe de erro**, não como
    diagnóstico de cada issue; a #1938 ficou sem resposta.

**Ajustes de redação para repositório público** (não são correções de conteúdo): três fontes de terceiros cujas URLs
trazem nome de empresa, de projeto pessoal ou de usuário ficaram **descritas** em vez de linkadas (F3/F6, F17, F44);
as mensagens de lista passaram a ser citadas pelo arquivo oficial (lists.clamav.net) **sem nome de quem escreveu**; e
as menções a pessoas foram substituídas por "a equipe", "um membro da equipe" ou "um usuário".

### 10. Fontes públicas consultadas (índice)

Cada fonte está citada ao lado do fato que ela sustenta, com a data de leitura (**28/11/2026**, salvo indicação).
Agrupamento:

1. **Documentação oficial do fornecedor** (`docs.clamav.net`): faq-cvd, faq-freshclam, faq-eol,
   appendix/CvdPrivateMirror e manual/Installing/Docker — F18, F29, F36, F37, F39, D3, D4.
2. **Blog oficial** (`blog.clamav.net`): posts de 19/03/2021, 11/2025, 12/2025, 03/2026 e 11/2026 (inclusive o de
   18/11/2026, sobre a 1.5.5 e a 1.4.7) — F9, F20, F40, F41.
3. **Listas oficiais** (`lists.clamav.net/pipermail`): clamav-virusdb de 2025-10, 2025-11, 2026-03, 2026-04, 2026-10
   e 2026-11 (índices e mensagens 009208, 009209, 009219, 009221, 009534, 009535, 009554 e 009555); clamav-users de
   2020-07 (009661), 2025-10 (014346 e 014351), 2025-11 (014398 e 014400) e 2026-11 (014573, 014574 e 014575);
   clamav-announce de 2026 — F1 a F5, F10, F12 a F16, F19 a F22.
4. **Código-fonte do fornecedor** (`raw.githubusercontent.com/Cisco-Talos`): ramos `main`, `rel/1.4` e `rel/0.103` e
   tag `clamav-1.4.7`, nos arquivos `libclamav/cvd.c`, `clamd/clamd.c`, `clamd/session.c`, `clamd/server-th.c`,
   `common/misc.c`, `libfreshclam/libfreshclam.c`, `libfreshclam/libfreshclam_internal.c`,
   `libfreshclam/libfreshclam_internal.h`, `freshclam/freshclam.c`, `docs/man/freshclam.1.in`,
   `etc/clamd.conf.sample`, `etc/freshclam.conf.sample`, `NEWS.md` e `cvdupdate/cvdupdate.py` — F23 a F38, D1 a D5.
5. **Issues do projeto do fornecedor** (`github.com/Cisco-Talos/clamav/issues`): #1907, #1908, #1920, #1936 a #1938,
   #1948 e #1949, mais a lista ordenada por data de criação — F4, F7, F11, F13, F42, D4.
6. **Canal de distribuição e DNS**: `database.clamav.net/daily.cvd` e `database.clamav.net/daily-28195.cdiff` (M2, M3,
   F3); TXT de `current.cvd.clamav.net` e consulta DS de `clamav.net` por resolvedor público (M1, F8, D3).
7. **Ferramentas de terceiros**: check_clamav empacotado pelo Debian (F45, D3); módulo de antivírus do rspamd e
   configuração de referência do Amavis (F43); bug 123 do Logwatch (F47, D2); check_clamav_time no diretório de
   plugins do Nagios (F46, D4 — **sem acesso, 403**).
8. **Fontes descritas sem URL** (regra do repositório público): o registro público do CI de outro projeto,
   27/11/2026 (F3, F6); o registro público de um projeto de terceiros, 23/09/2026 (F17); e o README público de um
   projeto comunitário que expõe o ClamAV como serviço REST (F44, D1).
9. **Medições próprias**: TXT no DNS, cabeçalho e 404 no canal de distribuição (M1 a M3) e o comportamento do portão
   no sistema em produção (M4), todas em 28/11/2026.

---

**Contagem final:** **47 fatos** (F1 a F47, mais 4 medições próprias M1 a M4, 6 divergências V1 a V6 e 15 hipóteses
H1 a H15) · **69 fontes distintas** (66 URLs + 3 fontes de terceiros descritas sem URL, pela regra do repositório
público) · **11 correções aplicadas** (2 fatos derrubados e reescritos — F5 e F40; 1 marcado sem acesso — F46; 4
fontes trocadas ou completadas — F19, F26, F30 e F41; 4 ressalvas registradas — F8, F33, F34 e F42).

ENTREGA-CONCLUIDA
