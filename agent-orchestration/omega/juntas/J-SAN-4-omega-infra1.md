# J-SAN-4 — Ata: PR Ω-INFRA-1 (containerização + healthcheck + escolha de provedor)

Decisão CRÍTICA (contratação/config de serviço externo) → junta de **5 UNÂNIME** (D-SAN-AUTONOMIA):
**agente-devops-provisionador · agente-secops · agente-dba-guardiao · critico-adversarial · estrategista**.

## Veredictos (5/5 APROVADO — unânime)
| Agente | Veredito | Núcleo |
|---|---|---|
| devops-provisionador | **APROVADO** | Reproduziu build + stack ao vivo: readiness 503 com deps mortas / 200 com deps up; compose ponta a ponta; GHCR content-size real ~185MB (837MB era disk usage). 12/12 checklist verde. |
| secops | **APROVADO** | Zero segredo real versionado (placeholders rotulados); gates env.ts intactos (provados: api crashou com dev-secret); /health/ready sem vazamento; GHCR via GITHUB_TOKEN. Achado ALTA pré-existente: CORS bare → **gate do go-live** (P-SAN-CORS). |
| dba-guardiao | **APROVADO** | Reproduziu migrate deploy em Postgres VAZIO (40/40, idempotente); migrations 100% aditivas; RLS reconstruída + isolamento cross-tenant provado com role não-superusuária. |
| critico-adversarial | **APROVADO** (2 alvos) | PD honesta (fontes verificadas independentemente, ranking bate); Dockerfile sem furo; split liveness/readiness é best-practice; KPI 766→768 sem duplo-contagem. Requisitos R1/R2 abaixo. |
| estrategista | **APROVADO** | A mesma imagem OCI do PR4 flui p/ PR5/6; fraqueza do Fly tem antídoto por desenho no PR7; fronteira de hand-off corretamente posicionada. |

## DECISÃO DE PROVEDOR (unânime 5/5) → D-INFRA-PROVIDER
**Fly.io (gru/São Paulo) 1º · AWS (Lightsail→RDS/ECS, sa-east-1) 2º.** Railway/Render/Hetzner reprovados como
principal (gate de região BR; Hetzner soma sem-PITR). Com DUAS condições vinculantes:
- **R1 (premissa a ratificar pelo humano, no dossiê de hand-off):** "dados no Brasil" é requisito de produto/venda?
  A LGPD (art. 33) não obriga. **Se NÃO for requisito, o 1º correto é Render** — a premissa não passa carimbada
  em silêncio.
- **R2 (gate BLOQUEANTE de go-live):** drill de restore CRONOMETRADO no Fly MPG + alvo de **RPO escrito** no
  runbook do PR 7 + pg_dump diário→S3 independente. RPO não atendido → switch pré-aprovado para AWS.

## Artefatos ratificados (todos reproduzidos ao vivo por ≥1 agente)
Dockerfile multi-stage (não-root, sem segredo, dummy DATABASE_URL só no builder descartado) · frontend
Vite→nginx (proxy same-origin) · /health liveness + /health/ready readiness profundo (200/503, §2.8 sem
vazamento) · docker-compose.prod (migrate one-shot `target: builder` — padrão a replicar no CD) · ci.yml job
docker (build em todo PR, GHCR só na main via GITHUB_TOKEN, needs backend+frontend) · PD-INFRA-1 · deployment.md.

## Pendências registradas
P-SAN-CORS (ALTA pré-existente — gate do Ω-INFRA-3) · P-SAN-INFRA1-NITS (837MB/185MB, compose em memory,
web depends_on sem healthy, custo Fly pós-jan/2026) · notas devops p/ PR5-7 (migrate via pipeline/release_command,
reapontar upstream do nginx no provedor, liveness/readiness como checks separados no fly.toml, modo prisma na
config real). `.gitignore` endurecido no bloco (.env.* exceto example).

## Evidência
`docker build` exit 0 · compose ponta a ponta (migrate "All migrations applied", /health/ready 200 pg/redis up,
SPA nginx 200, proxy web→api 200) · suíte 768/768 no ambiente do CI · check/build verdes · b106 guard 20/20.
**APROVADO — merge do Ω-INFRA-1 (fecha o teto 100% autônomo da rodada: PRs 1-4).**
