# Parecer do porteiro pós-merge — PR #519 (B-ASS-07) — 2026-11-09

**Papel · modelo que rodou:** porteiro-pos-merge · Claude Opus 4.8 (nível menor DECLARADO, §C7.6).
**Objeto:** PR #519, bloco B-ASS-07 — porta de nota fiscal + regras da reforma + adaptador Focus NFe (canal DESLIGADO). Recorte 1+1 (só Focus; NFE.io/PlugNotas no B-ASS-15).

## 1. Merge íntegro — OK
`git log origin/main --oneline`: topo em `7d8b2b98` ("feat(billing): porta de nota fiscal... (B-ASS-07) (#519)"), parent `4cd1889d` (#518). `gh pr view 519`: state=MERGED, mergeCommit.oid=`7d8b2b98d361...` bate com a main. Head julgado pela junta = `3175ce34...` (pré-squash), coerente com squash merge.

## 2. Promessa × diff real — OK
`git diff 4cd1889d..7d8b2b98 --name-status`: 16 arquivos, 1338 inserções, 0 deleções. 14 novos (A) + 1 doc modificado (`docs/subscription-billing.md`) + comando B-ASS-07. Exatamente o prometido: `src/modules/subscription-billing/providers/invoice/{focusnfe,invoice-*}`, `providers/tax/{ibs-cbs,nfse-route}.rules.ts`, `tests/ass-07-*` (5), `tests/helpers/fake-providers/focusnfe.ts`, docs e comando/registro.
PROIBIDO: nenhum (`grep` por prisma/migration/.env/Kpis/src/app.ts/outbox/webhook/lock → NENHUM). `git status --porcelain | grep '^ D'` → nenhum rastreado apagado na árvore.

## 3. Números reais (reexecução) — OK, 27/27
Criei worktree próprio `C:/Users/thiag/w-port519` em `7d8b2b98` (detached), `npm ci` próprio (junction proibida §C7.1-ter(c)), sem tocar nos worktrees vivos w-o6r03b/w-demoint, sem Docker.
`node --test --import tsx tests/ass-07-{focusnfe-adapter,focusnfe-final,focusnfe-security,sequence-memory,tax-rules}.test.ts` → **# tests 27 · # pass 27 · # fail 0 · skipped 0**. Reproduz exatamente o declarado no PR.
(Tentativa anterior com tsx via NODE_PATH deu 7/4 por falha de resolução `dotenv` nos subprocessos — artefato do atalho, não defeito; confirmado ao instalar deps.)

## 4. KPI — N/A
KPI CONGELADO (D-GOV-PROPORCIONAL §C7 item 8(5)). O diff não toca `Kpis/*` (correto). Não cobrado.

## 5. Ata da junta — OK
`agent-orchestration/omega/juntas/J-519-b-ass-07.md`: junta completa, inspetor LIBERADO, cadeiras C1/C2/C3 APROVAM → 3×0 unânime, 0 grave. Triagem D-JUNTA-FLUXO-RAPIDO registrada. Cruzamento de modelo (dev Codex 3 + Claude na cauda; inspetor e cadeiras Claude Opus 4.8) e separação de papéis (§C7.4-bis) declarados. Head `3175ce34...` bate.

## 6. Pendências — RESSALVA (registro) + nenhuma bloqueia o próximo alvo
As 5 pendências da triagem (P-ASS07-REGIME-VOCAB-FECHADO, P-ASS07-FOCUS-GET-MUNICIPAL→B-ASS-15, P-ASS07-ALREADY-ISSUED-REGEX, P-ASS07-CERT-REDACAO, recorte NFE.io/PlugNotas→B-ASS-15) constam na ata com dono, mas **ainda NÃO estão em `agent-orchestration/controle/pendencias.md`** (ausentes na main e na árvore da sessão). Dívida de registro — admitida pela D-GOV-PROPORCIONAL item 3 (registro em PR próprio/semanal), logo viaja, não bloqueia.
Nenhuma das 5 marca "bloqueia" o próximo alvo. A pendência de dono B-ASS-05/06/07/08 (linha ~12635) bloqueia só o "item 60" do portão vendável, não o start de bloco. B-ASS-07 não FECHOU nenhuma pendência → sem amostragem deste bloco; amostrei uma fechada recente (P-O6R-B03-FILA-POR-USUARIO/B-FILA-USUARIO): o teste citado `bfilausuario_dependente_de_outro_dono_test.dart` existe na main — "FECHADA" confere.

## 7. Limpeza §C5 — OK
Branch remota `feat/b-ass-07-porta-fiscal` APAGADA; sem branch local ass-07; sem worktree ass07 vivo (só o meu temporário, removido ao fim). Disco C: 234G livres (muito acima do gatilho de ~10 GB; sem DEEP_CLEAN).

## 8. CI — OK
Check-runs do head `3175ce34`: antivirus, authority-portal, backend, backend-postgres (Postgres+Redis real), docker, flutter, frontend, owner-portal, copilot-reviewer → todos completed/success.

## Próximo alvo
B-ASS-08 (depende de B-ASS-07, agora na main → destravado) e retomada do B-O6R-03b (despesas, w-o6r03b, independente). Nenhum pré-requisito bloqueante aberto.

LIBERADO COM RESSALVA: início de B-ASS-08 / retomada de B-O6R-03b | transcrever as 5 pendências P-ASS07 da ata J-519 para agent-orchestration/controle/pendencias.md (com dono e PR-alvo) no próximo PR de registro.
