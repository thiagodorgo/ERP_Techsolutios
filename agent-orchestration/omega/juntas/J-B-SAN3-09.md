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

## Ciclo 2 — junta 2 (2026-10-08)

- **Objeto julgado:** inspetor em `e1206447`; cadeiras em `07209295` (C1), `e277bb6d` (C2) e `d3eace58` (C3) — entre eles só
  entrou registro (mandatos, parecer, evidências e votos). CI 7/7 verde em cada objeto. Head do ramo ao fim da junta
  (`approved_head`): `cc01c9c480b3`. O ramo integra a `main` depois da junta (só arquivos de registro em conflito); o
  delta até o merge fica no fecho abaixo.
- **Inspetor:** **LIBERADO COM RESSALVA** (R-1 a R-6) — `votos/B-SAN3-09/00-inspetor-terreno-c2.md`.
- **Quórum:** unanimidade de 3 com veto (segurança e permissão); ciclo 2, o último em que achado não grave bloqueia
  (`D-GOV-PROPORCIONAL`); a norma aplicada foi a da `origin/main` (ressalva R-2).
- **Modelo:** todas as identidades em Claude Opus 5.5, substituição declarada (`D-FABLE-ASTRA-SO-DINHEIRO`: o bloco não toca
  dinheiro); dev do ciclo 2 no Codex `gpt-5.6-sol`.

## VEREDITO: APROVADO (3 × 0)

| cadeira | identidade | voto | bloqueia | ajustes → pendência |
|---|---|---|---|---|
| C1 | `jurado-san3-09c2-c1-entrada-e-registro` | **APROVADO** | — | C1c2-02 → `P-SAN3-09-ECO-APOS-FLAG-DE-SENHA`; C1c2-06 e C1c2-07 → adendos em `P-SAN3-09-ORG-PLATAFORMA-NO-CONSOLE` e `P-SAN3-09-SCRIPTS-FORA-DO-TSCONFIG` |
| C2 | `jurado-san3-09c2-c2-dryrun-e-concorrencia` | **APROVADO** | — | C2c2-A1 → `P-SAN3-09-DRYRUN-RESET-DIZ-SENHA-MANTIDA` |
| C3 | `jurado-san3-09c2-c3-guard-ast-e-escopo` | **APROVADO** | — | C3c2-A1 → `P-SAN3-09-FECHO-RUNTIME-SEM-CASO-VERMELHO` |

Notas (sem pendência nova): critérios do plano que não podiam passar com o texto que o próprio plano prescreve — §15.1.1
(eco em "3+ caracteres"), §15.1.5 ((i)/(ii)), §15.1.4 × §15.3 (relatório coerente com o corpo congelado), "T1.7-fecho sob
MF1-g" e o "diferencial" isolado de MF2-a/MF2-b (C1c2-04/05, C2c2-R1, C3c2) — defeitos da régua, não do produto. Demais
notas: C1c2-01/03/08/09/10/11, C2c2-N1/N2, C3c2-N1…N6, nas evidências.

Evidências e votos em `votos/B-SAN3-09/C{1,2,3}c2-evidencia.md` e `C{1,2,3}c2-voto.json`; mandatos com pré-voo em
`votos/B-SAN3-09/00-mandatos/`. As cadeiras rodaram uma por vez, sem ler os votos umas das outras.

## §C7.4-bis — papéis do ciclo 2

| papel | quem |
|---|---|
| planejador | `planejador-ciclo2-b-san3-09` (Claude Opus) — §15 do plano |
| dev | `dev-ciclo2-b-san3-09` (Codex `gpt-5.6-sol`) — caiu por limite de uso depois do commit `1c520f1e`; evidência final versionada pelo orquestrador |
| fábrica | `agente-fabrica` (Claude Opus) — as 3 cadeiras |
| inspetor | instância nova de `inspetor-de-terreno-da-junta` (Claude Opus) |
| achadores / votantes | C1, C2, C3 acima — identidades novas, nenhuma do ciclo 1 |
| orquestrador | mandatos, registro, integração da `main`; **não escreveu código do bloco** |

(a) A composição cobriu as competências dos achados do ciclo 1 (o inspetor conferiu os 10). (b) Quem achou no ciclo 1 não
consertou nem votou no ciclo 2. (c) O planejador mediu o objeto num worktree próprio; o dev registrou a única divergência
(`passwordReset`) em vez de improvisar.
