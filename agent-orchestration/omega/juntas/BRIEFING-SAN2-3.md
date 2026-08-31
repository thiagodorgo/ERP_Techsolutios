# BRIEFING — junta do bloco SAN2-3 (PR #364)

**Head julgado:** `23d9227` · **CI:** 7/7 verde (run 33346995433) · **Terreno:** `LIBERADO COM RESSALVA`
(ressalva 1 = este briefing; ressalva 2 = circularidade declarada, abaixo).
**Quórum: MAIORIA de 3** (§8 do plano) — bloco documental, não toca dinheiro, segurança, permissão nem
perda de dado. Sem cadeira de `critico-adversarial` (não é bloco de invariante).

## 1. O que o bloco entrega

O SAN2-3 vinha na fila como *"descarte dos 16 especialistas em `.claude/agents/especialistas/`"*. **Duas
premissas do enunciado caíram por medição, antes do código:**

1. **O diretório não existe na `main`** — os 17 arquivos vivem só na `demo/investidor`
   (`git ls-tree -r --name-only main -- .claude/agents/` → 23 arquivos, nenhum em `especialistas/`).
   Não se descarta da `main` o que nunca esteve nela → o bloco vira **registro**, **zero descarte físico**.
2. **A conta é 15 SEPULTADAS + 2 RESERVADAS, não 16+1.** A ata `J-B-O6R-ARNES.md` (l.51-56) **reserva** o
   `jurado-c5-arnes-catalogo-postgres` para o **ciclo 5**, e o `critico-c5-adversarial` também é preservado.
   Executar o enunciado herdado teria queimado um jurado guardado para a junta seguinte.

**Entregas:**
- `agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md` (144 linhas) — quem está queimado e por quê.
- **+4 linhas** no `inspetor-de-terreno-da-junta` (dentro do limite 2–4 do plano), apontando o obituário na
  conferência de inelegibilidade. **Sem guard novo** — o plano argumenta por quê.
- **Backfill §C3.5 do #363**: `pr 363` · `merge_commit d283903` · `approved_head` **`c8dc716`** (o head da
  **ata**, não o `e4926bd` do GitHub), com o porquê escrito na própria `description`.
- **Dono real (`SAN2-5`)** em `P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY` e `P-SAN2-2-INDICE-DONO-SEMPRE-SIM`.
- Entrada de KPI; `blocks_completed` 152 → **153**.

## 2. As três cadeiras (identidades NOVAS, maioria de 3, todas com voto declarando escopo)

- **C1 — `auditor-do-obituario`.** O obituário está **correto e completo**? As **15 sepultadas** são de fato
  identidades que já votaram/atuaram (confira contra as atas), e as **2 reservadas** estão marcadas como
  **preservadas**, não sepultadas? **Sepultar uma reservada é o erro caro do bloco** — verifique
  `J-B-O6R-ARNES.md` l.51-56 por leitura própria.
- **C2 — `zelador-do-escopo-e-do-instrumento`.** O diff cabe no §5 do plano (**11 arquivos**)? A edição no
  inspetor é **≤4 linhas** e o espelho `.agents/agents/` foi **gerado por script** (`--check` exit 0), nunca
  à mão? A `demo/investidor` ficou **intocada** (zero descarte físico)? Nada de `src/`, `tests/`, `scripts/`,
  `prisma/`, `.github/`, `frontend/`, `mobile/` nem contratos?
- **C3 — `auditor-do-registro-e-kpi`.** O **backfill do #363** está certo (`d283903`/`c8dc716`, **não** o
  `headRefOid e4926bd`) — prove por `git log --oneline c8dc716..e4926bd`. A entrada de KPI tem contagem de
  **execução real**, nulls na autoria, trilhas não tocadas com **nota §C3.3**, `mvp_*` intocados,
  `blocks_completed` 153? O **dono real** substituiu "a atribuir" nas duas pendências?

## 3. O que atacar com mais força

- **A conta 15+2.** É o erro que o bloco existe para não cometer. Confira as duas reservadas **nas atas**.
- **O índice não mudou, e isso é esperado.** O dev registrou: regenerar o índice deu **diff vazio**, porque o
  defeito `P-SAN2-2-INDICE-DONO-SEMPRE-SIM` faz a coluna `dono` dizer "sim" tanto com dono ausente quanto
  com dono nomeado. **Não trate isso como "índice defasado"** — é a pendência se manifestando. Meça
  **eol-neutro** (`git diff --exit-code`), nunca por `md5sum`/`git status`.
- **O dev corrigiu um erro próprio antes do voto**: a `description` dizia "7 arquivos" por estimativa; são
  **11**. Confirme que o número publicado hoje é o medido.

## 4. Armadilhas que fabricam achado FALSO (medidas hoje)

- **`md5sum` e `git status` mentem sob `core.autocrlf=true`** — arquivo muda de md5 com `git diff` vazio.
- **`grep -c $'\r'` é inútil** no Git Bash desta máquina (o MSYS esvazia o padrão e casa com toda linha).
- **`sed` não edita** os contratos (converte CRLF→LF: mudança de massa disfarçada de inserção).
- Nada de `git archive`+`tar`.

## 5. Circularidade declarada (ressalva 2 do inspetor)

Este bloco **alterou o corpo do próprio inspetor de terreno**. O `LIBERADO` dele **não é prova de mérito**
do obituário nem da edição — ele julga tabuleiro. **Quem julga o mérito são as três cadeiras.**

## 6. Inelegibilidade

Identidades **novas** obrigatórias. Nenhuma das **15 sepultadas** do obituário senta. Também inelegíveis:
o **orquestrador**, o **`planejador-mestre`** deste bloco, o **`dev-san2-3`**, o **inspetor de terreno** desta
junta, e o **`porteiro-pos-merge` do #363**.

## 7. Protocolo resiliente (P1–P6) — colar no mandato de cada cadeira

```
Crie <cadeira>-voto.json PRIMEIRO, com os itens marcados EM APURAÇÃO, e preencha cada um ao medir.  [P2+]
Após CADA item: apense a <cadeira>-evidencia.md → comando · saída resumida · veredito parcial.       [P1]
Mensagem final = 1 linha apontando o voto.  Máx 3 itens por cadeira.                                 [P4]
Se substituir um caído: re-execute os comandos registrados dele e compare; conclusão sem comando
registrado NÃO é insumo.                                                                             [P3]
Todo achado declara `gravidade` E `escopo` (dentro-do-bloco | pre-existente) COM evidência de data
ou origem — escopo sem evidência é tratado como dentro-do-bloco.                              [§C7.1-ter]
"Não consigo medir" = REPROVADO.  Você não propõe correção.                                  [§C7.4-bis]
```

**Cerca de 30 agentes caíram hoje por infraestrutura, nenhum por julgar mal.** A junta do SAN2-2 custou 11
disparos para 4 cadeiras e **não perdeu um voto** — porque o voto nascia como esqueleto e era preenchido item
a item. Onde medir tem N passos, gravar tem de ter N passos.
