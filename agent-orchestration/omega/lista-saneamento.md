# RODADA SANEAMENTO + Ω-INFRA — lista de execução

Fonte de verdade: `agent-orchestration/omega/prompt-rodada-saneamento-infra.md` (reler a cada bloco).
Governança: autonomia por juntas (verde da junta = merge + próximo); protocolo de dificuldade (fábrica cria
agentes antes de parar); paradas irredutíveis: migration destrutiva, exposição de segredo, ação irreversível
em produção sem junta unânime, **e a fronteira de provisionamento cloud** (conta/pagamento/domínio/secrets =
handoff humano — ratificada em J-SAN-0).

## Ordem: Ω-GATE → Ω-GOV → Ω-DOCS → Ω-INFRA-1 → 2 → 3 → 4

- [ ] **PR 1 — Ω-GATE (CI roda a suíte inteira + main verde)** — EM JUNTA (J-SAN-1). Fábrica da rodada criada
      (ci-doutor, devops-provisionador, secops, dba-guardiao, finops) + J-SAN-0 (plano ratificado). Diagnóstico
      28→3→0: 25 fails eram poluição do `.env` local (CORE_SAAS_PERSISTENCE=prisma que o CI não tem); 3 reais
      corrigidos por causa raiz (app.ts platform-antes-de-me; cloud-usage fixture-relógio; approval contrato
      vivo). `npm test` = suíte inteira; CI ganhou postgres:16+redis:7+migrate deploy. Suíte 0 fail no ambiente
      real do CI (766 pass). P-003 RESOLVIDO. **PR #NN, merge <hash> — pendente.**
- [ ] **PR 2 — Ω-GOV** (KPI por PR + autonomia por juntas como norma permanente; D-KPI-PER-PR + D-SAN-AUTONOMIA).
- [ ] **PR 3 — Ω-DOCS** (descontaminação Kryos; D-DOCS-KRYOS).
- [ ] **PR 4 — Ω-INFRA-1** (Dockerfile multi-stage + `/health` real + docker-compose.prod + PD-INFRA-1 escolha
      de provedor [junta 5] + publish GHCR [usa GITHUB_TOKEN, sem conta externa] + docs/deployment). **100% autônomo.**

> ### ⛔ CHECKPOINT PAUSA-HANDOFF-CREDENCIAIS (entre PR4 e PR5 — ratificado J-SAN-0/J-SAN-1 critico)
> Fronteira externa IRREDUTÍVEL. A partir do PR5, a ATIVAÇÃO VIVA exige o que a D-SAN-AUTONOMIA não fabrica:
> conta no provedor + método de pagamento/cartão + domínio registrado & DNS + secrets iniciais nos GitHub
> Environments. O agente entrega toda a config-as-code aprovada em junta-de-código; o **hand-off** é um único
> dossiê ao humano. Adicionado às paradas imediatas: **falta de credencial/pagamento/domínio externo**.

- [ ] **PR 5 — Ω-INFRA-2** (staging). Config-as-code + pipeline CD + smoke script AUTÔNOMOS; ativação viva
      (conta/secrets) = handoff humano (fronteira J-SAN-0).
- [ ] **PR 6 — Ω-INFRA-3** (produção + trava dupla). IaC + runbook rollback autônomos; go-live = handoff.
- [ ] **PR 7 — Ω-INFRA-4** (backup + observabilidade). Scripts backup/restore + PD-INFRA-2 autônomos; restore
      comprovado contra ambiente real = handoff.
- [ ] **Relatório final** `relatorio-saneamento-infra.md` + dossiê único de ativação ao humano.

## Teto autônomo (ratificado J-SAN-0): PR1→PR4 completos + IaC/pipelines/scripts/runbooks de PR5-7 escritos e
## aprovados em junta-de-código. Hand-off = ativação viva (um único dossiê, humano interrompido uma vez).
