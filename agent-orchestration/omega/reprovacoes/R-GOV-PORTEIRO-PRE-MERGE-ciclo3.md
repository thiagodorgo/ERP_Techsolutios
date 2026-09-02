# R-GOV-PORTEIRO-PRE-MERGE — ciclo 3 — reabertura de premissa

> **Ciclo 3 do protocolo de dificuldade (§C7.4).** O ciclo 3 tem uma instrução que os ciclos 1 e 2 não
> têm: **o crítico reabre a premissa desde o objetivo**, com pesquisa de ≥5 fontes. Não é para consertar
> os achados — é para perguntar se o que se está construindo é construível.
>
> **Papéis (D-JUNTA-SEPARACAO-DE-PAPEIS-TODO-FLUXO, §C7.4-bis):**
> · crítico da premissa: `critico-adversarial` (agente novo, não participou dos ciclos 1 e 2)
> · pesquisa: `agente-pesquisador-web` (≥5 fontes → `PD-GOV-PORTEIRO-RECIBO` em `docs/omega-pd.md`)
> · **nenhum dos dois propõe correção.** Este documento é dossiê de achado, não plano.

---

## Veredito do ciclo 3

**O objetivo declarado é inalcançável neste arranjo. A entrega deve ser REDESENHADA, não corrigida — e o
redesenho começa por reduzir o escopo, não por ampliá-lo.**

O objetivo era *provar que um porteiro independente, rodando um modelo específico, avaliou o PR*. Os oito
bloqueantes da ata do ciclo 2 não são a causa: são **sintomas de tentar fazer o gate afirmar uma propriedade
que a execução não pode produzir**. Consertar os oito devolve um gate igualmente forjável, com mais cinco mil
linhas.

---

## FATO 0 — o estado real do GitHub, medido agora

```
$ gh repo view --json nameWithOwner,visibility,owner
{"isPrivate":false,"nameWithOwner":"thiagodorgo/ERP_Techsolutios",
 "owner":{"id":"MDQ6VXNlcjQyOTE1NTYz","login":"thiagodorgo"},"visibility":"PUBLIC"}

$ gh api repos/thiagodorgo/ERP_Techsolutios/rulesets
[]

$ gh api repos/thiagodorgo/ERP_Techsolutios/branches/main/protection
{"message":"Branch not protected","status":"404"}
```

Três consequências que mudam a leitura de tudo:

1. **O repositório é de USUÁRIO, não de organização.** A regra `workflows` de ruleset — a única construção
   que a `PD-GOV-PORTEIRO-RECIBO` identificou como não-forjável pelo autor — é **org + Enterprise**. Ela não
   existe aqui.
2. **Zero rulesets. `main` sem proteção nenhuma.** Hoje `gh pr merge --squash` funciona sem junta, sem
   porteiro e sem CI. O gate inteiro é voluntário — não "quase": literalmente.
3. O token local tem escopo `repo`, que em repositório próprio é **admin**, incluindo
   `DELETE /repos/{owner}/{repo}/rulesets/{id}`.

> **Enquanto `gh api .../rulesets` responder `[]`, todo este debate é sobre um muro que não existe.**

---

## FATO 1 — um `LIBERADO` válido foi forjado no código do HEAD, sem modelo nenhum

```
verifyAttestation(forjado) => true
agentId  : porteiro-que-nunca-existiu
commands : [{"cmd":"npm test  # NAO FOI EXECUTADO","exitCode":0},
            {"cmd":"flutter test  # TAMPOUCO","exitCode":0}]
```

O forjador não é criativo: **todo campo conferível é copiado do próprio snapshot que o porteiro recebe
pronto**, inclusive a "evidência de reexecução".

### O teorema estrutural

`verifyAttestation(snapshot, a)` é **total sobre `snapshot`**: para todo snapshot existe um `a` que passa, e
ele é computável em O(1) **a partir do snapshot sozinho**, sem nenhuma informação externa. Os únicos graus de
liberdade — `agentId`, `runtime`, `model`, `reasoningEffort`, `commands[].cmd` — são strings livres que
ninguém confere.

Isso não é um verificador. É um **checador de boa-formação de uma mensagem cuja única variável livre é um
nome**.

---

## FATO 2 — a "evidência de reexecução" é um `git rev-parse`

```
$ git rev-parse docs/governanca-porteiro-pre-merge-sol:Kpis/kpis-latest.json
78873f6ec099413cb0d5c8cd03b62f1cf6638688
$ git show ...:Kpis/kpis-latest.json | git hash-object --stdin
78873f6ec099413cb0d5c8cd03b62f1cf6638688
```

Offline, sem rede, sem rodar teste nenhum, a partir de qualquer clone. E nem isso é preciso: o valor **já vem
como campo do snapshot**.

O comentário em `scripts/porteiro-pre-merge.mjs:11-12` e o `CLAUDE.md:260-261` afirmam o contrário — *"um
porteiro que não olhou o head não tem como produzi-lo"*. **Medido falso nas duas formas.**

---

## FATO 3 — o job de CI não PRODUZ a atestação; ele a RETRANSMITE

`.github/workflows/porteiro-pre-merge.yml:11-13` recebe `attestation_json` como **input obrigatório** e faz
`printf '%s' "$ATTESTATION_JSON" > attestation.json`.

O **snapshot** é reconstruído no servidor — isso tem valor real e não é forjável. A **avaliação** é o texto
que o disparador digitou. O CI é **cartório do snapshot**, nunca cartório do parecer.

---

## FATO 4 — B-3 piorou desde a ata do ciclo 2

```
$ gh api repos/.../commits/6efe5ad/check-runs?filter=latest&per_page=100 --jq '{retornados,total}'
{"retornados":100,"total":375}
```

A ata mediu 267; hoje são **375**, e cresce monotonicamente. Os três scripts leem 100 sem paginar — enquanto
`coletarPaths` pagina a API irmã com um comentário explicando por que truncar abriria buraco.

---

## FATO 5 — o workflow do porteiro não existe na `main`

```
$ git cat-file -e origin/main:.github/workflows/porteiro-pre-merge.yml
fatal: path ... does not exist in 'origin/main'
```

---

## FATO 6 — o harness já grava o modelo, e não é o agente que escreve

```
$ grep -o '"model":"[^"]*"' <transcript da sessão> | sort -u
"model":"claude-fable-5"  "model":"claude-opus-5"  "model":"fable"  "model":"opus"
```

Cada mensagem, incluindo as de subagente, carrega o modelo que de fato rodou — **escrito pelo harness, não
pelo agente**. Não é à prova de adulteração (o agente tem disco), mas é estritamente melhor que uma string
auto-escrita, exatamente pelo motivo que importa: **o agente não a autora**.

Contra descuido, é o controle certo e custa zero. Contra ataque, não vale nada — e é aí que a distinção paga.

---

## Inventário de overclaim — onde o artefato afirma prova e entrega forma

| Onde | O que afirma | O que a execução entrega |
|---|---|---|
| `porteiro-pre-merge.mjs:427` — summary do check verde | "autorizado pelo **porteiro independente**" | não-colisão entre strings declaradas. É a superfície mais visível do gate na UI do GitHub. |
| `.github/rulesets/main.template.json:2` — nome do ruleset | `"main — PR + CI + porteiro independente"` | idem. O overclaim está no rótulo que o dono lê em Settings. |
| `porteiro-pre-merge.mjs:11-12` | "um porteiro que não olhou o head não tem como produzi-lo" | FATO 2 — `git rev-parse`, offline |
| `CLAUDE.md:259-261` | a mesma frase, elevada a lei | idem |
| `CLAUDE.md:263-264` | "A independência **não** é mais auto-declarada" | mudou de auto-escrita pelo porteiro para auto-escrita **um salto adiante**. O próprio `CLAUDE.md:419-423` admite o limite — **os dois parágrafos se contradizem no mesmo documento.** |
| `CLAUDE.md:258-261` | "A prova conferível do atestado é `commands` e `evidence`" | `commands` é lista de strings que ninguém executa; `evidence` é FATO 2. |
| ata do ciclo 2 | "Ambos os exploits viraram caso de teste permanente" | o teste prova a forja **sem** o campo `evidence`. Acrescentar um campo copiado do snapshot devolve o verde (FATO 1). O título do teste é honesto; a ata é que overclaima sobre ele. |

**A observação desagradável, e ela precisa constar:** a entrega gastou 46 commits e +5816/−353 construindo
cercas de prosa que caçam as palavras *confiável*, *comprovado* e *fonte confiável* em seis scripts — e
enquanto isso as afirmações centrais (*independente*, *evidência de reexecução*, *prova conferível*, *não é
mais auto-declarada*) **são falsas e passam pelas cercas**. As cercas foram calibradas no vocabulário dos
ciclos anteriores, não na classe do defeito. O ciclo produziu um sistema imunológico que reconhece as palavras
dos patógenos antigos.

---

## Achados novos, além dos oito da ata

```
$ node -e "...pathsDeGovernanca([...])"
FORA da superfície 5/5 => package.json | tsconfig.json | scripts/post-merge-cleanup.sh
  | .github/CODEOWNERS | tests/kpi-release-tooling.test.ts | scripts/kpi-release.mjs | package-lock.json
```

- **`.github/CODEOWNERS` está fora da superfície de governança** — e é justamente o arquivo que a pendência
  `P-GOV-CODEOWNERS-WORKFLOWS` nomeia como *mitigação do resíduo*. A mitigação declarada é editável por junta
  3/3. Não constava na ata do ciclo 2.
- **B-7 confirmado por execução:** `SCRIPTS_GATE` (código) e `SCRIPTS_DO_GATE` (teste) são dois literais com
  as mesmas seis strings, e `grep -c SCRIPTS_GATE tests/porteiro-pre-merge-governance.test.ts` = **0** — zero
  import entre eles. Duas listas que precisam concordar e nada as obriga.
- **B-6 confirmado:** `governance:check` é `package.json:35`, uma lista de três arquivos de teste por nome,
  num arquivo que está **fora** da superfície 5/5.

---

## A ameaça foi trocada no meio do caminho

O que originou tudo isto (§C7.4-bis) é: *"quem conserta acabou de convencer a si mesmo de qual é o problema"* —
isto é, **DESCUIDO e autoengano de agente**. O que a entrega construiu é defesa contra **ATAQUE de um autor
malicioso com acesso de escrita**.

São ameaças diferentes, e a segunda é invencível neste arranjo: o adversário seria o dono das chaves, do
disco, do CI, do ruleset e do token.

### Contra ATAQUE, é mecanicamente verificável — e só isto

1. **Head congelado** (compare-and-swap): "aprovou X, mergeou Y" fica impossível.
2. **CI verde no head exato, criado pelo app GitHub Actions** (`required_status_checks` + `integration_id` +
   `strict`) — desde que o ruleset exista, o que hoje não é o caso.
3. **Sem force-push, sem delete em `main`.**
4. **PR obrigatório.**
5. **Uma aprovação de outra identidade GitHub** — a **única** primitiva de independência que a plataforma
   sustenta contra o autor, porque autoaprovação é bloqueada por plataforma e não é configurável. Custa uma
   segunda conta.

### O que NÃO é mecanicamente verificável e deve parar de ser afirmado

Quem avaliou · qual modelo avaliou · que os comandos rodaram · que o porteiro é independente da junta · **que
a junta aconteceu** (`erp-junta-attestation:v1` é um comentário de PR que qualquer `write` posta;
`validateJunta` só confere forma).

---

## O bloqueante 2 é o mais puro de todos

Não é bug de tradução — é a premissa errada em forma cristalina, por três razões independentes:

**(a) Nenhum provedor assina inferência.** `model: gpt-5.6-sol` é inverificável **em princípio**, não por
falta de engenharia neste repositório. Ver `PD-GOV-PORTEIRO-RECIBO` §3.

**(b) O campo é diretiva de *invocação*, checada como predicado de *merge*.** Modelo é decidido quando o
agente nasce; `verifyAttestation` roda depois que ele morreu. A verificação está no lugar errado do tempo. O
lugar certo já existe e já funciona: o frontmatter em `.claude/agents/` + o espelho `.agents/agents/` + o
`tests/agent-model-routing.test.ts`.

**(c) A única consequência executável do pin é inverter o controle.** `porteiro-pre-merge.mjs:327` exige
`runtime === 'codex'`. O porteiro **honesto** do Claude Code escreveria `runtime: 'claude-code'` e ficaria
**VERMELHO**. O forjador digita `'codex'` e fica **VERDE** (FATO 1).

> **Um controle de segurança que só constrange o honesto não é um controle fraco — é um controle de sinal
> trocado.**

Por isso: **aceitar `fable`/`claude-code` no `verifyAttestation` conserta o sintoma e preserva o defeito.**
Troca uma string inverificável por duas strings inverificáveis e apaga o único sinal visível de que o
mecanismo está errado. É a definição de conserto que contamina o ciclo seguinte — e era exatamente o pedido
que abriu esta sessão.

---

## O que sobrevive e o que deve morrer

**Sobrevive, é verdadeiro e vale sozinho:** o compare-and-swap do head · a normalização única de checks
(D-10) · a paginação de `files` · `aplicaSeABranchDefault` · a exigência de `pull_request` / `deletion` /
`non_fast_forward` · o registro externo imutável por merge.

**Deve morrer:** a palavra **independente** no summary e no nome do ruleset · o campo `evidence` e o nome
dele · a lista `commands` · o pin de `model`/`runtime`/`reasoningEffort` dentro de `verifyAttestation` · e as
três frases do `CLAUDE.md` que afirmam prova onde há forma.

> Enquanto o artefato disser "prova", cada ciclo vai gastar 84 agentes achando as instâncias em que ele não
> prova. Foi isso que aconteceu duas vezes.

---

## O sinal na votação do ciclo 2, que não deve passar batido

Dos cinco votantes, **os dois que aprovaram votaram pela lente do artefato** (anti-teatro de atestado,
interoperabilidade de modelos) e **os três que reprovaram votaram pela lente da realidade** (enforcement no
GitHub, fail-closed, secops).

A divisão não foi de opinião. Foi de **fronteira**: quem olhou para dentro do arquivo viu um sistema coerente;
quem olhou para o GitHub viu um repositório sem ruleset e sem proteção de branch.

---

## Recomendação do crítico (não é plano — plano é de outra alçada)

Parar de tentar provar *quem avaliou* e garantir mecanicamente só o que a plataforma sustenta — head
congelado · CI verde do app certo · sem force-push · PR obrigatório · uma aprovação de outra identidade —
tratando o resto (modelo, identidade, reexecução) como **registro auditável a posteriori, declaradamente
não-prova**, com o transcript do harness (FATO 6) no lugar da string auto-escrita.

E **instalar o ruleset antes de qualquer outra coisa.**

---

## A pergunta única que o dono precisa responder

> ### Você está se defendendo de um agente **descuidado** ou de um agente **malicioso**?

- **Se for descuido:** a segunda identidade GitHub é dispensável, o pin de modelo sai do gate e vira registro,
  e esta entrega encolhe para menos de um quinto do tamanho.
- **Se for ataque:** não existe solução dentro deste repositório. A pergunta seguinte passa a ser se você
  aceita criar uma **segunda conta GitHub que só aprova PR** — a única primitiva de independência que a
  plataforma sustenta contra o dono do repositório — ou se prefere que o artefato **pare de prometer
  independência**.

---

## Fontes do ciclo 3

Registradas em `docs/omega-pd.md` → `PD-GOV-PORTEIRO-RECIBO` (17 fontes primárias: SLSA v1.1/v1.2, GitHub
Docs de artifact attestations/OIDC/rulesets/environments/protected branches/Copilot code review, GitHub
Security Lab, Sigstore Fulcio, in-toto, arXiv:2603.14283, arXiv:2501.16007, NIST SP 800-53 AC-5).

Fontes adicionais levantadas pelo crítico: GitHub REST Checks ("To create a check run, you must use a GitHub
App") · Controlling permissions for GITHUB_TOKEN · `workflow_dispatch` executa a versão do ref selecionado ·
Required Workflows → Repository Rules (org/Enterprise) · Creating rulesets ("People with admin access (…) can
create, edit, and delete rulesets") · Approving a PR with required reviews (autor não aprova o próprio PR).
