# J-SAN2-3 — ata da junta do bloco SAN2-3 (PR #364)

> **Quórum:** MAIORIA de 3 (§8 do plano — bloco documental; não toca dinheiro, segurança, permissão nem
> perda de dado). **Head julgado:** `23d9227` · **CI:** 7/7 (run 33346995433) ·
> **Terreno:** `LIBERADO COM RESSALVA` (ressalva 1 = o briefing, escrito; ressalva 2 = circularidade).

## Votos

| Cadeira | Veredito | Achados |
|---|---|---|
| **C1 — `auditor-do-obituario`** | **APROVADO** | 1 · `pre-existente` / MÉDIA |
| **C2 — `zelador-do-escopo-e-do-instrumento`** | **APROVADO** | 1 · `dentro-do-bloco` / BAIXA |
| **C3 — `auditor-do-registro-e-kpi`** | **APROVADO** | 1 · `dentro-do-bloco` / BAIXA |

**RESULTADO: APROVADO 3×0.** Quórum exigia maioria; saiu unânime. **Nenhum achado `bloqueia`.**

## O que o bloco corrigiu antes de existir

O SAN2-3 vinha na fila como *"descarte dos 16 especialistas em `.claude/agents/especialistas/`"*.
**Duas premissas caíram por medição, antes de qualquer código:**

1. **O diretório não existe na `main`** — os 17 arquivos vivem só na `demo/investidor`. Não se descarta da
   `main` o que nunca esteve nela → o bloco virou **registro**, com **zero descarte físico**.
2. **A conta era 15 SEPULTADAS + 2 RESERVADAS, não 16+1.** A ata `J-B-O6R-ARNES.md` (l.51-56) **reserva** o
   `jurado-c5-arnes-catalogo-postgres` para o **ciclo 5**. Executar o enunciado herdado teria queimado um
   jurado guardado para a junta seguinte — e só descobriríamos ao montá-la.

## Os achados

**C1 / A-1 (`pre-existente`, MÉDIA, não reprova) — o obituário cobre quem tinha ARQUIVO, não quem VOTOU.**
Medido: **15 identidades queimadas fora do registro**, entre elas as **quatro cadeiras que julgaram o #363
hoje** (`provador-de-mutacao-do-espelho`, `curador-da-lista-suites-ci`, `zelador-do-contrato-canonico`,
`auditor-do-kpi-honesto`). Causa: o registro derivou do **diretório**, não das **atas** — e as 15 nunca
existiram como arquivo de agente. Escopo `pre-existente` com evidência de origem: o enunciado do bloco era
sobre os 16 arquivos; identidade sem arquivo nunca esteve nele.
**Atenuante medido, e é o que salva o documento:** ele **declara a fronteira** (§4) e **se recusa a absolver
por ausência** (§1.4, fail-closed) — nome não listado exige conferência nas atas, não passe livre. Não há
falsa segurança escrita. **Vira pendência com dono: o registro precisa de segunda passada derivada das ATAS.**

**C3 / A-1 (`dentro-do-bloco`, BAIXA, não reprova) — a pendência declara DOIS donos.**
Em `P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY`, a linha de status migrou para `dono: bloco SAN2-5`, mas a seção
narrativa "### Dono e o que falta" (l.80) ainda abre com "Dono: a atribuir". Impacto no índice: **nenhum**
(a forma não casa o classificador). Corrigido pós-voto.

## O que cada cadeira mediu por conta própria

**C1** — não conferiu o obituário contra si mesmo: foi às **atas**. Verificou a reserva do
`jurado-c5-arnes-catalogo-postgres` lendo `J-B-O6R-ARNES.md` l.51-56, e cruzou as 15 sepultadas com os votos
das juntas concluídas. Foi assim que achou as 15 que faltam — o gap só aparece de quem parte das atas.

**C3** — o teste decisivo do backfill não foi ler a ata, foi medir: **o diff dos campos numéricos de
`kpis-latest.json` entre `c8dc716` e `e4926bd` saiu VAZIO** — nenhum número se moveu pós-voto. Os 18 arquivos
do delta são todos de registro; zero em `src/`, `tests/`, `scripts/`, `.github/`. E reexecutou os quatro
guards por conta própria (12/12, 16/16, freeze exit 0, `node --check`).
**A armadilha do índice não pegou:** ela regenerou, mediu `git diff --exit-code` = 0 e **não reportou
defasagem** — reconheceu a pendência `P-SAN2-2-INDICE-DONO-SEMPRE-SIM` se manifestando, em vez de fabricar
achado falso a partir de `md5sum`.

**C2 / A-1 (`dentro-do-bloco`, BAIXA, não reprova) — a lista fechada do §5 e o cabeçalho discordam.**
`votos/SAN2-2/00c-porteiro-pos-merge-363.md` está **fora** da lista fechada do §5 do plano, embora nomeado
verbatim na l.6 do mesmo plano. O `dev-log` afirma "todos na lista fechada", quando são **10 na lista + 1 no
cabeçalho**. Não bloqueia; corrige-se no registro.

## O que a C2 mediu por conta própria

Não aceitou "o espelho foi gerado" como afirmação. **Regenerou em sandbox isolado** e comparou **23/23 byte
a byte** por sha256 **eol-neutro** (`tools:` 23→0, `model:` 4→4 — a regra do `D-PLANEJADOR-MODELO-FABLE`
preservada). Depois **mutou o guard** — 1 caractere, e a linha `model:` — e confirmou `DIVERGE` com exit 1.
Provar que foi gerado exige mostrar que o gerador reproduz **e** que o guard acusa quando não reproduz.

## Custo da junta (série P6)

**5 disparos para 3 cadeiras · 2 quedas, ambas de infraestrutura, ZERO por julgamento · ZERO votos perdidos.**

| Cadeira | Disparos | Quedas | Voto perdido |
|---|---|---|---|
| C1 | 1 | 0 | — |
| C2 | 3 | 2 | **nenhum** |
| C3 | 1 | 0 | — |

**Comparação com a junta anterior (SAN2-2): 11 disparos / 9 quedas / 4 cadeiras.** Aqui: 5 disparos, 2
quedas, 3 cadeiras. A diferença não é só a janela — é que o **voto-esqueleto** e a **evidência incremental**
entraram no mandato desde o primeiro disparo, em vez de serem descobertos no meio da junta.

## Padrão que as três cadeiras compartilharam, e vale como lição

**Nenhuma conferiu o artefato contra si mesmo.**
- A **C1** não leu o obituário para validar o obituário: foi às **atas** — e por isso achou as 15
  identidades que faltam, gap invisível para quem parte do diretório.
- A **C3** não leu a ata para validar o `approved_head`: mediu que o **diff dos campos numéricos entre os
  dois heads é vazio**, o que é mais forte do que a ata afirmar.
- A **C2** não leu o script para validar o espelho: **regenerou e mutou**.

## Veredito

**APROVADO 3×0.** Merge autorizado (§C7 — verde da junta = merge). Achados: 2 corrigidos/registrados no
pós-voto (C3/A-1 dois donos; C2/A-1 lista do §5) e 1 vira pendência com dono (C1/A-1 — o obituário precisa
de segunda passada **derivada das atas**, não do diretório).
