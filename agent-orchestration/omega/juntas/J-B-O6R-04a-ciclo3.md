# J-B-O6R-04a — junta do ciclo 3 (2026-10-10) · PR #389, a consistência do estoque sob concorrência

- **Objeto:** `622bf8453d2d60ecb6577aa611b2d87645a689ae` (head do PR; CI 14/14). O ciclo 3 não tem dev: o diff de código
  (`src`, `tests`, `prisma`, `scripts`, `.github`) desde o objeto da junta 2 (`35ef85be`) é vazio. A C1, a C2 e a C3
  mediram isso por si.
- **Régua:** ciclo 3, GRAVE (`CLAUDE.md` §C7 item 8(2); Emenda 8). Só bloqueia o que perde dado, vaza entre organizações,
  quebra permissão ou erra dinheiro, provado por execução no produto. Unanimidade de 3, porque o bloco toca dinheiro e dado.
- **Antes do ciclo 3 o modelo de topo entrou.** O `planejador-retomada-b-o6r-04a` (Fable) auditou os 4 achados da C2 do
  ciclo 2 contra o código real: nenhuma das formas existe no produto (varredura por destino). Ele planejou o fechamento
  sem dev, e os achados viraram as 5 pendências `P-O6R-B04-GUARD-D1/D2/D7/D5` e `P-O6R-B04-CENSO-DETECTOR-DE-LITERAIS`,
  com dono `B-GOV-GUARDA-POR-PROPRIEDADE`. É a forma que o dono fixou em 2026-10-10: topo no plano e em toda reprovação;
  o resto no nível menor.
- **Inspetor de terreno:** instância nova, Codex GPT-6 Astra (lançado antes da decisão de modelos do dono), LIBERADO COM
  RESSALVA (`votos/B-O6R-04a/insp-c3-parecer.md`). As ressalvas foram tratadas: os mandatos foram entregues com pré-voo e
  o dono das 5 pendências ficou explícito no índice (`bb083ea5`).
- **Cadeiras:** no nível menor, por decisão do dono de 2026-10-10.

## VEREDITO: APROVADO (3 × 0, unanimidade)

| cadeira | identidade (nunca votou neste bloco) | modelo | voto | bloqueia |
|---|---|---|---|---|
| C1 banco, RLS e concorrência | `jurado-o6r04a-c2-suplente-banco-rls` | Codex GPT-5.6 Sol | **APROVADO** | — (1 nota) |
| C2 produto fail-closed (varredura por destino) | `jurado-o6r04a-c2-suplente-fail-closed-backend` | instância 1: Codex Sol, caiu pelo limite de uso; instância 2: Claude Opus 5.5 | **APROVADO** | — |
| C3 rota, permissão, suíte e registro | `coordenador-de-acessos` | Claude Opus 5.5 | **APROVADO** | — (3 notas) |

- **approved_head:** `622bf8453d2d60ecb6577aa611b2d87645a689ae`

**O que as cadeiras mediram:**
- **C1:** dinheiro e dado sob corrida real, com papel sem BYPASSRLS. Débitos simultâneos não deixam saldo negativo, o
  fechamento concorrente tem um vencedor e nenhuma unidade é aplicada duas vezes. Nenhum vazamento entre organizações no
  banco. A migração só cria índices e conta, e o censo não escreve.
- **C2** (instância 2 refez o registrado pela instância 1 e mediu a cauda):
  - escritores do ledger por destino = 12 = a allowlist, 0 fora;
  - status desconhecido fechado em 45/45 decisões, sem gravar nada;
  - duplicidade concorrente correta em 40/40 corridas;
  - violação de outra restrição propagada como erro em 4/4;
  - 0 × 25P02;
  - 3 mutações de produto deixaram as sondas vermelhas.
- **C3:** login real e duas passadas de 80/80 (superusuário e papel de runtime com a trava em `enforce`): outra
  organização recebe 404, papel sem permissão recebe 403 e `tenant_id` do corpo é ignorado. `npm test` deu 3237 / 3233 /
  2 falhas / 2 skips. As 2 falhas são o T15 do #405, por relógio sob carga (`pre-existente`,
  `P-SAN3-05-T15-TETO-DE-RELOGIO`); isolado, 12/12. T13 com 56 chaves; Kpis sem diff.

**Quedas (P6, `votos/B-O6R-04a/00-quedas.md`):** a C2 caiu no Codex por limite de uso às 14:33Z e foi relançada no Claude
Opus com a mesma identidade (P3). Custo: ~25 min.

**Separação de papéis (§C7.4-bis):**
- achou: a C2 do ciclo 2;
- planejou o ciclo 3: `planejador-retomada-b-o6r-04a` (Fable);
- desenvolveu: ninguém (ciclo sem dev);
- votou: três identidades que não votaram antes neste bloco.

**Próximo:** merge com `--match-head-commit`, porteiro pós-merge no nível menor e o registro das pendências da trilha.
