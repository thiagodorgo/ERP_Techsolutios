# ATA DA JUNTA — B-O6R-07b (`fix/o6r07b-uploads`)

**Data:** 2026-09-06 · **Veredito: APROVADO 3×0 (unanimidade de 3)** · **Ciclo 1** (teto: 2, `D-TETO-DOIS-CICLOS`)

| | |
|---|---|
| **Head de CÓDIGO julgado** | **`a2988b5`** — provado por diff vazio de `src`/`tests`/`prisma`/`frontend`/`mobile`/`.github`/`scripts`/`Kpis`/`docs`/`API_CONTRACTS.md` contra os commits de registro posteriores |
| Head de registro ao votar | `91b8cdf1` → `4a24a074` (moveu durante a medição da C3; ela re-mediu e o head de código não mudou) |
| Base | `origin/main` = `e55245a` |
| Achado que fecha | **`Ω6R-SEC-004`** — como **`parcialmente_superado`**, não `fechado` |
| Quórum | **Unanimidade de 3** (§C7.1-ter(b): o núcleo do diff é **segurança**). Não é 5/5 — zero dependência nova, zero serviço externo, zero deploy |

## §1 · Separação de papéis (§C7.4-bis) — quem ocupou cada papel

| Papel | Quem | Elegível para votar? |
|---|---|---|
| **Quem achou** | auditoria Ω6R (`SEC-004`) + `critico-adversarial` (2 rodadas, 8 achados) | **não** |
| **Quem planejou** | `planejador-mestre` (plano + `EMENDA E1`) | **não** |
| **Quem desenvolveu** | dev `general-purpose` (4 commits de código) | **não** |
| **Quem liberou o tabuleiro** | `inspetor-de-terreno-da-junta` (2 passadas) | **não vota** |
| **C1 · segurança de conteúdo** | `agente-secops` | **APROVADO** |
| **C2 · contrato mobile B-108** | `jurado-07b-contrato-mobile-b108` (identidade nova) | **APROVADO** |
| **C3 · contrato/regressão/registro** | `jurado-07b-contrato-regressao-registro` (identidade nova) | **APROVADO** |

Inelegibilidade conferida **por nome** pelo inspetor (`git log --all -S<nome> --reverse`): os três nomes de
jurado aparecem pela primeira vez em `345ef4e0`/`37a2c465`; zero arquivos em `e55245a`; nenhum de
planejador/crítico/dev/porteiro/inspetor no roster.

## §2 · O caminho até aqui — e onde cada etapa mordeu

1. **Plano** (`03f136e`). Reenumerou as vias e achou o que o plano-mãe não tinha: **V4 e V5 não tinham
   scanner nenhum** — nem o `Noop`. Provado por **presença**: `.scan(` sobre `EvidenceScanner` existe em
   exatamente **3** sítios em todo o `src/`.
2. **Crítico, rodada 1** (`221843c`). **8 achados**, 4 bloqueando o start. Dois eram **aceites que passavam
   VERDES com o defeito presente** — a classe que esta rodada existe para não deixar passar:
   - **A4:** a marca de verificação era burlável por `{ ...marca, sha256: sha(hostil), sizeBytes: … }` —
     *spread copia propriedade de chave `Symbol`*. Provado **executando**.
   - **A5:** o gate de boot da allowlist cobria 1 dos 2 nomes de env.
   - **A1:** o censo de metadado estava incompleto — existia uma **M5**. Terceira aparição de censo
     incompleto no mesmo bloco (07a: 10ª via; plano: M5; código: M1).
   - **A2:** a mitigação declarada era **vazia por premissa falsa** — a exposição real era o `E5`, que o §5
     declara intocável.
3. **Emenda E1** (`2b9003a`, +288/−0, corpo original byte-idêntico). A causa do A4 era identidade **por
   conteúdo**; trocada por identidade **por instância** (`WeakMap` privado, objeto opaco congelado). Matou a
   **classe**, não a instância.
4. **Crítico, rodada 2** (`5a8d8c1`). **PLANO ROBUSTO.** Replicou o desenho novo e rodou o próprio ataque
   **mais cinco irmãos** — spread, `Object.assign`, `Object.create`, `structuredClone`, JSON, `Proxy`: **os
   seis recusados**. Vermelho-controle real: com `M-B9` (volta a identidade por conteúdo) o spread **aceita
   bytes hostis de novo**. Procurou um sétimo atalho e não achou.
5. **Implementação** (`b18fc20`→`a2988b5`, 4 commits).
6. **Inspetor** (`3fa616f7`, `f7b8799f`). Passada 1 **BLOQUEADO** por S1–S6 (terreno documental, não código);
   passada 2 **LIBERADO** após briefing, cadeiras, suplentes e a retirada da cópia podre do plano.

## §3 · Os votos

**C1 · `agente-secops` — APROVADO.** 4 achados; nenhum atinge o veto do contrato secops (sem segredo, sem
gate afrouxado, sem CORS/TLS, sem PII ou `path` em resposta — `storageKey` **não** é ecoado no DTO, medido).

- **F3.1 · ALTA · escopo MISTO** — existe um **terceiro** membro da classe "linha `stored` com chave do
  cliente": o **M1**, ramo JSON de anexo de checklist. Provado por execução **com vermelho-controle do
  mecanismo**: tenant B sobe PNG; tenant A cria anexo JSON apontando para a chave de B; **guard ligado →
  404**, **guard removido → 200 com os 12 bytes de B**. Defeito `pre-existente` (`bfc5c7f7`, `2530850a`,
  2026-06-07); **censo/registro `dentro-do-bloco`**.
- F3.2 · MÉDIA · os guards de E2/E3/E4 são falsificados por **texto** (C7), enquanto a E1·10 prometia
  "guard removido → 200 com bytes de B" nos 4 resolvers. Divergência não declarada pelo dev. **Código
  correto**: 4/4 resolvers recusam por execução.
- F3.3 · BAIXA · `buildContentDisposition` — teto de 100 furado quando a extensão excede 100; lone surrogate
  → `URIError` → `response.destroy()` (**fail-closed**).
- F1.1 · BAIXA.

**C2 · `jurado-07b-contrato-mobile-b108` — APROVADO.** 12 execuções; 3 achados (2 `ajuste`, 1 `nota`);
8 pendências aceitas como bem-formadas; teardown confirmado.

- **`ajuste`** — foto de galeria PNG/GIF declarada `image/jpeg` vira **415 permanente** no app.
  `pre-existente` (`e79616aa`, 2026-06-13) e **não nomeado** na pendência mobile.
- `ajuste` — o guard `M-B7.1` fica **13/13 verde** sob a mutação do default de produção.
- `nota` — a ata e o PR devem reproduzir os **6 itens** do efeito 503.

**C3 · `jurado-07b-contrato-regressao-registro` — APROVADO.** 0 `bloqueia`, 2 `ajuste`, 2 `nota`.

- **A1 · `ajuste`** — `pendencias-indice.md` (+109/−97 contra `origin/main`) **não consta da lista fechada do
  §5** (`grep` no plano volta vazio). Classificado `ajuste` e não `bloqueia` porque é o **placar derivado** do
  único arquivo de `controle/` que a §5 autoriza. **Parte dele é do orquestrador**, que regenerou o índice ao
  fechar as duas pendências de decisão do dono (`4a24a074`).
- **O susto que NÃO se confirmou:** `pendencias.md` medido contra a base certa é **`263 0`** — **zero
  deleções**, §A2 intacto. Entre commits da branch aparece `37 4` porque as 2 linhas reescritas foram
  **acrescentadas pelo próprio bloco** em `a2988b5`.

### §3.1 · Divergência preservada (§A2) — C1 × C3 sobre o M1

As duas cadeiras mediram o M1 **de forma independente e chegaram a enquadramentos diferentes do registro**:

| | C1 | C3 |
|---|---|---|
| O critério "3 sítios de `attachment.create(` → 1" alcança o M1? | **não alcança, e deveria** → quem fechar M2+M5 declara a classe resolvida com um membro aberto | **não alcança, e não precisa** — `attachment.create(` são exatamente 3 sítios (os que a pendência lista); o M1 é `checklistAttachment.create(` (`checklist-prisma.repository.ts:844`), **outro modelo, sem coluna `status`** |
| A classe fecha pela metade? | sim | **não** — a classe enunciada é outra |

**Convergem no defeito material, e ele existe:** a pendência `P-O6R-B07B-CHECKLIST-JSON-FILEURL` e o §2.3 do
plano afirmam *"cria anexo **sem `storageKey`** → download 404"*, e a execução **não sustenta** —
`parseCreateChecklistAttachmentDto` aceita `metadata` arbitrário, o repositório grava `metadata: data.metadata`
sem campo do servidor, e `resolveChecklistAttachmentDownload` **lê `metadata.storageKey`**. Ambas datam o
defeito de forma independente em **2026-06-07**. **A metade cross-tenant este bloco fechou**, no mesmo
resolver. **Nenhuma promessa do bloco é excedida.**

**A divergência fica registrada, não consolidada.** Duas cadeiras, dois caminhos, o mesmo achado material —
é o desenho da junta funcionando, não um empate a resolver.

## §4 · Números — três fontes independentes

| Fonte | head | base `e55245a` | Δ |
|---|---|---|---|
| dev | 2938 · 2936 pass · 0 fail · 2 skip | 2817 · 2815 | +121 |
| **inspetor** (cluster próprio) | idem | idem | +121 |
| **C3** (cluster próprio `c3-o6r07b-pg`) | idem, ec=0, 2 skips nomeados no TAP | — | **+121 decomposto por execução dela** |

Decomposição: `content-sniff` 19 · `upload-gate` 21 · `scanner-failclosed` 13 · `mime-sniff-routes` 36 ·
`download-hardened` 23 · `census` 8 (=120) + `owner-portal-photos` 17→18 (T9). **`comm -13` vazio nos 5
arquivos editados: nenhum caso antigo sumiu.** Piso do §6/E1·8 era **≥89**; entregues **121**. A diferença
`grep` 99 × execução 120 é toda de `mime-sniff-routes` (4 laços `for-of` parametrizam casos) — **direção
segura**. Os 2 skips são só `permission-catalog-db-parity` ×2.

`kpi-achados-paridade` **6/6** com `parcialmente_superado` + `aguardando_merge` vazio + `p1_fechados` 2.
Contrato **56 min posterior** ao último commit de teste — ordem provada, **contrato nunca à frente do drill**.
`sync-agent-agents --check` **ec=0**.

## §5 · Decisões VISTAS pela junta (consignadas, não decididas por ela)

1. **`Ω6R-SEC-004` fecha como `parcialmente_superado`, não `fechado`.** O `noop` segue default em dev/test
   **por desenho**; antivírus real é junta-5, fora deste bloco. **O bloco paga preço visível:**
   `tests/kpi-achados-paridade.test.ts` só conta `status === "fechado"`, logo o achado **não** entra em
   `aguardando_merge` e **não** move `p1_fechados`. Nas palavras do crítico: *"esquiva não paga preço"*.
   **A única porta para desfazer isto** — e fica escrita aqui de propósito: promover o achado a `fechado` no
   backfill **sem o AV**, porque o guard exige hash de merge e **não** exige AV.
2. **O censo C6 ficou VERDE na mutação M-B3** e o dev **não apertou o guard** — apertá-lo para caçar aquela
   grafia seria teatro. A E1·3 já declarava que **C6 é higiene, não prova**.
3. **Fail-closed = 503 em todo upload de produção e staging**, e o smoke de deploy **não faz upload** — CI
   verde, pane só para quem usa. **Decisão do dono, tomada em 2026-09-06: caminho (a), mergear normalmente.**
   **E o risco é menor do que as pendências diziam:** `deploy-staging.yml` tem
   `if: vars.STAGING_DEPLOY_ENABLED == 'true'`, a variável **não existe** (`gh variable list` vazio, `ec=0`) e
   os **últimos 5 runs estão `skipped`**. A pane é **latente**, não iminente; o gatilho é habilitar a
   variável, e está nomeado em `P-O6R-B07B-STAGING-SEM-UPLOAD` (FECHADA por esta decisão).
4. **Fila:** o bloco é 1 P1 com 6 P0 abertos, violando *"P0 precede P1"*. **Decisão do dono:** terminar o 07b
   (custo afundado), com a violação **registrada e aceita para este bloco, não normalizada**; e
   **`B-O6R-06` é o próximo**, não o `B-O6R-04`. `P-GOV-FILA-P1-ANTES-DE-P0` FECHADA por essa decisão.
5. **Seis divergências do plano, declaradas pelo dev** — entre elas o aceite **A11 movido da rota para o
   gate porque passava pelo motivo errado** (a allowlist congela no 1º import; quem recusava era o parser e o
   gate nem era alcançado). Verde-cego pego pelo próprio dev.

## §6 · Quedas (P6) — e a primeira prova de que o P2 zera o redo

**4 quedas, todas `rate_limit` (teto de sessão), zero `server_error` de streaming** — classe **diferente** das
14 do postmortem de 29/08. Registro em `votos/B-O6R-07b/00-quedas.md`.

**A queda #3 é o registro mais útil desta junta.** A C1 morreu **na cauda** e o **voto sobreviveu**, porque o
**P2** manda gravá-lo **antes** da mensagem final: evidência às 14:24, voto às 14:25, morte depois. Custo do
redo **~0** numa cadeira **com veto** — sem o P2, o julgamento inteiro seria refeito. **É a primeira evidência
medida nesta casa de que o P2 converte perda TOTAL em perda NULA**, e não apenas em parcial. O **P1** completou:
100 linhas de comando→saída→veredito parcial, auditáveis sem o agente.

**Modelo × queda:** 2 sob `claude-opus-5`, 2 sob `claude-fable-5-1`, gatilho idêntico nas quatro. **Nada
sustenta "pinar modelo reduz queda"; sustenta que cota é ortogonal a modelo.**

## §7 · Perguntas obrigatórias do §C7.4-bis

- **(a) A composição cobre a competência que os achados exigem?** Sim. C1 (segurança de conteúdo) achou o M1
  com vermelho-controle de mecanismo; C2 (contrato mobile) leu o Dart e não herdou a tabela; C3
  (regressão/registro) reexecutou a suíte e o guard de KPI em cluster próprio.
- **(b) Quem achou é quem consertou?** **Não.** Crítico achou → planejador emendou → dev implementou →
  jurados julgaram. Quatro papéis, quatro agentes, nenhum sobreposto.
- **(c) O planejador usou dado podre?** **Usou, e foi pego:** o §2 do plano-mãe fora medido em `53e44d3`
  (01/09) e a `main` já era outra; a E1 re-mediu. Havia ainda uma **cópia solta do plano com 509 linhas, sem
  a E1**, na árvore principal — retirada do caminho canônico antes da junta (achado **S5** do inspetor), e os
  corpos dos jurados mandam conferir `wc -l ≈ 1054` e `grep -c 'EMENDA E1' > 0` **antes de citar**.

## §8 · Consequência

**Verde da junta = merge autorizado** (§C7.1). Após o merge: limpeza §C5, **`porteiro-pos-merge`** (§C2.8),
backfill de `pr`/`merge_commit`/`approved_head`, e **`B-O6R-06` como próximo bloco**, por decisão do dono.

**Ajustes que seguem para o pós-merge, nenhum bloqueante:** o `pendencias-indice.md` fora da lista do §5
(A1 da C3), a divergência de falsificação por texto dos guards E2/E3/E4 (F3.2 da C1), o 415 permanente da
galeria no app (C2, `pre-existente`), e os 4 corpos de jurado **untracked na árvore principal** (R3 do
inspetor) — a reconciliar.
