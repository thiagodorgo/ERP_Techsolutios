# J-B-SAN3-22: junta do PR #464 (modelo de checklist com vistoria em andamento: trava otimista, só textos e 3 aparências)

- **Bloco:** B-SAN3-22, item 22 do gate (`PLANO_SAN3.md`). Ramo `fix/checklist-trava-versao`.
- **Régua:** perda de dado, então junta completa com unanimidade de 3 (`D-GOV-PROPORCIONAL` (1)), e `D-JUNTA-SO-CADEIRA-VERMELHA` no ciclo 2.
- **Orquestrador:** sessão Claude Code (Opus 5.5).
- **Resultado:** **APROVADO no ciclo 2, por unanimidade (3/3)**, no objeto `6b03e44d8136792398f521ccaf85d8dd45168a6d`.

## Ciclo 1: objeto `44d9cbb3874e45340ca43c934364c3d0103c53b8`, REPROVADO (2 × 1)

- **Inspetor:** `inspetor-san322` (Claude Opus) deu LIBERADO COM RESSALVA (R1–R7).
- **C1** `jurado-san322-c1-opus` (sucessora P3 de `jurado-san322-c1-sol`, que caiu pelo limite do Codex): APROVADO. Ajuste C1-01: o CE-12-forma não acusava a falta do `tenant_id` numa sentença só.
- **C2** `jurado-san322-c2-opus`: **REPROVADO**, com 3 `bloqueia` dentro do bloco, não graves:
  - **C2-01:** o modelo arquivado sem vistoria viva respondia 409 no render, e não 404;
  - **C2-06:** a mutação da E3-03 não deixava o guard do CE-13 vermelho;
  - **C2-08:** o publish de `checklist-snapshot-dispatch.test.ts:43` estava sem o status afirmado.
- **C3** `jurado-san322-c3-opus`: APROVADO. Ajuste C3-01: o smoke não guardava 3 caminhos da página.
- **Auditoria e plano da reprovação:** `planejador-san322-c1rep-fable` (topo), no registro `omega/reprovacoes/R-B-SAN3-22-ciclo1.md`. Só o C2-01 era defeito de produto; o resto eram artefatos de teste. Daí veio a Emenda E4, com 11 requisitos.
- **Dev do conserto:** `dev-san322-c2-opus`, que entregou o head `6b03e44d`.

## Ciclo 2: objeto `6b03e44d8136792398f521ccaf85d8dd45168a6d`, APROVADO (3 × 0)

- **Inspetor:** `inspetor-san322-c2` (Claude Opus) deu LIBERADO COM RESSALVA (R1–R6). A R1, obrigatória, mandava usar as ferramentas do ciclo 1 só copiadas e com o objeto, a porta e o worktree trocados. As 3 cadeiras cumpriram e publicaram o diff das cópias.
- **Regra (1) da `D-JUNTA-SO-CADEIRA-VERMELHA`, por script (`cruza.mjs`):** o conserto cruza o `arquivos_medidos` da C1 (`checklist.service.ts` e `checklist-template-lock-db.test.ts`) e o da C3 (`**`). Nenhum voto foi carregado; as duas cadeiras foram revalidadas pela regra (2), e a C2 foi refeita.

| Cadeira | Como | Identidade | Voto | Comando que provou |
|---|---|---|---|---|
| C1 | **revalidada** (regra 2) | `jurado-san322-c1-r2-opus` (Claude Opus, sucessora P3 de `jurado-san322-c1-r2-sol`) | APROVADO | `c1rev-evidencia.md`: re-execução das sondas e dos 13 mutantes do ciclo 1 (IGUAL), mais a cauda E4-01/04/05/06 verde, com vermelho-controle em `~8` e `~21` |
| C2 | **refeita** | `jurado-san322-c2-r2-opus` (Claude Opus, sucessora P3 de `jurado-san322-c2-r2-sol`) | APROVADO | `c2r2-evidencia.md`: cada comando do caído re-executado com saída igual; os achados C2-01/06/08 fechados e medidos |
| C3 | **revalidada** (regra 2) | `jurado-san322-c3-r2-opus` (Claude Opus) | APROVADO | `c3rev-evidencia.md`: bateria e sondas do ciclo 1 (IGUAL) e a cauda E4-08/09 verde |

- **Quedas (P6):** `jurado-san322-c2-r2-sol` e `jurado-san322-c1-r2-sol` (Codex) caíram pelo limite de uso às 02:00Z e às 02:01Z. O registro está em `votos/B-SAN3-22-ciclo2/00-quedas.md`.
  - O Codex da C2 tinha medido os 3 itens; a sucessora re-executou tudo e as saídas bateram.
  - O Codex da C1 não tinha medido nenhum item, e o worktree dele ficou sujo, no meio de uma mutação. O orquestrador removeu esse worktree, e a sucessora mediu num terreno novo.
- **C2R2-01 (§A2):** o Codex da C2 marcou como `bloqueia`, não grave, a contradição entre a E4-11 ("índice regenerado") e a E4.2 (PERMITIDO sem `pendencias-indice.md`). A sucessora **rebaixou para `nota`**, com prova: o gerador reproduz o índice do objeto a partir do `pendencias.md` permitido com 0 linhas de diferença, e o mesmo vale no controle `~8`. O índice é derivado byte a byte, e as duas cláusulas juntas formam um critério impossível de passar. Fica como contradição do texto do plano, sem defeito no conserto.
- **Notas** (nenhuma bloqueia):
  - C1R-01: o CE-12-forma aceita `tenant_id` dentro de comentário SQL, sem efeito de produto (a FK composta barra);
  - C1R-02 e C1R-03: notas do ciclo 1 que continuam iguais;
  - C3r2-01 e C3r2-02: o residual do guard de forma tem dono em `P-FRONT-TESTE-DE-INTERACAO`.
- **Monocultura:** as 3 cadeiras votantes do ciclo 2 rodaram em Claude Opus, porque o Codex esgotou o limite durante a junta. Isso fica declarado, conforme a ressalva 3 do inspetor.
- **Separação de papéis (§C7.4-bis):**
  - quem achou: as C2 do ciclo 1 e do ciclo 2;
  - quem planejou: `planejador-san322-fable` e `planejador-san322-c1rep-fable`;
  - quem desenvolveu: `dev-san322-sol`, `dev-san322-opus`, `dev-san322-web-opus` e `dev-san322-c2-opus`;
  - quem redigiu: `red-san322-c2-opus`;
  - quem julgou: as cadeiras acima.

  As identidades são todas distintas.

## Merge
O objeto aprovado é `6b03e44d`. O commit desta ata e dos votos do ciclo 2 acrescenta só `agent-orchestration/omega/juntas/**` e `agent-orchestration/omega/reprovacoes/**`. O merge vai no head que contém esse commit, com o CI verde, e depois vem o porteiro pós-merge (é merge de produto).

## Correção pós-merge — CI e briefing (2026-10-27)

- O porteiro mediu no merge `f7922ab7` que `tests/checklist-template-lock-db.test.ts` roda no job **`backend`**, e não no `backend-postgres`.
- Evidência: job `backend` **121975457986**, casos `ok 576` a `ok 586`; o log do job `backend-postgres` não contém a suíte.
- Portanto, qualquer briefing que descreva a suíte como verde no `backend-postgres` está corrigido por esta seção. O resultado continua verde, mas no job `backend`.
- `P-B-SAN3-22-CI-DB-SUITE` permanece ABERTA: ainda cabe à emenda decidir se a suíte também deve entrar na lista curada do `backend-postgres`.
