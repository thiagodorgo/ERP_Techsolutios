# Parecer do `inspetor-de-terreno-da-junta` — B-O6R-07b (`fix/o6r07b-uploads`) · passada 1 · 2026-09-06

**Modelo:** Fable (fixado por `D-INSPETOR-TERRENO-JUNTA`). **Alvo:** head **`a2988b5`**, branch `fix/o6r07b-uploads`,
base `origin/main` = **`e55245a`**, worktree `.claude/worktrees/o6r07b`. **Não julgo o mérito** — julgo o tabuleiro.
Cada item abaixo traz o comando, a forma e a saída. O que não consegui confirmar por execução está marcado como tal
e conta contra o terreno (fail-closed).

## VEREDITO: **BLOQUEADO** — por terreno DOCUMENTAL, não por código

O head, a árvore, o isolamento físico, o espelho Codex **no head**, o baseline e os números do dev estão limpos e
reproduzem (§4). O que está sujo é o que os jurados vão LER: **não existe briefing** deste bloco em lugar nenhum
(§1.2/§2.1/§5.1), **duas das três cadeiras não têm nome** (§3.1 — inelegibilidade inconferível), **não há suplente
nem plano de perda de jurado** (§5.1), e a árvore principal — de onde a sessão pode carregar corpos de agente — tem
**espelho Codex divergente**, **15 identidades já sepultadas** por `origin/main` e **uma cópia solta e desatualizada
do plano** (509 linhas, sem a Emenda E1) esperando um jurado lê-la como se fosse o plano (§1.3/§4.1). Lista do que
limpar, nomeada, ao final.

---

## §1 · Isolamento

### 1.1 · Head existe, é o nomeado, árvore limpa — **VERDE**

```
git rev-parse --short HEAD                      -> a2988b5     (branch fix/o6r07b-uploads)
git rev-parse --short origin/main               -> e55245a
git merge-base a2988b5 origin/main              -> e55245a
git fetch origin fix/o6r07b-uploads; rev-parse  -> a2988b5     (local == remoto)
git log --oneline e55245a..a2988b5              -> 8 commits: 03f136e 221843c 2b9003a 5a8d8c1 b18fc20 835dbbb 126b717 a2988b5
git status --porcelain --untracked-files=all    -> VAZIO (antes e depois de `npm run check` e da suíte plena — §4)
```

Diff `e55245a..a2988b5`: **50 arquivos, +5644/−185**; a lista completa (`git diff --name-status`) não toca
`prisma/`, `mobile/`, `frontend/`, `.github/`, `scripts/`, `src/modules/impound`, `src/modules/owner-portal`,
`src/modules/auth`, lockfiles, `CLAUDE.md`/`AGENTS.md` — **confere com o que o orquestrador mediu**, agora por
minha própria execução. Sem `.env` no worktree (`ls .env` → não existe): a suíte só alcança banco por variável
exportada, o que torna impossível o dev ter batido na base viva por herança de arquivo.

**Fantasma `autocrlf` na árvore principal:** `planejador-mestre.md`, `porteiro-pos-merge.md` e
`sync-agent-agents.mjs` aparecem ` M` mas `git hash-object` == blob de `HEAD` (f209f8e17f / 9a97167d34 /
a87d9a652d). **Não é mutação.** Os outros dois ` M` (`critico-c5-adversarial.md`, `jurado-c5-arnes-catalogo-postgres.md`)
diferem do `HEAD` de `demo/investidor` mas são **byte-idênticos ao blob de `origin/main` e do head** — ver §1.3.

**Plano e parecer do crítico são append-only e intocados pelos commits de código** (dado podre por reescrita
descartado):

```
git diff --numstat 03f136e 2b9003a -- planos/B-O6R-07b-plano.md            -> 288  0
git diff --numstat 2b9003a a2988b5 -- planos/B-O6R-07b-plano.md            -> (vazio)
diff <(git show 03f136e:plano) <(git show a2988b5:plano | head -766)        -> IDENTICAL (766 linhas)
git diff --numstat 221843c 5a8d8c1 -- votos/B-O6R-07b/01-critico-adversarial.md -> 241  0
git diff --numstat 5a8d8c1 a2988b5 -- votos/B-O6R-07b/01-critico-adversarial.md -> (vazio)
```

### 1.2 · Plano de isolamento POR JURADO declarado no briefing — **BLOQUEADO (briefing inexistente)**

```
ls agent-orchestration/omega/juntas/ | grep -i 07b        -> (nada)         [worktree o6r07b, head a2988b5]
find agent-orchestration -iname "*07b*"                   -> só planos/B-O6R-07b-plano.md   [árvore principal, inclusive untracked]
git ls-files a2988b5 | grep -i o6r-07b                    -> plano + 01-critico + 6 tests; NENHUM BRIEFING
```

O plano (§8, l.559-568) declara worktree próprio, `npm ci` próprio, junction proibida e cluster descartável —
**para o DEV**. Para os **jurados** o plano só diz "disparo de jurados ≤2 em paralelo (P5)" (l.606). Não há, em
nenhum arquivo, a frase exigida: *cada jurado que muta recebe worktree próprio; cada jurado que precisa de banco
cria cluster descartável em porta livre e o derruba; `erp-postgres`/`erp-redis` não são alvo de ninguém*. Foi a
ausência dessa frase que produziu a contaminação dos ciclos 2 e 3 do `B-O6R-02`. **Item bloqueante.**

### 1.3 · Resíduo de jurado anterior — **VERDE no head · RESSALVA na árvore principal**

```
docker ps -a  -> só erp-postgres / erp-redis (Up 8 days); nenhum jur-*/crit-*/o6r07b-*   [os do dev, :56436/:56383, sumiram; netstat vazio]
git worktree list -> main(demo/investidor d1fab3b) · gov-descuido · o6r07b · status-read   [+ o meu, criado e removido — linha final]
find ... -iname "jur-probe*" -o -iname "*-probe.ts"  -> nada;  dist/ coverage/ *.tsbuildinfo -> não existem no worktree
node lstat: node_modules do o6r07b, do frontend/ e da árvore principal -> isSymbolicLink=false (sem junction)
```

Resíduos encontrados (nenhum toquei — §C7.4-bis):

- **`.claude/worktrees/san2-r/`** — diretório VAZIO, sem `.git`, fora do `git worktree list` (`prune --dry-run`
  nada). Inerte.
- **Cópia solta do plano na árvore principal** (`agent-orchestration/omega/planos/B-O6R-07b-plano.md`, untracked):
  `hash-object` 1c05945… ≠ blob do head 2799154…; **509 linhas contra 1054**; `grep -c 'EMENDA E1'` → **0**;
  cabeçalho diferente (`· SEC ·`). É um rascunho anterior à E1. **Dado podre em posição de ser lido** por qualquer
  jurado que abra o caminho na árvore principal em vez do worktree do head. Inerte para o head; perigoso para o voto.
- **Corpos `c5` na árvore principal** (2 ` M` + 6 `??`): todos **byte-idênticos** aos blobs de `origin/main` e do
  head (`dc173575ec`, `254cc4f6f3`, `ab726a8c40`, `d729159004`, `5d1836587b`, `a08aeb2fb5`, `0a1f64ce65`,
  `deb2543fa1`). Não é mutação de agente; é a árvore principal parada em `demo/investidor` (21 commits atrás e 49 à
  frente de `origin/main`) com os arquivos novos por cima. Inerte — mas é a causa do §4.1 (árvore principal).
- **15 identidades sepultadas ainda vivas na árvore principal** (`jurado-arnes-*` ×6, `jurado-c4-*` ×9), que
  `origin/main` já removeu (obituário SAN2-3, #364), **3 especialistas do head ausentes** dela e o corpo do
  `inspetor-de-terreno-da-junta` na versão de 08-25 (head: 08-31). Já foi registrado como classe em
  `J-B-O6R-02-ciclo5.md` l.87 — e continua lá.

## §2 · Insumos do briefing

### 2.1 · Ata anterior incluída como "A RE-VERIFICAR", não como fato — **BLOQUEADO (briefing inexistente)**

Não há ciclo anterior deste bloco (é o ciclo 1); as atas de referência são as do `07a` (`J-O6R-07a-ciclo1/2`,
`J-O6R-07a-ressalvas`) e o parecer do porteiro do #379. Sem briefing, não há como conferir se elas entram como
insumo a re-medir ou como verdade herdada. O que consegui medir no lugar: o plano **não** herda — o §2 re-enumera as
vias em `e55245a` ("5" era texto herdado; a composição, não), a E1·12 declara as 4 premissas falsas corrigidas com
`arquivo:linha` re-lido, e o corpo de 766 linhas do plano é idêntico ao commit `03f136e` (§1.1). Isso absolve o
plano; **não absolve um briefing que não existe.**

### 2.2 · Parecer do crítico + PDs — **VERDE**

```
git log --oneline a2988b5 -- votos/B-O6R-07b/01-critico-adversarial.md -> 221843c (rodada 1) · 5a8d8c1 (rodada 2); 558 linhas
grep -n "RODADA 2|VEREDITO" 01-critico-adversarial.md -> l.14 "PLANO ROBUSTO COM RESSALVA" (8 achados, 4 bloqueantes)
                                                       -> l.321 "RODADA 2 (2026-09-06) — verificação da EMENDA E1" · l.333/l.549 "PLANO ROBUSTO"
git diff e55245a a2988b5 -- docs/omega-pd.md | grep "^+## PD-"
   -> PD-O6R-B07B-MAGIC-BYTES   (fontes numeradas 1..11 — contadas por grep, ≥5)
   -> PD-O6R-B07B-DISPOSITION   (§9 Fontes: 13 fontes listadas em linha — RFC 6266 · RFC 8187 · RFC 9110 · WHATWG Fetch ·
                                 annevk/orb · WHATWG HTML · MDN · jshttp/content-disposition · MS Learn · Node http · helmet ·
                                 csp.com/sandbox · RFC 2183 — ≥5)
```

Este é ciclo 1 (a regra "ciclo ≥ 3" não obriga), mas o plano §11 e a E1·12 fazem do parecer do crítico **insumo
obrigatório** deste bloco. Está no head, íntegro e append-only. **Para valer, tem de estar no briefing — que não existe.**

### 2.3 · Plano existe, nomeia base/branch, §5 e bateria com forma — **VERDE (com nota)**

`agent-orchestration/omega/planos/B-O6R-07b-plano.md` @ `a2988b5`: 1054 linhas; §5 (l.368-434) lista PERMITIDO
código/testes/registro e PROIBIDO com caminhos exatos; §8 (l.557-609) declara a **forma** (`node scripts/run-backend-tests.mjs`
com `DATABASE_URL`/`REDIS_URL` do cluster descartável, `CORE_SAAS_PERSISTENCE` não exportado, portas re-medidas,
`ec` por variável). Nota: o plano nomeia a **base** (`e55245a`) e a branch; o **head** `a2988b5` é nomeado pelo
orquestrador (o plano antecede o código) — o briefing tem de gravá-lo, e cada cadeira mede o próprio (`J-O6R-07a-ciclo2` l.4).

---

## §3 · Papéis (§C7.4-bis)

### 3.1 · Inelegibilidade por nome — **BLOQUEADO (2 de 3 cadeiras sem nome)**

Quem já atuou e não vota: `planejador-mestre` (03f136e, 2b9003a), `critico-adversarial` (221843c, 5a8d8c1), o dev
`general-purpose` (b18fc20, 835dbbb, 126b717, a2988b5), `porteiro-pos-merge` (gate do #378/#379). **Achador do
`Ω6R-SEC-004`**, medido em `docs/revisoes/O6R/ATA_J6R.md` l.8: lente **A2 = identidade `o6r-seguranca`** (não
`agente-secops`); `achados.jsonl` não tem campo de autor; o plano-mãe l.419 cita "secops do B01" entre quem achou
— refere-se ao `B-O6R-01`, e o §11 do 07b limita o achador a "auditoria O6R (SEC-004) + as medições deste plano".

Composição proposta (plano §11 l.658-671): **C1 = `agente-secops`**, **C2 = "contrato mobile B-108"**, **C3 =
"contrato/regressão/registro"** — "identidades novas". Só a C1 tem nome:

```
ls .claude/agents .claude/agents/especialistas | grep -iE "07b|o6r07|mobile|contrato" -> só agente-secops.md
git hash-object .claude/agents/agente-secops.md (árvore principal) == a2988b5 == demo/investidor -> 6216e1324c (mesmo corpo em toda parte)
```

`agente-secops`: não é planejador, crítico, dev nem porteiro deste bloco; não é o achador do SEC-004 (ATA_J6R); votou
em juntas do `B-O6R-01`/`B-O6R-05` (`grep -rl agente-secops omega/juntas/`) — outro bloco, não é o "ciclo anterior"
deste. **Elegível.** C2 e C3 **não existem como corpo** em `.claude/agents/` de nenhuma árvore; sem nome não há
cruzamento possível contra `J-*`/`R-*`. Fail-closed: **não conferido = bloqueado** até o orquestrador nomear as duas
cadeiras (e os suplentes, §5) no briefing.

### 3.2 · Composição cobre a competência dos achados — **VERDE condicional**

O achado é de superfície de segurança (ingresso/egresso de bytes) + contrato mobile B-108 + registro/escopo. C1
`agente-secops` cobre o núcleo; C2 e C3, quando nomeadas com o mandato do §11, cobrem o resto. Nenhum achado sem
cadeira — **desde que C2/C3 nasçam com o mandato escrito lá.**

---

---

## §4 · Fatia S0 e baseline

### 4.1 · Espelho Codex (`sync-agent-agents.mjs --check`, `ec` por variável, sem pipe) — **VERDE no head · VERMELHO na árvore principal**

```
[worktree o6r07b @ a2988b5]  node scripts/sync-agent-agents.mjs --check > sync-check.txt 2>&1; ec=$?  -> ec=0
                              "[agents-sync] OK — 34 agentes, espelho consistente."   (23 raiz + 11 especialistas/, recursivo)
[árvore principal, demo/investidor d1fab3b + untracked]  idem                          -> ec=1
                              DIVERGE: especialistas/critico-c5-adversarial.md · especialistas/jurado-c5-arnes-catalogo-postgres.md
                              FALTA no espelho: jurado-c5-banco-fk-triggers · jurado-c5-suplente-arnes-catalogo-postgres ·
                                jurado-c5-suplente-banco-fk-triggers · jurado-c5-suplente-validador-diff-plano ·
                                jurado-c5-validador-diff-plano · suplente-critico-c5-adversarial
```

A divergência da árvore principal é toda de corpos `c5` (resíduo do `B-O6R-02`, byte-idênticos a `origin/main` —
§1.3), **não deste bloco**. Mas é a árvore de onde a sessão do orquestrador carrega `.claude/agents/` quando dispara
jurados — e é lá que C2/C3/suplentes vão nascer. S0 deste bloco = os corpos novos espelhados **na árvore que carrega
os jurados**, re-medidos com `ec=0`. Ver S4 na tabela.

### 4.2 · Baseline honesto, medido AGORA, antes de qualquer jurado — **VERDE (reproduz o dev por execução minha)**

Forma: cluster descartável **meu** (`insp-o6r07b-pg` postgres:16 em **:5439**, bancos `erp_head` e `erp_base`;
`insp-o6r07b-redis` redis:7 em **:56390**, índices 0/1), portas conferidas livres por `netstat` antes; `DATABASE_URL`
e `REDIS_URL` exportadas, `CORE_SAAS_PERSISTENCE` **não** exportada (runner assume `memory` — mesma forma da CI e do
plano §8); `npx prisma migrate deploy` (107 migrations, ec=0) antes de cada suíte; **as duas suítes em sequência**
(base esperou o head terminar); `erp-postgres`/`erp-redis` não receberam um comando.

```
[head a2988b5, worktree o6r07b]         npm run check > check-head.txt 2>&1; ec=$?  -> ec=0 ; árvore limpa depois
[head a2988b5, worktree o6r07b]         npm test  -> ec=0 · # tests 2938 · pass 2936 · fail 0 · skipped 2 · 282 s
[base e55245a, worktree PRÓPRIO insp-o6r07b-base, npm ci próprio, prisma generate]
                                        npm test  -> ec=0 · # tests 2817 · pass 2815 · fail 0 · skipped 2 · 253 s
Δ = 2938 − 2817 = +121
Os 2 skips (nas duas suítes): tests/permission-catalog-db-parity.test.ts ×2, "RBAC_DB_PARITY não é 1" — os do orçamento do runner.
```

Decomposição do Δ, por arquivo, pelo runner canônico (`node scripts/run-backend-tests.mjs <arquivo>`, um a um, no head):

```
o6r07b-content-sniff        19/19    o6r07b-download-hardened   23/23    o6r07b-mime-sniff-routes   36/36
o6r07b-scanner-failclosed   13/13    o6r07b-upload-gate-census   8/8     o6r07b-upload-gate         21/21     = 120
owner-portal-photos  head 18/18  ·  base e55245a 17/17                                                       = +1
```

**121 = 120 + 1.** Baseline 2817 e head 2938 são números **meus**, não do dev nem do KPI do #371 — e coincidem com os
dois. Piso do §6/E1·8 (≥ 89) e a decomposição do dev conferem. Não julgo o que os testes provam; julgo que a
contagem existe, reproduz, e o denominador é o mesmo dos dois lados.

---

## §5 · Quórum e perda de jurado

**Quórum:** plano §11 l.650 — **UNANIMIDADE DE 3** (§C7.1-ter(b), segurança); "não é junta-5" justificado (zero
dependência, zero serviço externo, zero deploy). Confere com o que o orquestrador declarou.

**Plano de perda de jurado — AUSENTE:** `grep -nEi "suplente|perda de jurado|quórum" plano` → só a linha do quórum;
nenhum suplente nomeado para C1/C2/C3, nenhuma regra de re-disparo ou de voto perdido. Nos blocos anteriores havia
suplente por cadeira (`jurado-c5-suplente-*`, `jurado-arnes-suplente-*`). Junta de unanimidade que perde um voto sem
plano é junta cujo resultado o dono não consegue ler (`J-O6R-07a-ciclo2`: 3 quedas numa junta só). **Ressalva forte;
entra no bloqueio por estar no mesmo briefing que falta.**

---

## §6 · O que o terreno tem de EXPOR à junta (está no head; tem de estar no briefing)

As duas ressalvas que o dev entregou estão **declaradas no head**, com linha — o briefing só precisa apontá-las,
nunca deixá-las para o jurado descobrir:

1. **Censo C6 ficou VERDE numa mutação.** `agent-orchestration/codex/log-execucao.md` l.4188-4191: na M-B3 o
   censo C6 ficou verde enquanto o assert de runtime ficou vermelho, porque o cast usado
   (`as unknown as typeof verification`) não casa o texto `as UploadVerification`; o dev **não apertou o guard**
   ("seria teatro"; "está escrito no próprio arquivo do censo"). É a classe que o crítico já nomeou em
   `01-critico-adversarial.md` l.147-172 (A4/A7: "C6 é um aceite que fica verde com o defeito presente").
2. **Produção e staging recusam TODO upload com 503 a partir do merge, e o smoke de deploy não faz upload.**
   `pendencias.md` l.6935 ("O CI não avisa. `scripts/smoke-staging.mjs` não faz upload"), `P-O6R-B07B-SCANNER-AV-REAL`
   (l.2977, junta-5) e `P-O6R-B07B-STAGING-SEM-UPLOAD` (l.2994, decisão do dono). O CI fica verde e a pane só aparece
   para quem usa. Plano E1·12 manda isto **à ata como informação ao humano** (§C7.2).

Mais duas coisas de terreno que os jurados vão esbarrar:

3. **A suíte grava em `storage/checklist-attachments/<uuid>/` no worktree onde roda** (11 diretórios após uma
   passada; gitignored, logo `git status` fica limpo e ninguém vê). Cada jurado que rodar a suíte deixa isso no
   próprio worktree e o remove; e quem for medir "nada persistido" por listagem de diretório precisa partir de
   diretório vazio — o da minha passada eu removi (linha final).
4. **Os dois skips** são `tests/permission-catalog-db-parity.test.ts` × 2, gated por `RBAC_DB_PARITY != "1"`
   (l.10923/10928 do TAP) — os do orçamento do runner. Skip fora desses dois = auto-pulo silencioso.

---

## O QUE ESTÁ SUJO — e o que precisa acontecer (nomeio; não conserto)

| # | Sujeira | Evidência executada | O que limpa |
|---|---|---|---|
| S1 | **Briefing do bloco não existe** | `ls omega/juntas/ \| grep -i 07b` → nada (head e árvore principal) | Escrever `BRIEFING-B-O6R-07b.md` com: head `a2988b5`/base `e55245a`; plano de isolamento **por jurado** (worktree próprio + `npm ci` próprio, sem junction; cluster descartável em porta livre, derrubado no fim; `erp-postgres`/`erp-redis` alvo de ninguém); parecer do crítico (2 rodadas) e as 2 PDs como insumo obrigatório; atas do 07a e parecer do porteiro como **A RE-VERIFICAR**; os itens do §6 acima em destaque |
| S2 | **C2 e C3 sem nome** — inelegibilidade inconferível | `ls .claude/agents/**` → nenhum corpo além de `agente-secops` | Nomear (criar) as duas identidades com o mandato do §11, registrá-las no briefing, e cruzá-las por nome contra `J-*`/`R-*` (eu refaço o cruzamento na próxima passada) |
| S3 | **Sem suplente nem plano de perda de jurado** | `grep -nEi "suplente\|perda de jurado" plano` → 0 | Um suplente por cadeira (padrão `*-suplente-*` das juntas anteriores) e a regra escrita: re-disparo ou voto perdido + quórum aplicado |
| S4 | **Espelho Codex divergente na árvore principal** (onde a sessão pode carregar jurados) | `node scripts/sync-agent-agents.mjs --check` na árvore principal → **ec=1** (2 DIVERGE + 6 FALTA); no head → ec=0 | Decidir e escrever no briefing **de qual árvore os jurados são carregados**; se for a principal, executar a fatia S0 nela (rodar o sync) **incluindo os corpos novos de C2/C3 e suplentes**, e re-medir `--check` com `ec` por variável |
| S5 | **Cópia solta e desatualizada do plano na árvore principal** (509 linhas, sem E1) | `hash-object` 1c05945… ≠ 2799154…; `grep -c 'EMENDA E1'` → 0 | Retirar do caminho (ou o briefing fixar o caminho do plano **no worktree do head**) — dado podre à espera de um leitor |
| S6 | **Árvore principal atrasada** com 15 identidades sepultadas, 3 especialistas ausentes, `inspetor` de 08-25 | loop `hash-object` × `a2988b5` sobre os 34 corpos do head → 4 divergem; 15 só na principal | Não é do bloco; entra como ressalva para o dono e como razão do S4 |

S1–S3 bloqueiam sozinhos (mandato 1.2, 3.1, e 5.1 combinado com 1.2). S4 bloqueia se a resposta ao "de qual árvore"
for "a principal". S5–S6 são ressalvas fortes.

## VEREDITO: **BLOQUEADO**

Por S1 (briefing inexistente → sem plano de isolamento por jurado, sem insumos apontados, sem "a re-verificar"),
S2 (C2/C3 sem nome → inelegibilidade inconferível) e S3 (sem suplente/plano de perda). S4 bloqueia conforme a
resposta sobre a árvore de carga. **O código, a árvore, o isolamento físico, o espelho no head, o baseline e os
números estão limpos — o conserto é documental e de composição.** Quando o orquestrador escrever o briefing, nomear
C2/C3/suplentes e executar S0 na árvore certa, me chame de novo: refaço §1.2, §2.1, §3.1, §4.1 e §5 contra o briefing
por nome, e re-meço `git status` + `--check` (o resto deste parecer permanece válido enquanto o head for `a2988b5`).

**Limpeza (o que criei para medir, e confirmei derrubado):** containers `insp-o6r07b-pg` (:5439) e `insp-o6r07b-redis`
(:56390) — `docker rm -f`, `docker ps -a` volta a só `erp-postgres`/`erp-redis`, portas livres por `netstat`; worktree
`.claude/worktrees/insp-o6r07b-base` (e55245a, `npm ci` próprio, sem junction) — `git worktree remove --force`, diretório
inexistente, `git worktree list` volta aos 4 de origem; 15 diretórios `storage/checklist-attachments/*` que as minhas
passadas da suíte criaram no worktree `o6r07b` (13 com conteúdo + 2 vazios, mtime dentro da minha janela 11:34–11:44) — removidos,
`storage/checklist-attachments/.gitkeep` é RASTREADO e ficou; `git status --ignored` volta ao conjunto de partida (2 entradas:
`node_modules/`, `frontend/node_modules/`); `git status --porcelain --untracked-files=all` do `o6r07b` = **vazio** (exceto
este parecer, untracked, para o orquestrador commitar); árvore principal com as mesmas 19 linhas de status do início
(nada meu lá). Temporários ficaram só no scratchpad da sessão. Não toquei em `gov-descuido`, `san2-r`, `status-read`,
na cópia solta do plano nem em corpo de agente algum.

— `inspetor-de-terreno-da-junta` (Fable), 2026-09-06, passada 1 — não voto, não conserto, não julgo a entrega.

---
---

# PASSADA 2 — 2026-09-06 — re-medição dos itens que eu mesmo nomeei (1.2 · 2.1 · 3.1 · 4.1 · 5) + `status` + `--check`

**Apenso à passada 1, que fica preservada acima (§A2).** Head agora **`37a2c465`** (== `origin/fix/o6r07b-uploads`).

## P2·0 · O head de CÓDIGO continua `a2988b5` — provado por diff, não por confiança

```
git log --oneline a2988b5..HEAD  -> 37a2c465 (4 cadeiras + espelho) · 345ef4e0 (briefing) · 3fa616f7 (meu parecer)
git diff --name-status a2988b5 HEAD -> 10 arquivos, todos A: 4× .claude/agents/especialistas/jurado-07b-*.md,
                                      4× .agents/agents/especialistas/jurado-07b-*.md, BRIEFING-B-O6R-07b.md, 00-inspetor-terreno.md
git diff --stat a2988b5 HEAD -- src tests prisma frontend mobile .github scripts package.json package-lock.json Kpis docs API_CONTRACTS.md -> VAZIO
git rev-parse a2988b5:src HEAD:src     -> 7f626fbc… == 7f626fbc…      (mesma árvore)
git rev-parse a2988b5:tests HEAD:tests -> 8d00ef1b… == 8d00ef1b…      (mesma árvore)
git status --porcelain --untracked-files=all -> VAZIO ; storage/ só com o .gitkeep rastreado
```

Logo os números do §4.2 da passada 1 (2938/2817, Δ +121, `npm run check` ec=0) **permanecem os números deste head** —
nada de código, teste, lockfile ou KPI mudou. **Meu parecer commitado em `3fa616f7` é o que escrevi**: blob `ee792ae353`
== `HEAD` == arquivo de trabalho == concatenação do meu scratchpad (idêntico após normalização de CR).

## P2·1 · Item 1.2 — plano de isolamento POR JURADO no briefing — **VERDE**

`agent-orchestration/omega/juntas/BRIEFING-B-O6R-07b.md` existe no head (170 linhas, commit `345ef4e0`). §3 "Isolamento
por jurado — vinculante", lido linha a linha: (1) worktree PRÓPRIO para cada jurado que mutar; (2) `npm ci` próprio,
**junction/symlink PROIBIDA**; (3) **cluster Postgres descartável PRÓPRIO por jurado; `erp-postgres`/`erp-redis` não é
alvo de ninguém, nem para leitura**; (4) remoção só por `git worktree remove --force` (+ fallback Windows); (5) não tocar
em `demo/investidor`, `gov-descuido`, `san2-r`, `status-read` — resíduo alheio se reporta; (6) a suíte grava em
`storage/checklist-attachments/<uuid>/` no worktree onde roda — limpar. **As três frases exigidas pelo mandato estão
escritas.** (Falta só "porta livre" explícita para o cluster; o §8 do plano, l.566-568, já manda medir porta por
`netsh`/`docker ps` — nota, não ressalva.)

## P2·2 · Item 2.1 — nada da ata anterior herdado como fato — **VERDE**

Briefing §5 "O que NÃO se herda como fato": *nada da ata do 07a vale aqui como medido* (com o motivo: o 07a caiu por censo
incompleto e a classe voltou como M5); onde corpo e E1 divergem **vale a E1**; piso **≥89** (a frase-ponte "65" é
errada, e diz por quê); `M-D3` não existe, é `D6`; o §2 do plano-mãe foi medido em `53e44d3` e é **suspeito** até
reconferido. §0 manda "confira, não herde"; §4 publica o meu baseline e ainda assim manda "meça o seu". §1 aponta os
insumos **no head** (plano+E1 1054 l., crítico 558 l., PDs 11/13 fontes) e avisa da cópia podre já retirada. Nenhuma
conclusão do 07a ou do porteiro é repassada como verdade.

## P2·3 · Item 3.1 — inelegibilidade por nome — **VERDE**

Roster do briefing §2: **C1 `agente-secops` · C2 `jurado-07b-contrato-mobile-b108` · C3 `jurado-07b-contrato-regressao-registro`**;
suplentes `jurado-07b-suplente-contrato-mobile-b108` / `jurado-07b-suplente-contrato-regressao-registro`. Inelegíveis
listados por nome no briefing: `planejador-mestre`, `critico-adversarial`, dev `general-purpose`, `porteiro-pos-merge`,
`inspetor-de-terreno-da-junta`. **Nenhum deles está no roster.**

Origem das 4 identidades novas, provada por **presença** (`git log --all -S<nome> --reverse`): o primeiro commit em que
cada nome existe é **`345ef4e0`** (briefing) e o corpo nasce em **`37a2c465`**; em `e55245a` (`origin/main`) → **0
arquivos**; em `HEAD` (`git grep -l`) aparecem **só** nos 4 corpos, nos 4 espelhos e no briefing — em nenhum `J-*`, `R-*`,
voto ou plano. Frontmatter `name:` == nome do arquivo nos 4. Dentro dos corpos, os nomes inelegíveis aparecem apenas na
lista de inelegibilidade (l.23-30) e na auto-declaração "identidade nova — não votei, não planejei, não desenvolvi".
`agente-secops`: corpo `6216e1324c` idêntico em `HEAD`, árvore principal e `demo/investidor`; não consta em nenhuma ata
ou voto do 07a (`git grep -l agente-secops HEAD -- J-O6R-07a-* votos/O6R-07a*` → nada; onde consta, na passada 1, é
B01/B05/SAN); achador do `SEC-004` é `o6r-seguranca` (`ATA_J6R.md` l.8). **Nenhuma colisão.** Nota: as 4 cadeiras não
fixam `model:` no frontmatter — o contrato só o exige para planejador/crítico/inspetor/porteiro; informação, não ressalva.

## P2·4 · Item 4.1 — fatia S0 (`sync-agent-agents.mjs --check`, `ec` por variável, sem pipe) — **VERDE no head · RESSALVA na árvore principal (não bloqueia)**

```
[worktree o6r07b @ 37a2c465]  node scripts/sync-agent-agents.mjs --check > f 2>&1; ec=$?  -> ec=0  "OK — 38 agentes, espelho consistente."
[árvore principal demo/investidor] idem                                                     -> ec=1  12 linhas: os 8 c5 da passada 1
                                                                                             + 4 "FALTA no espelho: .agents/agents/especialistas/jurado-07b-*"
```

**Equivalência que o orquestrador pediu para eu derrubar — não caiu.** `git hash-object` na árvore principal × blob do head:
`agente-secops.md` 6216e1324c == 6216e1324c · `jurado-07b-contrato-mobile-b108.md` 24b6e934ee == 24b6e934ee ·
`jurado-07b-contrato-regressao-registro.md` c0535d4378 == c0535d4378 · suplentes 2d2f4f04f2 / b7cd8887f0 == idem.
**O que se invoca de qualquer das duas árvores é byte-idêntico ao que está commitado no head.** Na árvore principal os 4
corpos estão como `??` (untracked, idênticos); o espelho `.agents/agents/` de lá não os tem.

**Julgamento sobre a decisão de NÃO rodar o sync na árvore principal:** correta. Rodá-lo em `demo/investidor` gravaria um
espelho descrevendo um roster com 15 identidades sepultadas pelo #364 — consolidação silenciosa entre linhas divergentes,
exatamente o que §A2 proíbe. A regra S0 existe para que o espelho Codex descreva o roster **que vota**, e isso está
satisfeito onde o roster está commitado (head, `ec=0`). A junta corre em Claude Code, que lê `.claude/agents/` — provado
idêntico. O `ec=1` da árvore principal é **condição pré-existente de `demo/investidor`** (S6), fica como ressalva ao dono,
e volta a ser bloqueio se algum jurado for emulado via Codex a partir dela.

## P2·5 · Item 5 — plano de perda de jurado — **VERDE (com uma parada declarada)**

Briefing §2: suplente nomeado para C2 e C3 (corpos existem: 346 e 401 linhas); o suplente **não herda medição** e
re-executa o briefing inteiro; **voto perdido nunca conta como aprovação**; se a **C1 `agente-secops` cair, a junta
PARA** e o orquestrador registra — C1 é obrigatória e não tem suplente. É um plano completo e interpretável pelo dono; a
parada da C1 é escolha declarada, não lacuna. Quórum: unanimidade de 3, com o porquê de não ser 5/5.

## P2·6 · Re-medições de terreno físico (1.1/1.3) — **VERDE**

`docker ps -a` → só `erp-postgres`/`erp-redis`; `git worktree list` → os 4 de origem (nenhum jurado entrou antes da
hora); `.claude/worktrees/san2-r` segue diretório vazio (inerte, alheio, não toquei); **S5 confirmado:**
`ls agent-orchestration/omega/planos/B-O6R-07b-plano.md` na árvore principal → **não existe**; no head o plano tem
**1054 linhas**, 3 ocorrências de `EMENDA E1`, blob `27991543a6` (o mesmo da passada 1). Árvore principal: 22 linhas de
status = as 19 do início − a cópia podre + os 4 corpos das cadeiras (untracked, idênticos ao head) — nada meu.

## RESSALVAS (para o orquestrador pôr em destaque)

- **R1** · Briefing §0 diz "Head do bloco `3fa616f7`"; o head real é **`37a2c465`** (o commit das cadeiras veio depois
  do briefing). O head de CÓDIGO `a2988b5` está certo. Cada cadeira mede o próprio head (§0 já manda) — mas a ata deve
  gravar `37a2c465` como head julgado de registro e `a2988b5` como head de código.
- **R2** · `--check` **vermelho na árvore principal** (12 linhas) — pré-existente (S6) + os 4 corpos novos fora do espelho
  de lá. Não bloqueia (P2·4); bloqueia se houver emulação Codex a partir de `demo/investidor`.
- **R3** · Os 4 corpos das cadeiras estão **untracked na árvore principal**. Idênticos hoje; se alguém os editar lá, a
  árvore de invocação diverge do commitado sem que `git status` do worktree acuse. Após a junta: retirar de lá ou
  reconciliar `demo/investidor` — decisão do orquestrador/dono, não minha.
- **R4** · S6 permanece: `demo/investidor` 21 atrás / 49 à frente, 15 identidades sepultadas vivas em `.claude/agents/`,
  `inspetor` de 08-25. Ressalva ao dono; o briefing não esconde.

## VEREDITO DA PASSADA 2: **LIBERADO COM RESSALVA** — **a junta PODE COMEÇAR.**

S1, S2, S3 e S5 fechados por medição minha; S4 julgado não-bloqueante com a equivalência provada por hash; S6 e R1–R4
vão ao briefing/ata em destaque. Cada cadeira nasce em worktree próprio com cluster próprio (briefing §3, vinculante);
mede o próprio head; declara `gravidade` e `escopo` com evidência; e limpa o seu `storage/`.

**Limpeza desta passada:** não criei container, worktree nem arquivo temporário fora do scratchpad; só leituras e
`hash-object`. `git status` do worktree `o6r07b` = apenas este apenso (` M 00-inspetor-terreno.md`), para o orquestrador
commitar.

— `inspetor-de-terreno-da-junta` (Fable), 2026-09-06, passada 2 — não voto, não conserto, não julgo a entrega.
