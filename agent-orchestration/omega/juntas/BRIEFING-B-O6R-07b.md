# BRIEFING DA JUNTA — B-O6R-07b (`fix/o6r07b-uploads`)

> Escrito pelo orquestrador em 2026-09-06, para fechar o achado **S1** do
> `inspetor-de-terreno-da-junta` (passada 1, `BLOQUEADO`). **Nada aqui é insumo de mérito**: o mérito está
> no plano e nos pareceres. Este documento diz **quem julga, com o quê, em que tabuleiro, e o que não pode
> ser herdado como fato**.

## §0 · Âncoras — confira, não herde

| Item | Valor |
|---|---|
| Head do bloco | **`3fa616f7`** (branch `fix/o6r07b-uploads`) |
| Base | `origin/main` = **`e55245a`** |
| Head de CÓDIGO julgado | **`a2988b5`** — os commits posteriores são registro (parecer do inspetor, este briefing) |
| Achado que o bloco fecha | **`Ω6R-SEC-004`** (P1) — como **`parcialmente_superado`**, não `fechado` |

Cadeia, do mais antigo: `03f136e` plano · `221843c` parecer do crítico r1 · `2b9003a` emenda E1 ·
`5a8d8c1` crítico r2 · `b18fc20` gate/sniff/scanner/marca · `835dbbb` egresso · `126b717` aceites + T9 ·
`a2988b5` PDs/contrato/pendências/KPI · `3fa616f7` parecer do inspetor.

## §1 · Insumos — todos no head, nenhum em disco solto

| Insumo | Caminho | Nota |
|---|---|---|
| **Plano + EMENDA E1** | `agent-orchestration/omega/planos/B-O6R-07b-plano.md` | 1054 linhas. **A E1 (l.770-1054) MANDA onde diverge do corpo** — ela existe porque o crítico derrubou 8 pontos |
| **Parecer do crítico (2 rodadas)** | `.../votos/B-O6R-07b/01-critico-adversarial.md` | 558 linhas. Veredito **PLANO ROBUSTO**. Contém as mutações exatas |
| **Parecer do inspetor** | `.../votos/B-O6R-07b/00-inspetor-terreno.md` | passada 1, `BLOQUEADO` por S1–S6 |
| **PDs** | `docs/omega-pd.md` | `MAGIC-BYTES` (11 fontes) · `DISPOSITION` (13 fontes) |
| Plano-mãe | `agent-orchestration/omega/planos/B-O6R-07-plano.md` | contexto; onde conflitar, vale o do 07b |

**Aviso de dado podre, já removido:** havia uma cópia solta e **desatualizada** do plano na árvore
principal (509 linhas, sem a E1). Foi retirada do caminho canônico em 2026-09-06 e preservada no
scratchpad da sessão. **Se você encontrar plano do 07b fora da branch do bloco, não é o plano.**

## §2 · Composição, quórum e inelegibilidade

**Quórum: UNANIMIDADE DE 3** (§C7.1-ter(b) — o núcleo do diff é **segurança**). **Não é 5/5**: essa regra
vale só para produção, dependência nova e serviço externo pago, e o bloco não tem nenhuma das três.
**O voto de um jurado sozinho reprova.** Teto: **2 ciclos** (`D-TETO-DOIS-CICLOS`).

| Cadeira | Agente | Veto |
|---|---|---|
| **C1 · segurança de conteúdo** | `agente-secops` (obrigatório em PR de superfície de segurança) | sim |
| **C2 · contrato mobile B-108** | `jurado-07b-contrato-mobile-b108` | sim |
| **C3 · contrato / regressão / registro** | `jurado-07b-contrato-regressao-registro` | sim |

**Plano de perda de jurado (fecha S3):** cada cadeira tem suplente nomeado —
`jurado-07b-suplente-contrato-mobile-b108` e `jurado-07b-suplente-contrato-regressao-registro`. O suplente
**não herda medição nenhuma** do titular nem das atas: **re-executa o briefing inteiro**. **Voto perdido
nunca conta como aprovação.** Para a C1, se `agente-secops` cair, a junta **para** e o orquestrador
registra — não há suplente de secops, e a cadeira é obrigatória.

**INELEGÍVEIS, por nome (§C7.4-bis — quem acha não conserta, quem planeja não desenvolve, quem faz não
julga):**

- `planejador-mestre` — escreveu o plano **e** a emenda E1;
- `critico-adversarial` — atacou o plano em 2 rodadas (achou os 8);
- o **dev** (`general-purpose`) — os 4 commits de código;
- `porteiro-pos-merge` — julgou #378/#379 e **autorizou o start**; é o gate do PRÓXIMO merge;
- `inspetor-de-terreno-da-junta` — libera o tabuleiro, **não vota**.

## §3 · Isolamento por jurado (fecha S1/1.2) — vinculante

1. **Worktree PRÓPRIO para cada jurado que mutar** qualquer coisa. Criação a partir de `origin/main` ou do
   head do bloco, conforme o que a cadeira precise medir.
2. **`npm ci` PRÓPRIO em cada worktree. Junction/symlink de `node_modules` é PROIBIDA** (§C7.1-ter(c)) — em
   26/08 a remoção de um worktree apagou o `node_modules` do dev por dentro de uma junction.
3. **Cluster Postgres descartável PRÓPRIO por jurado.** A base viva **`erp-postgres`/`erp-redis` não é alvo
   de ninguém, nem para leitura.**
4. Remoção só por `git worktree remove --force`. No Windows, se falhar com "Filename too long":
   `[System.IO.Directory]::Delete("\\?\<path>", $true)`.
5. **Não tocar** em `demo/investidor` (árvore principal), `.claude/worktrees/gov-descuido`,
   `.claude/worktrees/san2-r`, `.claude/worktrees/status-read`. Resíduo alheio **se reporta, não se varre**.
6. A suíte grava em `storage/checklist-attachments/<uuid>/` **no worktree onde roda** (achado do inspetor) —
   limpe o seu ao final.

## §4 · Baseline — medido por TERCEIRO, não pelo dev

O `inspetor-de-terreno-da-junta` reexecutou em worktree próprio, `npm ci` próprio e cluster descartável
dele, na forma do §8 do plano:

| | arquivos | testes | pass | fail | skip | ec |
|---|--:|--:|--:|--:|--:|--:|
| **head `a2988b5`** | 275 | **2938** | 2936 | 0 | 2 | 0 |
| **base `e55245a`** | — | **2817** | 2815 | 0 | 2 | 0 |

**Δ = +121**, decomposto por arquivo: `content-sniff` 19 · `upload-gate` 21 · `scanner-failclosed` 13 ·
`mime-sniff-routes` 36 · `download-hardened` 23 · `census` 8 (= 120) + `owner-portal-photos` 17→18 (T9).
**Piso do §6/E1·8 era ≥89; entregues 121.** Os **2 skips** são só `permission-catalog-db-parity` ×2.

**Três fontes independentes no mesmo baseline** (2817/2815): o dev, o inspetor e o KPI publicado na `main`
pelo #371 (medido lá em N=10, denominador idêntico nas dez). **Ainda assim, meça o seu** se o seu voto
depender do número.

## §5 · O que NÃO se herda como fato (§C7.1-bis/4)

- **Nada da ata do 07a** vale aqui como medido. O 07a foi reprovado uma vez por **censo incompleto**
  (2 routers, décima via no `POST /api/v1/mobile/sync/work-order-actions`) — a mesma classe voltou neste
  bloco como **M5**, achada pelo crítico depois de o planejador ter publicado o censo como completo.
- **O corpo do plano (l.1-766) foi emendado.** Onde o corpo e a E1 divergirem, **vale a E1**. Em especial:
  o piso é **≥89** (a frase-ponte que fala em 65 está errada — o crítico mediu: some 32+20+7+24+6);
  `M-D3` não existe, é `D6`.
- **As afirmações do §2 do plano-mãe foram medidas em `53e44d3` (2026-09-01)** — **suspeitas** até
  reconferidas neste head.

## §6 · O que este briefing EXPÕE de propósito

O inspetor exigiu que a junta **visse de frente**, em vez de descobrir:

1. **O censo C6 ficou VERDE na mutação M-B3.** O cast usado (`as unknown as typeof verification`) não casa
   o texto que o guard procura. **O dev NÃO apertou o guard** para caçar aquela grafia — chamou de teatro,
   e a E1·3 já declarava que **C6 é higiene, não prova**. Julguem se a decisão está certa; ela está
   declarada, não escondida.
2. **A partir do merge, produção E staging recusam TODO upload com 503**, e o **smoke de deploy não faz
   upload** — logo **o CI fica verde e a pane só aparece para quem usa**. Duas pendências nomeiam:
   `P-O6R-B07B-SCANNER-AV-REAL` (ALTA) e `P-O6R-B07B-STAGING-SEM-UPLOAD`. **É decisão do dono, não da
   junta** — a junta a consigna em ata **como decisão vista**.
3. **`Ω6R-SEC-004` fecha como `parcialmente_superado`.** O `noop` segue default em dev/test **por
   desenho**; antivírus real é junta-5, fora deste bloco. Consequência que o guard impõe:
   `tests/kpi-achados-paridade.test.ts` só conta `status === "fechado"`, então o achado **não entra em
   `aguardando_merge` e não move `p1_fechados`**. O crítico julgou isso **honestidade com prova de
   mecanismo** — "esquiva não paga preço" — e deixou nomeada a única porta para desfazê-lo: promover a
   `fechado` no backfill sem o AV, porque o guard exige hash de merge e **não** exige AV. **Isto fica na
   ata.**
4. **Seis divergências do plano, declaradas pelo dev** (§ do relatório dele), entre elas: o aceite A11 saiu
   da rota para o gate porque **passava pelo motivo errado** (a allowlist congela no 1º import — quem
   recusava era o parser, e o gate nem era alcançado). Verde-cego pego pelo próprio dev.

## §7 · Mandato por cadeira (≤3 itens — P4)

**C1 · `agente-secops`:** (1) ataca o **GATE** e a **MARCA** — cast, reuso, parser novo, ordem dos gates
(A8–A10, M-B1…M-B6, censo); (2) ataca o **SNIFF** — poliglotas, truncados, PDF com lixo, WebP
`VP8L`/`VP8X`, SVG por env (M-B8); (3) ataca o **EGRESSO** — D1–D6, header injection no `filename`, e que
**E5 continua intocado** em `src/`.

**C2 · `jurado-07b-contrato-mobile-b108`:** (1) tabela do §7 confrontada com o **Dart lido**, não herdada, e
o invariante do B-108 — **o blob local só é apagado em `status=stored`**; procure caminho que apague
evidência; (2) `mobile-backend-contracts` com fixtures novos, **corpo 201 inalterado**, idempotência de V1;
(3) fail-closed por ambiente (M-B7) e o **503 consignado em ata como decisão vista**.

**C3 · `jurado-07b-contrato-regressao-registro`:** (1) **escopo §5 arquivo a arquivo**, inclusive os
congelados (`prisma`, `mobile`, `frontend`, `.github`, `scripts`, `src/modules/{impound,owner-portal,auth}`)
— **fixture é troca de bytes; asserção nova é caso novo**; (2) **KPI com N, forma, Δ por arquivo**, cópia
`FROZEN` do `app.js`, `aguardando_merge` coerente com o `parcialmente_superado`; (3) `API_CONTRACTS.md` ×
diff, pendências bem-formadas, `achados.jsonl` + `REGISTRO_ACHADOS_O6R.md` coerentes com o guard.

## §8 · Forma do voto

Cada voto declara **`gravidade`** E **`escopo`** (`dentro-do-bloco` | `pre-existente`), este último **com
evidência de data ou origem** (`D-JUNTA-ESCOPO-E-CALIBRACAO`). **Escopo declarado sem evidência é tratado
como `dentro-do-bloco`.** O veto **não alcança** achado `pre-existente` — ele vira **pendência nomeada com
bloco dono**, e o número afetado é publicado com **N, forma e causa**.

**"Não consigo medir" = REPROVADO** naquele item. **Nenhum jurado propõe correção** (§C7.4-bis): devolve
achado + evidência **executada** + motivo.

## §9 · Armadilhas de medição — 7 medidas nesta rodada

1. ` M` **fantasma** por autocrlf em arquivo byte-idêntico → confirme com `git diff` / `git hash-object`.
2. `ec` depois de pipe para `tail` é o **ec do `tail`**.
3. Absorção prova-se com **`rev^{tree}`**; `is-ancestor` **mente sob squash** (diz "não-ancestral" para
   toda branch squash-mergeada).
4. `git log -S` na `main` **não data** nada ocorrido **dentro** de uma branch squashada.
5. Para saber o que um gerador conta, **rode o gerador** — varredura própria dá outro número.
6. Prova por **presença**, nunca por ausência de grep (o real pode não conter a string).
7. Heredoc **> ~7,5 KB estoura o arnês** — escreva em pedaços ≤5,5 KB e confira a cada pedaço.

**E o corolário que custou seis over-claims nesta rodada:** quando um validador rígido acusa algo, a
leitura tentadora é "o validador exagera". Nas três formas de status quebrado desta rodada, **a rigidez era
a defesa** e o errado era a escrita.
