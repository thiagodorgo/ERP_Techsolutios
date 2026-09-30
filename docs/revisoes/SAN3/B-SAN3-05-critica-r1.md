# B-SAN3-05 — CRÍTICA ADVERSARIAL — rodada r1

> **Identidade:** `critico-b-san3-05` (nova; não planejou nem desenvolveu este bloco) · **papel:** `critico-adversarial`
> (§C7.4-bis: **quem acha** — defeito + evidência executada + motivo; sem correção, sem plano, sem código).
> **Corpo:** `.claude/agents/critico-adversarial.md` @ `origin/main` = `3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c`;
> `git show origin/main:.claude/agents/critico-adversarial.md | tr -d '\r' | md5sum` → `ae0a04610a6be1c1490c0c51e0489d91` (= o declarado pelo orquestrador).
> **Modelo em que roda:** Opus 5.5 (`claude-opus-5-5`) — o modelo da sessão; o `critico-adversarial` não tem `model:` fixado no frontmatter (não é gate Fable do §C7.6/6-bis).
> **Máquina:** `Linux vm 6.18.44-fc-v50 #1 SMP PREEMPT_DYNAMIC @0 x86_64 x86_64 x86_64 GNU/Linux` · `PATH=/opt/node20/bin:$PATH node -v` → `v20.20.2`.
> **Alvo:** `docs/revisoes/SAN3/B-SAN3-05-plano.md` no ramo `docs/plano-b-san3-05`, head `c3f57e9be6352b96a12ef1c6a292e49c1db64ad3`
> (1 commit sobre `origin/main@3b1fe0f9`). Lido inteiro (1292 linhas, com Apêndices A e B).
> **Cluster:** Postgres 16.13 descartável `127.0.0.1:54351`, banco `erp_critico` (115 tabelas, 106 FORCE — medido ao abrir). Redis `63851` (PONG; não usado).
> **Regra de leitura:** cada item = comando → saída resumida → veredito parcial. Logs longos ficam aqui, não na mensagem final.

---

## Item 1 — Lista fechada: gerador do Apêndice A, os 7 sítios do §0.4, e sítios crus que ele não vê

EM APURAÇÃO

## Item 2 — `RUNTIME_ROLE_GUARD_SQL` sob papel real (super, super renomeado, limpo, membro de BYPASSRLS c/ NOINHERIT e 2 níveis) e a consulta ingênua

EM APURAÇÃO

## Item 3 — `scripts/db-runtime-role.sh` (SQL do §4.1) executado de verdade; `ALTER DEFAULT PRIVILEGES`; `docker-entrypoint` do `postgres:16`

EM APURAÇÃO

## Item 4 — Trava de boot × `env.ts`, pontos de entrada, H6/paridade

EM APURAÇÃO

## Item 5 — A1–A16 × T1–T14: a mutação que derruba cada critério existe?

EM APURAÇÃO

## Item 6 — Outras premissas (contagens, linhas, P-a…P-p, §6×§5, §9)

EM APURAÇÃO

---

## Tabela de achados

EM APURAÇÃO

## Veredito

EM APURAÇÃO
