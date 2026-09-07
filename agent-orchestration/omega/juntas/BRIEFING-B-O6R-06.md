# BRIEFING DA JUNTA — B-O6R-06 (`fix/billing-durability`)

> Escrito pelo orquestrador em 2026-09-07 para fechar o item **1.2** do `inspetor-de-terreno-da-junta`
> (passada 1, `BLOQUEADO`). **Nada aqui é insumo de mérito** — o mérito está no plano e nos pareceres. Este
> documento diz **quem julga, o quê, em que tabuleiro, e o que não pode ser herdado como fato**.

## §0 · Âncoras — confira, não herde

| Item | Valor |
|---|---|
| Head de **registro** | **vigente na branch `fix/billing-durability`** — este briefing nomeava `e35492ef`, mas o commit que **contém** o briefing é posterior (ressalva **R7** do inspetor: quem abrisse worktree em `e35492ef` teria o mesmo código e **não** teria este arquivo). **O despacho de cada jurado nomeia o head vigente; use o que o seu despacho disser.** |
| Head de **CÓDIGO julgado** | **`0f0a872a`**. **Prove você mesmo, com o pathspec** (o inspetor mediu assim): `git diff --numstat 0f0a872a <head> -- . ':!agent-orchestration' ':!.claude' ':!.agents' ':!docs'` → **vazio**. Tudo acima de `0f0a872a` é registro |
| Base | `origin/main` = **`fe2748c`** (= merge-base, conferido) |
| Achados que o bloco fecha | **`Ω6R-DIN-005`** e **`Ω6R-DIN-007`** — **2 P0** |

Cadeia: `dd16beb1` parecer do porteiro do #380 · `9f582a34` plano · `be608a52` PDs + crítico r1 ·
`26182d6b` emenda E1 · `dc47e668` crítico r2 · `e2d4e119`→`0f0a872a` os 8 commits do dev · `e35492ef`
as 6 cadeiras + espelho.

## §1 · Insumos — todos no head

| Insumo | Caminho | Nota |
|---|---|---|
| **Plano + `EMENDA E1`** | `omega/planos/B-O6R-06-plano.md` | 1153 l. **A E1 (l.777-1153) MANDA onde diverge do corpo** — ela existe porque o crítico derrubou o plano original |
| **Parecer do crítico (2 rodadas)** | `votos/B-O6R-06/01-critico-adversarial.md` | 629 l. Veredito **PLANO ROBUSTO COM RESSALVA** |
| **PDs** (§C7.3) | `docs/omega-pd.md`, 2 últimas seções | `OUTBOX-IN-DB` **16 fontes** · `SUM-NUMERIC-RLS` **14 fontes**. **Mudaram o desenho** |
| Parecer do inspetor | `votos/B-O6R-06/00-inspetor-terreno.md` | passada 1 `BLOQUEADO` (só o 1.2), passada 2 a seguir |
| Porteiro do #380 | `votos/B-O6R-07b/05-porteiro-pos-merge-fe2748c.md` | autorizou o start deste bloco |

## §2 · Composição, quórum, inelegibilidade

**Quórum: UNANIMIDADE DE 3** (§C7.1-ter(b) — o bloco toca **dinheiro**: faturamento e rateio). **Não é 5/5**
(sem produção, sem dependência nova, sem serviço pago). **O voto de um sozinho reprova.** Teto: **2 ciclos**.

| Cadeira | Agente | Veto | Suplente |
|---|---|---|---|
| **C1 · banco / atomicidade / RLS** | `jurado-06-banco-atomicidade-rls` | sim | `jurado-06-suplente-banco-atomicidade-rls` |
| **C2 · invariante financeiro / rateio** | `jurado-06-invariante-financeiro-rateio` | sim | `jurado-06-suplente-invariante-financeiro-rateio` |
| **C3 · contrato / regressão / KPI** | `jurado-06-contrato-regressao-kpi` | sim | `jurado-06-suplente-contrato-regressao-kpi` |

**Perda de jurado:** o suplente **não herda medição nenhuma** — re-executa o briefing inteiro; conclusão sem
comando registrado **não é insumo**; **voto perdido nunca conta como aprovação**; a junta **não fecha com
menos de 3 votos de mérito**.

**INELEGÍVEIS, por nome** (§C7.4-bis) — conferido pelo inspetor (`grep -rln 'jurado-06-'` fora de
`votos/B-O6R-06/` → nada; os votantes do 07b e do 02-c5 não coincidem com nenhum `name:` dos 6 corpos):
`planejador-mestre` · `critico-adversarial` · o dev `general-purpose` · `porteiro-pos-merge` ·
`inspetor-de-terreno-da-junta` · **todos os `jurado-07b-*`** · `agente-secops` · **todos os `jurado-c5-*`**.

## §3 · Isolamento por jurado — vinculante

1. **Worktree PRÓPRIO** para cada jurado que mutar, com **`npm ci` PRÓPRIO**. **Junction/symlink de
   `node_modules` é PROIBIDA** (§C7.1-ter(c)).
2. **Cluster Postgres descartável PRÓPRIO por jurado.** A base viva **`erp-postgres`/`erp-redis` não é alvo
   de ninguém, nem para leitura.**
3. **Derrube o cluster com `docker rm -fv`** (com `-v`). **Ressalva R2 do inspetor:** ele mediu **49 volumes
   anônimos dangling, 2,35 GB**, cinco deles da noite anterior — consistentes com um cluster derrubado **sem**
   `-v`. Disco é escasso (§C5).
4. **Pristino exige `--ignored` (R1, e isto é medição nova).** A suíte grava
   `storage/checklist-attachments/<uuid>/` **no worktree onde roda**. Na execução do inspetor,
   `git status --porcelain` ficou **vazio** enquanto `--ignored` foi de **2 para 13**. **Limpe o seu**, e
   confira com `--ignored`, não só com `--porcelain`.
5. **Não toque** em `demo/investidor` (árvore principal), `.claude/worktrees/gov-descuido`,
   `.claude/worktrees/san2-r` (órfão vazio). **Resíduo alheio se reporta, não se varre** (R3).
6. Remoção de worktree só por `git worktree remove --force`; no Windows, se falhar com "Filename too long":
   `[System.IO.Directory]::Delete("\\?\<path>", $true)`.

## §4 · Baseline e números — o que está medido e por quem

| | arquivos | testes | pass | fail | skip | ec |
|---|--:|--:|--:|--:|--:|--:|
| **head `0f0a872a`** (dev, cluster próprio) | — | **2992** | 2990 | 0 | 2 | 0 |
| **head, re-medido pelo INSPETOR** (cluster próprio `o6r06-insp-pg`, 107 migrations, forma canônica 3) | — | **2992** | 2990 | 0 | 2 | 0 |
| base `fe2748c` (dev, worktree separado) | — | **2938** | **2936** | 0 | 2 | 0 |

**Δ = +54 casos novos**, decomposto por arquivo: **15 · 6 · 6 · 6 · 4 · 10 · 7**. Os 4 do `reopen` foram
**migrados**, não somados. **Piso ÚNICO do plano: ≥ 47.**

**Duas advertências sobre esses números:**

- **A re-medição do inspetor NÃO é insumo do voto** — ele mediu para julgar o terreno, não o mérito. **Meça o
  seu** se o seu voto depender do número.
- **O baseline `2936/2938` NÃO foi reproduzido pelo inspetor** (R4). Existem duas fontes independentes (dev e
  o porteiro do #380). **A C3 re-mede.**

**Sobre o piso — e isto reprova jurado, não bloco:** o piso é **≥47**, único. A `E1·7` recontou **~90 casos de
desenho**; o entregue por execução é **+54**, com os **6 da série K legitimamente fora** (o script foi
bloqueado). A lacuna é **observação publicada com N e forma**, não critério. **Cobrar `≥90` como piso é erro do
jurado** — é o defeito dos três pisos que o crítico pegou no 07b.

## §5 · O que NÃO se herda como fato

- **Nada da ata do 07b.** Nada do relatório do dev vale como medido: **re-execute**.
- **O corpo do plano (l.1-773) foi emendado.** Onde corpo e `E1` divergirem, **vale a `E1`**.
- **As PDs mudaram o desenho** — `createMany` foi **retirado**; tipos passaram a **nuláveis**. Ler o corpo do
  plano sem a `E1` e sem as PDs leva a cobrar o que já não está lá.
- **O dev declarou 10 pendências novas; o inspetor e o orquestrador mediram 11.** **A C3 conta ela mesma** e
  publica os dois números com o comando de cada.

## §6 · O que este briefing EXPÕE de propósito

**1. A INVERSÃO DO PAPEL DE BANCO — leia mesmo que não seja a sua cadeira.** O inspetor notou que isto está
no corpo da **C1** e da suplente C1, **mas não na C2 nem na C3**; por isso está aqui, para as três.

O defeito que o **canário achou no código do próprio dev** — `sumUsageBasis` e o `deleteMany` do replace
confiando **só** na RLS — é **INVISÍVEL sob o papel `NOSUPERUSER NOBYPASSRLS`**: ali a RLS faz o recorte e o
teste fica **VERDE COM O DEFEITO PRESENTE**. Ele só aparece **sob `postgres`**, que ignora RLS. **Medir apenas
sob o papel restrito APROVARIA o defeito.** A correção (`tenant_id` explícito) tem de ser verificada **sob os
dois papéis**, e a mutação rodada **sob superusuário**.

**2. O ramo `completed` do `scripts/reconcile-checklist-usage.ts` está BLOQUEADO**, por decisão do crítico
(R2-A): duas seções da emenda se contradiziam — a trilha C (divergência/mobile) termina com `completed_at` e
**sem** métrica **por decisão do bloco**, e o script a **refaturaria**. **A série K não existe na suíte.**
**Cobrar o script, ou cobrar `I2′` reescrita, é REPROVAÇÃO POR CONSTRUÇÃO** — a junta **decide o predicado
observável**, não o exige do dev. Idem cobrar migration, dependência nova, `mobile/**`, o outbox genérico da
`Ω6R D-002` (rascunho **não deliberado**), string-decimal no contrato, paginação por cursor ou a agenda da
projeção diária.

**3. Duas divergências de escopo que o DEV declarou e devolveu** — estão em `pendencias.md`:
   (a) **2 arquivos de teste `-db`** tocados fora do §6 (`P-O6R-B06-DIVERGENCIA-ESCOPO-TESTES-DB`). Não havia
   caminho verde sem tocá-los; a alternativa exigia `ON DELETE CASCADE`, isto é **migration**, proibida.
   **Nenhum guard foi afrouxado — um deles ficou mais forte.** O inspetor conferiu: em `tests/` são
   **exatamente essas duas**, sem terceira.
   (b) **O papel do drill não se chama `o6r06_app`** (`P-O6R-B06-PAPEL-DO-DRILL-VEM-DO-ARNES`) — vem de
   `createEphemeralRole` sob `withRoleCatalogLock`, porque a regra do arnês único vale mais que um nome no
   plano. Propriedade integral conferida em `pg_roles`.

**4. O alarme do `K4`, levantado e NÃO confirmado.** Temeu-se que a `evidencia_fechamento` do `DIN-005`
citasse `K4` — caso da série bloqueada —, o que seria um P0 "fechando" com prova inexistente. **Medido em três
lugares (orquestrador, fábrica e inspetor): não cita.** Fica como conferência da C3, com o resultado esperado
conhecido.

**5. Achado do próprio dev, durante a implementação** — o canário exigido pelo `R2-C` pegou defeito **no
código que ele acabara de escrever**: o `groupBy` somava a base de **todas as organizações num balde só**.
Corrigido. É o item 3 da C1.

## §7 · Mandato por cadeira (≤3 itens — P4)

**C1 · banco/atomicidade/RLS** — (1) atomicidade da captura, séries **A/F/R** por **execução**;
`$executeRaw` com **alvo explícito** (o `createMany` foi retirado pela PD-1: o Prisma emite `ON CONFLICT`
**sem alvo**); (2) **RLS** — o drill sob `NOSUPERUSER NOBYPASSRLS` é seu, **falha ao criar o papel é VERMELHO,
nunca skip**; mais o `R2-C` (o helper é fail-closed na **escrita** e **fail-open na leitura**) — confira o
canário em `sumUsageBasis` **e** em `listTenantAllocations`; (3) o defeito do canário, **sob os dois papéis**
(ver §6.1).

**C2 · invariante financeiro/rateio** — (1) séries **S/B** e o mapa do §3.4 **pelo valor**: `SUM`/`GROUP BY`
no banco, sem `take`, **tipos nuláveis** com `_count._all` como discriminador, `lineItemCount > 0 ∧ total ===
null` é **erro**, **`?? 0` incondicional proibido nominalmente**; (2) o **`DIN-007` fecha DOIS defeitos** — o
truncamento em 10.000 (que o achado nomeia) **e** a acumulação em **float** (que ele não nomeia): tolerância
**0** contra referência em `BigInt`; o crítico mediu **1,1e-3** com 10.001 linhas, **1108×** a tolerância
antiga; (3) ataque ao **"exactly-once efetivo"** e à resposta do §4 (o `.catch(warn)` sobrevive para
storage/jobs/api, que **também** são base de rateio) — o P0 fecha, ou fecha pela metade?

**C3 · contrato/regressão/KPI** — (1) **escopo §5/§6 por `git diff --numstat -- <path>`** (ver §9.7) das
pastas proibidas, mais as duas divergências declaradas; (2) **KPI por reexecução** — `backend_tests` com N e
forma, **Δ +54** decomposto, piso **≥47**, `blocks_completed` 161→**162**, cópia `FROZEN` conferida, **mais o
backfill do #380** em 4 lugares (`pr 380` · `merge_commit fe2748c` · `approved_head a2988b5` · `c5d63bf` como
`pr_head`); (3) **registro** — ordem `API_CONTRACTS.md` × diff por `git log`; `achados.jsonl` +
`REGISTRO_ACHADOS_O6R.md` coerentes com `tests/kpi-achados-paridade.test.ts`, **executado por você**; e a
contagem real das pendências.

## §8 · Forma do voto e do trabalho (§C7.7, `D-JUNTA-RESILIENTE`)

```
Após CADA item: apense a votos/B-O6R-06/<cadeira>-evidencia.md → comando · saída resumida · veredito parcial.  [P1]
Antes da mensagem final: escreva votos/B-O6R-06/<cadeira>-voto.json. Mensagem final = 1 linha apontando o arquivo.  [P2]
Máximo 3 itens; logs longos só no arquivo de evidência.  [P4]
Se você substituir um caído: re-execute cada comando do <cadeira>-evidencia.md dele e compare, depois
meça a cauda. Conclusão sem comando registrado NÃO é insumo.  [P3]
```

**Voto-esqueleto com os 3 itens em `EM APURAÇÃO` gravado ANTES de medir.** No 07b o **P2 salvou um voto
inteiro** de uma queda por cota, numa cadeira com veto — o voto estava gravado, a morte custou só a mensagem.
**O jurado NÃO commita** — o orquestrador commita após cada conclusão.

Cada achado declara **`gravidade`** E **`escopo`** (`dentro-do-bloco` | `pre-existente`, **com evidência de
data/origem**). Escopo sem evidência é tratado como `dentro-do-bloco`; **o veto não alcança `pre-existente`**,
que vira pendência nomeada. **"Não consigo medir" = REPROVADO** naquele item. **Nenhum jurado propõe
correção** (§C7.4-bis).

## §9 · Armadilhas de medição — medidas nesta rodada

1. **`git rev-parse <rev>:<path>` FALHA EM SILÊNCIO para caminho inexistente** — foi assim que o orquestrador
   publicou um falso *"`infra/` mudou"* (`infra/` não existe no topo; é `src/infra`). **Para escopo, use
   `git diff --numstat -- <path>`.**
2. ` M` **fantasma** por autocrlf em arquivo byte-idêntico → confirme com `git diff` / `git hash-object`. A
   árvore principal tem **2 modificações reais e 3 fantasmas**.
3. **`ec` depois de pipe para `tail` é o `ec` do `tail`.**
4. **`--porcelain` não vê ignorado** — para pristino, `git status --porcelain --ignored` (R1).
5. Absorção prova-se por **`rev^{tree}`**; `is-ancestor` **mente sob squash**.
6. `git log -S` na `main` **não data** o que ocorreu **dentro** de branch squashada.
7. Para saber o que um gerador conta, **rode o gerador**. **Prova por presença, nunca por ausência de grep.**
8. **Heredoc > ~7,5 KB estoura o arnês** — pedaços ≤5,5 KB, conferindo a cada um.

**E o corolário que esta rodada pagou seis vezes:** quando um validador rígido acusa algo, a leitura tentadora
é *"o validador exagera"*. Nas três formas de status quebrado desta rodada, **a rigidez era a defesa**.
