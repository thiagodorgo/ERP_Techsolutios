# Estudo de migração para a AWS — custo, desenho e etapas

- **Autor:** o orquestrador (Claude Opus 5.5), por exceção aberta pelo dono em 13/10: *"faça você ... o estudo da AWS"*.
- **Fecha:** a parte "estudo" da `P-TRC-AWS-ESTUDO-MIGRACAO`. Desde a `D-INFRA-PROVIDER-AWS` (13/10, "o provedor é o aws"), ela não pergunta mais SE, e sim COMO.
- **Ref:** `origin/main` `f59ad1d6`.

## 1. O que roda hoje e precisa ir para a AWS (medido no repositório)
| Peça | Hoje | Fonte |
|---|---|---|
| API Node.js (Express, Prisma) | imagem Docker; na Fly, `shared-cpu-1x` com 512 MB, 1 máquina sempre ligada | `Dockerfile`, `fly.production.toml:32-80` |
| Frontend React (build estático) | na Fly, `shared-cpu-1x` com 256 MB servindo o build | `frontend/fly.production.toml:10-39` |
| PostgreSQL 16 | container no compose; na Fly, Postgres gerenciado | `docker-compose.prod.yml:6` |
| Redis 7 | container | `docker-compose.prod.yml:30` |
| Anexos, checklists e evidências | provedor `local` ou **`s3`** (já suportado, com bucket, região e endpoint) | `src/config/env.ts:246-253` |
| Traccar | desenho aprovado: **ECS/Fargate em subnet privada, RDS PostgreSQL dedicado, Secrets Manager, sem porta pública** | `docs/revisoes/TRACCAR/PLANO_TRACCAR.md:899-912` |
| Antivírus (ClamAV) | `B-AV-REAL`: o desenho AWS está na PD `PD-O6R-B07B-CLAMD-INSTREAM` | `decisoes.md` (D-INFRA-PROVIDER-AWS) |
| Produção hoje | **nenhuma**: a config da Fly está inerte (`D-INFRA-PROVIDER` e o hand-off nunca ativado) | `PROJECT_MEMORY.md:132` |

**Hoje o custo de hospedagem é US$ 0**, porque não há produção no ar. A comparação útil é a AWS contra o que a Fly custaria. A PD anterior tinha o Traccar em ~US$ 26–67/mês na Fly e ~US$ 38–73/mês no Fargate com NAT (`docs/omega-pd.md:1333,1593`).

## 2. Desenho proposto (região `sa-east-1`, São Paulo: dado no Brasil, LGPD)
- **VPC** com 2 zonas de disponibilidade.
  - Subnets públicas: só o balanceador.
  - Subnets privadas: API, Traccar, ClamAV e os bancos.
- **API:** ECS Fargate, ARM, 0,5 vCPU e 1 GB. Começa com 1 tarefa e sobe para 2 quando houver cliente pagante.
- **Frontend:** S3 com CloudFront (estático, mais barato e sem servidor), em vez de um container.
- **PostgreSQL do ERP:** RDS `db.t4g.small` com backup automático e PITR. Restore cronometrado = o R1 e o R2 do go-live.
- **Redis:** ElastiCache Valkey `cache.t4g.micro`, compatível com Redis.
- **Traccar:** Fargate x86, 0,5 vCPU e 2 GB (Java), mais RDS `db.t4g.micro` dedicado, como manda o plano do Traccar.
- **ClamAV:** Fargate ARM, 0,5 vCPU e 3 GB (o clamd carrega a base de vírus na memória).
- **Balanceador:** ALB público só para a API, com certificado ACM grátis. Nenhuma porta pública para o Traccar.
- **Saída para a internet das subnets privadas:** NAT gateway, ou uma **instância NAT** `t4g.nano` para economizar (ver 3.2).
- **Segredos:** Secrets Manager.
- **Deploy:** GitHub Actions com OIDC, sem chave de longa duração.
- **Logs:** CloudWatch.
- **Infraestrutura como código:** Terraform mínimo, com o `agente-devops-provisionador`.

## 3. Custo mensal estimado (730 h/mês, sob demanda, sem desconto)

### 3.1 Preços usados
| Item | Preço em sa-east-1 | Fonte |
|---|---|---|
| Fargate ARM | US$ 0,0557 por vCPU-h · US$ 0,00612 por GB-h | **oficial**, AWS Price List API (`AmazonECS/sa-east-1`), lida em 13/10 |
| Fargate x86 | US$ 0,0696 por vCPU-h · US$ 0,0076 por GB-h | **oficial**, idem |
| ALB / NLB | US$ 0,034 por hora · LCU US$ 0,011 / US$ 0,00825 | **oficial** (`AWSELB/sa-east-1`) |
| ElastiCache Valkey t4g.micro | US$ 0,024 por hora (Redis: US$ 0,030) | **oficial** (`AmazonElastiCache/sa-east-1`) |
| RDS PostgreSQL db.t4g.micro | ~US$ 25 por mês | secundária (Bytebase); a small fica em ~US$ 50, por **estimativa** (dobro da micro) |
| NAT gateway | US$ 0,093 por hora + US$ 0,093 por GB | secundária (CostGoat) |
| S3, CloudFront, Secrets Manager, CloudWatch, dados de saída | valores de ordem de grandeza | **estimativa**: confirmar na calculadora da AWS |

### 3.2 Total
| Componente | US$/mês |
|---|---|
| API (Fargate ARM 0,5 vCPU e 1 GB, 1 tarefa) | 24,8 |
| Frontend (S3 + CloudFront) | ~3 |
| PostgreSQL do ERP (RDS t4g.small + 20 GB) | ~54 |
| Redis (Valkey t4g.micro) | 17,5 |
| ALB (hora + ~1 LCU) | ~33 |
| Traccar (Fargate x86 0,5 vCPU e 2 GB) | 36,5 |
| PostgreSQL do Traccar (RDS t4g.micro dedicado + 20 GB) | ~28 |
| ClamAV (Fargate ARM 0,5 vCPU e 3 GB) | 33,7 |
| NAT gateway (hora; os dados à parte) | 67,9 |
| Secrets Manager, CloudWatch, S3 de anexos, Route 53 e saída de dados | ~20 |
| **Total com NAT gateway** | **~US$ 320/mês** |
| **Total com instância NAT `t4g.nano`, no lugar do gateway** | **~US$ 255/mês** |

**Como baixar o custo, por ordem de impacto:**
1. **Instância NAT no lugar do NAT gateway:** −US$ 60. Custo: um ponto único a monitorar.
2. **Savings Plan ou reserva de 1 ano** em Fargate e RDS: −30 a 40% sobre esses itens, quando a carga se firmar.
3. **Banco do Traccar no mesmo RDS do ERP,** em outro database: −US$ 28. Contraria o "RDS dedicado" do plano do Traccar, então é decisão de segurança.
4. **ClamAV só quando o `B-AV-REAL` entrar:** −US$ 34 até lá.

**Staging:** metade do tamanho, desligável fora do horário, ~US$ 80–120/mês.

## 4. Etapas da migração (blocos, em ordem)
1. **`B-INFRA-AWS-01` — conta e fundação.**
   - Organização e conta, região `sa-east-1`, VPC com subnets, IAM mínimo, ECR, Secrets Manager.
   - **Orçamento e alertas de custo** (AWS Budgets).
   - GitHub OIDC.
   - É contratação de serviço pago: **junta de 5 unânime** (§C7.1).
2. **`B-INFRA-AWS-02` — bancos.**
   - RDS do ERP com backup, PITR e **restore cronometrado** (R1 e R2 do go-live).
   - Papel de runtime `NOSUPERUSER NOBYPASSRLS`, o ato do dono do `B-SAN3-05`.
   - Valkey.
3. **`B-INFRA-AWS-03` — API e frontend em staging.**
   - Fargate, ALB, ACM, Route 53, S3 de anexos (`CHECKLIST_STORAGE_PROVIDER=s3`), CloudFront.
   - Deploy pelo GitHub Actions; smoke autenticado.
4. **`B-TRC-06` — Traccar em staging,** já planejado: Fargate privado, RDS dedicado, ponte privada com a API na mesma VPC.
5. **`B-AV-REAL` na AWS:** ClamAV privado, pelo desenho AWS da PD.
6. **Produção:**
   - repetir em produção o que o staging provou;
   - 1º admin pelo script do `B-SAN3-09`;
   - go-live com os 12 passos de `docs/go-live-readiness.md`.
7. **A Fly sai:** depois de o staging AWS estar verde, os `fly.*.toml` vão para um PR de limpeza (ou ficam como referência de rollback, decisão do dono).

**Tamanho:** de 5 a 7 blocos de infra, M ou G cada, com juntas de segurança e de serviço pago. Corre **em paralelo** com o gate de produção, porque não toca os mesmos arquivos de produto.

## 5. Riscos
- **sa-east-1 é mais cara** que us-east-1: o NAT custa o dobro e a saída de dados é ~US$ 0,15/GB. Compensa pela LGPD e pela latência no Brasil.
- **NAT gateway é o maior item fixo:** a instância NAT corta, mas vira ponto a monitorar.
- **Lock-in baixo:** imagens Docker, PostgreSQL e Redis padrão. Sair é `pg_dump` mais trocar o orquestrador.
- **Os preços secundários** (RDS, NAT, S3) precisam ser conferidos na calculadora oficial antes da junta de 5.
- **Custo acidental:** o AWS Budgets com alerta é obrigatório desde o dia 1 (etapa 1).

## 6. Decisões do dono que este estudo abre
1. **Conta AWS:** quem abre e qual cartão. É ato do dono.
2. **NAT gateway ou instância NAT.** Recomendo a instância no começo.
3. **Banco do Traccar dedicado ou compartilhado.** O plano do Traccar diz dedicado; recomendo manter.
4. **Teto do orçamento mensal da AWS,** para o alerta. Sugestão: US$ 350 com staging.

## Fontes
- AWS Price List API, sa-east-1: `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/{AmazonECS,AWSELB,AmazonElastiCache}/current/sa-east-1/index.json` (lida em 13/10/2026)
- [Bytebase — db.t4g.micro pricing (RDS)](https://www.bytebase.com/dbcost/rds/instance/db.t4g.micro/)
- [CostGoat — AWS NAT Gateway pricing](https://costgoat.com/pricing/aws-nat-gateway)
- [AWS Region sa-east-1 (aws-pricing.com)](https://aws-pricing.com/sa-east-1.html)
