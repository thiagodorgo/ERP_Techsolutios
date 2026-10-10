# R-B-O6R-04a-ciclo2 — reprovação da junta do ciclo 2 (2026-10-10)

- **Ata:** `agent-orchestration/omega/juntas/J-B-O6R-04a-ciclo2.md` — REPROVADO 2 × 1. A C2 vetou com 4 `bloqueia`
  `dentro-do-bloco`; a C1 e a C3 aprovaram.
- **O que reprovou:** o guard estático do bloco (`tests/inventory-write-paths-guard.test.ts`, regras D1/D2/D5/D7) reconhece
  forma e deixa membro novo nascer permitido. São 4 classes, provadas por mutação (evidência em
  `votos/B-O6R-04a/c2-C2-evidencia.md`).
- **O que NÃO reprovou:** o comportamento do produto. Banco, locks, unidades retomáveis, 503 em todo wrapper,
  exaustividade de status e a suíte inteira (3237/3235/0/2) estão aprovados pela C1 e pela C3, e a C2 fechou os itens de
  comportamento.
- **Régua do ciclo 3** (`CLAUDE.md` §C7 item 8(2) e Passo 3 do plano de retomada): bloqueia só o que perde dado, vaza entre
  organizações, quebra permissão ou erra dinheiro. "Forma de guard" é não grave, vira pendência com dono e o bloco mergeia.
- **Papéis do ciclo 3** (§C7.4-bis): quem achou (a C2) não planeja nem conserta. O plano do ciclo 3 é do
  `planejador-retomada-b-o6r-04a`, que não achou. A junta 3 usa identidades que não votaram neste bloco.
- **A auditoria da máquina do ciclo 3** deixou de ser obrigatória (`D-GOV-PROPORCIONAL` (2)).
