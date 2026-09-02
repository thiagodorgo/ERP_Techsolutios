# J-SAN2-5 — ata da junta do bloco SAN2-5 (PR #367)

> **Quórum: MAIORIA de 3** (§8 do plano — o bloco **não toca produto**; diff de código **0 bytes**).
> **Head julgado:** `5256b49` · **Terreno:** `LIBERADO COM RESSALVA` (R1 briefing + suplentes + worktree
> próprio para quem muta · R2 merge só com CI 7/7 · R3 E2c aberto).

## Votos

| Cadeira | Veredito | Achados |
|---|---|---|
| **C1 — `auditor-da-composicao-e-dos-corpos`** | **APROVADO** | 2 · nota e ajuste |
| **C2 — `provador-do-apenso-e-do-escopo`** | **APROVADO** | 2 · BAIXA / `dentro-do-bloco` |
| **C3 — `auditor-do-registro-e-do-kpi`** | **APROVADO** | 4 · 2 MÉDIA + 2 BAIXA |

**RESULTADO: APROVADO 3×0.** Quórum exigia maioria; saiu unânime. **Nenhum achado `bloqueia`.**

## O que o bloco existe para impedir

Uma revisão adversarial de prontidão **reprovou o start do ciclo 5** e corrigiu uma premissa do
**orquestrador**, repetida várias vezes ao dono: **o `B-O6R-02` tem UMA tentativa, não duas**
(`D-TETO-DOIS-CICLOS`, l.1790-1791 — *"o ciclo 5 já é a última tentativa (…) Se reprovar, para"*).
Os quatro bloqueios fechados aqui custariam essa tentativa: a junta do ciclo 5 **não abriria** (sem
composição), o corpo do jurado reservado **violava o contrato**, dois documentos mergeados se
**contradiziam**, e o §7 do plano **reprovaria o próprio bloco** (âncoras obsoletas).

## O que cada cadeira mediu por conta própria

**C1** conferiu os 8 corpos nas **três pernas** — disco × tabela E1.8 × **blob do head** — depois de a
fábrica ter reescrito um suplente **entre duas conferências** durante a execução. Verificou as **16/16**
ocorrências de `5/5` uma a uma (todas revogação), `escopo` em **6/6 votantes**, e foi conferir os cortes
**no commit mergeado `f081b5d` (#359)**, não na afirmação do bloco.

**C2** provou o append-only na forma mais forte disponível: **o prefixo de 341 linhas do head hasheia para o
mesmo OID de blob** (`a191381…`) que o arquivo inteiro da `main` — identidade de objeto, não semelhança de
diff. Validou o detector **mutando 1 byte**. E provou o diff-zero **mutando as seis pernas** (`src/app.ts`,
um teste, `schema.prisma`, `ci.yml` e os dois contratos): o comando foi de `ec=0`/0 bytes para
`ec=1`/2.773 bytes/6 arquivos e voltou a zero no restauro.
**Provou também a exaustividade que o bloco não provou:** das 10 ocorrências de `ci.yml` nas 341 linhas,
**só 3 são prescritivas** — não existe um quarto lugar contraditório.
**"Preparo que invade o ciclo 5: procurado, não encontrado"** — e reproduziu o merge simulado
(`git merge-tree`), achando **exatamente os 9 conflitos nomeados**.

**C3** provou que `2d2d16d` é o head **da ata** e não o `headRefOid`: o delta são **17 arquivos, todos em
`agent-orchestration/`**, zero em `Kpis/`, `src/`, `tests/`, `scripts/`, `prisma/`, `.github/`. Confirmou a
**mordida do guard** por **drill isolado** (`app.js@main` + JSON@head → ec=1; após freeze → ec=0) e mediu que
o `app.js` commitado é **byte-idêntico** ao gerado pelo script — foi **gerado, não digitado**.

## Os achados

| # | Cadeira | Grav. | O quê |
|---|---|---|---|
| **C3-A1** | C3 | **MÉDIA** | uma "PROVA MEDIDA" é **falsa no head julgado**: diz **1 arquivo** de diff contra a `main`, são **17**. Verdadeira em `44a30e4`, **nunca re-medida após o commit final**. Está nas **duas** superfícies (history + `release.summary`) |
| **C3-A5** | C3 | **MÉDIA** | o índice de pendências ficou **fora de sincronia**: o gerador sobre os blobs do head dá `241/232/191`, o commitado tem `240/231/190`. **Controle na `main`: idêntico** → a dessincronia **nasce neste PR**. **Não é a armadilha conhecida** — medido por execução do gerador e comparação de texto, não por `md5sum` |
| **C3-A4** | C3 | BAIXA | *"o §5 do plano do ciclo 5 congela `scripts/**`"* é **falso**: a string não existe nas 783 linhas, e `scripts/run-backend-tests.mjs` está **explicitamente permitido** ao dev do ciclo 5. A conclusão sobrevive pelo outro pé |
| **C3-A3** | C3 | BAIXA | `74430cc` datado 28/08; todas as formas de `git log` devolvem **29/08** |
| **C1-A1** | C1 | nota | formato de saída do **crítico titular** sem `escopo` — mas ele **não vota**, e há apenso operante |
| **C1-A2** | C1 | ajuste | **E1** é o único dos três apensos **sem cláusula de precedência** |
| **C2-A1/A2** | C2 | BAIXA | citações de intervalo de linha imprecisas (o guard vai à l.**231**, não 230; o formato das vizinhas é 213-216, não 209-216) — a linha exata está transcrita verbatim |

**O `C3-A1` é a terceira ocorrência da mesma classe em três juntas** ("+78%" no 4a, "11 observações" no
briefing do 4a, agora "1 arquivo"): **número medido cedo, publicado tarde, nunca re-medido**. Não é descuido
isolado — é padrão, e merece guarda.

**O `C3-A5` importa por ironia dupla:** o bloco criou a pendência da cegueira do S0 e **deixou o índice
dessincronizado** ao fazê-lo. E a jurada **distinguiu explicitamente** da armadilha conhecida antes de
reportar — que é o que o briefing pedia e o que separa achado de falso positivo.

## Custo da junta (série P6)

**3 disparos para 3 cadeiras · ZERO quedas · ZERO votos perdidos.** A primeira junta da rodada sem nenhuma
queda — com o voto-esqueleto e a evidência incremental já no mandato desde o primeiro disparo.

## Higiene de terreno

A **C2 mutou em worktree próprio** (`git worktree add` + `remove --force`, sem junction de `node_modules`),
conforme a ressalva que o porteiro do #366 carimbou **depois do incidente da junta anterior**, em que três
cadeiras dividiram árvore e uma tinha mandato de mutar. **A regra nova funcionou na primeira aplicação.**

## Veredito

**APROVADO 3×0.** Merge autorizado (§C7), **com CI 7/7** (R2 do inspetor). O pós-voto corrige `C3-A1` (a
prova falsa) e `C3-A5` (o índice), registra `C3-A4`/`C3-A3` e as notas de C1/C2.
