# J-B-O6R-04a — junta do ciclo 2 (2026-10-10) · PR #389, a consistência do estoque sob concorrência

- **Objeto:** `35ef85be` (head do PR; CI 14/14). O inspetor julgou `ae863e1a`; do objeto dele ao das cadeiras só entrou
  registro (o parecer e os mandatos). A `main` de 2026-10-10 (`c1cfdabe`, merge do #413) está dentro.
- **Inspetor de terreno:** LIBERADO COM RESSALVA (R1–R7), `votos/B-O6R-04a/insp-c2-parecer.md`. A instância 1 caiu pelo
  limite de sessão da conta (429); a instância 2, mesma identidade, refez o registrado e mediu a cauda
  (`votos/B-O6R-04a/00-quedas.md`).
- **Régua:** ciclo 2, COMPLETA (`CLAUDE.md` §C7 item 8(2)); unanimidade de 3, porque o bloco toca dinheiro e dado.
- **Retomada:** ordem do dono `D-ORDEM-NOITE-2026-10-10`; plano de retomada e Emenda 1 em
  `agent-orchestration/omega/planos/B-O6R-04a-plano.md`; emendas 6 e 7 do orquestrador no comando do bloco.
- **Modelo:** Fable nas 3 cadeiras e no inspetor, sem fallback.

## VEREDITO: REPROVADO (2 × 1)

| cadeira | identidade | voto | bloqueia |
|---|---|---|---|
| C1 banco, RLS e concorrência | `jurado-o6r04a-c2-banco-rls` | **APROVADO** | — (1 `ajuste`: o detector somente-leitura do censo só reconhece aspas simples como literal) |
| C2 invariante e guards por mutação | `jurado-o6r04a-c2-fail-closed-backend` | **REPROVADO** | 4 `bloqueia`, `dentro-do-bloco` — todos do GUARD (abaixo) |
| C3 integração, contrato, regressão e registro | `agente-ci-doutor` | **APROVADO** | — (4 notas) |

**Os 4 bloqueios da C2** são da mesma classe: o guard estático do bloco reconhece a FORMA do código e deixa um membro
NOVO, escrito de outro jeito, nascer permitido. Os 4 foram provados por mutação executada:
- **D1:** 7 formas novas de escritor do ledger compilam, gravam sob o papel real e deixam o guard verde, porque o universo
  vem do tipo `<Model>Delegate`, não do DESTINO da escrita.
- **D2:** uma via que chega a `insertMovement` por indireção (`.call`/cast) sai do universo das regras de lock.
- **D7:** uma porta pública nova escrita como propriedade-arrow escapa da enumeração por `MethodDeclaration`.
- **D5:** uma transição de status por SQL cru com identificador entre aspas e sem status no WHERE escapa, porque o pino é
  textual.

**Nenhum é defeito do produto como ele está:** a C1 aprovou banco, locks e unidades do fechamento sob os dois papéis, e a
C2 fechou os itens de comportamento (0 × 25P02, 503 em todo wrapper, exaustividade pelo compilador, status desconhecido
fechado).

**O que a C3 mediu:** `npm test` próprio com banco recriado, 3237 / 3235 / 0 falhas / 2 skips (o denominador do dev); T13
com 56 chaves, igual à `main`; guard-db 5/5; 67/67 em memória; paridade 23/23. O T15 do #405 passou nesta rodada (C3-N2,
`pre-existente`).

## §C7.4-bis — papéis e as perguntas da reprovação

- **Papéis do ciclo 2:**
  - achou: as cadeiras da junta 1 (C1 `agente-dba-guardiao`, C2 `guardiao-fail-closed`);
  - planejou: `planejador-mestre` (Fable) na autoria e `planejador-retomada-b-o6r-04a` (Fable) na retomada;
  - desenvolveu: as instâncias de dev do ciclo 2 e da bateria, `dev-integracao-b-o6r-04a` e
    `dev-integracao-2-b-o6r-04a` (Opus).
- **(a) A composição cobria a competência?** Sim. A C2 é a cadeira de guards por mutação, e foi ela que achou.
- **(b) Quem achou é quem consertou?** Não. O guard D5 da Emenda 1 foi planejado pelo planejador da retomada e
  implementado pelo dev de integração 2; a C2 só achou.
- **(c) O planejador usou dado podre?** Não houve premissa herdada. A classe "guard que reconhece forma" é antiga
  (`D-GUARDA-POR-PROPRIEDADE-BLOCO-TRANSVERSAL`), e os 4 achados são instâncias dela em superfícies que o guard não
  enumerava.

**Não-convergência:** a classe "guard por forma" se repetiu sem informação nova sobre o PRODUTO. Ela é informação sobre o
GUARD, que existe para o futuro. Pela `D-GOV-PROPORCIONAL` (2) e pela régua do plano (Passo 3), no ciclo 3 "forma de
guard" é não grave e vira pendência com dono.

**Próximo:** ciclo 3, régua GRAVE — `R-B-O6R-04a-ciclo2.md` e o plano do ciclo 3. Merge só com junta do ciclo 3 sem
achado grave de produto.
