# J-B-TRC-02 — ciclo 2 — junta de SEGURANÇA (unanimidade de 3 com veto)

- **Bloco:** B-TRC-02 — eventos da viatura e telemetria veicular pelo forward do Traccar. **PR:** #454, ramo `feat/traccar-b-trc-02`.
- **Objeto julgado:** `42800d0dcece29c7e3a39476c9b40c917a66dfd0` (CI 14/14 `success`, medido pelo inspetor).
- **approved_head:** 42800d0dcece29c7e3a39476c9b40c917a66dfd0
- **VEREDITO: APROVADO (3 × 0, unanimidade)**

## O que mudou desde o ciclo 1
Ciclo 1 REPROVADO pela cadeira (b): achado b-1 (7 linhas de andaime da Q1 = SIM revertida em `phaseTwoSteps`), não grave, dentro do bloco
(`J-B-TRC-02-ciclo1.md`, `R-B-TRC-02-1.md`). Auditoria e plano do ciclo 2 pelo topo (`planejador-trc02-c2-fable`, Fable; decisão do dono de 24/10
`D-TOPO-E-O-CLAUDE`): máquina sã, achado real de higiene. Conserto (`18872503`): `phaseTwoSteps` +5/−7, `M-E16″` ancorada no passo 5; merge da `main`
(`96821af8`) sem rebase; relatório (`42cb4da4`); nota b-3 (`42800d0d`).

## Papéis (§C7.4-bis)
- **Achou:** `jurado-trc02-b-opus` (ciclo 1). **Planejou:** `planejador-trc02-c2-fable` (Fable). **Desenvolveu:** `dev-trc02-c2-argon` (Antigravity Argon).
- **Redatores:** `redator-trc02-c2-sol` (commit R, Codex) e `redator-trc02-c2-opus` (mandatos, Claude Opus, cobrindo o Codex em limite).
- **Inspetor:** `insp-trc02-c2-argon` (Antigravity Argon) — LIBERADO COM RESSALVA (disco < 10 GB, resolvido antes das cadeiras: 10,1 GB).
- **Julgaram (item 9: as 3 refeitas do zero — nenhum verde do ciclo 1 a carregar):**
  - (a) `jurado-trc02-c2-a-api` — Claude Opus pela API (`run-api-v3`, container cercado, teto US$ 4; gasto US$ 2,47; decisão do dono: *"Use o claude api para a cadeira a com teto de 4 uss"*), **mais o complemento** `jurado-trc02-c2-a-compl-opus` (Claude Opus) para as 3 medições que a (a) declarou não feitas por limite do ambiente (M-E14, sonda 23505, organização B povoada). Antes, caíram `a-pro` (Gemini CLI bloqueou `npm ci`), `a-sol2` (Codex, limite) e `a-argon` (Antigravity, créditos) — `00-quedas.md`.
  - (b) `jurado-trc02-c2-b-opus` (Claude Opus; sucessor de `b-argon`, créditos).
  - (c) `jurado-trc02-c2-c-opus` (Claude Opus; a cadeira não-Gemini).
- (a) composição cobriu banco/RLS/arnês, superfície/escopo/registro e contrato/evento/unidades; (b) quem achou não consertou; (c) sem dado podre:
  cada sucessor re-mediu (P3), evidências de quedas guardadas como `*-QUEDA-*` e não usadas como conclusão.

## Votos
| Cadeira | Voto | Achados |
|---|---|---|
| (a) API + complemento | APROVADO + APROVADO | A-1 `pre-existente`, não bloqueia (teste de tempo do bloco 01 `traccar-position-ingestion-db.test.ts:819` recebeu 503 em 1 de 3 rodadas sob carga; isolado 5/5); complemento: M-E14 vermelha, 23505 → 503 sem gravação nem duplicata, B povoada inalterada 16/16 |
| (b) | APROVADO | b-1 FECHADO (diff `src/` 1 arquivo `5 7`; 0 linhas fora das faixas; M-E16″ morde F3); notas: autoverificação do demo nunca falha; vermelho-controle por critério não refeito na variante final |
| (c) | APROVADO | nenhum achado contra o objeto; nota: `B-TRC-02-dev.md:617` põe o F5 entre os vermelhos da M-E17 e ele não está lá |

## Quedas (P6)
`votos/B-TRC-02-ciclo2/00-quedas.md`: `a-pro`, `b-argon`, `a-sol2`, `a-argon` — custo: refazer do zero cada uma; nenhum voto perdido contado.

## Ressalva de legalidade declarada
O parecer do inspetor libera as cadeiras pelos nomes do mandato (`a-pro`, `b-argon`); as substituições por `a-api`/`a-compl-opus` e `b-opus` estão registradas
em `00-quedas.md` pelo orquestrador (P3/P6), com o motivo de cada queda.

## Nota de registro — mandatos versionados sem espaço final
Os 4 mandatos tinham espaço no fim de uma linha (saída colada do pré-voo, linha "AVISO … NAO DETERMINAVEL"), o que o `git diff --check` recusa.
As cópias versionadas tiveram SÓ o espaço final removido; os originais, byte a byte como as cadeiras os leram (e com o `mandato_md5` que elas declararam),
ficam arquivados fora do repositório em `C:/Users/AMP/erp-pausa-2026-10-03/arquivo-mandatos-trc02-c2/` com `md5-originais.txt`.

## Registro pós-merge — rodada de 24–26/10

- **Head final do PR #454:** `acc14b1e04366a046e96358895f4c2b397d92783`; **merge:** `8a7885f4c3bfab02e6c31b318c1111e262f2907c`.
- **Delta desde o `approved_head` `42800d0d`:** commit `18207efc` (registro da junta) e merge da `main` que trouxe `37a3f360` (#456) e `c76ec481` (#457). Os conflitos declarados ficaram em `decisoes.md`, `pendencias.md` e `pendencias-indice.md`; a CI do head final ficou 14/14 verde, e a árvore do squash é igual à do head final (parecer `C:/Users/AMP/erp-pausa-2026-10-03/revisoes/porteiro-456-454-parecer.md:47-56,76-77`).
- **Cadeia completa da cadeira (a):** `a-pro` (Gemini CLI, bloqueio no `npm ci`) → `a-sol2` (Codex, limite) → `a-argon` (Antigravity, créditos) → `a-api` + `a-compl-opus` (votos contados). Fontes: as linhas de `votos/B-TRC-02-ciclo2/00-quedas.md` e a linha 19 desta ata.
- **Correção do `a-opus`:** `00-quedas.md` declara `jurado-trc02-c2-a-opus` como sucessor do `a-sol2`, mas esse agente não existiu: nenhum arquivo dele em `votos/B-TRC-02-ciclo2/` (`ls`: só `a-pro-DESCARTADO`, `a-sol2-QUEDA`, `a-api-resposta-final`, `a-complemento` e os da cadeira), esta ata não o lista, e o orquestrador o registrou como inexistente (`C:/Users/AMP/erp-pausa-2026-10-03/planos/PLANO-RODADA-2026-10-24.md:81`). O sucessor efetivamente lançado depois do `a-sol2` foi o `a-argon`. A linha de `00-quedas.md` fica como foi escrita (registro P6); esta nota é a correção.
- **Legalidade residual:** o inspetor conferiu os nomes dos mandatos, não todos os sucessores efetivos; permanece declarada como ressalva de registro, não como prova retroativa de inelegibilidade.
