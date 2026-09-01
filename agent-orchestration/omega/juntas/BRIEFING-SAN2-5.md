# BRIEFING — junta do bloco SAN2-5 (PR #367)

**Head julgado:** `5256b49` · **Terreno:** `LIBERADO COM RESSALVA` (R1 = este briefing, com suplentes
nomeados e worktree próprio para quem muta · R2 = merge só com CI **7/7** · R3 = E2c aberto · R4–R6 = mapa
F3/F5/F6 não entregue).
**Quórum: MAIORIA de 3** (§8 do plano) — o bloco **não toca produto**: diff de código **0 bytes** em `src/`,
`tests/`, `prisma/`, `.github/` e contratos, medido pelo inspetor.

## 1. Por que este bloco existe, e o fato que o governa

Uma revisão adversarial de prontidão **reprovou o start do ciclo 5**, e corrigiu uma premissa do
**orquestrador**, repetida várias vezes ao dono:

> **`B-O6R-02`** está no ciclo 5, que já era o teto anterior e continua sendo o dele: o ciclo 5 já é a
> **última tentativa** sob qualquer das duas regras. **Se reprovar, para.**
> — `decisoes.md`, `D-TETO-DOIS-CICLOS`, l.1790-1791

**Uma reprovação encerra o `B-O6R-02`.** Tudo que este bloco deixar torto custa a única tentativa que aquele
tem. **É por isso que a junta do SAN2-5 importa: ela julga o preparo de um bloco que não pode ser preparado
duas vezes.**

## 2. O que o bloco entrega

**B1** — a composição da junta do ciclo 5 **não existia em lugar nenhum**. A emenda manda **3 unânimes**; o
§13.3 nomeava **6 cadeiras**, 4 delas julgando matéria que a emenda tirou do bloco. Sem nomes escritos, o
inspetor fail-closed **não abre a junta**. Nomeadas: `arnes-catalogo` (a reservada) · `banco-fk-triggers` ·
`validador-diff-plano`. Cortes com razão (matéria mergeou no **#359**); `ataque-ao-dinheiro` **fundida**.

**B2** — os corpos não estavam na linhagem, e o reservado **violava o contrato**: dizia `unanimidade 5/5` e
tinha schema de voto **sem `escopo`** (§C7.1-ter(a)). Emenda **cirúrgica**: 4 linhas no jurado, 0 no crítico,
**reserva intacta**. **8 corpos, 8/8 conformes.**

**B3** — dois documentos **mergeados** se contradiziam no arquivo que o plano manda o dev devolver. O
`ci.yml` **vence**; o plano do c5 foi emendado por apenso.

**B4** — o §8 instruía sobre fato falso (a base moveu 8 commits) e as **âncoras do §0** estavam obsoletas —
o §7 **reprovaria o próprio bloco**. A **absorção fica com o S0 do ciclo 5**.

**Dívidas:** backfill do #366 (`df496d2`/**`2d2d16d`**, head da **ata**) e `blocks_completed` **156**.

## 3. As três cadeiras (identidades NOVAS, maioria de 3)

- **C1 — `auditor-da-composicao-e-dos-corpos`** *(suplente: `suplente-auditor-da-composicao-e-dos-corpos`)*.
  Os **8 corpos** conferem? **Re-meça os hashes você mesmo** — durante a execução a fábrica reescreveu um
  suplente **depois de duas conferências**, e a tabela ficou falsa até ser corrigida. Nenhum corpo pode ter
  `5/5` como regra **operante** (só como revogação); os **votantes** precisam do campo `escopo`. A
  composição (3 titulares + suplentes) está **nomeada por escrito**, e os cortes têm razão medida?
- **C2 — `provador-do-apenso-e-do-escopo`** *(suplente: `suplente-provador-do-apenso-e-do-escopo`)*
  **— ESTA CADEIRA MUTA: use WORKTREE PRÓPRIO** (`git worktree add`, remoção por `git worktree remove
  --force`; **junction de `node_modules` entre worktrees é PROIBIDA**). Os apensos ao
  `B-O6R-02-ciclo5-plano.md` são **append-only** (+442/−0) e as **341 linhas originais seguem
  hash-idênticas**? O diff de código é **0 bytes**? A decisão do B3 (o `ci.yml` vence) está coerente com o
  que está **mergeado**?
- **C3 — `auditor-do-registro-e-do-kpi`** *(suplente: `suplente-auditor-do-registro-e-do-kpi`)*.
  Backfill do #366 = `df496d2` / **`2d2d16d`** (prove que é o head **da ata**, não o `headRefOid`)?
  `blocks_completed` **156**, entrada **150**, trilhas **CARREGADAS com nota §C3.3** (o bloco não toca
  código — prove), `mvp_*` intocados, nulls na autoria? O **guard do freeze mordeu** (ec=1 antes, 0 depois)?
  As pendências novas têm severidade honesta?

## 4. O que atacar com mais força

- **Preparo que invade o ciclo 5.** O risco §7 do plano. Este bloco **prepara**; se ele executou o que era
  do ciclo 5, esvaziou a junta que deveria julgá-lo.
- **Corpo de jurado que não obedece ao contrato vigente.** É o defeito que o bloco existe para consertar —
  procure o análogo nos 6 corpos **novos**, não só nos 2 trazidos.
- **Conclusão além da medição** — defeito recorrente pego nas duas juntas anteriores.
- **Número sem origem no método** — a junta do 4a achou dois; a do 4b não achou nenhum. Procure.

## 5. Armadilhas que fabricam achado FALSO (todas MEDIDAS nesta sessão)

- **O `--check` do S0 é CEGO a `especialistas/`** (`readdirSync` plano, l.66): acrescentar **8 corpos** não
  mudou o *"23 agentes"*. **Não use `ec=0` como prova sobre os corpos** — é o conforto falso que o próprio
  bloco denunciou (`P-SYNC-AGENTS-NAO-RECURSIVO`).
- **`grep -c $'\r'` NÃO conta CR neste ambiente** — devolveu **0** para arquivo com **494 CRs**. Use
  `tr -cd '\r' | wc -c`.
- **`md5sum` e `git status` mentem sob `core.autocrlf=true`** — meça eol-neutro (`git diff --exit-code`).
- **O índice de pendências não muda** ao regenerar — é `P-SAN2-2-INDICE-DONO-SEMPRE-SIM`, não defasagem.
- **`erp-postgres`/`erp-redis` são INTOCÁVEIS**, nem para leitura.

## 6. O que o bloco NÃO fecha, declarado

**E2c** — o guard `tests/junta-voto-escopo-guard.test.ts`, que tornaria *"corpo com `gravidade` tem
`escopo`"* **executável** em vez de conferido à mão (`tests/**` fora do escopo). **Hoje um corpo mudou entre
duas conferências** — a propriedade depende de alguém olhar. Também não fecha a **absorção da `main`** (é do
S0 do ciclo 5) nem a recontagem das **68** (base viva proibida).

## 7. Inelegibilidade

Identidades **novas**. Confira contra o `OBITUARIO-IDENTIDADES.md` **e** as atas — **ausência do nome no
obituário NÃO absolve** (cobertura parcial, `P-OBITUARIO-DERIVADO-DO-DIRETORIO`). Inelegíveis: orquestrador,
`planejador-mestre` do bloco, `dev-san2-5`, o inspetor desta junta, o `porteiro-pos-merge` do #366 e **as 8
identidades do ciclo 5** (elas serão julgadas, não julgam).

## 8. Protocolo (P1–P6) — colar no mandato de cada cadeira

```
Crie <cadeira>-voto.json PRIMEIRO, itens marcados EM APURAÇÃO, e preencha cada um ao medir.   [P2+]
Após CADA item: apense a <cadeira>-evidencia.md → comando · saída · veredito parcial.          [P1]
Item grande também se fatia: onde medir tem N passos, gravar tem de ter N passos.
Mensagem final = 1 linha. Máx 3 itens por cadeira.                                             [P4]
Sucessor re-executa os comandos registrados do caído; conclusão sem comando NÃO é insumo.      [P3]
Achado declara `gravidade` E `escopo` COM evidência de data/origem.                     [§C7.1-ter]
"Não consigo medir" = REPROVADO. Você não propõe correção.                              [§C7.4-bis]
Cadeira que MUTA usa worktree próprio.                                    [ressalva do porteiro #366]
```

**Merge só com CI 7/7** (R2 do inspetor). Afirmação de ata anterior é **"a re-verificar"**, nunca fato.
