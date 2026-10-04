# J-B-SAN3-09 — junta do B-SAN3-09 (PR #400), caminho versionado para o 1º admin de plataforma

## Ciclo 1 — junta 1 (2026-10-04)

- **Objeto julgado:** `ba65c03a4c3edc0723633b0f1330f34852a60e6f` (14/14 check-runs verdes; delta desde `6330bce2` só o parecer
  do inspetor). O ramo integrou a `main` `8ee10bd2` por merge (`aa64aac3`) e o KPI foi recontado (`033739b6`) antes da junta.
- **Inspetor:** **LIBERADO COM RESSALVA** (R-1 a R-7) — `votos/B-SAN3-09/00-inspetor-terreno.md` (Claude Opus 5.5, substituição
  declarada: Fable e Astra suspensos pelo dono).
- **Quórum:** unanimidade de 3 com veto (o bloco mexe em segurança e permissão). Desde o merge do #407 vale o §C7 item 8
  (`D-GOV-PROPORCIONAL`): junta completa mantida, **teto de 2 ciclos** — no ciclo 3 só defeito de produto grave bloqueia.

## VEREDITO: REPROVADO (3 × 0)

| cadeira | identidade | modelo | voto | bloqueia | ajustes e notas |
|---|---|---|---|---|---|
| C1 | `agente-secops` | Opus 5.5 | **REPROVADO** | **3b-1** — o registro programa o fechamento de `P-SAN-PROD-BOOTSTRAP` no pós-merge (porteiro/CI), e não pela execução do dono em produção; traz `ALLOW_PROD_SEED=1` | M-1 (checagem de hash do T2.9 nunca dispara), M-2 (falta o M5c de processo no T2.9), 3a-1 (passo de domínio+TLS sumiu do Runbook B), 3b-2 (§13 incompleto). Nenhum critério de veto de segredo disparou |
| C2 | `agente-dba-guardiao` | Opus 5.5 | **REPROVADO** | **A-1** — T2.4 e T2.10 continuam verdes sob os mutantes do A11 e do A18 | itens 1–3 verdes medidos; a R-1 (restore/PITR/migration fora do escopo) foi aplicada |
| C3 | `guardiao-fail-closed` | Opus 5.5 | **REPROVADO** | **C3-F1** — o guard de imports (CE-G1) só reconhece imports de uma linha, com `from` e aspas duplas: um import fora da allowlist em 4 formas passa com 23/23 verde; **C3-F2** — o "teste de mutação" do T1.7 é tautológico; **C3-F3** — o script ignora em silêncio flag desconhecida: `--dryrun` (erro de digitação) aplicou de verdade um e-mail errado, e o certo passa a ser recusado sem caminho de remoção | C3-A1 (o runbook não cita o exit 1 do A20); N1–N4 (N4 pré-existente: a trava libera qualquer `NODE_ENV` diferente de "production") |

Evidências e votos em `votos/B-SAN3-09/C{1,2,3}-evidencia.md` e `C{1,2,3}-voto.json`. As cadeiras rodaram uma por vez no Claude em
Opus (decisão do dono: Claude nas janelas sem Codex, uma tarefa por vez).

## §C7.4-bis — papéis

| papel | quem |
|---|---|
| planejador | `planejador-b-san3-09` (plano v-final) |
| dev | dev de nuvem do bloco; `dev-kpi-b-san3-09` (recontagem de KPI) |
| inspetor | instância nova de `inspetor-de-terreno-da-junta` (Opus) |
| achadores | C1, C2, C3 |
| orquestrador | integração da `main`, mandatos, registro; **não escreveu código do bloco** |

**Incidente de terreno declarado pela C3:** na limpeza, um glob `./*.log` no scratchpad do orquestrador apagou também logs que não
eram dela (logs de sessões do Codex e um log de CI do #405); nada rastreado foi afetado.
