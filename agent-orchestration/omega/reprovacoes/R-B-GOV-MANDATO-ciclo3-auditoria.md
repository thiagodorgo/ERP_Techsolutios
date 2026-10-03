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

## 8. Conserto da máquina (plano)

**Papel:** `planejador-mestre` (§C7.4 item 4: *"máquina defeituosa → conserta-se a máquina primeiro"*; `D-PLANEJADOR-MODELO-FABLE`) · **Identidade:** `planejador-conserto-maquina-b-gov-mandato` (nova: não votou nos ciclos 1–3, não desenvolveu, não auditou, **não é** o planejador das §14–§14.20 — inelegível por dado podre, §3) · **Modelo:** Fable 5.1 (`claude-fable-5-1`), sem substituição · **Corpo:** `origin/main:.claude/agents/planejador-mestre.md`, md5 EOL-neutro `4c912f69a93f07b14d8fd1c49539c778` (confere) · **Objeto:** `chore/mandato-refs-e-preflight` em `968d15b4` (= `origin`), lido inteiro: este parecer (§0–§7), `R-B-GOV-MANDATO-{1,2,3}.md`, as três seções de `J-B-GOV-MANDATO.md`, os JSON dos votos C1‴/C2‴ e o parecer do inspetor em `votos/B-GOV-MANDATO-ciclo3/`, o plano do ciclo 3 (§1.1, §10, §14.12, §14.18–§14.20), os corpos `inspetor-de-terreno-da-junta` / `porteiro-pos-merge` / `critico-adversarial` / `planejador-mestre`, `conhecimento-de-terreno.md` (`origin/docs/conhecimento-de-terreno` = `38dc7f1f`, PR #396), a pendência `P-GOV-AUDITORIA-MAQUINA-PECAS-ABERTAS` (`pendencias.md` l.9958) e o plano `B-GOV-CICLOS-RESIDUAIS` (`36f68126`, §2.2/§3/§6/§10) · **Data:** 2026-09-30 22:40–23:10 (−03:00) · **Evidência incremental:** `scratchpad/PLANO-CONSERTO-MAQUINA.md` (+ `scratchpad/plconserto/`).

**O que este §8 é e não é.** É o desenho do conserto da **máquina** (orquestração e plano pré-junta), registrado aqui porque o contrato manda (*"o conserto fica registrado no mesmo arquivo do parecer"*). **Não** conserta o bloco: o pré-voo (C1c-01…04), a ferramenta de mutação (C2c-01/02, fronteiras 25–28) e os ajustes das cadeiras são do **ciclo 4**, com planejador e devs próprios. Quem auditou (`auditor-maquina-b-gov-mandato-c3`) não conserta — mas **atesta** (§8.7). O orquestrador versiona este arquivo; não escreve código do bloco. A fábrica escreve corpos; o orquestrador os versiona.

### 8.0 Medido por mim, não herdado

Worktree `C:/Users/AMP/w-plconserto` detached em `968d15b4`, `npm ci` próprio, sem junction; `env | grep -c '^MSYS_NO_PATHCONV='` = 0; git 2.53.0.windows.2; node v20.19.5; base viva nunca alvo; `timeout` em tudo.

| # | o quê | comando (forma) | resultado |
|---|---|---|---|
| M1 | **D-M2** — o briefing versionado do ciclo 3 | `sed -n '/^# Ciclo 3 — briefing/,$p' agent-orchestration/omega/juntas/BRIEFING-B-GOV-MANDATO.md` (123 l.) → `timeout -k 10 300 bash scripts/mandato-preflight.sh <arq> 393` | **ec=1, 43 REJEITADO** (= §4): falta `## MEDIDO`, falta `## HIPOTESE`, conteúdo fora das seções, ~39× "SHA … nao esta na saida de mandato-refs.sh 393", l.92 token reservado `approved_head` fora da colagem |
| M2 | **D-M2** — o mandato que lançou **esta** identidade (transcrito, 19 l.) | idem, PR 393 | **ec=1, 9 REJ** (2× falta seção · conteúdo fora · 2 SHAs fora do refs · 3 caminhos + 1 diretório inexistentes no `RAIZ`) — o ato que lança o conserto da máquina também não passa pela máquina |
| M3 | **D-M2 (controle)** — `scratchpad/mandato-dev-393.md`, o mandato de dev que **passou** no pré-voo no lançamento (ciclo 1, head `f8d5a2c8`) | idem, PR 393 | **hoje ec=1, 6 REJ**: *"SHA 'f8d5a2c8' nao esta na saida … e pode ser SHA VELHO: o ramo anda"* + conteúdo fora (l.2-7). **O veredito do pré-voo é indexado ao head**: `PRE-VOO OK` é uma afirmação sobre um instante, não sobre o documento |
| M4 | **D-M3** — mutante da l.305 (`if (c == 0) continue` → `:`, operador M7(salto) da ferramenta) | cópia LF do blob (`tr -d '\r'`; `git hash-object --no-filters` = **`faa408c8`**), `sed '305s/…/…/'` → `diff` = **1 linha** (`305c305`); `bash -n` **ok**; `neg.md` = `## MEDIDO` / `- suite 3103/3105 verde e CI 14/14` / `## HIPOTESE` / `- …, derruba com: true`; `timeout -k 5 60` | pristino → **ec=1** `REJEITADO unidade de MEDIDO sem 'medido por:' — l.2` (stderr 0 l.) · **m305 → ec=0 `PRE-VOO OK`**, stderr `awk: cmd. line:31: if (c == 0) : ^ syntax error` · **m298** (M10 `if (0)) return`) → **ec=0 `PRE-VOO OK`**, `awk: cmd. line:24: syntax error` · controle positivo `pos.md` (com `medido por: true`) → ec=0 nos três (o mutante não "rejeita tudo": **aprova tudo**) |
| M5 | **D-M1** — a assinatura de crash na matriz **publicada** (`…-ciclo3-mutantes.md` §4.5, 162 linhas) | `grep -E '^[AB] \| [0-9]+ \| '` → histograma de `fail=` entre os 100 VERMELHOS; `comm` contra a lista do C2c-01 | `fail=196`×**29** · `192`×**4** · `210`×**1** (os outros 66 VERMELHOS: 1×18, 2×7, 9×6, 23×4, resto ≤2) → **34 pontos** = os 33 do C2c-01 **∪ {541}**; `comm` nas duas direções: só o 541 (= §1.2(ii)). **29 linhas com o mesmo `fail=196` de 299 testes eram legíveis sem mutante** |
| M6 | corpos de gate/especialista | `grep -c -i mandato` no inspetor (`origin/main` **e** objeto, md5 `de80b2a9` nos dois) · `grep -c -iE 'interno\|morte\|componente'` no `guardiao-fail-closed` · `grep -c -iE 'artefato de processo\|dois lados\|boa not'` no `planejador-mestre` | **0 · 0 · 0**. "Classes de artefato de processo" existem só no plano do ciclo 3 e nos 3 corpos `jurado-mandato-c*c` — **não há catálogo permanente** |
| M7 | **D-M4** | `scratchpad/limpeza-DM4.txt` (22:39:06–22:39:11) · `grep -n -iE 'limpeza\|§C5\|DM4'` em `log-execucao.md` após l.4830, objeto e árvore principal | disco: `w-j3c2-a/b` removidos pelo nome, 30 dirs em `/tmp`, restam 0, 8 worktrees vivos — **pago**. Registro: **0 linhas** — a linha §C5 do ciclo 3 **continua ausente** |
| M8 | "Parte 6.6" (texto livre × campos declarados) citada no meu mandato | `git grep -n -iE 'texto livre\|campos declarados'` em `HEAD` do objeto, `36f68126`, `38dc7f1f`; `grep -rl` no scratchpad inteiro | **0 ocorrências sobre a forma do mandato** (os hits são cópias de `pendencias.md` e um inventário de outro bloco) — a pergunta ao dono (§8.8) é formulada a partir do enunciado do mandato e das medições M1–M3 |
| M9 | escopo do `B-GOV-CICLOS-RESIDUAIS` (`36f68126` §6) para saber o que ele pode absorver | leitura | inspetor **só** itens 2.0/2.1/2.2/3.3/3.4; `planejador-mestre`, `guardiao-fail-closed`, "todo corpo não nomeado", `scripts/**` **PROIBIDOS** → peça fora disso = emenda de escopo (do planejador daquele bloco) **ou** bloco próprio |

Nota de honestidade: a 1ª tentativa do M4 aplicou `sed -i` sobre o arquivo rastreado (CRLF) e o `diff` saiu com 541 linhas — o `sed` reescreveu o EOL (classe "âncora em CRLF", `conhecimento-de-terreno.md` §2.6). Os `ec` eram os mesmos, mas o mutante não era de 1 linha; descartada, refeita em LF com `hash-object` = blob. E a 1ª tentativa de apensar esta seção morreu no spawn (`ENAMETOOLONG`, classe A10 da §1.1): conferido `porcelain` 0 e 253 linhas antes de refazer por arquivo.

### 8.1 Diagnóstico de uma linha — os três defeitos são uma classe, do lado pré-junta

**A máquina confere o que lhe parece mau e aceita o que lhe parece bom.** D-M1: a má notícia (16 não-cobertos) foi medida por comportamento, a boa (87 cobertos) foi aceita pela cor. D-M2: o mandato é conferido quando algo dá errado (B2 do ciclo 2), não antes de lançar. D-M3: "fail-closed" foi provado contra insumo adversarial, nunca contra a morte do próprio artefato. O conserto são **três propriedades** — não três formas — cada uma com casa, régua e executor. A régua é a do cabeçalho do pré-voo (l.9) e da convenção ⇄ do plano (§1): **para cada critério, a mutação que o deixaria vermelho.**

### 8.2 D-M1 — a boa notícia tem conferente

**(i) Propriedade P1 — "Número de ferramenta de medição não é fato até ter CAUSA por ponto e conferência dos DOIS lados."** Três partes: **P1a** (do artefato) — toda matriz publicada traz, por ponto, a **causa** do veredito (para VERMELHO: o 1º caso que falhou **e** a 1ª linha do stderr do artefato mutado; para VERDE: a prova de comportamento diferente) e o **histograma** de `fail=`; um valor modal com multiplicidade ≥ 10 % de N é marcado pela própria ferramenta `ASSINATURA-DE-CRASH — nao conta ate conferencia`; **P1b** (da máquina) — antes do inspetor, uma identidade **distinta do runner e do dev da ferramenta** confere **por amostra com semente publicada, dos dois lados** (≥ 20 % dos VERMELHOS **e** 100 % dos VERDES/equivalentes), que o mutante é um programa (o interpretador aceita) e que o comportamento muda antes da cor — e publica a amostra; **P1c** (do plano) — a tabela §1.1 ganha a coluna **"papel que aplica, por artefato"**: toda classe, para cada artefato de medição que a junta consome (matriz, KPI, contagem), tem um papel nomeado; classe sem papel para um artefato = o artefato **não é insumo** da junta. (Era isto que faltava: A14 estava na tabela e não tinha dono para a matriz.)

**(ii) Onde mora.** P1a: **ferramenta `scripts/mandato-mutantes.sh`** — é conserto do **bloco** (ciclo 4), entra como requisito do plano do ciclo 4 (E4), **não** deste §8. P1b: **corpo do `planejador-mestre`** (a conferência da premissa numérica é o dever §C7.4-bis(c); hoje o corpo não diz "dois lados") **e** o §0 de todo plano de ciclo (a amostra, com semente, comando e saída); o **inspetor** confere a **presença** da amostra dos dois lados no plano/briefing como insumo (item 2.3 do corpo dele: "plano … com a forma de execução declarada"), não o mérito. P1c: **corpo do `planejador-mestre`** (a tabela de classes é obrigatória e tem a coluna de papel) + o §1.1 de cada plano.

**(iii) Aceite ⇄ mutação.** [P1a] alimentar a ferramenta consertada com o arnês do ciclo 3 → a saída marca **34** pontos `ASSINATURA-DE-CRASH` (os 33 + 541) e **não** imprime `[M-1]=0`; ⇄ retirar a coluna de causa → a conferência P1b não consegue classificar e publica "não publicável" (vermelho); ⇄ sobre o blob `37549262` (sem o conserto), a conferência P1b **tem** de achar os 34 — é o vermelho-controle histórico. [P1b] no plano do ciclo 4, a amostra dos dois lados existe com semente, comando e saída; ⇄ remover a amostra do lado verde → o inspetor acusa insumo ausente (ressalva forte; `BLOQUEADO` quando o corpo tiver o item); ⇄ amostra feita pelo runner ou pelo dev da ferramenta → ata inválida (§C7.4-bis: quem mede a premissa ≠ quem produziu o número). [P1c] a tabela §1.1 do ciclo 4 tem a coluna "papel por artefato" sem célula vazia para matriz/KPI; ⇄ esvaziar a célula de A14 para "matriz" → o inspetor acusa (insumo); e, no mérito, a cadeira C2 do ciclo 4 verifica que o papel nomeado **executou** (há saída colada), não que está nomeado.

**(iv) Quem e quando.**

| peça | natureza | quem executa | antes de o ciclo 4 abrir? |
|---|---|---|---|
| P1a na ferramenta (causa por ponto, histograma, `ASSINATURA-DE-CRASH`, mutante compila) | **bloco** (ciclo 4) | planejador do ciclo 4 (identidade nova, Fable) especifica; dev novo implementa; cadeira C2 do ciclo 4 julga | não — é o próprio ciclo 4 |
| P1b no plano do ciclo 4 (§0: amostra dos dois lados, semente, comando, saída) | **mandato do ciclo 4** | planejador do ciclo 4 mede (runner da ferramenta = orquestrador; conferente = planejador; mérito = C2) | **sim** — condição 3 (§8.6) |
| P1c no plano do ciclo 4 (§1.1 com coluna "papel por artefato") | **mandato do ciclo 4** | planejador do ciclo 4 | **sim** — condição 3 |
| P1b + P1c no corpo do `planejador-mestre` (3 linhas: "dois lados com semente", "classe × artefato × papel", "número sem causa não é fato") | **bloco de governança** | `agente-fabrica` escreve a emenda do corpo; dev de governança versiona; junta própria; **não** cabe no `B-GOV-CICLOS-RESIDUAIS` (corpo PROIBIDO lá, M9) → bloco **`B-GOV-MAQUINA-PRE-JUNTA`** (novo, nomeado aqui) | não — pendência `P-GOV-MAQUINA-393-D-M1-DOIS-LADOS` (§8.9) |

### 8.3 D-M2 — o mandato é artefato verificado por máquina, com veredito gravado e re-executado

**(i) Propriedade P2 — "Nenhum agente nasce de texto que não exista como arquivo versionado no registro do bloco e que não tenha passado pelo instrumento no head do lançamento, com o veredito gravado nele; e o inspetor re-executa o instrumento sobre cada mandato no head do objeto, em vez de herdar o veredito."** Desdobrada: **P2a** o prompt de lançamento de **todo** papel (planejador, fábrica, crítico, dev, inspetor, cadeira, porteiro, auditor) é um arquivo em `agent-orchestration/omega/juntas/votos/<bloco>-ciclo<N>/00-mandatos/<NN>-<papel>.md` **antes** de o agente nascer, e o texto passado ao agente é **esse arquivo** (o agente lê o arquivo pelo caminho e declara o md5 EOL-neutro dele na 1ª linha, como já faz com o corpo); **P2b** o arquivo carrega, em cerca ao fim, a saída do instrumento no lançamento: `ec`, `head` do refs (`# gerado em:` do `mandato-refs.sh`), blob do instrumento (`faa408c8` hoje), data UTC; **P2c** o inspetor, por mandato, **re-executa** o instrumento no head do objeto e exige `OK` — veredito gravado é insumo a re-verificar, nunca fato (M3: o mandato do dev passou em `f8d5a2c8` e hoje dá 6 REJ porque o ramo andou; mandato cujo head não é o objeto é mandato **velho**, e cadeira lançada com ele julga outra coisa); **P2d** a ata registra, por papel, o md5 do mandato que o agente declarou = o do arquivo (md5 divergente = ata inválida, como corpo divergente).

**O que P2 NÃO fixa, de propósito: a FORMA do mandato (§8.8, decisão do dono).** P2 diz "instrumento", não "pré-voo sobre o texto inteiro". Nas duas respostas: **(A) campos declarados** — o instrumento é o pré-voo sobre o mandato inteiro (`## MEDIDO`/`## HIPOTESE`, `# título` isento; a **instrução** vira hipótese: *"a cadeira C1 julga X — derruba com: `<comando que a cadeira roda>`"* — é exatamente como o `mandato-dev-393.md` foi escrito, M3); **(B) texto livre + ficha** — a prosa fica, e o mandato leva uma **ficha** (`## MEDIDO`/`## HIPOTESE`) que é o que passa pelo pré-voo, mais uma **cobertura gerada** prosa→ficha (todo token hex de 7–40, todo caminho com `/` e todo número da prosa está na ficha; `grep -oE` registrado, com controle positivo), feita pelo inspetor à mão enquanto não houver script. **O conserto deste §8 vale nas duas**: muda só o que o inspetor executa no P2c (pré-voo sobre o arquivo, ou pré-voo sobre a ficha + cobertura).

**(ii) Onde mora.** P2a/P2b: **ato do orquestrador** — convenção de diretório e de cabeçalho (sem corpo nem contrato: é registro do bloco, como `00-inspetor-terreno.md`). P2c/P2d: **corpo do `inspetor-de-terreno-da-junta`**, item novo **"2.4 Mandatos"** (hoje: `mandato` = 0 ocorrências, M6) e a **ata** (§C7.1: "junta sem registro = merge inválido" ganha "mandato sem registro = voto inválido"). Enquanto o corpo não muda: o **briefing** do ciclo 4 instrui o inspetor a executar 2.4 (o briefing é versionado e o corpo dele já manda ler os insumos do briefing — não é "instrução só no chat").

**(iii) Aceite ⇄ mutação.** [P2a] `ls votos/B-GOV-MANDATO-ciclo4/00-mandatos/` tem um arquivo por papel lançado, com `git log` anterior ao 1º commit/evidência do papel; ⇄ apagar o arquivo de uma cadeira → inspetor `BLOQUEADO` (hoje: ressalva forte via briefing). [P2b] cada arquivo termina com a cerca do veredito (`ec=0`, head, blob, UTC); ⇄ remover a cerca → `BLOQUEADO`. [P2c] o inspetor roda `bash scripts/mandato-preflight.sh <mandato> 393` no head do objeto → `PRE-VOO OK` para todos; ⇄ trocar **um** SHA no mandato depois do veredito gravado → a re-execução dá `REJEITADO SHA … nao esta na saida` → `BLOQUEADO`; ⇄ objeto andou após o lançamento → `REJEITADO … SHA VELHO: o ramo anda` → `BLOQUEADO` (relançar com mandato novo: é a mesma regra "o objeto não andou" que as cadeiras já medem). [P2d] o JSON de cada cadeira tem `mandato_md5` = `tr -d '\r' < <arquivo> | md5sum`; ⇄ md5 diferente → ata inválida. **Forma (B)**, se for a escolhida: ⇄ acrescentar um SHA à prosa que não está na ficha → a cobertura acusa (controle positivo: um SHA presente nos dois → não acusa).

**(iv) Quem e quando.**

| peça | natureza | quem executa | antes de o ciclo 4 abrir? |
|---|---|---|---|
| Diretório `00-mandatos/`, um arquivo por papel, cerca do veredito, lançamento **a partir do arquivo** | **ato do orquestrador** | orquestrador (escreve o mandato na forma provisória de §8.8; roda o pré-voo; versiona no ramo do bloco **antes** de lançar) | **sim** — condição 2 (§8.6). Inclui o mandato do **planejador do ciclo 4** (é o 1º a nascer) |
| Briefing do ciclo 4 instrui o inspetor a executar 2.4 (re-execução por mandato) e as cadeiras a declarar `mandato_md5` | **mandato do ciclo 4** | orquestrador (briefing); fábrica (corpos das cadeiras: 1 linha "declare o md5 do mandato") | **sim** — condição 4 |
| Item **2.4** no corpo do inspetor + `mandato_md5` na ata (§C7.1, 1 frase) | **bloco de governança** | dev de governança; o `B-GOV-CICLOS-RESIDUAIS` já tem o inspetor no PERMITIDO (itens 2.0–2.2/3.3/3.4) → **emenda de escopo de 1 linha** ("+ 2.4 (novo)") a decidir pelo planejador daquele bloco; se recusar, `B-GOV-MAQUINA-PRE-JUNTA` | não — pendência `P-GOV-MAQUINA-393-D-M2-MANDATO-ARTEFATO` |
| Forma do mandato (A ou B) | **decisão do dono** | orquestrador leva (§8.8); até a resposta, forma **provisória** declarada no cabeçalho de cada mandato | não bloqueia o ciclo 4 (ver §8.8) |

### 8.4 D-M3 — fail-closed inclui a própria morte

**(i) Propriedade P3 — "Um artefato de decisão responde FECHADO quando um componente interno dele falha: `ec ≠ 0` e mensagem que nomeia o componente — nunca o veredito positivo; e toda cadeira ou guard de fail-closed prova isso MATANDO cada componente interno, não só com insumo adversarial."** Nasce a classe **A15** do catálogo: *"falha interna lida como veredito (fail-open por morte): o status de um subprocesso (awk, sed, git, refs, binário no PATH) não é lido e a sua saída vazia vale como 'nada a rejeitar'"*; controle: *"mate o componente (erro de sintaxe, binário ausente, `exit 1` num shim) e exija REJ nomeando-o; `ec` de cada subprocesso lido; cano sem `pipefail` é suspeito"*. M4 é a instância: `REC=$(awk …)` (l.275) sem status, `set -e`/`pipefail` = 0 → awk morto ⇒ `REC` vazio ⇒ 0 REJ ⇒ `PRE-VOO OK`.

**(ii) Onde mora.** (a) **§1.1 do plano do ciclo 4** (A15 com o controle e o papel por artefato — P1c) e os requisitos do plano para o pré-voo (status de cada subprocesso; `set -o pipefail`; teste "componente morto → `ec=1`") — do **bloco**; (b) **corpo da cadeira de fail-closed/invariância do ciclo 4** (fábrica): item *"mate cada componente interno do artefato — awk da passada 1 e 2, `tr`, `sed`, `git rev-parse`, `mandato-refs.sh` — e exija REJ que o nomeie; `PRE-VOO OK` com componente morto = `bloqueia`"*; (c) **permanente**: o corpo do **`guardiao-fail-closed`** (especialista permanente: hoje 0 ocorrências de "interno/morte/componente", M6) ganha o item; o **catálogo de classes A1–A15** ganha casa permanente — **conhecimento** em `agent-orchestration/docs/conhecimento-de-terreno.md` (§2.7 novo, "Classes de artefato de processo — catálogo vivo"; é lição medida, não norma, e o PR #396 está em voo) — e **norma** no corpo do `planejador-mestre`: *"o §1.1 de todo plano parte do catálogo e acrescenta as instâncias do bloco"*.

**(iii) Aceite ⇄ mutação.** [bloco] `m305`/`m298` (M4) sobre o pré-voo consertado → `ec ≠ 0` com mensagem nomeando o awk; ⇄ sobre o blob `faa408c8` → `PRE-VOO OK ec=0` (vermelho-controle histórico, **já medido aqui**); o guard do ciclo 4 tem caso "awk morto → ec=1" que fica vermelho sob `faa408c8`. [máquina] a cadeira de fail-closed do ciclo 4 **executa** o item (b) e publica, por componente, o comando que o matou e o veredito; ⇄ corpo sem o item → o inspetor acusa insumo (ressalva forte / `BLOQUEADO` quando 2.4 existir); ⇄ a prova de que o item **funciona**: a cadeira do ciclo 4 roda o item sobre `faa408c8` **antes** de olhar o head e tem de reportar o fail-open da l.305 — se não reporta, o item é forma, não propriedade, e a cadeira é inválida. [plano] §1.1 do ciclo 4 contém A15 com controle e papel; ⇄ sem A15 → inspetor acusa insumo.

**(iv) Quem e quando.**

| peça | natureza | quem executa | antes de o ciclo 4 abrir? |
|---|---|---|---|
| A15 no §1.1 + requisito "status de subprocesso / pipefail / caso awk-morto" no plano | **mandato do ciclo 4** (bloco) | planejador do ciclo 4 | **sim** — condição 3 |
| Item "morte interna" no corpo da cadeira fail-closed do ciclo 4 (+ vermelho-controle histórico sobre `faa408c8`) | **mandato do ciclo 4** | `agente-fabrica` escreve; orquestrador versiona nos 2 espelhos (`git add -f`; `sync-agent-agents.mjs --check`) | **sim** — condição 4 |
| Conserto do pré-voo (REC com status; `set -o pipefail`; caso no guard) | **bloco** (ciclo 4) | dev novo do ciclo 4; cadeira julga | não — é o ciclo 4 |
| Item "morte interna" no `guardiao-fail-closed`; catálogo citado pelo `planejador-mestre` | **bloco de governança** | fábrica escreve; dev de governança versiona — `B-GOV-MAQUINA-PRE-JUNTA` (ambos os corpos são PROIBIDOS no CICLOS-RESIDUAIS, M9) | não — pendência `P-GOV-MAQUINA-393-D-M3-FALHA-INTERNA` |
| Catálogo A1–A15 em `conhecimento-de-terreno.md` §2.7 | **conhecimento** (não norma) | orquestrador apensa no PR #396 (ou no PR seguinte do mesmo arquivo), copiando a tabela §1.1 do ciclo 3 + A15, com a origem (bloco/ciclo) por classe | não — mas custa 1 commit e convém antes |

### 8.5 D-M4 — pago em disco, pendente no registro

Pago (M7): `limpeza-DM4.txt` 22:39:06–22:39:11 — `w-j3c2-a` e `w-j3c2-b` removidos pelo nome (fora de `git worktree list`), 30 diretórios `tmp.*`/`mandato-preflight-*` em `/tmp`, 0 restantes, 8 worktrees vivos, 0 processo (por `CommandLine`). **Falta o registro**: a linha §C5 ("reportada em 1 linha, nunca silenciosa") nas seções do ciclo 3 de `agent-orchestration/codex/log-execucao.md` — **0 linhas** no objeto e na árvore principal. **Ato do orquestrador antes do ciclo 4** (condição 6): 1 linha na seção do ciclo 3 (o que foi removido, hora, contagem), e a mesma linha em `status-geral.md` se a seção do ciclo 3 existir lá. ⇄ `grep -n -iE 'limpeza|§C5' log-execucao.md` após l.4830 → ≥ 1 (hoje 0); a cadeira C3 do ciclo 4 confere (fecha o C3c-02).

### 8.6 Condições de abertura do ciclo 4 — o que o inspetor confere (fail-closed), com o comando

| # | condição | prova |
|---|---|---|
| 1 | Este §8 está no arquivo do parecer, no ramo do bloco, **e** a §9 de atestação (8.7) existe com `conserto verificado` | `grep -c '^## 8\. Conserto da máquina' R-B-GOV-MANDATO-ciclo3-auditoria.md` = 1; `grep -c '^## 9\.' …` = 1 e a linha final da §9 diz `CONSERTO VERIFICADO` |
| 2 | **Mandatos do ciclo 4 são artefatos** (P2a/P2b): um arquivo por papel em `votos/B-GOV-MANDATO-ciclo4/00-mandatos/`, com a cerca do veredito; **o do planejador do ciclo 4 primeiro** | `ls` + `tail -n 8 <cada>` mostra a cerca; `git log --diff-filter=A --format=%ci -- <arquivo>` anterior ao 1º artefato do papel |
| 3 | O plano do ciclo 4 traz: §0 com a **amostra dos dois lados** (P1b: semente, comando, saída, identidade de quem mediu ≠ runner ≠ dev); §1.1 com **A15** e a **coluna "papel por artefato"** (P1c) sem célula vazia para matriz/KPI; os requisitos do pré-voo e da ferramenta (status de subprocesso; mutante compila; causa por ponto; equivalentes por id — fronteira 28) | leitura do plano com `grep -n` dos marcadores + um comando da amostra **re-executado** pelo inspetor (1 ponto de cada lado) |
| 4 | Corpos das cadeiras do ciclo 4 (fábrica) nos **2 espelhos**, com: item "morte interna" na cadeira de fail-closed (com vermelho-controle sobre `faa408c8`), "conferência dos dois lados" na cadeira de cobertura, "declare `mandato_md5`" nas três; briefing instrui o inspetor a executar **2.4** | `sync-agent-agents.mjs --check` ec=0; md5 EOL-neutro = blob; `grep -c` dos três itens por corpo ≥ 1 |
| 5 | **P2c executado pelo inspetor**: `bash scripts/mandato-preflight.sh <mandato> 393` no head do objeto → `PRE-VOO OK` para **todos** os mandatos do ciclo 4 (na forma A: o arquivo; na forma B: a ficha + cobertura gerada) | saída colada por mandato; qualquer `REJEITADO` = `BLOQUEADO` |
| 6 | D-M4 registrado (8.5) | `grep` ≥ 1 na seção do ciclo 3 do log |
| 7 | Inelegibilidades conferidas por nome (3.1/3.1-bis): além das 9 cadeiras, inspetor da junta 3, devs e planejador do ciclo 3 (R-3) — **o auditor** (`auditor-maquina-b-gov-mandato-c3`) e **esta identidade** (`planejador-conserto-maquina-b-gov-mandato`) são inelegíveis como planejador, dev e cadeira do ciclo 4 (quem desenha o conserto não o consome) | `grep` nas atas/R-*/obituário |

Condições 1–7 **todas** = o inspetor pode `LIBERAR` a junta 4 (2.2 do corpo: "registro do conserto no mesmo arquivo"). Qualquer uma ausente = `BLOQUEADO`, nomeando-a.

### 8.7 Atestação — quem confere que o conserto consertou (M-04 da pendência, sem duplicar o desenho do CICLOS-RESIDUAIS)

O `B-GOV-CICLOS-RESIDUAIS` (`36f68126` §2.2, M-04(ii)) já desenha: *"o mesmo `auditor-da-maquina` (mesma identidade) re-executa a(s) pergunta(s) que reprovou depois do conserto e apensa 'conserto verificado — máquina sã' ao mesmo `R-<entrega>-ciclo3-auditoria.md`"*. **Este §8 adota esse desenho tal qual, cita-o e não o reescreve.** Aplicado aqui: a identidade `auditor-maquina-b-gov-mandato-c3` (Fable; não conserta — verifica) nasce **depois** de as condições 2–6 existirem e **antes** do inspetor da junta 4, re-executa **(d)** (pré-voo sobre cada mandato do ciclo 4 → OK), **(c)** (a amostra dos dois lados do plano do ciclo 4 existe e 1 ponto de cada lado reproduz) e **(a)** quanto à A15 (o item "morte interna" está no corpo da cadeira e o vermelho-controle sobre `faa408c8` está declarado), e escreve a **§9** deste arquivo terminando em `CONSERTO VERIFICADO — máquina sã para o ciclo 4` **ou** `CONSERTO INSUFICIENTE — <peça>`. Sem §9, condição 1 falha. Prazo e desfecho alternativo da espera continuam **do dono** (Q2 do CICLOS-RESIDUAIS §3) — não decido por ele; o que decido é que a espera **não é cega**: as condições são enumeráveis e cada uma tem comando.

### 8.8 Pergunta ao dono — a forma do mandato (não decido por ele; o conserto vale nas duas respostas)

> **O mandato de lançamento de um agente — o texto que cria uma cadeira, um dev, um gate — passa a ser um documento de campos declarados, ou continua texto livre com uma ficha de fatos anexa?**
>
> Hoje o instrumento que o bloco entrega (`mandato-preflight.sh`) só aceita duas seções — `## MEDIDO` (toda afirmação com `medido por: <comando>` e saída em cerca) e `## HIPOTESE` (toda afirmação com `derruba com: <comando>`) — e rejeita qualquer linha de conteúdo fora delas. Medido hoje: o briefing do ciclo 3 em prosa → 43 rejeições; o mandato que lançou o planejador deste conserto → 9; um mandato de dev escrito nas duas seções → passa (e volta a reprovar quando o ramo anda, o que é correto).
>
> **(A) Campos declarados.** Todo mandato é escrito nas duas seções; a instrução ("julgue X") vira hipótese com o comando que a derruba. Implica: o pré-voo é o instrumento inteiro, sem ferramenta nova; o orquestrador reescreve briefing e mandatos nessa forma (custo de escrita, imediato); a prosa narrativa que não é afirmação nem hipótese **sai** do mandato (ou o ciclo 4 cria uma terceira seção declarada para instrução, onde SHAs/caminhos continuam conferidos mas `medido por:` não é exigido — mudança do bloco). Risco: forma rígida convida a "hipótese de fachada" (`derruba com: true`) — a cadeira C1 pega isso como pega hoje.
>
> **(B) Texto livre + ficha.** O mandato fica em prosa; leva uma ficha (as duas seções) com todo número, SHA e caminho que a prosa afirma; o pré-voo roda sobre a ficha e um passo de **cobertura** (gerado da prosa: hex 7–40, caminhos com `/`, números) confere que nada da prosa escapou da ficha. Implica: dois artefatos por mandato; a cobertura prosa→ficha é uma fronteira **forma × propriedade** nova — a classe que reprovou este bloco três vezes — e precisa de script próprio (bloco pequeno) ou de `grep` registrado pelo inspetor enquanto não houver; a prosa continua sem verificação de **sentido**, só de tokens.
>
> **Nas duas respostas** vale o que este conserto fixa: o mandato existe como arquivo versionado antes do lançamento, passa pelo instrumento no head do lançamento com o veredito gravado, e o inspetor re-executa no head do objeto. **Até a sua resposta**, os mandatos do ciclo 4 saem na forma **(A)** — porque é a única executável hoje sem ferramenta nova — com a linha `forma provisória até D-MANDATO-FORMA` no cabeçalho; a sua decisão, registrada em `decisoes.md`, muda o passo 5 de §8.6 e nada mais.

(A frase "Parte 6.6 do plano de 28/09", que o meu mandato cita como origem desta pergunta, **não foi localizada** em artefato versionado nem no scratchpad — M8. A pergunta acima nasce do enunciado e das medições M1–M3.)

### 8.9 Pendências a abrir (orquestrador, `pendencias.md`, índice pelo gerador) — e o que NÃO é deste conserto

| id | peça | dono | teste de encerramento |
|---|---|---|---|
| `P-GOV-MAQUINA-393-D-M1-DOIS-LADOS` | 3 linhas no corpo do `planejador-mestre` (P1b, P1c, "número sem causa não é fato") | **`B-GOV-MAQUINA-PRE-JUNTA`** (novo) | corpo nos 2 espelhos; ⇄ apagar a linha "dois lados" → a junta do bloco acusa por execução (um plano-fixture com amostra de um lado só passa no corpo mutado e reprova no corpo certo) |
| `P-GOV-MAQUINA-393-D-M2-MANDATO-ARTEFATO` | item 2.4 no inspetor + `mandato_md5` na ata (§C7.1, 1 frase) | `B-GOV-CICLOS-RESIDUAIS` por emenda de escopo de 1 linha (decisão do planejador dele); fallback `B-GOV-MAQUINA-PRE-JUNTA` | simulador: mandato ausente / SHA trocado / md5 divergente → `BLOQUEADO` ×3 (vermelho-controle: tudo presente → não bloqueia) |
| `P-GOV-MAQUINA-393-D-M3-FALHA-INTERNA` | item "morte interna" no `guardiao-fail-closed`; catálogo citado pelo `planejador-mestre`; §2.7 em `conhecimento-de-terreno.md` | `B-GOV-MAQUINA-PRE-JUNTA`; o §2.7 pelo orquestrador no #396 | uma identidade com o corpo novo, sobre `faa408c8`, reporta o fail-open da l.305 sem ser mandada |
| `P-GOV-MANDATO-FORMA` | decisão do dono (§8.8) | orquestrador leva; registra `D-MANDATO-FORMA` | entrada em `decisoes.md` com a resposta literal; passo 5 de §8.6 ajustado |

**Não é deste conserto (é do bloco, ciclo 4, com o seu planejador):** C1c-01…04, C2c-01/02, os 10 `ajuste`, fronteiras 25–28, equivalentes por id, mutante que compila, REC com status, `set -o pipefail`. **Não é deste conserto (já tem dono, citado, não duplicado):** corpo `auditor-da-maquina`, M-04 (prazo), M-05 (recorrência), M-06 (relato "classe repetida"), M-09 — `B-GOV-CICLOS-RESIDUAIS` §2.2/§3. **Nota sobre M-06:** o relato que ele padroniza é o insumo direto de P1 — quando existir, a seção "classe repetida sem informação nova?" do `R-*` deve citar a amostra dos dois lados.

### 8.10 Quem ocupa cada papel neste conserto (§C7.4-bis) e inelegibilidades

| papel | quem | restrição |
|---|---|---|
| quem auditou | `auditor-maquina-b-gov-mandato-c3` | não conserta; **atesta** (§8.7) |
| quem desenhou o conserto | `planejador-conserto-maquina-b-gov-mandato` (este §8) | não executa nada; **inelegível** como planejador, dev e cadeira do ciclo 4 e do `B-GOV-MAQUINA-PRE-JUNTA` |
| atos do orquestrador | orquestrador | §8.6 condições 2, 4 (versionar), 6; abre as pendências de §8.9; leva §8.8 ao dono; apensa §2.7 no #396. **Não escreve código do bloco** |
| corpos | `agente-fabrica` (cadeiras do ciclo 4; emendas dos corpos permanentes no bloco de governança) | não versiona; o orquestrador versiona (`git add -f`, 2 espelhos, `--check`) |
| plano do ciclo 4 | `planejador-mestre`, identidade **nova** (nem a das §14, nem esta), Fable obrigatório | consome este §8 + os 3 votos + o parecer; não desenvolve |
| bloco de governança `B-GOV-MAQUINA-PRE-JUNTA` | planejador novo, crítico, dev novo, junta de 3 (maioria: não toca dinheiro/segurança/permissão/dado) | nenhum dos nomes acima |

### 8.11 Divergências e precisões achadas no parecer da auditoria (lidas como hipótese e medidas)

1. **§1.2(ii) e §6.3 D-M1 — confirmados por mim** (M5): o conjunto `fail∈{192,196,210}` da matriz publicada tem 34 ids = os 33 do C2c-01 ∪ {541}; `comm` vazio nas duas direções fora o 541.
2. **§1.5 / D-M3 — confirmado e estendido** (M4): além da l.305, a l.298 (M10) produz o mesmo `PRE-VOO OK ec=0` com awk morto; `set -e`/`pipefail` = 0 no blob `faa408c8`.
3. **§4 / D-M2 — confirmado** (M1: 43 REJ; M2: 9 REJ no mandato desta tarefa). **Precisão:** "o pré-voo nunca foi aplicado a briefing/mandato" vale para o **ciclo 3**; no ciclo 1 um mandato de dev **foi** escrito na forma e passou (`scratchpad/mandato-dev-393.md`, head `f8d5a2c8`) — e **hoje dá 6 REJ porque o ramo andou** (M3). Isto não contradiz o parecer; **muda o desenho**: o veredito é indexado ao head, logo P2 exige veredito gravado **e** re-executado no head do objeto (P2b/P2c), não só "passou no pré-voo".
4. **§5 / D-M4 — parcialmente superado**: o resíduo em disco foi varrido pelo orquestrador (`limpeza-DM4.txt`, M7); a linha §C5 no registro **continua ausente** (0 linhas, objeto e árvore) — fica como condição 6.
5. **§6.3 D-M2 diz "corpo do inspetor sem item mandato"** — confirmado em `origin/main` **e** no objeto (0 e 0, mesmo md5 `de80b2a9`); e o mesmo vale para os outros dois corpos que o conserto toca (`guardiao-fail-closed` 0; `planejador-mestre` 0) — o parecer não os mediu porque não precisava; registro aqui porque o conserto precisa.
6. **Sem divergência de veredito:** a junta está sã (os 6 bloqueantes reproduzem com par de controle, §1.1–1.3); a máquina pré-junta está defeituosa — e a classe é uma só (§8.1).
7. **Fora do parecer, no meu mandato:** "Parte 6.6" não localizada (M8).

### 8.12 Limpeza (§C5, 1 linha) e fechamento

Criado e removido pelo nome: worktree `C:/Users/AMP/w-plconserto` (`git worktree remove --force`, `status --porcelain` 0 antes; `npm ci` próprio, sem junction; 0 processo vivo por `CommandLine` antes da remoção); cópias `mandato-preflight.{lf,m305,m298}.sh` apagadas antes (porcelain 0 conferido após cada rodada); ficam no scratchpad, como evidência reexecutável, `plconserto/` (briefing extraído, `neg.md`, `pos.md`, mandato transcrito, `secao-8.md`, saídas `.out/.err`) e `PLANO-CONSERTO-MAQUINA.md`; nenhum contêiner criado; base viva `erp-postgres`/`erp-redis` nunca alvo; nenhum arquivo rastreado tocado além deste (§8 apensada ao fim; nada acima editado — `git diff -U0` sem linha `-`). Resíduo alheio (`w-devs393`, `w-devt393`, `w-conh`, `.claude/worktrees/*`) **reportado, não varrido**.

## 9. Atestação — o conserto consertou? (§8.7; a mesma identidade da auditoria re-executa (d), (c) e (a) quanto à A15)

**Papel:** atestação (§8.7 deste parecer = M-04(ii) do `B-GOV-CICLOS-RESIDUAIS` §2.2) · **Identidade:** `auditor-maquina-b-gov-mandato-c3` (a mesma dos §0–§7; não é cadeira, não é dev, não planejou o conserto; não vota, não propõe correção, não herda a §9 de ninguém) · **Modelo:** Fable 5.1 (`claude-fable-5-1`), sem substituição · **Mandato:** `agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/auditor-atestacao.md`, versionado em `47d113fb`, `mandato_md5` EOL-neutro `b15da98eb22f727a3f3c760447e56bc4` (disco = blob `47d113fb:` = o declarado no disparo; pré-voo `OK` no head do lançamento `d031518d`, cerca `HC = H0`) · **Objeto:** `chore/mandato-refs-e-preflight` em `47d113fba02da1ec1a0e60ec7d25441e78b3414e` (= `origin`; `merge-base` com `origin/main` = `origin/main`) · **Terreno:** worktree detached próprio `C:/Users/AMP/w-aud4` no head (1,9 s; `porcelain` 0), `npm ci` próprio (326 pacotes, 22 s, `node_modules` diretório real, 0 junction), `env | grep -c '^MSYS_NO_PATHCONV='` = 0 (a variável só inline, no stub do replay e em dois `git rev-parse`), `timeout` em tudo que executou artefato, `tail -f` nunca, base viva `erp-postgres`/`erp-redis` nunca alvo (este papel não abre banco), nenhum contêiner · **Data:** 2026-10-03 04:47Z–05:18Z · **Evidência incremental (P1), com hora por passo:** `scratchpad/ATESTACAO-393-C4.md` (+ `scratchpad/aud4/`: `replay.sh`, `replay-refs.sh`, `replay/` com `.log/.err/.ec` por mandato e `00-resumo.psv`, `arn/aplica.sh` + os 2 blobs extraídos, `fx/` 6 fixtures, `dois-lados/` saídas por arnês × fixture, `conta.ps1`/`conta.pat`).

**O que esta §9 é e não é.** Re-executa, com comando e saída, exatamente as três peças que o §8.7 dá a esta identidade — **(d)**, **(c)** e **(a) quanto à A15** — e nada além. O critério de (d) é o da **errata §15.15(b)** do plano (REPLAY no commit `A` que versionou cada mandato, com o instrumento de `A` e a colagem gravada no blob): a re-execução viva no head reprova por construção (A8) e não é critério — a §15.9 l.1934 lê-se assim desde a errata. Tudo o que o plano, as erratas e o §8 afirmam entrou aqui como **hipótese**; cada número abaixo foi medido por mim em 2026-10-03.

### 9.1 (d) — o mandato é artefato verificado por máquina (D-M2, P2a–P2c): replay do pré-voo em `A`, 21 mandatos

Stub = l.2081-2104 do plano, EOL-neutro (24 l., `bash -n` ok, md5 `0d198ab5…`). Por mandato (`aud4/replay.sh`, 05:01:31Z → 05:03:27Z): `A` por `git log --diff-filter=A`; **PRE1** `git merge-base --is-ancestor H0 A && … H0 HEAD`; **PRE2** `git diff --quiet HC A -- scripts/mandato-preflight.sh scripts/mandato-refs.sh`; **P-b** `rev-parse HEAD:M = rev-parse A:M`; worktree detached `C:/Users/AMP/w-aud4-A<8>` em `A` (13 criados; `A` = head usa o `w-aud4`); `( cd $WA && REPLAY_REV=$A REPLAY_M=$M MANDATO_REFS=<stub> timeout -k 10 300 bash scripts/mandato-preflight.sh "$M" 393 )`, `ec` em arquivo, nunca por cano.

```
21 mandatos em 00-mandatos/ (o disparo listou 17; c1d, c2d, c3d e inspetor nasceram em 47d113fb com o meu) · n=1 commit em 21/21 (P2a: nenhum editado depois)
PRE1 OK 21/21 · PRE2 OK 21/21 (instrumento de HC = instrumento de A) · P-b OK 21/21 (blob do head = blob de A) · cerca presente (HC) 21/21 (P2b)
replay: PRE-VOO OK ec=0 em 20/21 — auditor-atestacao c1d c2d c3d conferente-reconferencia conferente dev-scripts-k4b3 dev-scripts-k4b4 dev-scripts dev-tests-t4c5 dev-tests fabrica-1bis fabrica-1quater fabrica-1ter fabrica inspetor planejador-errata2 planejador-errata3 planejador-errata4 planejador
        cada um com `COLAGEM l.11-NN: refs do PR #393 confere` + 1 AVISO `approved_head NAO DETERMINAVEL (ec=3)`, como no lançamento; stderr do artefato 0 B em 21/21
        ec=1 em 1/21 — planejador-errata.md (A=60f4f79f, H0=335cf09d, HC=987cde17): `REJEITADO SHA '987cde178d349d71e690f6f7238069af6683b202' nao esta na saida de mandato-refs.sh 393`
HC = H0 em 20/21; o único HC ≠ H0 é o mesmo planejador-errata.md
```

**Leitura.** P2a, P2b e P2c estão **em vigor e medidos**: todo papel do ciclo 4 nasceu de um arquivo versionado antes dele, com a cerca do veredito, e o instrumento do lançamento re-executado em `A` aprova 20 de 21. O único `ec=1` é **a exceção única que a §15.15(b) já publicou com a causa** (cerca gravada sobre head local não empurrado, `987cde17`, enquanto a colagem do GitHub dizia `335cf09d`; segundo a errata, o arquivo *sem a cerca* — o que o agente leu — passou, e o conteúdo é o do blob que o agente declarou) — e a **regra que a errata instituiu, `HC = H0`, está cumprida em todos os 15 mandatos nascidos depois dela**, inclusive os 5 de `47d113fb`. A hipótese "todos OK" do meu mandato é **derrubada em 1/21**, por um fato que **a própria máquina consertada produziu e registrou** (o replay pegou; o planejador publicou; o inspetor registra; a C3⁗ classifica — §15.15(b)): não é omissão nem fato novo, e a classificação de gravidade **não é minha**. O que atesto em (d) é o que o §8.3 pediu: mandato como artefato, veredito gravado, re-executado por máquina — e re-executado por mim.

### 9.2 (c) — a boa notícia tem conferente (D-M1, P1b): a §15.0(d) existe com semente e identidade, e 1 ponto de cada lado reproduz

```
§15.0(d) presente: l.1747 — Semente **`20261001393`** · identidade `planejador-ciclo4-b-gov-mandato` ≠ runner da E4 = orquestrador ≠ devs da ferramenta = Dev-S/Dev-S-2
semente → amostra (python 3.13: random.seed(20261001393); random.sample(sorted(VERMELHOS), ceil(0.2*100)) sobre os 100 ids VERMELHO da composta, recontados: 100 linhas, 100 únicos):
   187 195 219 255 298 327 356 373 390 393 399 431 457 469 470 481 493 520 523 541  = os 20 publicados
arnês do ciclo 3 reconstruído do objeto: `git cat-file -p faa408c8` (hash-object = faa408c8, CR 0) · `aplica()` verbatim de `git cat-file -p 37549262` (53 l.) · 6 fixtures próprias LF · sem PR (`MANDATO_REFS=/bin/false`) · `timeout -k 5 60` · antes de qualquer cor de guard
lado VERMELHO — 298 (sorteado): M10, `if (isento(num)) return` → `if (0)) return`, diff 2 l., bash -n ok → AWK-INVALIDO (stderr `awk: cmd. line:24: if (0)) return` em 6/6) · comportamento DIFERE: neg / hip-sem-token / grep-sem-i ec 1→0 `PRE-VOO OK` (o fail-open da §1.5)  = linha 298 da tabela
lado VERDE — 245 (equivalente declarado): M7(salto), `*) continue ;;` → `*) : ;;`, diff 2 l., bash -n ok → PROGRAMA (stderr 0 B em 6/6) · IGUAL em 6/6, inclusive 2 fixtures com cerca que não é colagem (único caminho que passa pela l.245) · causa na fonte: a l.248 `[ -n "$N" ] || continue` descarta o bloco de qualquer modo  = linha 245 da tabela ("resiste")
controles: pristino determinístico (2 execuções IGUAL), aprova pos/fences (ec=0) e rejeita neg/hip-sem-token/grep-sem-i/fora (ec=1, 1 REJ)
```

**Leitura.** A amostra dos dois lados existe, com semente que reproduz o sorteio, identidade distinta do runner e dos devs, e **1 ponto de cada lado reproduz por caminho próprio** (arnês meu, fixtures minhas, mutante pelo `aplica()` do blob). P1b está em vigor no plano do ciclo 4. Contexto, não meu item: a conferência do ciclo 4 (`votos/B-GOV-MANDATO-ciclo4/00-conferencia-dois-lados.md`) existe e a última linha dela é `CONFERIDO — ponto 263 (reconferência T4c-5 …)`.

### 9.3 (a) quanto à A15 — fail-closed inclui a própria morte (D-M3): o item "morte interna" no corpo da C1⁗, com o vermelho-controle sobre `faa408c8` declarado

```
.claude/agents/especialistas/jurado-mandato-c1d-invariancia-e-morte-interna.md @47d113fb: blob 3866d02b · md5 EOL-neutro 7b13b3f196de8626c0529c8142260b95 · 502 l.
.agents/agents/especialistas/…c1d…md: blob 024ef924 · md5 81db2cc2358ab5ce8b02fcba6dcfea5f · 508 l. — diferem SÓ no frontmatter Codex (D-INTEROP); do 1º `# ` em diante md5 4f80d87d… nos dois = corpo idêntico
contagens (iguais nos 2 espelhos): 'morte interna' 6 · faa408c8 23 · 'passada 2' 3 · 'sem ser mandad' 1 · 'mata cada componente' 2 · 'vermelho-controle' 7 · mandato_md5 4
S0: `node scripts/sync-agent-agents.mjs --check` → `OK — 42 agentes, espelho consistente.` ec=0
l.342 `## Item 2 — MORTE INTERNA (A15): mate cada componente — sobre faa408c8 PRIMEIRO, depois sobre o head` · componentes: awk oráculo, awk passada 2, awk filtro, tr, sed, git, refs · l.359-364 "Ordem obrigatória — faa408c8 ANTES do head … o que você reportar daí é o vermelho-controle histórico do item, e é o teste de encerramento de D-M3 … se o seu item não acusar nada em faa408c8, o item é forma, não propriedade, e a cadeira é inválida — declare-o com as palavras 'o item NÃO CUMPRIU'"
```

**Leitura.** O que o §8.4(iv) exigia antes de abrir o ciclo 4 — item "morte interna" na cadeira de fail-closed, com vermelho-controle histórico sobre `faa408c8` — está no corpo, nos dois espelhos, com a sanção do §8.4(iii) escrita (item que não acusa em `faa408c8` = cadeira inválida). A classe A15 que nenhuma composição cobria (§2) agora tem cadeira nomeada — e o meu próprio controle de 9.2 (m298 → `PRE-VOO OK` com a passada 2 morta) é a instância que ela tem de reportar sem ser mandada.

### 9.4 Limpeza (§C5, 1 linha) e fechamento — 05:18Z

Criado e removido pelo nome: worktree `C:/Users/AMP/w-aud4` (`git worktree remove --force`, ec=0; `porcelain` 0 antes; o `npm ci` próprio vai junto; `git worktree list | grep -c w-aud4` = 0; em disco = 0) e os 13 worktrees do replay `C:/Users/AMP/w-aud4-A*` (removidos às 05:03:44Z, `porcelain` 0 em cada; restantes 0); cópias do arnês `aud4/arn/{pris,m298,m245}` apagadas após conferir `hash-object` = `faa408c8` (403K → 60K; ficam os 2 blobs extraídos, `aplica.sh`, fixtures e saídas como evidência reexecutável); processos vivos com o nome do worktree, dos arneses ou do artefato na linha de comando, contados por `aud4/conta.ps1` (padrão só no arquivo `conta.pat`, invocação sem os nomes; exclui o próprio PID e o pai): **N=0** (05:12:15Z); resíduo do pré-voo em `/tmp` criado nesta sessão: 0; nenhum contêiner criado; base viva nunca alvo; nenhum arquivo rastreado tocado além deste (só a §9, apensada ao fim em LF como o resto do arquivo; `git diff -U0` com 0 linhas `-`; `git diff --check` limpo; `porcelain` de `w-mandato` sem este arquivo = 0); resíduo alheio (`w-nuv05`, `w-nuv05d`, `w-nuv09`, `w-nuv11`, `w-pvnuv`, `w-pvpr`, `w-pvreg`, `.claude/worktrees/{b04a,b11,gov-descuido}`) **reportado, não varrido**. Nota de honestidade: três tentativas minhas morreram antes de produzir resultado — a derivação da semente com caminho MSYS passado ao Python do Windows (A4), a 1ª contagem de processos com `[/\]` não terminado no regex .NET (o `printf` comeu uma barra) e a 1ª tentativa de apensar esta seção num único comando de shell, cortado no limite de linha de comando do Windows (classe A10, a mesma do §8.0) — as três descartadas antes de ler qualquer número, e a terceira conferida: nada executou (worktree presente, parecer = `HEAD`, `porcelain` 0). Valem a derivação com `cygpath -m`, a contagem com padrão sem barra invertida e esta seção escrita em arquivo e apensada por `cat`.

### 9.5 Veredito da atestação

| peça (§8.7) | o que o conserto prometeu | medido | resultado |
|---|---|---|---|
| (d) D-M2 | mandato = artefato versionado antes do papel, com cerca, re-executável por máquina | 21/21 artefato com cerca e 1 commit; replay em `A` OK 20/21; o 1 REJ é a exceção publicada pela §15.15(b), com `HC = H0` cumprido nos 15 posteriores | **verificado** (com a exceção nomeada, a classificar pela C3⁗) |
| (c) D-M1 | a boa notícia tem conferente: amostra dos dois lados com semente e identidade ≠ runner ≠ dev | §15.0(d) presente; semente reproduz os 20; 298 (vermelho) e 245 (verde) reproduzem por caminho próprio | **verificado** |
| (a) A15 / D-M3 | cadeira de fail-closed com item "morte interna" e vermelho-controle sobre `faa408c8` | item 2 no corpo da C1⁗, 2 espelhos, S0 verde, sanção do §8.4(iii) escrita | **verificado** |

Nenhuma peça ficou sem medição; a única hipótese do meu mandato derrubada ("todos OK" em (d)) caiu por um fato que a própria máquina consertada registrou e cuja gravidade tem dono nomeado. O ciclo 4 pode abrir pela máquina: o inspetor confere as 7 condições da §8.6 (esta §9 é a condição 1).

CONSERTO VERIFICADO — máquina sã para o ciclo 4
