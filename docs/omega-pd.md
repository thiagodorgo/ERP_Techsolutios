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
