# J-B-SAN3-20 — ciclo 1 — junta de DINHEIRO (unanimidade de 3 com veto)

- **Bloco:** B-SAN3-20 — cheque × baixa de título (item 22 do portão, `P-Ω4-7-DUPLA-CONTAGEM`).
- **PR:** #456, ramo `fix/cheque-x-baixa`. **Objeto julgado:** `a0f5aabca6b86aba21051baffd40c245b5ef1a05` (CI 14/14 `success` no objeto, medido pelo inspetor).
- **approved_head:** a0f5aabca6b86aba21051baffd40c245b5ef1a05
- **VEREDITO: APROVADO (3 × 0, unanimidade)**

## Papéis (§C7.4-bis)
- **Planejou:** `planejador-mestre` — iniciado em GPT-6 Astra (Codex), que caiu por limite; concluído em **Fable** (v1, v2, v3 final). Emenda E1 (preparo do Prisma) pelo orquestrador.
- **Criticou:** Codex `gpt-5.6-sol` (r1 e r2, identidades distintas).
- **Desenvolveu:** Codex `gpt-5.6-sol` (`dev-san3-20`, até o limite de uso às 18:15Z) e **Claude Opus** `dev-san320-opus` (cobrindo, regra do dono de 24/10).
- **Fábrica dos corpos + redator dos mandatos:** `fab-red-san320-argon` (Antigravity Argon).
- **Inspetor:** `insp-san320-opus` (Claude Opus, sucessor do `insp-san320-argon`, que caiu por créditos) — **LIBERADO COM RESSALVA** (R1–R7).
- **Julgaram:** C1 `jurado-san320-c1-opus` (Claude Opus — dono: *"a c1 vc pode fazer, nao esperar o codex. temos pressa"*) · C2 `jurado-san320-c2-opus` (Claude Opus; substitui `c2-pro`/`c2-sol` — Gemini CLI não executa `npm ci`; dono: *"vc cobre o codex nessa rodada"*) · C3 `jurado-san320-c3-opus2` (Claude Opus; substitui `c3-argon`, sem créditos).
- (a) a composição cobriu dinheiro, banco/migração e regressão/escopo/registro; (b) quem desenvolveu não julgou (identidades distintas; mesmo modelo Opus declarado como R6 do inspetor); (c) sem dado podre: cada cadeira re-mediu no objeto.

## Votos
| Cadeira | Voto | Achados |
|---|---|---|
| C1 dinheiro | APROVADO | 2 notas (C1-N1 dentro, C1-N2 pré-existente); 18 mutações vermelhas |
| C2 banco e migração | APROVADO | 5 notas; migração transacional, drill 6/6, `-db` 77/77 ×3, F-DEV-02 = nota (deposit não perde com 409; resultado sequencial correto) |
| C3 regressão, escopo, registro | APROVADO | 1 ajuste (A-1) + 5 notas |

**A-1 (ajuste, dentro do bloco, não bloqueia):** `titleId` do item de `GET /cheques` prometido em `API_CONTRACTS.md` l.469 sem asserção (mutação M4b sobrevive 38/38); nenhum cliente consome `/cheques`. Vira pendência `P-SAN3-20-CHEQUE-LIST-TITLEID-SEM-TESTE` (dono: `B-SAN3-24`, telas de cheque).

## Quedas (P6)
`votos/B-SAN3-20/00-quedas.md`: inspetor Argon (créditos). Substituições de executor declaradas acima. Nenhuma queda de cadeira com voto perdido.

## Fecha
- Item 22 do portão (`P-Ω4-7-DUPLA-CONTAGEM`, por linha de cheque registrada — limite declarado no plano), com o merge.
- Decisão do dono registrada no bloco: `D-SAN3-20-CHEQUE-SO-PELA-COMPENSACAO` (*"A: só pela compensação (Recomendado)"*).

## Registro pós-merge — rodada de 24–26/10

- **Head final do PR #456:** `bb3cbd6c35c2e6a9d143c68a36ee47711f1978ad`; **merge:** `37a3f360731a25afc13d218a2449909ca2458f09`.
- **Delta desde o `approved_head` `a0f5aabc`:** commit `d3aa1875` (registro da junta) e merge da `main` em `c76ec481` (#457, KPI). O porteiro mediu que o delta toca somente registro e os `Kpis/*` trazidos da `main`, sem mudança posterior de produto; a árvore do squash é igual à do head final (parecer `C:/Users/AMP/erp-pausa-2026-10-03/revisoes/porteiro-456-454-parecer.md:47-55,75`).
