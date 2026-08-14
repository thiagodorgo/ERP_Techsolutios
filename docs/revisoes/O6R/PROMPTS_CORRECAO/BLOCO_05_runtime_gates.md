# Prompt — B-O6R-05 Gates de runtime produtivo

Corrija Ω6R-DAT-001 e Ω6R-DIN-006. Em `NODE_ENV=production`, boot deve exigir Prisma e presença de worker crítico; alinhe compose/fly sem segredos literais reais.

Done-when: production sem flag ou com memory falha antes de listen; processo worker dedicado tem heartbeat por schedule; deploy sem heartbeat falha readiness/gate. Smoke grava/reinicia/lê; prova OS→custódia, diária e notificação. Preserve dev/test Memory e não mexa em produção externa sem junta.
