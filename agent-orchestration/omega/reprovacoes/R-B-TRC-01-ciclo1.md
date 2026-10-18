# R-B-TRC-01 — ciclo 1 (2026-10-16)

**Entrega:** B-TRC-01, PR #426 — o Traccar em dev com ingestão privada e quarentena (posição no mapa da OS).
**Junta (segurança, completa):** inspetor de terreno · guardião de banco · 3 cadeiras, unanimidade com veto. Ata: `agent-orchestration/omega/juntas/J-B-TRC-01-ciclo1.md` (objeto `5abdf83b`).

## Veredito do ciclo 1: REPROVADO (1 × 2)
- **(a) RLS, unicidade e banco** (`jurado-trc01-a-rls-e-banco-cdx3`, Codex GPT-5.6 Sol) → **REPROVADO**, 2 bloqueios: (a)-1 os 6 testes `-db` do Traccar fora da lista curada do job `backend-postgres`; (a)-2 três submedições (log SQL por transação, `pg_terminate_backend`, rollback por `pg_dump`) não executadas pela cadeira.
- **(b) superfície e segredo** (`jurado-trc01-b-superficie-e-segredo-cdx2`, Codex GPT-5.6 Sol) → **APROVADO**.
- **(c) contrato e atribuição** (`jurado-trc01-c-contrato-e-atribuicao-claude`, Claude Opus 5.5) → **REPROVADO**, 1 bloqueio: (c)-1 a atribuição da posição não tem dimensão de tempo (usa a viatura que a OS tem quando a posição CHEGA, não a do instante do fix).

## Auditoria de topo (`D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`)
`planejador-trc01-ciclo2` (Fable): **1 achado real × 2 artefatos** — (c)-1 real; (a)-1 artefato na consequência (o job `backend` executou os 44/44 `-db`), fato menor na forma; (a)-2 artefato (não-medição por cota). Plano: `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-01-ciclo2-auditoria-e-plano.md`.

## Separação de papéis (§C7.4-bis)
- **Quem achou:** as cadeiras (a) e (c) do ciclo 1.
- **Quem planejou o ciclo 2:** `planejador-trc01-ciclo2` (Fable), que não votou nem desenvolveu.
- **Quem desenvolve o ciclo 2:** `dev-trc01-c2-codex` (00:15–00:23Z de 17/10, consertos A, B e C) → `dev-trc01-c2-argon` (bateria até o passo 5; caiu por login/cota do Antigravity) → `dev-trc01-c2-gemini` (Gemini 3.1 Pro pela API, teto US$ 5; em curso). Nenhum deles foi cadeira do ciclo 1. As trocas foram por ordem do dono ou por infraestrutura, não por defeito.
- **Autorização do dono para a migração nova:** `D-TRC01-VEHICLE-ASSIGNED-AT`, opção (i) (`decisoes.md`, registro de 16/10, na `main`).

## Ação
Ciclo 2 com 3 cadeiras de identidade NOVA (corpos da `agente-fabrica`, §2.6 do plano), inspetor de terreno e parecer do guardião de banco sobre `20260876000000_work_orders_vehicle_assigned_at`. Ciclo 2 é o último em que achado não grave reprova.
