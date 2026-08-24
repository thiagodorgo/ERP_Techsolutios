# PLANO B-O6R-02 — ciclo 3 · fechar B-1..B-3 da J-B-O6R-02-ciclo2

**Papel:** planejador do ciclo 3 (Fable, `D-PLANEJADOR-MODELO-FABLE` — replanejamento pós-correção, onde o
Fable é obrigatório). Não achei os defeitos, não implemento, não voto, não sou porteiro. Encerro minha
participação ao entregar este plano.
**Insumos lidos por inteiro:** `J-B-O6R-02-ciclo2.md` (a ata), `J-B-O6R-02-ciclo1.md`,
`B-O6R-02-ciclo2-plano.md`, `R-B-O6R-02-ciclo2/especialista-maquinas-de-desfazer.md`, e o código da branch
(por `git show`, sem checkout).
**Branch:** `feat/o6r-b02-financial-uow` · head julgado `8145415` · head atual `9198d55` (medi: os 3 commits
pós-junta são **docs-only** — ata, parecer, `D-INSTANCIA-NOVA-COM-AUDITORIA`; **zero mudança de código**) ·
base `origin/main` = `6efe5ad`.
**Este plano complementa e NÃO substitui** o v3 + planos dos ciclos 1–2 naquilo que a junta confirmou
fechado (§10 lista o que não se toca).

**Objetivo:** fechar os três bloqueantes do ciclo 2 mudando a **classe**, não o exemplar — a frase que
governa este ciclo é a do votante: *"os defeitos do ciclo 1 estão fechados; a classe que os gerou, não."*
**Ator:** desenvolvedor único, agente novo, nominalmente designado antes de qualquer código (§13).
**Fluxo origem→destino:** plano (este arquivo) → correções C1–C4 em fatias S1–S5 → bateria integral +
drills → junta 5/5 unânime (protocolo de ciclo 3 do §C7.4) → PR (após gate `G-A109FD7-PUBLICADO`) → porteiro.

---

## 0. AUDITORIA POR EXECUÇÃO (D-INSTANCIA-NOVA-COM-AUDITORIA) — reportada ANTES do produto

Sou instância nova ocupando a alçada de planejador cujo trabalho foi reprovado. Pela decisão do dono de
2026-08-23, minha primeira tarefa foi **auditar por execução** as afirmações do artefato anterior das quais
este plano depende. Resultado, executado por mim no scratchpad, sem tocar a árvore:

**0.1 · B-1 CONFIRMADO por execução minha.** Extraí o helper REAL do head julgado
(`git show 8145415:tests/helpers/financial-ledger.ts`, md5 `88ede9ef597a272e35b7a18178858a1c` — idêntico em
`9198d55`) e o executei alimentado **como os dois loaders reais o alimentam** (só as pontas vivas), sobre os
dois estados D11 da ata:

```
[HELPER ATUAL] D11 intermediario (saldo real da conta = 0):    VERDE (passou)
[HELPER ATUAL] D11 final (saldo real da conta = -100):         VERDE (passou)
```

A afirmação do plano do ciclo 2 (§7, *"o helper de efeito acusa net = −100"*) é **falsa, agora medida
também por mim**. O helper é verde nos dois mundos. A junta tinha razão palavra por palavra.

**0.2 · A semântica que este plano exige DISCRIMINA — prototipada e executada.** Um protótipo da regra de
**fecho por estorno** (§C1 abaixo), sobre os mesmos estados, mais controles:

```
[PROTOTIPO C3] D11 intermediario:                       VERMELHO -> cleared: net 0 != 100
[PROTOTIPO C3] D11 final:                               VERMELHO -> bounced: net -100 != 0
[PROTOTIPO C3] saudavel cleared:                        VERDE
[PROTOTIPO C3] saudavel bounced (clear+bounce):         VERDE
[PROTOTIPO C3] saudavel bounced-antes (sem caixa):      VERDE
[PROTOTIPO C3] compensacao APAGADA (mecanismo B-1 c.1): VERMELHO -> cleared: net 0 != 100
[PROTOTIPO C3] cheque issued saudavel:                  VERDE
[PROTOTIPO C3] registered com lancamento vinculado:     VERMELHO -> 1 linha viva (esperado 0)
```

Vermelho exatamente onde o defeito mora (os dois checkpoints do D11 **e** o mecanismo do B-1 do ciclo 1),
verde em todos os estados saudáveis, nas duas direções. **Este plano não afirma que a correção funcionará;
afirma que a semântica proposta, executada por mim em protótipo, discriminou estes 8 estados** — e exige no
§C1 que a implementação real prove o mesmo, por drill.

**0.3 · O mecanismo de compilador exigido no C2 REPROVA no tsc deste repo (5.8.2)** — executei
`npx tsc --noEmit --strict` num probe com as três construções:

```
membro FALTANDO no Record<keyof T, Class>   -> TS1360 (Property 'amount' is missing)  exit 2
membro EXCEDENTE (payrollId inexistente)    -> TS2353 (does not exist)                exit 2
ordem de guard incompleta vs uniao de donos -> TS2322 (true not assignable to never)  exit 2
controle: versao completa e correta         -> exit 0
```

**0.4 · Restrição medida que muda o desenho: `npm run check` só compila `src/**`** (`tsconfig.json`:
`include: ["src/**/*.ts"]`; os testes rodam via tsx, transpile-only). **Toda construção fail-closed pelo
compilador TEM de viver em `src/`** — um `satisfies` num arquivo de teste não reprova nada no check. O
precedente da casa já está em src e provado: `src/modules/core-saas/permissions/catalog.ts:314-335`.

**0.5 · Demais premissas conferidas estaticamente no head** (§14 lista tudo): os guards do B-2
(`financial-entry.service.ts` — três negações nomeadas, resto passa), as duas cópias literais das pontas
(`cheque.repository.ts:180` e `cheque-prisma.repository.ts:120`), o `Cheque` no schema **sem `@relation`
nas pontas** (colunas app-level, linhas 2045-46 — as únicas `*_entry_id` do schema inteiro), os dois jobs
do `ci.yml` (o `backend` roda `migrate deploy` e **nunca** seed, linhas 74-81; o roteado **seeda**, linhas
153-160), as duas suítes com `findUnique`+assert (`financial-period-close-write-race-db.test.ts:406-410`,
`financial-title-invariants-db.test.ts:348-349`), as 4 irmãs que auto-provisionam por upsert, as chaves em
`prisma/seed.ts:164,169`, `Prisma.ChequeScalarFieldEnum` no client gerado com as duas colunas
(`index.d.ts:161752-161774`), o par snapshot/restore nos **três** repositórios de memória, e `a109fd7`
**segue não-ancestral** do head.

**Nenhum bloqueante da ata caiu na auditoria. Um foi re-confirmado por execução minha (B-1).**

---

## 1. As PROPRIEDADES, antes das correções

A ata é explícita: a correção do ciclo 1 acrescentou os membros faltantes e **não mudou a propriedade que
os produziu**. Este plano começa pelas propriedades; os patches são consequência. Cada uma tem drill de
mutação próprio (§7) — **a propriedade é julgada pelos drills, não pela estética do código**: o
desenvolvedor pode variar a codificação SOMENTE se todos os drills continuarem se comportando como o §7
exige.

> **P6 (fecha B-1):** *o invariante de efeito do cheque soma o FECHO POR ESTORNO dos lançamentos vivos
> alcançáveis a partir das pontas — e a seleção do conjunto acontece DENTRO do helper, nunca em quem
> carrega.* Sob o estado D11 (reverse aceito), o helper sozinho fica vermelho nos dois checkpoints.
>
> **P5 (fecha B-2):** *nenhum vínculo de agregado nasce permitido em silêncio.* Campo novo no tipo
> `FinancialEntry` ou no tipo `Cheque` sem classificação explícita → `npm run check` **vermelho**
> (compilador). Dono-de-desfazer novo sem política declarada para `delete` E para `reverse` → check
> **vermelho**. Coluna/relação nova no schema Prisma apontando para `financial_entries` sem registro →
> suíte de **censo** vermelha. As duas pontas do cheque são DERIVADAS de uma fonte única consumida pelas
> duas cópias (memória e Prisma) — discordar não compila.
>
> **P7 (fecha o correlato ALTA do B-2):** *todo membro dos repositórios journaled é CLASSIFICADO
> (write/read) em `src/`, com exaustividade pelo compilador; e a classificação é julgada EMPIRICAMENTE por
> harness — membro que muta estado e não journala, ou classificado read e muta, fica vermelho.* Mutador
> entregue como delegação pura não sobrevive à suíte (o ataque 203/203-verde do ciclo 2 morre).
>
> **P8 (fecha B-3):** *no job seedless (`backend`), toda suíte provisiona a própria pré-condição de forma
> idempotente e sem clobber; no job roteado, o seed do próprio job é quem fornece — os dois braços são
> legítimos e DECLARADOS, e nenhuma suíte pode assumir seed onde o job não seeda.* `npm test` contra banco
> só-migrado com `DATABASE_URL` presente = **verde**.

**Honestidade sobre o limite do compilador, dita antes que a junta a diga:** a construção do P5 força a
**decisão** a existir e aparecer no diff — não força a decisão a estar certa. Classificar de má-fé um
vínculo novo como "plain" compila. O que fecha esse resto é o par {decisão visível no diff + junta}, o
mesmo par do precedente `catalog.ts` que a ata aceitou como fail-closed. Nenhuma construção conhecida deste
repo faz melhor que isso, e este plano não finge que faz.

## 2. Correções

### C1 · P6 — o helper de efeito soma o conjunto certo (fecha B-1)

**Mudança em `tests/helpers/financial-ledger.ts`, SOMENTE em `expectChequeLedgerCoherent`.**
`expectTitleLedgerCoherent` **não é tocado** — funciona, a junta o executou contra o defeito equivalente e
ele reprova com a mensagem certa; mexer no irmão saudável é exatamente a classe "correção que nasce
defeito" do §C7.4-bis.

1. **Assinatura nova:** recebe `status`, `direction`, `amount`, `linkedIds` (as pontas, direto do cheque) e
   `ledger` = **TODOS os lançamentos da conta, vivos e apagados**, com `id`, `direction`, `amount`,
   `reversalOf`, `deletedAt`. O filtro de vivos e a seleção do conjunto acontecem **dentro** do helper. A
   raiz do B-1 foi a fronteira de confiança — *"quem carrega filtra"* — e o defeito morava exatamente no
   que o carregador não carregava. A fronteira nova é mínima e declarada: o chamador só promete a
   completude do razão da conta.
2. **Conjunto relevante = fecho por estorno:** começa nas pontas e agrega, transitivamente, todo lançamento
   cujo `reversalOf` aponte para membro do conjunto; vivos filtrados no final (protótipo executado, §0.2).
3. **Regras por status** (mesmos valores do ciclo 2, agora sobre o conjunto certo): `cleared` → net =
   ±amount **e** exatamente 1 linha relevante viva; `bounced` → net = 0 **e** 0 ou 2 linhas; demais → 0
   linhas relevantes vivas. Mensagens continuam nomeando `Ω6R-DIN-011`.
4. **Os dois carregadores mudam junto:** `tests/cheques.test.ts` (`liveChequeEntries`, hoje
   `linked.includes`) e `tests/cheque-clear-bounce-atomic-db.test.ts` (`expectChequeLedger`, hoje
   `id: { in: linkedIds }` + `deleted_at: null`) passam a carregar o razão **inteiro** da conta (memória:
   `list` com `include_deleted`; Postgres: `findMany` sem filtro de `deleted_at`) e a entregar as pontas
   separadas.
5. **Checkpoints re-armados com captura-liquidada:** nos casos de ataque (reverse-clear, delete-clear,
   reverse-bounce — memória, HTTP e Postgres), a tentativa é capturada com o idioma never-reject do C3 do
   ciclo 2, o helper roda **antes** de julgar o outcome, e só então se assere a razão da recusa. Assim o
   helper acusa **independentemente** do `assert.rejects` — que foi o mascaramento que enganou o plano do
   ciclo 2.
6. **Suíte nova de unidade do helper** — `tests/financial-ledger-helper.test.ts`, estados **sintéticos**
   (o helper é função pura): no mínimo os 8 estados do §0.2 — incluindo os dois estados D11 medidos pela
   junta e o estado de compensação apagada do B-1 do ciclo 1 — com `assert.throws`/execução limpa. O erro
   do ciclo 2 foi nunca testar o próprio helper; esta suíte é o discriminador **permanente** (vermelha para
   qualquer regressão do helper, sem depender de drill).

### C2 · P5 — vínculo fail-closed por construção (fecha B-2)

**Novo `src/modules/financial-entries/financial-entry-undo-owners.ts`** (em `src/` — restrição medida no
§0.4), com quatro peças, todas na forma provada no §0.3:

1. **Classificação total dos campos do lançamento:**
   `FINANCIAL_ENTRY_FIELD_CLASS = { ... } as const satisfies Record<keyof FinancialEntry, FieldClass>` —
   cada um dos 25 campos declarado (`"plain"` ou `"owner:<id>"`; hoje: `reversalOf → owner:reversal_pair`,
   `titleId → owner:title_settlement`). Campo novo no tipo → TS1360; chave sem campo → TS2353. É o ataque
   `payrollId` do guardião com a aceitação invertida: `check` **exit != 0**.
2. **Donos-de-desfazer com política por rota, célula a célula:**
   `UNDO_OWNER_POLICIES satisfies Record<UndoOwnerId, { delete: Policy; reverse: Policy }>`, com
   `UndoOwnerId = "reversal_pair" | "title_settlement" | "cheque_link"` e
   `Policy = { kind: "refuse"; error: () => Error } | { kind: "allow"; why: string }` + o detector por rota
   (síncrono ou via porta, como o `ChequeLinkReader`; os detectores de `reversal_pair` são DIFERENTES por
   rota hoje — a tabela preserva isso, não unifica). **Não existe else**: dono novo sem as DUAS células
   escritas não compila. `title_settlement.reverse = allow("reverse É o fluxo do agregado título")` fica
   explícito — hoje essa permissão é o silêncio entre dois ifs.
3. **Ordem de precedência por rota como dado, com igualdade de união:**
   `DELETE_UNDO_ORDER` / `REVERSE_UNDO_ORDER` (`as const`) + `AssertSame<(typeof ORDER)[number],
   UndoOwnerId>` — dono novo fora de qualquer ordem → TS2322. A precedência VIGENTE não muda uma posição:
   `delete`: 404 → `entry_reconciled` → `reversal_pair_immutable` → `settlement_entry_immutable` →
   `cheque_entry_immutable` → `period_closed`; `reverse`: 404 → `entry_reconciled` →
   `reversal_pair_immutable` → `cheque_entry_immutable` → `already_reversed` → `period_closed`.
4. **`financial-entry.service.ts`:** `delete`/`reverse` passam a iterar as ordens aplicando as políticas.
   Os checks que **não** são vínculo de agregado (404, `entry_reconciled`, `already_reversed`, período)
   ficam onde estão. **Refactor 100% preservador de comportamento**: mesmas razões, mesma precedência,
   mesmos códigos — provado por (a) suítes existentes verdes com denominadores inalterados, (b) matriz de
   concordância do parecer re-executável, (c) **D10/D11/D12 re-executados sobre o código refatorado** (os
   guards continuam morrendo quando removidos).

**Uma fonte, duas pontas** — em `src/modules/cheques/cheque.types.ts`:

5. `CHEQUE_FIELD_CLASS satisfies Record<keyof Cheque, ...>` (ponta nova no tipo sem classificar → check
   vermelho) e, derivado dele, **o mapa único**
   `CHEQUE_ENTRY_LINK_COLUMNS = { clearedEntryId: "cleared_entry_id", bounceEntryId: "bounce_entry_id" }
   as const satisfies Record<EntryLinkKey, Prisma.ChequeScalarFieldEnum>` (import **type-only** do client
   gerado — apagado em runtime, não pesa no modo memória; coluna com typo ou fora do schema → check
   vermelho; medido no §0.5 que o tipo existe e carrega as duas colunas), e
   `CHEQUE_ENTRY_LINK_FIELDS = Object.keys(...)`. **As duas cópias consomem o derivado**:
   `cheque.repository.ts` (memória) itera `CHEQUE_ENTRY_LINK_FIELDS`; `cheque-prisma.repository.ts` monta o
   `OR` a partir de `CHEQUE_ENTRY_LINK_COLUMNS`. O literal escrito à mão morre nos dois lados. Ponta nova →
   classifica no tipo → entra no mapa → **os dois repositórios a enxergam no mesmo commit**, e os testes
   por ponta (item 7) crescem sozinhos.
6. **Censo do schema** — novo `tests/financial-entry-link-census.test.ts` (sem banco; lê
   `prisma/schema.prisma` como TEXTO): o conjunto {toda coluna `*_entry_id` fora do model `FinancialEntry`}
   ∪ {toda relação `@relation` cujo alvo é `FinancialEntry`} tem de ser **igual** ao conjunto registrado
   (pontas do mapa único + allowlist estrutural FECHADA). Desconhecido → vermelho; schema não-parseável →
   vermelho (**fail-closed nas duas bocas**). Por que texto e não relation-only: **medido** — as pontas do
   cheque NÃO têm `@relation` no schema (colunas app-level), então censo por relação as perderia; o sinal
   duplo cobre os dois jeitos de nascer uma ponta. Censo parte (b): toda coluna do model `FinancialEntry`
   no schema mapeia para chave classificada no item 1 (tabela snake→camel no teste) — coluna nova só no
   Prisma não fica invisível. **Limite declarado:** ponta futura sem `@relation` E com nome fora da
   convenção `*_entry_id` escapa do censo — mitigado pelo item 5 (o tipo TS a denuncia) e registrado como
   resíduo em pendência.
7. **Testes por ponta, derivados da fonte única:** os casos de recusa (`delete`/`reverse` de lançamento
   vinculado) passam a iterar `CHEQUE_ENTRY_LINK_FIELDS` — tabela por ponta × rota × arranjo (memória e
   Postgres). Ponta nova ganha linhas de teste automaticamente; repositório que deixar de enxergar uma
   ponta perde a linha dela (drill D18).

### C3 · P7 — o journal classificado, e a classificação julgada por execução (fecha o correlato ALTA)

1. **`src/modules/financial-uow/financial-uow.ts`:** três mapas exportados —
   `TITLE_REPO_KIND satisfies Record<keyof FinancialTitleRepository, "write" | "read" | "test_reset">` e
   os irmãos de entries/cheques. **Contagem MEDIDA no head**: os `keyof` têm 13+10+10 chaves — os três
   contratos carregam `reset?(): void` opcional (test-only), e `keyof` inclui membro opcional. O mapa é
   TOTAL (sem `Exclude` — decisão explícita por chave): `reset` classifica como `test_reset`, e o harness
   assere que o contexto journaled NÃO o expõe. Método novo em qualquer repositório → TS1360 no `check`. O
   comentário *"aqui
   a lista é a documentação"* morre: a lista vira **contrato compilado**. Os delegadores em si não mudam de
   comportamento.
2. **Novo `tests/financial-uow-journal-classification.test.ts`** (memória): itera **os mapas** (completude
   herdada do compilador — o teste não mantém lista própria) com uma tabela de invocação por membro; membro
   presente no mapa e sem fixture → `assert.fail` (fail-closed em runtime). Para cada `"write"`: executa o
   membro dentro de unidade que **aborta** depois da escrita → o estado do tenant (comparado por
   `snapshotTenantForUow` dos três repositórios — medido que os três o expõem) tem de voltar **idêntico**.
   Para cada `"read"`: executa e o estado tem de permanecer idêntico. Assim: mutador não-journaled →
   vermelho (o aborto deixa rastro); membro que muta classificado `read` → vermelho; membro novo → primeiro
   o compilador, depois a fixture obrigatória. Publica a contagem exercida: **30 membros write/read
   (12+9+9), mais os 3 `test_reset` asseverados ausentes do contexto**.

### C4 · P8 — a pré-condição volta ao padrão da casa, e o detector permanece armado (fecha B-3)

**Decisão de propriedade (pergunta 5 do briefing):** o repositório adota **os dois braços, por job,
declarados** — e a suíte obedece o job em que roda:

- **Job `backend` (npm test, seedless de propósito):** a suíte **auto-provisiona**. É o padrão da casa
  (medido: 4 suítes irmãs auto-provisionam por upsert e dão verde no arranjo; o ciclo 2 saiu do padrão em
  `1e833bc`).
- **Job roteado (SUITES, com `db:seed` no próprio job):** o **job fornece** — já é assim, está escrito no
  `ci.yml`, não muda.

**O que impede a próxima suíte de sair do padrão sem ninguém ver — duas camadas:**
(a) **o job `backend` PERMANECE sem seed, de propósito**: ele é o detector permanente — qualquer suíte
futura que dependa de seed fica vermelha no primeiro PR que rodar CI (é exatamente o vermelho que pegou o
B-3; adicionar `db:seed` ao job mataria o detector, e por isso este plano o **proíbe**);
(b) a bateria local ganha a **forma canônica 3** (§9): `npm test` contra banco descartável só-migrado — o
arranjo do job, reproduzível na máquina do dev, para o vermelho aparecer **antes** da junta e não nela (a
lacuna real do ciclo 2: a CI nunca rodou nesta branch, e ninguém reproduziu o arranjo do job localmente).

**Mecanismo:** novo `tests/helpers/db-permissions.ts` → `ensurePermission(client, key)`:
`findUnique` → existe? retorna (**zero escrita em regime seeded** — preserva o ganho real do C3.4: nada de
upsert paralelo na mesma linha global; a classe `XX000` de `P-O6R-ARNES-ISOLAMENTO` não volta) → ausente?
`create` com descrição rotulada `"[provisionado por teste — ausente do seed em banco só-migrado]"` +
`catch` de P2002 (outro processo venceu a corrida; o índice único decide) → re-`findUnique` → assert.
**Nunca update** (nunca clobber de catálogo). As duas suítes (`financial-period-close-write-race-db`,
`financial-title-invariants-db`) trocam o par `findUnique`+assert pelo helper. As chaves continuam vindo do
catálogo de `src/` (fonte única já usada pelas suítes e pelo seed). **As 4 irmãs upsert NÃO são tocadas**
(verdes, fora do bloqueante; convergência para o helper vira pendência, não escopo). Resíduo declarado: a
suíte de paridade RBAC compara catálogo×banco só sob `RBAC_DB_PARITY=1` (medido) e seu arranjo canônico é
seeded; **não medi** se ela compara descrições — o desenvolvedor anota o resíduo na pendência.

## 3. Contrato REST — delta

**Nenhum.** Nenhuma rota, código ou reason novo; os dois reasons do ciclo 2 (`settlement_entry_immutable`,
`cheque_entry_immutable`) permanecem exatamente como estão; 404 cross-tenant e precedências preservados
byte a byte (é critério de aceitação do C2, não efeito colateral). O que muda de contrato é só
**documentação**: `API_CONTRACTS.md` ganha os dois reasons — **emenda de escopo concedida por este plano**
(a ata registrou que a lacuna era do plano do ciclo 2, que não autorizava o arquivo). As recusas
precedentes das mesmas rotas continuam na granularidade vigente — documentá-las é pendência, não este PR.

## 4. Modelagem

**Nenhuma migration, nenhuma coluna, nenhum índice.** A única menção a `prisma/**` neste ciclo é
**leitura** (o censo lê o schema como texto) e a mutação **temporária, nunca commitada e verificada por
md5** do drill D17b (§7) — autorizada aqui, com condições: mutação textual apenas, sem `prisma generate`,
sem `migrate`, restore conferido antes de qualquer outro passo. Dinheiro segue Decimal; nenhum cálculo
monetário novo (o helper de teste já arredonda a 2 casas, como o domínio).

## 5. Arquivos exatos

**Desenvolvedor — src:** `src/modules/financial-entries/financial-entry-undo-owners.ts` (novo) ·
`src/modules/financial-entries/financial-entry.service.ts` · `src/modules/cheques/cheque.types.ts` ·
`src/modules/cheques/cheque.repository.ts` · `src/modules/cheques/cheque-prisma.repository.ts` ·
`src/modules/financial-uow/financial-uow.ts`.
**Desenvolvedor — tests:** `tests/helpers/financial-ledger.ts` (só `expectChequeLedgerCoherent`) ·
`tests/helpers/db-permissions.ts` (novo) · `tests/financial-ledger-helper.test.ts` (novo) ·
`tests/financial-entry-link-census.test.ts` (novo) · `tests/financial-uow-journal-classification.test.ts`
(novo) · `tests/cheques.test.ts` · `tests/cheque-clear-bounce-atomic-db.test.ts` ·
`tests/financial-entries.test.ts` (checkpoints/tabela por ponta) ·
`tests/financial-period-close-write-race-db.test.ts` · `tests/financial-title-invariants-db.test.ts`.
**Desenvolvedor — docs/registro (mesmo PR):** `API_CONTRACTS.md` (emenda §3) ·
`agent-orchestration/docs/status-geral.md` e `agent-orchestration/codex/log-execucao.md` (reconciliar —
§C2.7, achado da ata: ainda publicam números que a junta do ciclo 1 reprovou) ·
`docs/revisoes/O6R/achados.jsonl` + `REGISTRO_ACHADOS_O6R.md` (só quem registra, não-votante — conferir o
estado REAL do jsonl antes: nada muda de status até a junta verde; com junta verde, `DIN-002/010/011` vão a
`aguardando_merge` no PR) · `Kpis/kpis-latest.json`, `Kpis/kpis-history.*`, `Kpis/index.html` (§C3,
contagens de execução real; `pr`/`merge_commit`/`approved_head` null na autoria).
**Orquestrador (fatia S0, fora do dev):** espelho Codex dos dois especialistas da fábrica
(`scripts/sync-agent-agents.mjs` + conferência manual — erro 2 da ata, ainda aberto).

**PROIBIDO:** qualquer outro `src/**`/`tests/**` · `.github/workflows/ci.yml` (**não precisa mudar — e
adicionar seed ao job backend mataria o detector do P8**) · `prisma/**` (exceto leitura; mutação SÓ no
drill D17b, temporária, nunca commitada) · `CLAUDE.md`/`AGENTS.md` (o diff contra origin/main segue vazio —
critério da bateria) · `.env` · lockfiles · `infra/**` · frontend · mobile · RBAC · `mvp_*` · cherry-pick
de `a109fd7` · `git checkout/stash/clean/reset --hard` · heredoc de shell para conteúdo de arquivo.
**Arquivo fora das listas → o dev PARA e devolve ao planejador.**

## 6. Baseline N e meta M

Cobertura das propriedades hoje: **P5/P6/P7/P8 = N=0** (é a definição dos bloqueantes: o helper existe mas
não discrimina; a classificação não existe; o harness não existe; o arranjo só-migrado está vermelho). Com
N=0, `M>=2N` degenera — pisos vinculantes, como no ciclo 2:

| Propriedade | Casos novos mínimos |
|---|---|
| P6 | >=8 unit sintéticos do helper + 3 checkpoints de ataque re-armados (memória/HTTP/Postgres) |
| P5 | >=3 casos do censo (colunas `*_entry_id`, relações, allowlist fechada/não-parseável) + tabela por ponta >=2 pontas × 2 rotas × 2 arranjos |
| P7 | 30 membros write/read (12+9+9) exercidos um a um + 3 `test_reset` asseverados fora do contexto; contagem publicada |
| P8 | >=2 casos do helper (idempotência; corrida create×create capturada) + arranjo D20 verde |

**Total >=20 casos executáveis novos** + 4 drills de compilação + 1 drill de ambiente. Baselines a
re-medir e publicar com N e forma (referência da ata: `npm test` local 2646·2636·0·10skip; cluster
descartável 2659·2657·0·2skip; lote na forma do job 29 arquivos · denominador 187 · 15/15; suítes
financeiras de memória 122/122 no arranjo do parecer). Divergência publica o número real e **bloqueia se
menor que o piso**.

## 7. Drills de mutação (D1–D14 do histórico intactos; numeração continua)

Forma geral de TODO drill: baseline verde **medido** → mutação → vermelho **com exit code registrado** →
restore → **md5 do arquivo igual ao pré-mutação** (md5sum antes e depois, comparado — não "confio que
restaurei") → verde re-medido → `git diff` sem resíduo. **Verde durante a quebra invalida o drill e reabre
o ciclo. Mutação que já estava vermelha antes não prova nada — por isso o baseline é parte do drill.**

| ID | Mutação temporária | Vermelho obrigatório | Prova de que não estava vermelho antes |
|---|---|---|---|
| **D15** | remover só o guard de vínculo do `reverse` (a mesma do D11) | o caso de ataque fica vermelho **com o vermelho vindo do HELPER** (asserção de efeito no checkpoint), além da razão; e >=2 casos da suíte unit ficam vermelhos se alimentados do estado gerado | baseline verde pré-mutação; **controle com o helper ANTIGO** (`git show 8145415:tests/helpers/financial-ledger.ts`, md5 `88ede9ef...`) sobre o MESMO estado → verde (reproduz a cegueira medida; prova que o vermelho novo vem do helper novo) |
| **D16** | campo `payrollId?: string` no tipo `FinancialEntry` | `npm run check` exit != 0 apontando o mapa de classificação | `check` exit 0 medido imediatamente antes (o mesmo ataque media exit 0 no ciclo 2) |
| **D17** | (a) `voidEntryId?: string` no tipo `Cheque`; (b) remover uma ponta de `CHEQUE_ENTRY_LINK_COLUMNS` | `check` exit != 0 nos dois casos | `check` exit 0 antes de cada um |
| **D17b** | apendar coluna `probe_entry_id String? @db.Uuid` num model ≠ FinancialEntry no `prisma/schema.prisma` (texto; sem generate/migrate) | censo vermelho nomeando a coluna | censo verde antes; restore md5 do schema conferido ANTES de qualquer outro passo |
| **D18** | hardcode de UMA ponta (bypass da lista derivada) na cópia memória; depois o mesmo na cópia Prisma | a linha de tabela da OUTRA ponta fica vermelha (memória e -db respectivamente) | tabela integral verde antes de cada bypass |
| **D19** | (a) dois mutadores journaled viram delegação pura (replay EXATO do ataque do ciclo 2, incl. `restorePaymentGuarded`); (b) remover uma chave de um kind map | (a) harness vermelho NOMEANDO os membros; (b) `check` exit != 0 | (a) harness verde antes — e o ataque do ciclo 2 media 203/203 verde, que é o contraste; (b) check exit 0 antes |
| **D20** | ambiente: banco descartável recém-criado + só `migrate deploy` (sem seed), `DATABASE_URL` exportada | **controle ANTES da correção**: `npm test` exit 1 com as 6 falhas de permissão (reproduz a medição do ci-doutor) → **DEPOIS da correção**: exit 0 | o controle vermelho pré-correção É a prova; mesma receita de banco nas duas medições, comandos idênticos |

## 8. Ordem e dependências

**S0** (orquestrador): espelho Codex dos especialistas + designação nominal do dev + reconciliação de
`status-geral.md`/`log-execucao.md` **antes de qualquer código** (§C2.7).
**S1** C4/P8 — primeiro, porque destrava o arranjo canônico: o controle vermelho do D20 é medido AQUI,
antes da correção, e todas as medições -db seguintes já podem usar banco descartável só-migrado.
**S2** C1/P6 (helper + unit + checkpoints; D15).
**S3** C2/P5 (registro + pontas + censo; D16–D18).
**S4** C3/P7 (kind maps + harness; D19).
**S5** docs/registro/KPI + bateria integral + re-execução de D10–D12 sobre o refatorado.
S2–S4 são independentes entre si mas rodam em série (isolamento de causa de qualquer vermelho); cada fatia
verde antes da seguinte; commit por fatia.

## 9. Bateria de validação (forma de execução DECLARADA — a contagem só vale com N e forma)

**Regra de execução de TODOS os passos:** `comando > "$LOG" 2>&1; EXIT=$?` — o exit code vem da variável,
NUNCA de pipe (`comando | tail` devolve o código do `tail`); contagens lidas do TAP no arquivo
(`# tests/# pass/# fail/# skipped`). Cada número publicado carrega: comando exato, env relevante (inclusive
presença de `DATABASE_URL` e `CORE_SAAS_PERSISTENCE`), N e forma (arquivo único vs lote).

1. `npm run check` · `npm run lint` (exit por variável)
2. `npm test` — **forma canônica 1** (sem `DATABASE_URL` exportada; o runner resolve `memory` e declara)
3. **Forma canônica 3 (NOVA — o arranjo do job `backend`):** criar banco descartável →
   `npx prisma migrate deploy` (sem seed) → exportar `DATABASE_URL` do descartável → `npm test`.
   **Meta: exit 0.** É o passo que teria pego o B-3 antes da junta.
4. Cada suíte `-db` isolada (diagnóstico; zero skip com banco presente)
5. Drills **D15–D20** + re-execução de **D10/D11/D12** sobre o código refatorado (§C2.4)
6. **Forma canônica 2 — lote na forma exata do job roteado:** `npm run db:seed` + um único
   `node --test --import tsx` com a lista SUITES completa (29 arquivos), **N>=15**, denominador constante
   publicado por iteração, grep de `unhandledRejection|XX000|23505|40P01` no log. Meta **15/15**. Suíte
   isolada continua permitida como diagnóstico, mas não conta como evidência de estabilidade.
7. `npm run build` · `npm --prefix frontend run check`
8. KPI: freeze + `node --check Kpis/app.js` + os dois guards do painel
9. `git diff --check` · `git diff origin/main...HEAD -- CLAUDE.md AGENTS.md` **vazio**
10. Medições fora das formas canônicas que derem vermelho: registrar arranjo completo em
    `P-O6R-ARNES-ISOLAMENTO` **sem conclusão causal** (regra do ciclo 2 §10, mantida — os dados novos da
    ata sobre dotenv/carga de CPU pertencem à pendência, não a este PR)

## 10. O que NÃO fazer — fechado pela ata, não se reabre

1. **`expectTitleLedgerCoherent`** — funciona, provado por execução contra o defeito equivalente. Intocado.
2. **A semântica dos guards C1/C2 do ciclo 2** — razões, códigos, precedência, matriz de concordância
   (inclusive `DELETE /{módulo}/:id/payable`), rota de saída ponta a ponta contra Postgres. Tudo isso a
   junta provou por ataque próprio. O C2 muda a FORMA da enumeração, nunca o comportamento — qualquer
   denominador que se mova é defeito do refactor.
3. **A premissa birth-fixed** — atacada e sustentada pelo especialista. Não re-provar; o crítico do ciclo 3
   pode reabri-la como premissa (§13), mas o dev não mexe.
4. **DIN-001/004/008, QUA-003, migration (up/down/re-up), fixture do ciclo 1, RESTORE (RTO 26,5s), 404
   cross-tenant antes de regra financeira, anti-verde-cego (modo asseverado), 403-nunca-422** — fechados
   por execução nos dois ciclos.
5. **O arnês do C3 do ciclo 2** — captura-liquidada, barreira por `application_name`, decoy dentro do lote
   real, vaza-metro zero. O D14 pertence ao arnês e passou. (O resíduo "meia-metade fraca no decoy" fica
   registrado, não é escopo.)
6. **`P-O6R-B02-CHEQUE-UNCLEAR`** — examinado pela junta e confirmado trade-off, não achado. Não reabrir.
7. **As três medições divergentes de `npm test`** — registradas sem harmonizar; este ciclo NÃO investiga a
   causa (é `P-O6R-ARNES-ISOLAMENTO`), só declara arranjos (§9).
8. **As 4 suítes irmãs com upsert** — verdes no arranjo, fora do bloqueante. Convergir para o helper é
   pendência futura, não escopo.
9. **`CLAUDE.md`/`AGENTS.md`** — já restaurados (diff vazio, B-4 fechado). Ninguém os toca.
10. **Gate `G-A109FD7-PUBLICADO`** — continua bloqueando push/PR/merge (medido: não-ancestral). Trilha
    paralela com alçadas disjuntas, como decidido no ciclo 2 §11. Cherry-pick segue proibido.

## 11. Riscos e rollback

| Risco | Contenção |
|---|---|
| O refactor do C2 mudar comportamento sem querer (a classe "correção que nasce defeito" — 4 de 4 instâncias na repaginação do KPI nasceram assim) | refactor é preservador por CRITÉRIO: mesmas razões/precedência; suítes existentes com denominadores inalterados; D10/D11/D12 re-executados sobre o refatorado; separação de papéis (§13) |
| Import type-only do Prisma em `cheque.types.ts` atrapalhar o modo memória | é apagado na transpilação (tsx e tsc); o `check` já exige client gerado hoje (repos prisma importam `Prisma`); se a 1ª verificação do dev falhar → PARA e devolve |
| Censo por texto frágil | fail-closed nas duas bocas: não-parseável → vermelho; desconhecido → vermelho; D17b prova que morde; limite declarado no C2.6 |
| Kind map mentir (membro write declarado read) | quem julga é o harness EMPÍRICO, não o mapa: read que muta → vermelho; D19 prova |
| Helper novo verde-cego | suíte unit com estados corrompidos sintéticos é permanente; D15 exige vermelho vindo DO HELPER com controle do helper antigo |
| `ensurePermission` correr contra si mesma entre processos | create-if-absent + P2002 + re-read (o índice único decide); caso de corrida capturada na suíte do helper; qualquer XX000 novo → vermelho do lote §9.6 e registro na pendência |
| Flake residual no lote 15/15 | qualquer falha = reprovação e investigação; não se arredonda (regra do ciclo 2, mantida) |

**Rollback:** revert do PR único; nenhum dado nem schema muda. Os drills nunca são commitados; restore
sempre conferido por md5.

## 12. Registro, pendências, KPI

- **Pendências novas:** `P-O6R-B02-CENSO-CONVENCAO` (ponta sem `@relation` e fora de `*_entry_id` escapa do
  censo — resíduo declarado do C2.6) · `P-O6R-B02-UPSERT-IRMAS` (convergir as 4 suítes upsert para
  `ensurePermission`) · anotar em `P-O6R-ARNES-ISOLAMENTO` o que o §9.10 capturar · resíduo da descrição
  rotulada vs paridade RBAC (C4).
- **Achados:** nenhum ID novo — os bloqueantes do ciclo 2 são defeitos de arnês/CI/classe, com evidência em
  `R-B-O6R-02-ciclo2/` e na ata; `DIN-010/011` seguem como estão até a junta verde (§5). Quem registra não
  vota (§C7.4-bis).
- **KPI (§C3):** latest + history (append com nota) + `kpi-freeze.mjs` + painel; contagens de execução real
  deste ciclo; `pr` após `gh pr create`; `merge_commit`/`approved_head` null na autoria.

## 13. Junta e alçadas do ciclo 3 (protocolo do §C7.4 para ciclo 3)

1. **Separação de papéis (§C7.4-bis):** quem achou (os 5 votantes do ciclo 2) não planeja, não desenvolve,
   não revisa, não é porteiro — a ata já os declara inelegíveis. Eu (planejador) não desenvolvo nem voto.
   **Desenvolvedor: agente novo, nominalmente designado antes de qualquer código.** Se qualquer alçada for
   instância nova de papel reprovado → `D-INSTANCIA-NOVA-COM-AUDITORIA`: primeira tarefa é auditar por
   execução, e o briefing DECLARA quais afirmações auditar (este plano lista as dele no §0).
2. **Protocolo de ciclo 3 (§C7.4): o crítico reabre a premissa + pesquisa >=5 fontes ANTES da junta**, PD
   registrado em `docs/omega-pd.md`. Premissas nomeadas para reabertura: (a) *enumeração fail-closed por
   construção fecha a classe, ou só a empurra para a classificação?* (b) *birth-fixed dos vínculos* (o
   especialista deixou o interleaving explicitamente em aberto "se a junta discordar"); (c) *fronteira de
   confiança dos helpers de invariante* (quem carrega o quê). Pesquisa: padrões de exaustividade em TS
   (`satisfies`/`Record`/`never`), mutation testing de invariantes financeiros, testes de propriedade em
   razão contábil, gestão de pré-condição de fixture em CI, lint/censo de schema Prisma. Teto 6 agentes.
3. **Junta 5/5 UNÂNIME** (invariante financeiro), competências: banco/locks · ataque adversarial ao
   dinheiro · arnês concorrente Node/Postgres · fail-closed/enumeração · validador diff×plano. **Cada
   jurado que precisar de banco recebe cluster Postgres descartável** (erro de orquestração 1 da ata — não
   se repete). Briefing de cada jurado com recorte conferido contra o diff real (erro 3). A ata do ciclo
   responde por escrito às perguntas (a)/(b)/(c) do §C7.4-bis e registra quem ocupou cada papel.
4. **Porteiro pré-merge no head exato**; PR só após o gate `G-A109FD7-PUBLICADO` + rebase + reexecução da
   bateria (decisão do ciclo 2 §11, mantida).

## 14. O que eu medi e o que não medi

**Medi por EXECUÇÃO (§0, saídas transcritas):** o helper real do head julgado verde nos dois estados D11
alimentado como os loaders alimentam; o protótipo do fecho por estorno vermelho/verde nos 8 estados; as
três construções de compilador reprovando no tsc 5.8.2 do repo (TS1360/TS2353/TS2322) + controle exit 0;
`a109fd7` não-ancestral; head atual `9198d55` com delta docs-only sobre `8145415`.

**Medi por LEITURA no head (git show, linhas citadas no texto):** guards de `delete`/`reverse` e
precedências; as duas cópias das pontas; `cheque.types.ts`/`financial-entry.types.ts` (25 campos);
`financial-uow.ts` (delegadores, journal); as três interfaces de repositório extraídas membro a membro
(12+9+9 métodos + `reset?` opcional em cada uma → keyof de 13+10+10); `snapshotTenantForUow` nos três;
schema Prisma (Cheque sem `@relation` nas pontas; únicas `*_entry_id` em 2045-46; colunas de
FinancialEntry); `tsconfig.json` (include só src); `package.json` (scripts, TS 5.8.2, Prisma 7.8);
`run-backend-tests.mjs`; os dois jobs do `ci.yml` (seedless vs seeded, lista SUITES); as duas suítes
`findUnique`+assert e as 4 irmãs upsert; `prisma/seed.ts` (chaves 164/169, importa o catálogo de src);
paridade RBAC gated por `RBAC_DB_PARITY=1`; `ChequeScalarFieldEnum` no client gerado;
`Prisma.ChequeScalarFieldEnum` como tipo-união.

**NÃO medi:** nenhuma suíte inteira deste repo (os números 2646/2659/187/122 são da ata e do parecer, com
os arranjos deles, citados como deles); os ataques HTTP dinâmicos (saldos, −100, 6 falhas do job — da ata,
que os executou); se a paridade RBAC compara descrições (resíduo declarado no C4); a propagação em runtime
das construções novas (é exatamente o que os drills D15–D20 existem para provar — e o plano manda PARAR e
devolver se qualquer verificação de premissa falhar na primeira execução, não improvisar).

**Nenhuma afirmação deste plano sobre comportamento futuro é fato — são critérios de aceitação.** A
diferença entre este plano e o do ciclo 2 no ponto que virou agravante: onde o do ciclo 2 escreveu "o
helper acusa", este escreve "o drill só conta se o helper acusar" — e a semântica que ele exige já foi
executada em protótipo, com a saída transcrita no §0.2.
