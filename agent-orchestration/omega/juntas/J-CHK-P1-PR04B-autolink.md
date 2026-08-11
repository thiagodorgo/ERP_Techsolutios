# J-CHK-P1-PR04B — AUTO-link da custódia: filtrar ou continuar varrendo todas as vistorias da OS

- **Bloco:** CHECKLIST P1 PR-04b — fatia **puramente defensiva** (mandato da carta: "o comportamento de
  quem usa o sistema hoje NÃO pode mudar; só os caminhos perigosos passam a ser impossíveis")
- **Branch:** `feat/chk-p1-pr04b-bloqueadores`
- **Data:** 2026-08-11
- **Composição (§C7.1):** 3 votantes — `coordenador-de-acessos` · `agente-dba-guardiao` ·
  `critico-adversarial` — com **desempate** pelo `validador-mestre` (empate 1×1×1 na 1ª rodada)
- **Pendência que motivou:** `P-CHK-CUSTODIA-AUTOLINK-SEM-FILTRO` (achado A3 da junta
  `J-CHK-P1-PR04-aplicabilidade`) — **bloqueava a PR-04b**
- **Resultado:** **OPÇÃO A, 2×1×1 — o AUTO-link CONTINUA VARRENDO TODAS as vistorias da OS, sem
  filtro.** A decisão **não gera mudança de código**: a varredura que existia segue byte-idêntica; o que
  muda é que ela **deixou de ser "ninguém decidiu isso" e virou decisão registrada** (o comentário de
  `autoLinkChecklistRuns` passa a referenciar esta ata). **Este registro É a entrega** (§C7.1: junta sem
  registro = merge inválido).

---

## A pergunta

`autoLinkChecklistRuns` (`src/modules/impound/impound-prisma.repository.ts`) vincula com
`linkSource: "AUTO"` **todas** as `ChecklistRun` da ordem de serviço
(`related_entity_type='work_order'` + `related_entity_id`, **sem** filtro de tipo ou fase) ao processo de
custódia recém-aberto, na **mesma transação** da abertura, re-executada de forma idempotente pelo sweep
de 60s. A vistoria é **prova jurídica** do estado do veículo, e a aplicabilidade (PR-04a, #345) em breve
**multiplica as vistorias por ordem** (sticky; até 2). No dia em que ligar, todo processo de custódia
passa a receber 2 vínculos AUTO em vez de 1 — e ninguém havia decidido se isso é o desejado.

**Opções em voto:**

| Opção | O que faz |
|---|---|
| **(A)** | **Mantém** a varredura sem filtro — toda vistoria da OS entra no dossiê |
| **(B)** | **Filtra** por `checklist_templates.type` — só tipos de guincho (coleta/entrega) entram no AUTO; o resto fica de fora, recuperável pela rota manual |
| **(C)** | Filtra como (B) **e registra** (log/auditoria) cada vistoria que ficou de fora, para a exclusão nunca ser silenciosa |

---

## 1ª rodada — os três votos, na íntegra (referências de linha removidas; discurso convertido para 3ª pessoa onde sinalizado)

> Os três agentes verificaram os fatos **no código da branch** antes de votar. Os textos abaixo são os
> votos originais (as referências de linha citadas neles são do estado **anterior** a este registro — o
> comentário de `autoLinkChecklistRuns` cresceu ao absorver esta ata, deslocando as linhas).

### Voto do `coordenador-de-acessos` — **C** (filtrar + registrar a exclusão)

Fatos verificados por ele:

1. **AUTO-link sem filtro confirmado** — `impound-prisma.repository.ts`: `findMany` por
   `related_entity_type: "work_order"` + `related_entity_id`, sem `where` de tipo de template, na mesma
   tx da abertura, re-executado pelo sweep.
2. **Rota manual existe** — `impound.routes.ts` (`POST /impound-processes/:processId/link-checklist-run`,
   permissão `impound:update`, decisão de junta Ω-VID PR-04). A rede de segurança para incluir
   manualmente está de pé.
3. **Não existe UNLINK** — grep por unlink/desvincular/remove no `impound.checklist-link.service.ts`
   retorna vazio. O vínculo é append-only: o que entra no dossiê, **nenhum papel consegue tirar**.
4. **Hoje a OS tem 1 vistoria** — `field-dispatch.service.ts` provisiona a run a partir de
   `workOrder.checklistId` (single); no fluxo de guincho esse é o checklist do guincho.
5. **Quem lê o dossiê** — a listagem tem guarda dupla `impound:read + checklist_runs:read`; o dossiê de
   custódia é lido por perfis além do operador que criou a vistoria (auditor, e na visão do dono, persona
   de autoridade). A aba chama-se "Checklist do Guincho" — quem a abre espera vistorias de
   coleta/entrega.

A ótica dele (coordenador-de-acessos): o AUTO-link é uma **fronteira de audiência automática**. Uma
vistoria `technical_evidence`/`custom` nasce num contexto operacional interno da OS; ao ser varrida para
o dossiê, ela passa a ser exibida a papéis e personas (autoridade, auditor) que o autor da vistoria nunca
escolheu como leitores — e, sem unlink, **ninguém consegue reverter**. A assimetria de erro é decisiva:

- **Vistoria faltando** no dossiê → recuperável em 1 ação: o operador com `impound:update` usa a rota
  manual (verificada, existe).
- **Vistoria sobrando** no dossiê → irrecuperável por qualquer papel; vira superfície permanente para
  advogado adverso explorar contradições entre um checklist genérico e as vistorias de fase.

Por que (C) e não (B), nas palavras dele: sem registro do que ficou de fora, a exclusão é **silenciosa**
— o operador que abre a custódia não sabe que existe uma vistoria genérica não vinculada e a rede manual
nunca é acionada, violando o espírito de §A2/D-007 (nada some em silêncio). O log transforma "excluído e
invisível" em "excluído, visível e recuperável". Isso também cobre a retrocompatibilidade: se alguma OS
de hoje tiver sua única vistoria com tipo fora do filtro, a mudança de comportamento fica registrada e
corrigível, não oculta.

Custo de ele estar errado (declarado no voto): se (A) fosse o certo, o dossiê nasce incompleto em casos
raros — corrigível com 1 clique na rota manual, guiado pelo registro. Se votasse (A) e estivesse errado,
conteúdo irrelevante entra irreversivelmente em prova jurídica lida por terceiros. **Erro reversível
ganha de erro irreversível.**

### Voto do `agente-dba-guardiao` — **B** (filtrar por `template.type`, sem log)

Fatos verificados por ele (leitura na branch `feat/chk-p1-pr04b-bloqueadores`):

- `autoLinkChecklistRuns`: `findMany` por `related_entity_id` sem filtro, upsert idempotente na unique
  (tenant, process, run), na MESMA tx da abertura; re-tick de 60s do sweep re-executa a abertura
  idempotente.
- Rota MANUAL existe e está viva: `impound.routes.ts` → `ImpoundChecklistLinkController.link` →
  `linkSource: "MANUAL"` (`impound.checklist-link.service.ts`), gate `impound:update`.
- **Não existe unlink**: `grep unlink|deleteLink|removeLink` em `src/modules/impound` → zero. Link
  criado é permanente.
- Hoje a OS tem ~1 run (`work_orders.checklist_id` single, nullable); o tipo vem de
  `checklist_templates.type` ∈ {towing_collection, towing_delivery, technical_evidence, custom}.
- PR-04a confirma: `generic` é FALLBACK e a multiplicação (até 2 runs/OS) chega na PR-04b.

A análise dele (ótica dba-guardiao — integridade do dossiê + sweep idempotente):

1. **Assimetria de reversibilidade decide.** Sem rota de unlink, a sobre-inclusão (A) é porta de mão
   única num artefato jurídico: vistoria irrelevante entra no dossiê e NUNCA sai. A sub-inclusão (B) é
   corrigível pela rota MANUAL que já existe. Quando um erro é irreversível e o outro é corrigível, o
   default de integridade é o corrigível.
2. **Nada "some" no filtro.** A run excluída não é apagada nem escondida: continua íntegra e listável na
   OS (fonte de verdade dela). O dossiê deixa de IMPORTAR ruído; não perde evidência. Se o produto quiser
   mostrar "há N vistorias da OS fora do dossiê", isso é derivação de LEITURA — não precisa de log
   gravado.
3. **(C) é um footgun no domínio dele.** Gravar auditoria "do que ficou de fora" DENTRO de uma tx
   idempotente re-executada pelo sweep de 60s ou (a) spamma um evento por re-tick (auditoria é
   append-only, não tem unique natural), ou (b) exige inventar uma pseudo-tabela de exclusão upsertável —
   estado a mais para manter consistente, e mais superfície de falha numa tx cujo rollback reverte a
   abertura de custódia inteira (efeito LEGAL pago por um registro navegacional). Custo alto, benefício
   que a leitura já entrega.
4. **Filtro por `template.type` é seguro para o sweep**: função determinística do modelo, efeito
   monotônico (só adiciona, nunca remove — não há delete), zero risco de flip-flop entre tx inicial e
   re-tick.
5. **Retrocompat**: links já criados são intocados (não há remoção retroativa de dossiê); OSs futuras
   cuja única run seja `technical_evidence`/`custom` deixam de auto-entrar, e esse é exatamente o caminho
   que a pendência A3 aponta como nunca-decidido. A rede manual cobre o caso legítimo raro.

Custo de ele estar errado (declarado no voto): uma vistoria relevante de tipo `custom` não entra sozinha
no dossiê e a organização precisa de 1 clique manual para incluí-la — recuperável, auditável
(`linkSource: "MANUAL"`, `createdBy`), sem perda de dado. O custo do erro oposto (A/C) é dossiê jurídico
permanentemente poluído ou tx de custódia com side-effect não-idempotente.

### Voto do `critico-adversarial` — **A** (manter a varredura)

Fatos confirmados por leitura direta:

- `impound-prisma.repository.ts` — `findMany` por `related_entity_id` sem filtro de tipo, `createLink`
  com `linkSource: "AUTO"`, mesma tx da abertura (trade-off de atomicidade documentado como decisão de
  junta do PR-05).
- Rota manual existe e funciona: `impound.routes.ts` → `ImpoundChecklistLinkService.linkChecklistRun`
  (`linkSource: "MANUAL"`, guard de tenant, `impound:update`).
- Hoje a OS tem ~1 run, nascida do provisioner `dispatch:<workOrderId>:<checklistId>`
  (`field-dispatch.service.ts`) a partir de `work_orders.checklist_id` — que é escolha manual **sem
  nenhuma restrição de tipo de template** (`checklist-applicability.types.ts` admite: "o que alguém
  escolheu à mão").
- A camada de aplicabilidade (PR-04a) **não acopla** `role` (collection/delivery/generic) a
  `checklist_templates.type` — nada impede uma regra `role=collection` apontando para template `custom`.

**Ataque à (B)** — três tiros fatais, nas palavras dele: (1) **Eixo errado** — a fase da vistoria vive
na REGRA de aplicabilidade (`role`), não em `template.type`; um tenant cuja vistoria de coleta real usa
template `custom` teria a ÚNICA prova do estado do veículo excluída do dossiê. (2) **Quebra
retrocompat** — hoje `checklist_id` é livre; OSs existentes com run única de tipo
`custom`/`technical_evidence` são auto-linkadas hoje e deixariam de ser — violação direta do mandato
desta fatia ("o comportamento de quem usa o sistema hoje NÃO pode mudar"). A opção (B) é desqualificada
pela própria carta do bloco. (3) **Fail-silent em cadeia jurídica** — o vínculo manual como rede exige
que um humano PERCEBA a ausência; ninguém audita aba vazia antes do litígio, quando já é tarde.

**Ataque à (C):** herda os tiros 1 e 2 da (B). O log só converte fail-silent em fail-logged — o leitor
jurídico abre o dossiê, não o log. E custa código novo + superfície de auditoria nova numa fatia que se
declarou puramente defensiva. "(C) é a (B) com remorso."

**Ataque à (A)** (auto-crítica do próprio voto): a acusação é ruído — vistoria irrelevante dentro de
prova jurídica. É o ataque mais fraco dos três: o vínculo é NAVEGACIONAL (fora da cadeia de hash), o
conteúdo é registro do estado do MESMO veículo na MESMA OS que gerou a custódia, e advogado adverso ganha
pouco com "vocês documentaram demais" — ganha o caso com **"cadê a vistoria que prova o estado?"**. Com o
FALLBACK do #345, o cenário futuro é coleta+entrega (ambas relevantes por fase) OU 1 genérica que É a
vistoria — o carona verdadeiramente irrelevante é caso raro e ainda assim é evidência do mesmo evento. O
medo da pendência ("ninguém decidiu isso") se fecha DECIDINDO com voto registrado, não necessariamente
filtrando.

**Assimetria de custo de erro**, nas palavras dele: errar em (A) = link extra navegável num dossiê;
remédio aditivo e reversível (filtro futuro pela fase real quando a run ganhar proveniência na PR-04c, ou
curadoria/unlink). Errar em (B)/(C) = dossiê sem a prova do estado na coleta; a organização não rebate
alegação de dano pré-existente; e não se sabe quais processos litigaram com dossiê incompleto no
intervalo. Além disso, (B)/(C) cravariam `template.type` como **proxy de fase** num caminho legal — proxy
que a própria PR-04c torna obsoleto ao dar fase à run. **Filtrar HOJE é construir no eixo errado, às
vésperas do eixo certo existir.** Quando a PR-04c der proveniência de fase à run, a junta pode revisitar
com o eixo correto — decisão aditiva, não retroativa.

---

## O EMPATE — 1×1×1

| Agente | Voto |
|---|---|
| `coordenador-de-acessos` | **C** |
| `agente-dba-guardiao` | **B** |
| `critico-adversarial` | **A** |

Três óticas, três opções, nenhuma maioria. Os três votos **concordam nos fatos** (varredura sem filtro;
rota manual viva; **inexistência de unlink**; ~1 run por OS hoje; multiplicação vindo com a PR-04b) e
divergem na **hierarquia dos riscos**: C prioriza audiência não consentida + reversibilidade; B prioriza
integridade do dossiê + higiene da tx idempotente; A prioriza completude da prova jurídica + o mandato da
fatia. Empate desfeito por voto do `validador-mestre`, conforme a composição desta junta.

---

## Desempate — `validador-mestre` vota **A**

O desempate não foi por preferência: o `validador-mestre` foi ao código verificar as duas afirmações
factuais de que dependia o ataque do `critico-adversarial` à (B)/(C). **As duas se confirmaram:**

1. **Nada acopla `role` a `checklist_templates.type`.** Na migração
   `prisma/migrations/20260864000000_add_checklist_applicability_rules/migration.sql`, o CHECK de fase é
   `"role" IN ('collection', 'delivery', 'generic')` e **nenhuma cláusula referencia o tipo do template**;
   no módulo de aplicabilidade (`checklist-applicability.*`), nenhuma regra liga a fase ao
   `type` do modelo. Uma regra `role=collection` apontando para um template `custom` é legal por
   construção — ou seja, **o tipo do modelo é mesmo o eixo errado para inferir fase**.
2. **`work_orders.checklist_id` e `checklist.validator.ts` não restringem tipo.** O campo aceita
   qualquer template, e `parseCreateChecklistRunDto` valida `checklistId` como string livre (sem `where`
   de tipo). Logo, **OSs de hoje podem ter run única `custom`/`technical_evidence` auto-linkada** — e sob
   (B)/(C) essa run **deixaria** de entrar no dossiê: mudança de comportamento observável em dado
   existente.

**Por que a violação de mandato é DESQUALIFICADORA, e não algo que a junta pudesse "declarar e
aceitar":** o mandato desta fatia — "o comportamento de quem usa o sistema hoje NÃO pode mudar" — não é
uma preferência da junta; é a **carta do bloco**, restrição dada À junta de fora (nível bloco/dono). O
fato 2 prova que (B) e (C) violam essa carta. Uma junta pode pesar mérito **dentro** do espaço que o
mandato permite; não pode votar para fora dele — isso seria a junta redefinir o próprio bloco que a
convocou. Portanto (B) e (C) estão **fora do espaço de decisão desta fatia**, independentemente do mérito
de seus argumentos (que seguem registrados acima e alimentam as pendências abaixo). O único voto de
desempate possível que respeita a carta é **A**. O fato 1 acrescenta que, mesmo sem a carta, (B)/(C)
construiriam no eixo errado às vésperas de o eixo certo existir (proveniência de fase na run, PR-04c).

---

## Resultado — **2×1×1 pela A**

| Agente | Voto |
|---|---|
| `coordenador-de-acessos` | C |
| `agente-dba-guardiao` | B |
| `critico-adversarial` | **A** |
| `validador-mestre` (desempate) | **A** |

**O AUTO-link continua varrendo TODAS as vistorias da OS, sem filtro.** Nenhuma linha de lógica muda; o
comentário de `autoLinkChecklistRuns` (`src/modules/impound/impound-prisma.repository.ts`) passa a
carregar a referência a esta junta — a varredura sem filtro deixou de ser omissão e virou decisão.

---

## O que os votos vencidos deixam — duas pendências novas (§A2: nada se consolida em silêncio)

Os argumentos de B e C **não foram refutados em bloco** — foram vencidos pelo mandato e pelo eixo. O que
neles é verdadeiro vira pendência com dono, para não evaporar:

1. **`P-CHK-AUTOLINK-FASE-REAL`** — a preocupação legítima de B e C (ruído no dossiê) tem um eixo certo
   para ser tratada: **a fase real da run**, que ainda não existe como dado. Quando a run ganhar
   proveniência de fase (PR-04c), a junta **revisita o filtro do AUTO-link pelo eixo certo** — e o
   compromisso registrado é que qualquer filtro futuro é **ADITIVO, NUNCA RETROATIVO**: vale para
   vínculos novos; nenhum vínculo já criado é removido do dossiê.
2. **`P-IMPOUND-LINK-SEM-UNLINK`** — o fato comum aos três votos que mais pesou contra a (A): o vínculo
   é **porta de mão única** (não existe unlink; verificado três vezes de forma independente). O remédio
   futuro é **marcação aditiva** (curadoria/anotação sobre o vínculo, com autor e data), **não
   exclusão** — dossiê jurídico não perde história.

---

## Rastreabilidade

- **Pendência fechada:** `P-CHK-CUSTODIA-AUTOLINK-SEM-FILTRO` → **DECIDIDA (junta 2×1×1: varredura
  mantida — SEM filtro)**. Registro honesto: a pendência **não** foi "resolvida com filtro"; a decisão
  foi manter a varredura.
- **Pendências criadas por esta junta:** `P-CHK-AUTOLINK-FASE-REAL` · `P-IMPOUND-LINK-SEM-UNLINK`
  (ambas em `controle/pendencias.md`, com o compromisso "aditivo, nunca retroativo").
- **Código:** somente o comentário de `autoLinkChecklistRuns` em
  `src/modules/impound/impound-prisma.repository.ts` referencia esta ata; **zero linha de lógica**
  alterada por esta decisão.
- **Antecedentes:** achado A3 e pendência em `J-CHK-P1-PR04-aplicabilidade.md`; rota manual de vínculo
  decidida na junta Ω-VID PR-04; trade-off de atomicidade do AUTO-link decidido na junta Ω-VID PR-05.
- **Votos originais:** transcritos na íntegra nesta ata (a fonte efêmera `C:\tmp\voto-{1,2,3}.md` não é
  versionada — a ata é o registro permanente).
