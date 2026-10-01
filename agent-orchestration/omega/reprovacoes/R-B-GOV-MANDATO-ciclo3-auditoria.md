# AUDITORIA DA MÁQUINA — B-GOV-MANDATO (PR #393), ciclo 3

**Papel:** auditor da máquina (§C7.4 item 4) · **Identidade:** `auditor-maquina-b-gov-mandato-c3` (nova; não votou nos ciclos 1–3, não planejou, não desenvolveu, não é o orquestrador) · **Modelo:** Fable 5.1 (`claude-fable-5-1`) · **Contrato lido:** `CLAUDE.md` §C7.4 item 4 em `origin/main` = `3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c` (descendente de `b3f0af5f`, provado por `git merge-base --is-ancestor b3f0af5f 3b1fe0f9` → ec=0), linhas 413–445.

**Objeto:** ramo `chore/mandato-refs-e-preflight` em `b1c0b09658dd8cd98df3e06e55131923bea50871` (resolvido por `git ls-remote origin` em 2026-10-01T01:05:49Z).

**Mandato:** as cinco perguntas do contrato, e só elas, respondidas por execução; veredito **máquina sã** ou **máquina defeituosa**. Não conserto, não proponho conserto do bloco (§C7.4-bis). Se a máquina estiver defeituosa, nomeio o defeito da máquina (orquestração ou junta) com evidência.

## 0. Terreno do auditor

```
$ date -u → 2026-10-01T01:05:49Z
$ git ls-remote origin refs/heads/main refs/heads/chore/mandato-refs-e-preflight
b1c0b09658dd8cd98df3e06e55131923bea50871  refs/heads/chore/mandato-refs-e-preflight
3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c  refs/heads/main
$ git --version → git version 2.53.0.windows.2
$ node -v → v20.19.5
$ uname -srm → MINGW64_NT-10.0-22631 3.6.6-1cdd4371.x86_64 x86_64
$ env | grep -c '^MSYS_NO_PATHCONV=' → 0 (ec=1 do grep = zero linhas)
$ git worktree add --detach C:/Users/AMP/w-audit393 b1c0b096… → HEAD is now at b1c0b096 (01:06:20Z)
$ git -C C:/Users/AMP/w-audit393 status --short | wc -l → 0
$ npm ci --no-audit --no-fund (próprio, sem junction) → em curso, log em scratchpad/audit393-npm-ci.log
```

Worktrees alheios presentes (resíduo reportado, não tocado): `.claude/worktrees/{b04a,b11,gov-descuido}`, `C:/Users/AMP/w-{conh,devs393,devt393,mandato}`.

Base viva `erp-postgres`/`erp-redis`: não é alvo; nada nesta auditoria abre conexão de banco.

---



## 1. Pergunta (a) — os achados são defeitos reais do produto, ou artefatos do processo?

Objeto lido: ata (3 ciclos), R-1/R-2/R-3, os três votos do ciclo 3 (bloco JSON de cada um), o parecer do inspetor, briefing (3 seções), plano (§0, §1.1, §10, §12–§14.20), `…-ciclo3-mutantes.md`, os 3 scripts, os 2 guards e os 7 corpos `jurado-mandato-*`. Blobs no objeto, medidos por mim (`git rev-parse --short=8 HEAD:<f>` em `w-audit393`): `mandato-preflight.sh` **faa408c8** · `mandato-mutantes.sh` **37549262** · `mandato-preflight.test.ts` **7a52d37c** — iguais aos da ata e do inspetor. `git diff --stat 28b4defd b1c0b096` → 10 arquivos, só registro (ata, R-3, votos); o código julgado é o mesmo.

### 1.1 C1‴ (invariância de forma) — os quatro bloqueantes reproduzem no script do head, com o par de controle

Arnês: script do head (`w-audit393/scripts/mandato-preflight.sh`, blob faa408c8), o shim **da própria cadeira** (`scratchpad/j3c1b/shim/refs.sh`, estado vazio) e as fixtures dela (`j3c1b/fx/`), lidas com `cat -A` antes de rodar. Comando (01:19Z):

```
MANDATO_REFS=$S/j3c1b/shim/refs.sh timeout 60 bash /c/Users/AMP/w-audit393/scripts/mandato-preflight.sh $S/j3c1b/fx/<nome>.md 4102
```

| achado | fixture (ataque) | ec | rej | par de controle (só a variável atacada muda) | ec | rej |
|---|---|---|---|---|---|---|
| **C1c-01** isenção I1 absolve linha `# gerado em:` injetada | `c-gerado-em-inj` (linha `# gerado em: … deadbeef×5` dentro do bloco) | **0** | 0 (`COLAGEM l.4-19 confere`) | `c-abuso-dentro` (mesma linha sem o prefixo) | 1 | 5 (`NAO bate`, `SHA deadbeef… nao esta na saida`) |
| C1c-01 (b) lava SHA para a prosa | `c-gerado-em-lava` | **0** | 0 | `c-gerado-em-lava-par` (sem a injeção) | 1 | 1 (`SHA deadbeef…`) |
| **C1c-02** SHA colado a caminho por `:` | `j11-sha-dois-pontos` (`deadbeef×5:CLAUDE.md`) | **0** | 0 | `j11-…-par` (mesmo SHA, espaço em vez de `:`) | 1 | 1 (`SHA deadbeef… nao esta na saida`) |
| C1c-02 (c/ `/`) | `j11c-fake-caminho` (`deadbeef×5:scripts/mandato-preflight.sh`) | **0** | 0 | — | | |
| **C1c-03** `medido por:` dentro da cerca satisfaz a afirmação de fora | `j7-token-em-cerca` | **0** | 0 | `j7-ctrl-sem-token` (cerca com `saida`) | 1 | 2 (`sem 'medido por:'` + `saida colada sem comando`) |
| **C1c-04** afirmação numérica na linha `## MEDIDO …` | `j8-afirm-no-cabecalho` | **0** | 0 | `j8-…-par` (texto na linha seguinte) | 1 | 1 (`unidade de MEDIDO sem 'medido por:'`) |
| C1c-04 (chk 5) | `j9-grep-no-cabecalho` (`## MEDIDO medido por: grep -c …`) | **0** | 0 | `j9-…-par` | 1 | 1 (`grep/rg SEM -i`) |

Os seis pares reproduzem **exatamente** como o voto descreve: `ec=0` no ataque, `ec=1` no par, diferença de uma variável. Escopo `dentro-do-bloco` conferido por mim: `git log --diff-filter=A -- scripts/mandato-preflight.sh` → `f8d5a2c8 2026-09-25` (o script nasce no bloco); `git log -S"grep -v '^# gerado em:'" -- scripts/mandato-preflight.sh` → `33356358 2026-09-28` (a isenção I1 nasce no ciclo 3, como a C1‴ afirma).

### 1.2 C2‴ — C2c-01: a ferramenta publica como "coberto" mutante que não compila; com mutante viável o guard fica verde

**(i) O mutante da ferramenta não é um programa.** Arnês montado **como a ferramenta monta** (`git archive` das dependências declaradas + `tr -d '\r'` + `git init`; 336 rastreados; `git hash-object --no-filters` do script = **faa408c8**), `aplica()` extraída **verbatim** do blob 37549262 (`sed -n '/^aplica() {/,/^}/p'`, 53 linhas) e aplicada aos quatro pontos (01:17Z):

```
l.305 op=M7(salto) diff=2 bash-n=ok exec-ec=0 stderr=awk: cmd. line:31:     if (c == 0) :
l.298 op=M10       diff=2 bash-n=ok exec-ec=0 stderr=awk: cmd. line:24:   if (0)) return
l.364 op=M7(salto) diff=2 bash-n=ok exec-ec=0 stderr=awk: cmd. line:90:  … { print "HEXLONGO", FNR, length(us); : }
l.405 op=M7(salto) diff=2 bash-n=ok exec-ec=0 stderr=awk: cmd. line:131: abre(i, l, 0); coletaGrep(i, l); fecha(); :
```

`bash -n` (l.226 da ferramenta) aprova os quatro; o awk embutido rejeita os quatro. O operador M7(salto) troca `continue|break` por `:` — no-op **do bash**, aplicado a linhas **do awk**; o M10 produz `if (0))` quando há parêntese aninhado. **Reproduzido.**

**(ii) O sinal estava na matriz publicada.** Pontos da matriz composta (`…-mutantes.md` §4.5) com `fail∈{192,196,210}`: `166 176 179 184 280 281 285 298 305 306 307 326 330 349 356 363 364 365 368 370 371 374 375 389 390 397 405 409 412 413 415 423 431 541`. Contra a lista dos 33 "awk inválidos" do C2c-01 (`comm -23`/`-13`): **diferença = só o 541** (`exit 1 → exit 0` no fim do script, que falha em massa legitimamente). Ou seja: os 33 mutantes que não compilam são **exatamente** os 33 pontos em que uma mutação de uma linha fez 192–196 dos 299 casos falharem — assinatura de crash, publicada como cobertura, e lida por quatro papéis (planejador §14.18 "87 VERMELHO", Dev-S-2 `deriva.py`, orquestrador E4, inspetor item 6) como "coberto".

**(iii) Mutantes viáveis — o comportamento muda ANTES de olhar a cor (regra (ii) do §1.1 do plano):**

- **X04 (l.298, `if (isento(num)) return` → `if (0) return`)**: shim que imprime uma linha `dica: grep -c "approved" J-4102.md` na saída real; colagem GERADA dele (01:26Z):
  `pristino → ec=0 | COLAGEM l.4-19 confere` · `X04 → ec=1 | COLAGEM … | REJEITADO invocacao de grep/rg SEM -i … l.18`. **Muda o veredito**: a isenção da checagem 5 dentro de colagem verificada não tem caso no guard.
- **X02 (l.305, `if (c == 0) continue` → `if (c == 0) ;`)**: fixture `- x, medido por: true; caixa-exata: sim`:
  `pristino → ec=0, sem AVISO` · `X02 → ec=0 | AVISO caixa-exata: isenta 0 invocacao(oes) sem -i — l.3`. Muda **só um AVISO** (veredito e `ec` iguais).
- 364 e 405 (versões viáveis da cadeira, `scratchpad/j3c2-i2/viav/pre/V364.sh`, `V405.sh`, `continue` → `;`): por leitura da fonte, 364 acrescenta uma segunda REJ (`SHA`) a uma linha já rejeitada por `HEXLONGO`, e 405 reabre a linha de cabeçalho de tabela como unidade e repete `coletaGrep` — diferenças de **contagem de mensagem**, não de veredito.

A cor do guard sobre pristino / X04 / X02 está na §1.7 (rodada em paralelo, `timeout -k 10 1500`).

**Leitura honesta da gravidade:** o achado é real pelo critério do próprio bloco ([M-1] l.720 / §7 l.937: ponto VERDE não declarado = vermelho) e o número publicado (K=100, [M-1]=0) é falso. Dos 4 pontos, **1 (l.298) é fail-open de veredito**; 3 são de mensagem. Não é fabricação: a C2‴ classificou os dois bloqueantes pelo critério do bloco e deixou em `ajuste` os 8 [M-EXT] e os controles sem `ec`.

### 1.3 C2‴ — C2c-02: o ponto 336, declarado equivalente, é discriminável

Mutante **da ferramenta** no 336 (`aplica()` verbatim → `M7(next)`, `diff` = 1 linha: `NR==FNR { …; next }` → `{ …; ; }`, `bash -n` ok), sobre a fixture da cadeira `um-milhao.md` (1 000 003 linhas, conferido por `wc -l`; conteúdo: `## MEDIDO`, 10⁶ linhas `- x, medido por: true`, `## HIPOTESE`), nos dois arneses com `.git` (01:21–01:25Z, `timeout -k 5 900`):

| script | sem PR, `MANDATO_REFS=/bin/false` | PR 7, `MANDATO_REFS=shim-sha.sh` |
|---|---|---|
| pristino | `PRE-VOO OK`, **ec=0** | `PRE-VOO OK`, **ec=0** |
| m336 | `REJEITADO o mandato cita SHA mas nao recebeu o numero do PR`, **ec=1** | `REJEITADO SHA '1000000'…'1000003' nao esta na saida`, **ec=1** |

Reproduzido: sem o `next`, as linhas do oráculo (`1000000 0 M 0`…) são lidas como documento e `1000000`–`1000003` casam o reconhecedor de SHA (7+ hex). A justificativa do planejador (§14.18: *"as linhas do oráculo … não carregam SHA"*) é falsa a partir de 10⁶ linhas. É exótico, mas é o critério A6 do próprio plano (*"equivalente só com fixture dedicada que tente discriminar"*): 245 e 318 resistiram a 30/30 tentativas da cadeira; o 336 não.

### 1.4 Hipótese contrária — há artefato de processo nos achados?

Procurado nos votos, nos corpos (c1c/c2c/c3c) e nas ERRATAs E-1…E-12 (6/9/10 por corpo, `grep -c '^> - ERRATA E-'`):

| classe do contrato | procurado em | resultado |
|---|---|---|
| **critério impossível de passar** | corpo c1c item 6 (l.318-324): *"Tente uma isenção NÃO inventariada … **Se não achar, publique o que tentou e o controle que mostra que o seu método distingue**"* — admite resultado nulo com controle; critério [M-1]=0 da C2‴: o Dev-T-6 o cumpriu para 13 de 16 pontos (13 VERMELHOS na matriz B) | **não há**: os critérios são falsificáveis e foram cumpridos em parte pelo próprio bloco |
| **premissa herdada como fato** | datas de escopo dos votos (C1c-01 → 33356358; C2c-02 → 371961ac; script → f8d5a2c8) conferidas por `git log -S` / `--diff-filter=A` / log do ramo; `head_medido` dos 3 JSON = 28b4defd por 2–3 fontes; `legalidade_ciclo_3` medida por cada um | **não há**: cada data foi medida, nenhuma herdada |
| **amostra do próprio autor** | C1‴: ~140 fixtures próprias + 27 do crítico (0 divergência) + 6 formas próprias; C2‴: semente própria `20260930393`, 21 [M-EXT] próprios, fixture `um-milhao.md` própria; as fixtures do **planejador** para os equivalentes foram **reclassificadas** pela cadeira (ERRATA E-10(a) item 7) | **não há**: as amostras são das cadeiras; a do autor foi o alvo, não o instrumento |
| **guarda de forma na própria cadeira** | critério de defeito da C1‴ = par `ec=0 × ec=1` que difere só na variável (propriedade); da C2‴ = "comportamento muda antes da cor" + vermelho-controle; a C2‴ **rejeitou** a guarda de forma da ferramenta (`fail > base` = coberto) em vez de herdá-la | **não há** |

Conclusão da hipótese contrária: **nenhum dos bloqueantes é artefato de processo**. A ferramenta de medição, sim, tinha a guarda de forma (`VERMELHO = fail subiu`) — e foi isso que a C2‴ pegou.

### 1.5 Achado da auditoria — o que a máquina DEIXOU de ver (o outro lado da vigilância do dono)

Ao executar o mutante da ferramenta na l.305 (awk morto) sobre um insumo **negativo** (`neg.md`: afirmação numérica sem `medido por:`), medi (01:19Z; `ec` lido sem cano):

```
pristino  neg.md → PRE-VOO REJEITOU 1 item(ns)  ec=1      (controle)
m305      neg.md → PRE-VOO OK                    ec=0      (awk da passada 2 morto: stderr 'awk: … syntax error')
```

`REC=$(awk … )` (l.275-436) não confere o status do awk; o script não tem `set -e` (`grep -c 'set -e\|pipefail'` = 0). **Quando a passada 2 morre, o pré-voo aprova qualquer documento.** Nenhuma cadeira nomeou isso: a C2‴ viu o `syntax error` e descreveu o efeito como *"o guard falha em massa"* (olhou a cor do guard, não a resposta do artefato). Registro como **achado da auditoria** (não é voto; não proponho conserto): a máquina não fabricou achado, mas tem um ponto cego nomeável — ver (b).

*Nota de honestidade do auditor:* na primeira leitura do controle eu li `ec=0` para o pristino sobre `neg.md` porque o `ec` saiu de `| tail -2` (classe A5/A9 do plano: cano que mascara o código); refeito sem cano → `ec=1`. Fica registrado.

### 1.6 Resposta (a)

**Defeitos reais.** Os 6 bloqueantes do ciclo 3 reproduzem no script e na ferramenta do head, com par de controle, antes de olhar cor de guard; nenhuma das quatro classes de artefato do contrato se aplica; a calibração de gravidade das cadeiras é defensável (1 dos 4 pontos do C2c-01 é fail-open de veredito, 3 são de mensagem — a cadeira não escondeu isso). A máquina **não fabricou**; **deixou de ver** um (§1.5).

## 2. Pergunta (b) — a composição cobre a competência que os achados exigem, e a inelegibilidade foi conferida por nome?

**Competência × achados (por leitura dos JSON e dos corpos):** C1‴ (`jurado-mandato-c1c-invariancia-de-forma`, corpo 450 l.) produziu C1c-01…04 — todos da classe "propriedade × forma", a sua pergunta única; C2‴ (`…c2c-cobertura-por-mutacao`, 443 l.) produziu C2c-01/02 — a honestidade da matriz, a sua pergunta única; C3‴ (`…c3c-fronteira-numero-registro`, 576 l.) ficou em escopo/KPI/registro e aprovou com 3 ajustes de registro. **Cada bloqueante nasceu na cadeira cuja competência o exige** — e o achado mais fundo do ciclo (a ferramenta de medição errada) nasceu exatamente na cadeira criada para ele (R-2 (a): *"cobertura por mutação … é o especialista a criar"*). A composição cobriu.

**Lacuna de competência que esta auditoria nomeia (§1.5):** nenhuma cadeira, em nenhum dos três ciclos (c1 "fail-closed do pré-voo", c1′ `guardiao-fail-closed`, c1‴ "invariância de forma"), tem no mandato *"comportamento do artefato quando um componente interno dele falha"*; a tabela §1.1 do plano (A1–A14) também não tem essa classe. O pré-voo respondendo `PRE-VOO OK ec=0` com o awk morto ficou invisível a três juntas. É lacuna de **composição/plano**, não de voto.

**Inelegibilidade por nome, por execução (01:15Z, em `w-audit393`):**

```
$ git grep -l -E 'c1c-invariancia-de-forma|c2c-cobertura-por-mutacao|c3c-fronteira-numero-registro' origin/main -- agent-orchestration docs
agent-orchestration/omega/juntas/BRIEFING-B-GOV-SEM-TETO.md      ← "as cadeiras DESIGNADAS para a junta 3 do #393" (registro do #394)
docs/revisoes/SAN3/B-GOV-SEM-TETO-plano.md                        ← idem
$ grep -c -i -E 'c1c|c2c|c3c|invariancia-de-forma|cobertura-por-mutacao' agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md → 0
$ printf '%s\n' <18 nomes: 9 cadeiras c1-c3, 2 devs c1-c2, 5 devs c3, planejador, inspetor> | sort | uniq -d | wc -l → 0
```

As três identidades do ciclo 3 **nunca votaram, nunca planejaram, nunca desenvolveram** (aparecem na `main` só como "designadas"); nenhum nome se repete entre papéis. O inspetor fez a mesma conferência (parecer item 12: grep nas atas → 0, obituário → 0, censo de autoria por commit). **Censo de autoria de código, refeito por mim:** `git log origin/main..b1c0b096 -- scripts/mandato-*.sh tests/mandato-*.test.ts` → **17** commits; **5** são ancestrais de `34969a81` (ata do ciclo 2: código dos ciclos 1–2, autores inelegíveis declarados); os **12** do ciclo 3 estão **todos** na lista de devs do briefing (`6c8fb3e8 4ad4ba9f 33356358 616fd4fa 72214ff7 1466c7d9 714d4815 d222ce7c 9d3de5dd c32f77b5 395d07c9 396643aa 190e2300 9e8cf1cd` ⊇ os 12; 0 "FORA"). *"O orquestrador não escreveu código no ciclo 3"* confere por medição. **Corpos aplicados = blobs:** md5 EOL-neutro de `28b4defd:` e `b1c0b096:` dos 3 corpos = `35765f76` / `71415699` / `f12be570`, iguais aos declarados nos 3 JSON e na ata; ERRATAs prefixadas 6 / 9 / 10 (`grep -c '^> - ERRATA E-'`), iguais à tabela do briefing.

**Separação de papéis (§C7.4-bis) no ciclo 3:** achadores (C1′, C2′ do ciclo 2) ≠ planejador (`planejador-mestre`, Fable — `D-PLANEJADOR-MODELO-FABLE` cumprido: `PLANO-393-S14.md` l.3 declara Fable 5.1 e md5 do corpo `4c912f69`) ≠ devs (7 identidades, nenhuma cadeira). O conserto de comentário T6 foi do **autor** (Dev-T-4) para achado do Dev-T-5 (§14.17) — correto. Um ponto a registrar, **não como violação**: o planejador classificou 3 não-cobertos como "equivalentes" com fixtures próprias (§14.18) — isto é *julgar a validade de um achado da E4*, papel que o §C7.4-bis reserva a quem acha; o plano mitigou mandando a C2‴ reclassificar com fixture própria (E-10(a) item 7), e foi a C2‴ que derrubou o 336. O mecanismo de correção funcionou.

**Resposta (b): sim** — composição adequada aos achados feitos; inelegibilidade conferida por nome, por execução, pelo inspetor e por mim. Com uma lacuna nomeada (falha interna do artefato) que nenhuma composição cobriu.

## 3. Pergunta (c) — o planejador está usando dado podre?

As duas premissas que o R-3 declara podres, **medidas** (não herdadas):

1. **§14.18 — os 3 "equivalentes" (245, 318, 336).** O planejador mediu com fixtures próprias (`semcab.md`, `tabela.md`, `paste2.md`/`bullets.md`/`paths.md`) e publicou "IGUAL". Medido por mim (§1.3): **336 é discriminável** (pristino `OK ec=0` × mutante `REJ ec=1` em 10⁶ linhas, com e sem PR); 245 e 318 resistiram a 30/30 fixtures da C2‴. A premissa estava **errada em 1 de 3** — e era a classe A6 da própria tabela do plano (*"sonda fraca → falso equivalente"*).
2. **§14.2.1 — o blob da ferramenta `37549262` congelado "com o `bash -n`".** Medido (§1.2 i): o `bash -n` da l.226 aprova mutantes cujo awk embutido não compila; 33 pontos entraram em K por crash. O plano **nunca especificou** um controle "mutante é um programa": `grep -i 'compila|sintaxe|bash -n'` nas l.692-748 (§E4) → **0**; o único lugar onde "não compila" aparece antes da junta é o **cabeçalho da própria ferramenta** (escrito pelo Dev-S) e o §14.4 l.1386 (anomalia l.164, que o `bash -n` **pegou**, o que reforçou a confiança). O planejador herdou a **autodescrição da ferramenta** como fato.

**Premissa podre que ninguém nomeou — a assimetria boa/má notícia.** O planejador verificou **por comportamento** cada um dos **16 não-cobertos** (§14.18, tabela "pristino × mutante DIFERE/IGUAL", 18 mutantes refeitos com o `sed` da ferramenta) e **nenhum dos 87 cobertos**. A má notícia foi auditada; a boa foi aceita. O mesmo vale para o Dev-S-2 (`deriva.py` conta categorias), o orquestrador (rodou a E4) e o inspetor (item 6 deriva `[M-1]=0` dos conjuntos — dentro do mandato dele, que é terreno). O sinal estava legível no artefato publicado desde 30/09 00:44 (`E4/preflight.txt`) e no §4.5 do `…-mutantes.md`: **33 pontos com `fail∈{192,196}` de 299 — o conjunto exato dos 33 awk-inválidos** (§1.2 ii). A classe A14 do próprio plano (*"o caso cai por OUTRA causa que não a anunciada"*) estava na tabela §1.1 e **não foi atribuída a nenhum papel para a matriz** — só a C2‴ a aplicou, na junta. Esta é a premissa podre de maior custo do ciclo: fez o §14.18 decidir "13 testes + 3 equivalentes" sobre um K falso, e o §14.20 publicar `[M-1]=0`.

**O lema do §14.18(3)** (VERMELHO em A → VERMELHO em B) é válido, mas **vácuo** para mutante que não compila: o crash de A é o crash de B. A C3‴ mediu as premissas (a)–(e) do lema corretamente; o lema não tinha como ver o que a sua premissa "VERMELHO = o guard reagiu a comportamento" escondia.

**O que NÃO estava podre (conferido):** §14.19 (MSYS_NO_PATHCONV) — a C2‴ reproduziu A e refs sem a variável com 0 divergência; §0.3 (5 bloqueantes do ciclo 2 reproduzidos pelo planejador em cópia pristina); §14.1/E-1 (texto do gatilho = `origin/main` l.413-445, conferido por mim); R-2 (c) — o planejador **derrubou** uma premissa da C1′ ao medir (não há assimetria tabela × bullet). O planejador mede; o que ele não mediu foi a boa notícia da ferramenta.

**Resposta (c): sim**, em duas premissas declaradas (336 e `bash -n`) e numa não declarada (K=87 aceito sem prova de comportamento), todas do mesmo mecanismo: **número da ferramenta de medição tomado como fato sem o controle A14 que o plano já tinha**. A junta pegou; o pré-junta não.

## 4. Pergunta (d) — o mandato do orquestrador foi conferido antes do voto?

**O que é "mandato" aqui e o que está versionado.** O mandato de cada cadeira = corpo (`.claude/agents/especialistas/jurado-mandato-*.md`, 2 espelhos) + ERRATAs prefixadas + briefing (`BRIEFING-B-GOV-MANDATO.md`, seção Ciclo 3) + plano §10/§14. **O prompt de lançamento não está versionado** (confirmado: `agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo3/` tem inspetor e votos, nenhum prompt; o scratchpad tem `briefing-393-c3.final.md` = a seção versionada, byte a byte salvo cabeçalho; nenhum arquivo de prompt de cadeira). Implicação: **a pergunta só é respondível para a parte versionada**; sobre o prompt, esta auditoria não afirma nada — e isso é, por si, um fato sobre a máquina (ver §6).

**A parte versionada foi conferida antes do voto, por execução de quem?**
- **Inspetor** (parecer item 11): briefing l.155-157 "insumo a re-verificar"; §0 do plano marcado "a re-verificar"; nenhuma conclusão de ata repassada como fato; item 12: inelegibilidade por nome; item 3.3: md5 dos 3 corpos que cada cadeira teria de declarar. **Mas o corpo do inspetor não tem item "mandato"**: `grep -n -i 'mandato' .claude/agents/inspetor-de-terreno-da-junta.md` → **0 linhas**. A conferência do briefing existe por prática (B2 do ciclo 2: *"instrução que vive só no chat não é regra"*), não por contrato do inspetor.
- **Cadeiras**: os 3 JSON trazem `head_medido` (2–3 fontes), `legalidade_ciclo_3` (decisoes.md l.2633 + `gh pr view 394`), md5 do corpo, blobs — cada cadeira re-mediu o que o briefing afirma.

**O pré-voo do bloco — a ferramenta que o bloco entrega para conferir o mandato do orquestrador — foi aplicado a quê no ciclo 3?** `grep -l 'PRE-VOO OK|mandato-preflight.sh'` no scratchpad: `DEV-S2-K1/K1b/K2b/K2c`, `DEV-T-CICLO3`, `DEV-T3-CICLO3`, `INSPETOR-393-J3` (baseline) — **relatórios de dev** (§14.16 decisão 5: "pré-voo dos relatórios obrigatório"). **Não ao mandato nem ao briefing.** Executado por mim (01:21Z, `w-audit393`, refs real via `gh`):

```
$ bash scripts/mandato-preflight.sh $S/audit393-mandato-auditor.md 393      ← o mandato DESTA auditoria (prompt, transcrito)
REJEITADO  falta a secao '## MEDIDO' · falta a secao '## HIPOTESE' · linha(s) de conteudo fora de MEDIDO/HIPOTESE … → PRE-VOO REJEITOU 5 item(ns). ec=1
$ sed -n '/^# Ciclo 3 — briefing/,$p' agent-orchestration/omega/juntas/BRIEFING-B-GOV-MANDATO.md > …/audit393-briefing-c3.md (123 l.)
$ bash scripts/mandato-preflight.sh …/audit393-briefing-c3.md 393           ← o briefing VERSIONADO do ciclo 3
REJEITADO  falta a secao '## MEDIDO' · … → PRE-VOO REJEITOU 43 item(ns). ec=1
```

O bloco cujo título é *"o mandato do orquestrador passa a ser verificável por máquina"* chegou ao ciclo 3 sem que o mandato do orquestrador (briefing, prompts) passasse pela máquina que ele entrega. O briefing tem número com fonte em prosa (bom), mas não na forma que o pré-voo exige — logo, na prática, **o mandato foi conferido por leitura humana/agente (inspetor + cadeiras), não pelo instrumento do bloco**.

**Resposta (d): parcial** — sim para a parte versionada, por execução do inspetor (fora do contrato dele) e das três cadeiras; **não verificável** para o prompt de lançamento (não é artefato); e **não** pelo instrumento do próprio bloco (rejeita o briefing com 43 itens e o mandato do auditor com 5).

## 5. Pergunta (e) — o terreno foi limpo em cada ciclo, e o inspetor liberou cada junta?

**Inspetor liberou cada junta (por execução — `grep VEREDITO` nos pareceres):**

| ciclo | parecer | veredito | onde |
|---|---|---|---|
| 1 | `INSPETOR-393.md` | `LIBERADO COM RESSALVA — 0 bloqueios` (7 ressalvas) | scratchpad (não versionado) |
| 2, 1ª passada | `INSPETOR-393b.md` | `**BLOQUEADO** — 2 bloqueios, 5 ressalvas` (B1 cadeira contaminada; B2 enunciados só no chat) | scratchpad |
| 2, 2ª passada | `INSPETOR-393c.md` | `**LIBERADO COM RESSALVA** — 0 bloqueios, 6 ressalvas` (R2 FORTE contra o orquestrador) | scratchpad |
| 3 | `00-inspetor-terreno.md` | `**LIBERADO COM RESSALVA**` (0 bloqueios, R1–R5) | **versionado**; md5 EOL-neutro = `INSPETOR-393-J3.md` do scratchpad (`4f21db94…`, byte a byte) |

Nenhuma junta votou sem liberação; o bloqueio do ciclo 2 foi real e foi fechado antes da 2ª passada. Os 3 votos do ciclo 3 versionados são byte-idênticos aos do scratchpad (`791c2986` / `fcc00c94` / `81f75ced`).

**Terreno durante o voto (ciclo 3):** base viva intocada — `docker ps -a`: `erp-postgres Up 3 days (healthy)`, `erp-redis Up 3 days`, nenhum `jur-*`/`crit-*`; os 2 contêineres da C3‴ (`pg-j3c3b` 55493 / `redis-j3c3b` 56493) não existem mais (derrubados, como o JSON dela declara). Censo de processos antes das minhas execuções (`Get-CimInstance Win32_Process`, filtro node|tsx|bash|awk|postgres|redis|npm): **0**. Worktrees das cadeiras (`w-j3c1/2/2h/3`) **não existem** em `git worktree list` — removidos pelo nome, como cada JSON declara. Os 4 ` M` da árvore principal que o inspetor apontou (R3) hoje são **0** (`git status --porcelain | grep -c '^ M'`).

**Limpeza — o que NÃO foi feito, por execução:**
1. **Sem a linha §C5 do ciclo 3 na trilha** (C3c-02 da C3‴, confirmado): `sed -n '4840,4999p' agent-orchestration/codex/log-execucao.md | grep -i 'limp|§C5|worktree remove'` → **0 linhas** (as seções do ciclo 3 em l.4840, 4922, 4962 existem; nenhuma reporta limpeza). A regra §C5 diz "reportada em 1 linha, nunca silenciosa".
2. **Resíduo alheio em disco, não registrado como worktree:** `ls -d /c/Users/AMP/w-*` × `git worktree list` → **`w-j3c2-a`** (14 entradas, sem `.git`, mtime 30/09 06:49) e **`w-j3c2-b`** (2 entradas, 06:20) — sobras da **1ª instância da C2‴** (morta ~06:50, R-3 item 4), que a 2ª instância reportou como alheio e o orquestrador não varreu. `w-devs393`/`w-devt393`/`w-mandato` ficam por declaração (ERRATA E-6).
3. **`/tmp`:** 30 diretórios `tmp.*` (30/09 13:32–16:15, cada um com `mandato.norm` + `oraculo` = `TMPD` do pré-voo cujo `trap … EXIT` não rodou — processos mortos por `timeout -k` nas rodadas das cadeiras) + `mandato-preflight-{DAu0al,EKBGNh,icpdJ6}` (22/351/352 arquivos: `mkdtemp` do guard, cuja limpeza é `process.on("exit")` best-effort e não roda quando o processo é morto). Inertes, pequenos, alheios: **reportados, não varridos** (esta auditoria não apaga nada que não seja seu).

**Resposta (e): sim, com ressalva** — o inspetor liberou cada junta (e bloqueou uma, com razão); as cadeiras limparam o que era delas; **a limpeza do ciclo 3 não foi reportada (§C5)** e há resíduo da 1ª instância da C2‴ e de processos mortos por timeout.

### 1.7 A cor do guard sobre os mutantes viáveis — fecha o C2c-01 por execução

Três rodadas do guard **inteiro** (`tests/mandato-preflight.test.ts`, blob 7a52d37c), em paralelo, `cwd` = `w-audit393`, `timeout -k 10 1500`, TAP em arquivo, `ec` por arquivo (01:22:42Z → 01:34:16Z):

```
$ node --test --import tsx --test-reporter=tap $A/<v>/tests/mandato-preflight.test.ts > $A/<v>.tap
pristino : ec=0  tests=312 pass=312 fail=0 skipped=0     (linha de base, no MESMO arnês)
X04 l.298: ec=0  tests=312 pass=312 fail=0 skipped=0     ← SOBREVIVE (muda o VEREDITO: §1.2 iii)
X02 l.305: ec=0  tests=312 pass=312 fail=0 skipped=0     ← SOBREVIVE (muda um AVISO)
```

Confirmado o C2c-01 nos dois pontos que reproduzi: o guard 312/312 fica verde com cada mutante **viável** presente, enquanto a matriz publicada traz `298 | M10 | fail=196 | VERMELHO` e `305 | M7(salto) | fail=196 | VERMELHO`. Os 196 eram o awk morto, não cobertura. Com o X04 sobrevivendo, o `[M-1]` publicado como 0 é **≥ 1 por este ponto sozinho** (o 336 da §1.3 soma outro; a cadeira contou ≥ 5).

## 6. Veredito

### 6.1 Resumo das cinco respostas

| pergunta | resposta | base |
|---|---|---|
| (a) achados reais ou artefatos? | **reais** | §1.1–1.3: 6 bloqueantes reproduzidos no head com par de controle; §1.4: nenhuma das 4 classes de artefato se aplica |
| (b) composição cobre; inelegibilidade por nome? | **sim** | §2: cada bloqueante nasceu na cadeira da sua competência; `git grep` na main = só "designadas"; obituário 0; censo de autoria 12/12 devs nomeados; md5 dos corpos = blobs |
| (c) planejador com dado podre? | **sim** | §3: 336 discriminável; `bash -n` não cobre o awk; K=87 aceito sem prova de comportamento (A14 não aplicada à matriz) |
| (d) mandato conferido antes do voto? | **parcial** | §4: parte versionada conferida pelo inspetor (sem item no corpo dele) e pelas cadeiras; prompt não é artefato; o pré-voo do bloco rejeita o briefing (43) e o mandato do auditor (5) |
| (e) terreno limpo e inspetor liberou? | **sim, com ressalva** | §5: 4 pareceres, 1 bloqueio real fechado, base viva intocada, 0 processos; sem linha §C5 no ciclo 3; resíduo `w-j3c2-a/b` + 33 dirs em `/tmp` |

### 6.2 O que a junta fez certo (para que o conserto não a alcance)

A junta do ciclo 3 **não fabricou**: todo bloqueante reproduz, com par de controle, no artefato do head, e as cadeiras calibraram (notas para o exótico: `&#95;`, CR solitário, `` ```a``` ``; `ajuste` para os 8 [M-EXT] e os controles sem `ec`). A C2‴ fez o que três papéis pré-junta não fizeram — perguntou se o mutante era um programa — e reproduziu a matriz linha a linha **antes** de a derrubar, que é a ordem certa. A C3‴ aprovou com 3 ajustes de registro todos verdadeiros (confirmei o C3c-02 por `grep`). A inelegibilidade foi conferida por nome; o inspetor bloqueou quando havia motivo (ciclo 2) e liberou com ressalvas verificáveis. A retomada da C2‴ após o 429 na mesma instância está declarada com hora e com os jobs re-verificados no disco; é a forma do briefing ("queda relança a mesma identidade"), e o voto não herdou nada de fora.

### 6.3 Veredito: **MÁQUINA DEFEITUOSA** — na orquestração e no plano pré-junta; a junta está sã

Os defeitos são **da máquina** (de orquestração/plano, não de voto), nomeados com a evidência, e nenhum é conserto do bloco (§C7.4-bis — quem conserta a máquina é outro papel; o conserto fica registrado neste mesmo arquivo):

**D-M1 — [orquestração/plano] A boa notícia da ferramenta de medição não tem quem a confira antes da junta.** Evidência: §1.2(ii) e §3 — os 33 pontos com `fail∈{192,196}` na matriz publicada são exatamente os 33 mutantes que não compilam; o planejador (§14.18) verificou por comportamento os 16 não-cobertos e nenhum dos 87 cobertos; Dev-S-2 (`deriva.py`), orquestrador (E4) e inspetor (item 6) contaram categorias; a classe A14 estava na tabela §1.1 do plano e não foi atribuída a papel nenhum para a matriz; o `[M-1]=0` do §14.20 e o K=100 do K2b nasceram daí. Custo: o ciclo 3 inteiro julgou um número "reproduzível e errado" (palavras da própria ata). É a mesma classe do ciclo 2 ("30 mutações" sem denominador) — **o pré-junta repete a classe; a junta não**.

**D-M2 — [orquestração] O mandato de lançamento não é artefato, e o instrumento do bloco não é aplicado ao mandato.** Evidência: §4 — nenhum prompt versionado; corpo do inspetor sem item "mandato" (`grep` → 0); o pré-voo do bloco foi aplicado a 6 relatórios de dev e a nenhum briefing/mandato; executado, rejeita o briefing versionado do ciclo 3 (43 itens) e o mandato desta auditoria (5). Consequência: a pergunta (d) do contrato é **irrespondível** para o prompt, e o próprio precedente da máquina (B2 do ciclo 2: "instrução que vive só no chat não é regra") não é cumprido para o ato que lança as cadeiras.

**D-M3 — [plano/composição] A classe "falha interna do artefato → fail-open" não existe na tabela §1.1 nem em mandato de cadeira.** Evidência: §1.5 — `m305 neg.md → PRE-VOO OK ec=0` com o awk da passada 2 morto; `REC=$(awk …)` sem conferência de status, sem `set -e`; três juntas (c1 fail-closed, c1′ `guardiao-fail-closed`, c1‴ invariância) não a viram; a C2‴ viu o `syntax error` e leu a cor do guard. É o "deixando de ver os reais" do dono, nomeado.

**D-M4 — [orquestração/limpeza] §C5 não reportada no ciclo 3 e resíduo da 1ª instância não varrido.** Evidência: §5 — 0 linhas de limpeza nas três seções do ciclo 3 em `log-execucao.md`; `w-j3c2-a` (06:49) e `w-j3c2-b` (06:20) em disco fora de `git worktree list`; 30 `TMPD` do pré-voo + 3 `mkdtemp` do guard em `/tmp`. Menor; não muda mérito; é a regra "nunca silenciosa".

**O que NÃO é defeito da máquina (e não deve ser "consertado"):** a junta ter achado quatro formas novas no pré-voo pela terceira vez — isso é a junta funcionando sobre um artefato que o plano decidiu fail-closed por inventário (E2 regra 3); a convergência depende de D-M1/D-M3, não de reduzir a junta. A retomada pós-429. A maioria de 3 sem veto (o bloco não toca dinheiro/segurança/permissão/dado — conferido pelas C3 dos 3 ciclos por geração).

**Depois da auditoria, continua-se (§C7.4 item 4):** máquina defeituosa → conserta-se a máquina primeiro (D-M1 a D-M4, por papel que não auditou), registra-se o conserto neste arquivo, e o ciclo 4 abre. Nada aqui é conserto do bloco; o planejador do ciclo 4 recebe este parecer e os três votos.

## 7. Limpeza (§C5, 1 linha) — 01:37Z

Criado e removido pelo nome: worktree `C:/Users/AMP/w-audit393` (`git worktree remove --force`, ec=0, `status --porcelain` 0 antes; `npm ci` próprio, sem junction) e as 8 cópias do arnês + `pacote.tar` em `scratchpad/audit393-arn/` (83M → 313K; ficam só saídas, TAPs, logs, fixtures e os 2 shims, como evidência reexecutável); processos vivos ao fim: **0** (`Get-CimInstance Win32_Process`, filtro `audit393|node|awk|tsx`, 01:36:58Z); nenhum contêiner criado; base viva `erp-postgres`/`erp-redis` `Up 3 days`, nunca alvo; nenhum arquivo rastreado tocado (árvore principal: 0 modificados); resíduo alheio (`w-j3c2-a/b`, 33 dirs em `/tmp`, worktrees de devs) **reportado, não varrido**. Nota de forma: a §1.7 está depois da §5 (anexada quando a rodada do guard terminou); a referência cruzada da §1.2 aponta para ela.
