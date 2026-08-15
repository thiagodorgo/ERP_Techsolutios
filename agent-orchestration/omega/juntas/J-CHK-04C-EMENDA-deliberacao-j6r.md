# J-CHK-04C-EMENDA — emendar (ou não) a deliberação da J-6R que bloqueia a trilha CHECKLIST

- **Data:** 2026-08-14
- **Origem:** parecer `BLOQUEADO` do `porteiro-pos-merge` na conclusão do merge do PR **#347** (auditoria total Ω6R,
  `e80430a`), que trouxe para a `main` uma deliberação de junta 5×0 vedando features nos módulos atingidos.
- **Composição (5, §C7.1):** `agente-secops` · `agente-dba-guardiao` · `agente-ci-doutor` ·
  `critico-adversarial` · `estrategista`
- **Resultado: opção (B) — EMENDAR COM SEQUENCIAMENTO, 4×1.** Opção (C) **duplamente vetada**.
  Veto de especialidade exercido pela cadeira `agente-ci-doutor` → condições de CI vinculantes (§4).

---

## 1. A pergunta

A deliberação da J-6R (`docs/revisoes/O6R/ATA_J6R.md:47`), verbatim:

> "Bloquear deploy produtivo e features nos módulos atingidos até concluir os blocos P0 do `PLANO_O6R.md`;
> P1 vem antes de nova feature no módulo correspondente. O humano delibera os rascunhos arquiteturais
> D-001..D-004."

A trilha CHECKLIST P1 cai sobre três módulos atingidos: `checklists`/`cloud-usage` (`Ω6R-DIN-005`, P0),
`work-orders`/`approvals` (`Ω6R-SEC-002`, P0) e `field-dispatch` (`Ω6R-ARQ-004`, P1). O PR-04c-A está pronto e
corrigido, mas não mergeado. Opções postas: **(A)** honrar como escrito · **(B)** emendar com sequenciamento ·
**(C)** ler o bloqueio como só de produção · **(D)** honrar e repriorizar o backlog inteiro para o `PLANO_O6R.md`.

## 2. Correção de registro (§A2) — a pauta levou DOIS fatos errados à junta

Ambos os erros são do orquestrador que redigiu a pauta, e ambos foram apanhados pelos próprios votantes. Ficam
registrados aqui porque uma deliberação apoiada em premissa falsa é contestável depois, e porque a dissidência
**exigiu em ata** que a justificativa não se apoiasse no primeiro deles.

**(a) A evidência "o 04c-A melhora a métrica faturada" está INVERTIDA.** A pauta afirmou que o PR ataca parte do
dano do `Ω6R-DIN-005` porque introduz o fallback à chave legada que impede a duplicação de
`checklist_runs_count`. A leitura correta, provada pelo `critico-adversarial` com a fonte que a própria pauta
citava (`tests/work-order-checklists-legacy-key-fallback.test.ts:8-25` + `field-dispatch.service.ts:447` na
`main`): a chave em produção hoje é `dispatch:<ordem>:<modelo>`, **sem fase** — logo o risco de duplicação
**não existe na `main`**. Ele é **criado** pelo 04c-A (que muda a forma da chave para incluir a fase) e depois
remediado pelo próprio 04c-A. O `expected: 1 / actual: 2` mede o estrago que este PR causaria se o remendo dele
fosse removido, não um defeito preexistente sendo corrigido. **O delta do 04c-A sobre a perda silenciosa do
DIN-005 é ZERO: ela continua aberta e intocada.**
→ **Esta emenda não se apoia, em nenhum ponto, no argumento "melhora a métrica".**

**(b) A tabela do `PLANO_O6R.md` foi lida na coluna errada.** A pauta apresentou "B-O6R-06 (2,5d) · B-O6R-07 (1d)
· B-O6R-09 (8d)" como estimativas de prazo. O cabeçalho real é
`| Ordem | Bloco / branch sugerida | Achados | Aceite e testes obrigatórios | Dep. | Esforço |`: aqueles números
são a coluna **`Dep.`** — os blocos dos quais cada bloco depende — e o esforço é a letra **G/M** da última
coluna. Prova interna: os blocos 01 e 05 têm `—` em `Dep.`, e "—" não é duração. Apanhado independentemente por
duas cadeiras (`critico-adversarial` e `estrategista`).

**Consequência da correção (b):** o fechamento transitivo para destravar a trilha CHECKLIST é
**01 + 02 + 05 + 06 + 07** — cinco blocos, quatro deles "G" —, e somando a cláusula de P1 de field-dispatch
entram **08 + 09**: sete dos onze. A opção (A) **não era** "uma pausa curta para dois consertos"; ela é
substancialmente a (D). A pauta apresentou as duas como extremos opostos e elas não são.

**Por que o resultado sobrevive às duas correções.** A correção (b) **encarece a (A)**, e portanto reforça a (B)
em vez de enfraquecê-la — tanto que a cadeira que a descobriu (`estrategista`) votou **B** já sabendo dela. E
nenhuma das quatro justificativas de B se apoia na evidência invertida de (a): `agente-secops` votou pelo delta
de autorização medido no diff; `agente-dba-guardiao`, pela análise do DAT-001 na sua lente; `estrategista`, pelo
método (C apaga metade da frase; A já é D); `agente-ci-doutor`, porque a suíte é cega aos três achados. A
dissidência (`critico-adversarial`), autora da correção (a), **declarou explicitamente que não veta B**.

## 3. Os votos

| Cadeira | Voto | Fundamento em uma linha |
|---|---|---|
| `agente-secops` | **B** | Confirmou SEC-001/TEN-001/SEC-002 integralmente na `main`, e mediu que o 04c-A **estreita** a superfície: `git diff origin/main -- catalog.ts` volta vazio (zero permissão nova) e a única rota nova em work-orders é gateada por `field_dispatch:create`, que `field_technician` **não possui**. Travar este PR não reduz nada mensurável no domínio de segurança. **Veto declarado contra (C).** |
| `agente-dba-guardiao` | **B** | Confirmou SEC-002, DIN-005, DIN-006 e ARQ-004; registrou que **DAT-001 não se sustenta como escrito** na sua lente. Redigiu a emenda com o sequenciamento que começa por B-O6R-05. |
| `agente-ci-doutor` | **B** | Nenhum dos três achados da interseção é coberto pela suíte — logo segurar merges **não reduz a exposição de nenhum deles**. Os dois P0 mais graves (DAT-001, DIN-006) são de configuração de deploy, sem superfície nenhuma em CI. **Veto de especialidade exercido** → condições do §4. |
| `critico-adversarial` | **A** | Autor da correção (a): a evidência pró-B estava invertida. Sustenta que a deliberação 5×0 já autoriza (A) sem voto novo. **Veta (C)** (o PR carrega duas migrations, e migration mergeada na `main` **é** caminho de produção). **Não veta (B)**; exige em ata as duas condições acolhidas no §5. |
| `estrategista` | **B** | Autor da correção (b). (C) morre no método: ler "deploy produtivo **e** features" como só-deploy não é interpretar, é apagar metade da frase — e §C7.1 existe para impedir erosão por releitura. Emenda-se explicitamente, que é o que B faz. |

## 4. O TEXTO DA EMENDA (vinculante)

> **Emenda `J-CHK-04C-EMENDA` à Deliberação da J-6R** (`docs/revisoes/O6R/ATA_J6R.md:47`).
>
> A Deliberação da J-6R permanece **vigente e íntegra**, com **uma exceção nominal e única**:
>
> **O PR CHECKLIST P1 PR-04c-A** — junção N:N `work_order_checklists` (migração `20260865000000`), coluna
> `checklist_runs.role` (migração `20260866000000`) e rota `PATCH /api/v1/work-orders/:workOrderId/checklists` —
> **fica liberado para merge na `main`**.
>
> A exceção alcança **este PR, nominalmente**; não alcança o módulo, não alcança a trilha, e **não toca o
> bloqueio de deploy produtivo**, que permanece integral. Ela alcança **também, e explicitamente**, a cláusula
> "P1 vem antes de nova feature no módulo correspondente" quanto a `Ω6R-ARQ-004`: o 04c-A **é** feature em
> `field-dispatch` e **viola** essa cláusula; a junta a excetua **para este PR apenas**, e mantém que a próxima
> feature em `field-dispatch` posterior ao 04c-A não merga antes de **B-O6R-09**.
>
> **1. Continua bloqueado, sem exceção.** PR-04c-B, PR-05a, PR-06 e qualquer outra feature em `checklists`,
> `cloud-usage`, `work-orders`, `approvals` e `field-dispatch` — até o merge de **B-O6R-07** (SEC-002/003/004)
> **e** **B-O6R-06** (DIN-005/DIN-007). Em especial, **PR-04c-B não merga antes de B-O6R-06**, porque amplia o
> número de execuções provisionadas por ordem exatamente na métrica que o DIN-005 perde em silêncio.
>
> **2. Sequenciamento vinculante após o merge do 04c-A**, respeitando o grafo real de dependências da coluna
> `Dep.`: **B-O6R-05** (`fix/production-runtime-gates` — DAT-001 + DIN-006; único bloco P0 sem dependência, e o
> que torna estrutural a garantia que o 04c-A pressupõe: o conjunto de vistorias só é prova se sobreviver a um
> restart) → **B-O6R-01** (`fix/identity-authority` — SEC-001/TEN-001; pré-requisito dos blocos 02 e 07) →
> **B-O6R-02** (`fix/financial-uow`) → **B-O6R-07** → **B-O6R-06**.
>
> **3. Condições de CI, vinculantes** (veto de especialidade da cadeira `agente-ci-doutor` — bloco de correção
> não fecha com verde que não exercite o defeito):
> - **(i)** No merge do 04c-A: `tests/work-order-checklists-junction-schema-db.test.ts` e
>   `tests/checklist-run-role-db.test.ts` no subconjunto do job `backend-postgres` do
>   `.github/workflows/ci.yml`, com o guard "Fail on skipped tests" passando com **0 pulos**.
>   → **já satisfeita** na árvore (`.github/workflows/ci.yml:170-171`), verificada em 2026-08-14.
> - **(ii)** Permanece no PR o teste negativo de papel provando `field_technician` → **403** em
>   `PATCH /api/v1/work-orders/:workOrderId/checklists`.
> - **(iii)** **B-O6R-07** entrega teste negativo de papel em `POST /approvals/:id/approve` e `/reject`
>   provando `field_technician` → **403**, no padrão que o repo já tem em `tests/work-order-mileage.test.ts:397`
>   (`[J-Ω3F-7A furo]`).
> - **(iv)** **B-O6R-06** entrega injeção de falha que prove a durabilidade do registro de uso.

## 5. Exigências da dissidência, acolhidas

1. **A justificativa desta emenda não cita "o 04c-A melhora a métrica faturada"** — registrado como
   factualmente errado no §2(a), e o §4 não o invoca em nenhum ponto.
2. **A cláusula de P1 de field-dispatch (ARQ-004) foi coberta explicitamente** no texto da emenda, em vez de
   ficar tacitamente violada como na redação proposta pela pauta.

## 6. Achado de processo (levantado pela dissidência, endereçado no mesmo trabalho)

`grep O6R agent-orchestration/controle/pendencias.md` na `main` retornava **0 ocorrências**: uma deliberação
vinculante que bloqueia trilhas inteiras não existia no backlog operacional, e todo agente que não lesse esta
pauta a atropelaria sem saber. O registro correu **em paralelo** a esta junta (536 linhas em `pendencias.md`,
os 29 achados individualmente localizáveis por `grep`, 12 entradas mapeadas aos 11 blocos; mais
`D-O6R-REGISTRO-NO-BACKLOG` e `D-O6R-RASCUNHOS-DEFERIDOS-AO-HUMANO` em `decisoes.md`). A dissidência sustenta
que deveria ter **precedido** a discussão de emenda; a ata registra a crítica como procedente — o paralelismo
foi escolha do orquestrador, não determinação da junta.

## 7. O que esta junta NÃO decidiu

- Não tocou o **bloqueio de deploy produtivo**, que segue integral.
- Não deliberou os rascunhos **Ω6R D-001..D-004**: a própria ata da J-6R os defere ao humano, e continuam
  como pauta aberta (registrado em `D-O6R-RASCUNHOS-DEFERIDOS-AO-HUMANO`).
- Não reclassificou nenhum achado. `Ω6R-DAT-001` foi contestado na lente do `agente-dba-guardiao`, mas a
  contestação fica registrada como voto, **não** como reclassificação — mudar severidade exige junta própria.
