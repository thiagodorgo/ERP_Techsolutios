# J-B-O6R-07c-a — junta do ciclo 1 (2026-10-10) · PR #414, escopo por objeto nos subrecursos da OS

- **Objeto:** `4ca2be43c3b4b32b9bed670f02d78145620cdc2e` (head do PR com os mandatos; CI 14/14 no run `pull_request`; o run
  `push` caiu no T15 do #405, `pre-existente`, e o job foi re-executado). Delta desde o objeto do inspetor (`c8bd4c28`): só
  registro — o merge da `main` (#415, 7 arquivos), o parecer do inspetor e o registro do bloco (`d7255263`), e os mandatos.
- **Régua:** ciclo 1 (`CLAUDE.md` §C7 item 8): bloco de PERMISSÃO, unanimidade de 3 com veto. Nos ciclos 1 e 2 todo
  `bloqueia` dentro do bloco reprova, grave ou não.
- **Inspetor de terreno:** instância nova, Claude Opus 5.5 (nível menor, `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`), LIBERADO
  COM RESSALVA (`votos/B-O6R-07c/insp-07ca-parecer.md`). As 5 ressalvas foram tratadas no briefing: corpo carregado do
  blob com md5 declarado (R1); a `main` integrada antes das cadeiras (R2); caminhos reais nos mandatos (R3); nenhuma
  ferramenta no worktree do dev durante a junta (R4); disco e paralelismo (R5).
- **Cadeiras:** no nível menor, Claude Opus 5.5, declarado em cada voto; corpo lido do blob do head, md5 EOL-neutro igual
  ao publicado pelo inspetor (C1 `23594fb3…`, C2 `faff2d5c…`, C3 `114a51cc…`). Mandatos com pré-voo OK
  (`00-mandatos/C1c.md`, `C2c.md`, `C3c.md`).

## VEREDITO: REPROVADO (2 × 1 — a unanimidade não se formou)

| cadeira | identidade (nunca votou neste bloco) | modelo | voto | bloqueia |
|---|---|---|---|---|
| C1 escopo por objeto | `jurado-07ca-c1-escopo-por-objeto` | Claude Opus 5.5 | **APROVADO** | — (1 nota, `pre-existente`: o T15 do #405) |
| C2 censo e guard | `jurado-07ca-c2-censo-e-guard` | Claude Opus 5.5 | **REPROVADO** | **3** (A1, A2, A3) + 1 ajuste (A4) + 4 notas |
| C3 regressão, escopo e registro | `jurado-07ca-c3-regressao-escopo` | Claude Opus 5.5 | **APROVADO** | — (1 ajuste + 6 notas) |

**Os bloqueios (C2, todos `dentro-do-bloco`, classe não grave: nenhum é defeito do produto hoje):** em cada um, um membro
não previsto nasce PERMITIDO (CE-G1(b)) com o guard `tests/o6r07c-census-guard.test.ts` verde em 31/31.
- **C2-07ca-A1:** um lote existente que passe a decidir o tipo por `Map.get(action.type)` ou pelo operador `in` aceita do
  papel de campo um tipo novo de OS, e o extrator não lista essas formas.
- **C2-07ca-A2:** os curingas estáticos aceitos casam por arquivo e texto, sem a linha: um despacho NOVO por sufixo, escrito
  com o mesmo texto de um curinga aceito no mesmo arquivo, passa.
- **C2-07ca-A3:** o residual MG3b (sub-app `express()` montado por `router.use(sub)`) é contado como `MIDDLEWARE · app` e não
  é descido; depois do `--gravar`, guard e laço G ficam verdes e a rota de dentro responde 200 ao campo. É a forma que o dev
  registrou como `P-O6R-07CA-SUBAPP-EM-ROUTER-INVISIVEL`, cuja decisão o registro deixou com esta cadeira.
- **Ajuste C2-07ca-A4:** a pertença de um par de lote à propriedade é decidida pelo prefixo do nome do tipo.
- **Ajuste da C3:** a `P-O6R-07CA-DB-FORA-DA-LISTA-CI` (gravada pelo orquestrador a partir do relatório do dev) é falsa no log:
  o `-db` roda no job `backend`, 6 testes executados nos dois runs. A C3 deixou ainda 6 notas (régua 44 × 80 medido; a forma
  `env -u REDIS_URL` da régua; o status da `P-O6R-SUBRECURSO-OBJECT-SCOPE` reescrito no lugar; `decisoes.md` fora da lista
  PERMITIDO do 07c-a.5; o R.3 e o append do Estoque fora do objeto, por serem do 07c-b; números do corpo do PR vindos do
  head do dev).

**Terreno:** a sessão do orquestrador caiu duas vezes (~16:48Z e ~16:55Z) sem atingir a junta (o inspetor já tinha
terminado; nenhuma cadeira tinha nascido). Anomalia do orquestrador às 16:37Z, durante a inspeção: o gerador do índice
rodado no worktree do dev reescreveu `pendencias-indice.md` com conteúdo idêntico (medido pelo inspetor: numstat vazio,
md5 igual). Nenhuma cadeira caiu (P6 sem linha).

**Separação de papéis e as três perguntas da reprovação (§C7.4-bis):**
- achou: a C2 (`jurado-07ca-c2-censo-e-guard`); planejou o ciclo 1: `planejador-b-o6r-07c`; desenvolveu: os devs do 07c-a;
- (a) a composição cobriu a competência que o achado exige — a C2 é a cadeira de censo e guard, com a competência de
  `guardiao-fail-closed` + `inspetor-de-rotas`;
- (b) quem achou NÃO conserta: o ciclo 2 nasce de uma AUDITORIA + PLANO de topo (Fable), com identidade nova, e de um dev
  novo; a C2 não planeja nem desenvolve;
- (c) se o planejador usou dado podre fica para a auditoria de topo responder por execução. Fato já sabido: o plano v3 mandou
  o 07c-a portar o censo "sem mudar o algoritmo", e as três formas da C2 moram no algoritmo.

**Próximo (decisão do dono `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`):** o modelo de topo audita a reprovação — os achados são
defeitos reais do produto ou artefato do processo? — e escreve o plano detalhado do ciclo 2. Ciclo 2 é o último em que achado
não grave reprova (`CLAUDE.md` §C7 item 8(2)). Registro: `omega/reprovacoes/R-B-O6R-07c-a-1.md`.
