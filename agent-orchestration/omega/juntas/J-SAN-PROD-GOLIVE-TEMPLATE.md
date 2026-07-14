# J-SAN-PROD-GOLIVE-<SHA> — TEMPLATE (ata de GO-LIVE de produção, junta-5 unânime por SHA)

> **Não é a ata de código deste PR** (essa é `J-SAN-PROD-CODE`). Esta ata é da **ativação viva**: registra a
> junta-5 unânime que autoriza o deploy de um SHA ESPECÍFICO em produção. Criar copiando este template para
> `J-SAN-PROD-GOLIVE-<sha-de-40-chars>.md` **antes** de disparar o `deploy-production.yml` com aquele `promote_sha`.
> O CD (trava (a)) exige que este arquivo exista em HEAD e referencie o SHA; a trava (b) exige smoke de staging
> verde no mesmo SHA; a trava (c) exige `rollback_rehearsed=true` amarrado à evidência abaixo.

## SHA promovido
`promote_sha`: `<cole aqui o SHA de 40 caracteres a promover — deve ter imagem GHCR erp-backend:<sha> e smoke de staging verde>`

## Pré-condições verificadas (as três travas)
- [ ] **(a) Ata presente por SHA** — este arquivo nomeia o `promote_sha` acima.
- [ ] **(b) Smoke de staging VERDE no MESMO SHA** — run de `deploy-staging.yml` com job `deploy`=success e step
      `Smoke staging`=success (URL da run: `<link>`). Requer `STAGING_DEPLOY_ENABLED=true` já ativo.
- [ ] **(c) Rollback ENSAIADO** — evidência cronometrada abaixo; `rollback_rehearsed=true` no `workflow_dispatch`.

## Evidência do ensaio de rollback (Runbook A, em STAGING)
```
# ciclo deploy N → deploy da imagem N-1 → smoke verde, cronometrado
<comando>            fly deploy --config fly.staging.toml --image ghcr.io/<owner>/erp-backend:<sha-N-1>
<saida resumida>     ...
RTO medido:          <mm:ss>
```

## Junta-5 unânime (5/5 — decisão crítica: deploy de PRODUÇÃO, D-SAN-AUTONOMIA)
| Agente | Veredito | Núcleo |
|---|---|---|
| agente-devops-provisionador | | |
| agente-secops | | |
| agente-dba-guardiao | | |
| critico-adversarial | | |
| estrategista | | |

## Decisão
`APROVADO 5/5 — go-live do SHA <promote_sha> autorizado` **ou** `REPROVADO` (com motivo e ciclo do protocolo).

> Registrar também: URL de produção (entra em `docs/deployment.md` + `docs/demo-credentials.md`), confirmação de
> que `db:seed` NÃO rodou, e o resultado do `smoke-production.mjs` pós-deploy.
