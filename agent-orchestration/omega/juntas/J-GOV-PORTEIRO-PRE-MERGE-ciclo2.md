# J-GOV-PORTEIRO-PRE-MERGE — ciclo 2 — ata da junta crítica 5/5

> **VEREDITO: REPROVADO.** Junta crítica exige **unanimidade** (§C7.1). Placar: **2 APROVADO · 3 REPROVADO**.
> Head julgado: **`bc1c1f7`** · branch `docs/governanca-porteiro-pre-merge-sol` · 44 commits · árvore limpa.
> **Nada mergeia.** Pelo §C7.4, isto abre o **ciclo 3**: o crítico reabre a premissa **desde o objetivo**,
> com pesquisa de ≥5 fontes.

## Composição e separação de alçadas (§C7.4-bis)

| Alçada | Ocupante | Confirmação |
|---|---|---|
| achadores (auditoria) | 84 agentes | não implementaram, não votaram |
| planejador | `planejador-mestre` | não implementou, não revisou, não votou |
| desenvolvedores | 4 devs distintos (F-A/F-B · F-C/D/E · F-F · residual) | nenhum revisou nem votou |
| achadores satélite | 2 `critico-adversarial` (sem Write/Edit) | não implementaram |
| céticos | 2 `critico-adversarial` (sem Write/Edit) | não implementaram |
| pesquisadores | 2 `agente-pesquisador-web` | sem Write; não decidiram |
| fábrica | `agente-fabrica` | criou 1 especialista; não votou |
| **votantes** | 5 papéis distintos, **nenhum** com alçada anterior | ver votos abaixo |

Nenhum acúmulo. O especialista `guardiao-anti-teatro-de-atestado` foi criado pela fábrica conforme §7 do
plano, **sem `Write` nem `Edit`** — reforço estrutural: achador que não pode escrever não conserta o que achou.

## Os cinco votos

| Votante | Lente | Voto |
|---|---|---|
| `guardiao-anti-teatro-de-atestado` | vota executando mutações, nunca relendo diff | **APROVADO** |
| `guardiao-interoperabilidade-modelos-claude-codex` | modelos e interop nas duas ferramentas | **APROVADO** |
| `guardiao-enforcement-github-porteiro` | o gate é efetivo no GitHub? | **REPROVADO** |
| `guardiao-fail-closed` | enumeração fail-closed | **REPROVADO** |
| `agente-secops` (veto) | segredo, permissões, ruleset, produção | **REPROVADO** |

---

## O que a junta CONFIRMOU como fechado

**O defeito que originou o ciclo está morto, e por execução.** A frase que mandava o Claude Code rodar em
`gpt-5.6-sol` não existe em nenhum dos seis documentos normativos. O gateway do `transform()` rejeita as cinco
variações erradas — inclusive um papel cirúrgico declarando `gpt-5.6-sol` do lado Claude. E um porteiro
declarando `model: fable` **fica vermelho no gate**: a frase "o Claude Code não emite atestado válido para
este papel, por desenho" é consequência executável, não prosa.

**Os sete exploits do ciclo 1 medidos nas duas árvores** pelo guardião anti-teatro — todos eram **verdes**
antes e são **vermelhos** agora: `LIBERADO` forjado por `node -e`; junta omitindo `planner`/`origin`/
`developer`; porteiro com `agentId` do planejador; ruleset apontado a outra branch; atestado `BLOQUEADO`
fechando o pós-merge; espelho mutado para "aprove sempre" (o `--check` varria 22 de 25 e dizia OK).

**A cerca carrega o peso, provado em três combinações.** Texto defeituoso sozinho fica vermelho; texto
defeituoso **mais a cerca antiga** fica **verde**. Não foi conserto cosmético.

**Âncoras numéricas medidas, não afirmadas:** `ocorrenciasDeFonte >= 10` (medido 18, folga 8), `comprovad === 0`,
`confer >= 10` (medido 18). A não-tautologia do limiar `0` foi demonstrada por mutação.

**Secops:** zero segredo versionado; `15368` confirmado público por chamada anônima independente; `src/config/env.ts`
byte-idêntico a `main`; os ~23 gates de produção intactos; o deploy segue bloqueado pelo J-6R.

---

## OS BLOQUEANTES — por que reprovou

### B-1 · O gate não pode ser instalado (achado por DOIS votantes, independentemente)

`conferirFontesFixadas` exige check **verde observado** para **todo** contexto requerido — inclusive
`erp/porteiro-pre-merge`. Esse check só é publicado em **head de PR**, nunca num commit de `main`. E `apply()`
amarra o plano ao tip de `main`. Logo **`plan()` não pode suceder em nenhum head que `apply()` aceite** —
hoje nem nunca. **A ferramenta sancionada para instalar o ruleset não instala o ruleset.**

Medido: `[.check_runs[] | select(.name=="erp/porteiro-pre-merge")] | length` = **0** entre os 267 do head de `main`.

### B-2 · Deadlock do próprio PR de instalação

`.github/workflows/porteiro-pre-merge.yml` está **ausente de `origin/main`** (confirmado pelo orquestrador com
`git cat-file -e`), e os quatro gatilhos do publicador exigem o arquivo na branch default. As duas ordens
falham: ruleset-antes-do-merge trava tudo para sempre; merge-antes-do-ruleset impede o porteiro de montar
snapshot (`buildSnapshot` com `rulesets: []` → *"nenhum ruleset ativo se aplica à branch default"*).

**As saídas restantes são fora da lei:** apagar/editar o ruleset (vedado pelo §8 do plano v1) ou mergear sem
parecer. A propriedade que falta: **um caminho de inicialização que não dependa de artefato que ainda não
está em `main`.**

### B-3 · Paginação truncada na API que alimenta o check requerido E o CAS

`check-runs?filter=latest&per_page=100` **sem paginar**, nos três scripts. O head de `main` tem **267**
check-runs; o gate lê 100 e **vetoa um `backend` verde que existe**.

Agravante de coerência interna: `coletarPaths` pagina a API de **files** com comentário explícito dizendo que
truncar abriria o buraco que a escalada fecha. A API irmã é truncada nos três arquivos.

### B-4 · A "prova conferível" do atestado não prova reexecução

O votante de enforcement **forjou o atestado inteiro** a partir do snapshot público:
`verifyAttestation => true`, com `commands: [{cmd: "npm test (NAO FOI EXECUTADO)", exitCode: 0}]` e
`agentId: "porteiro-que-nunca-existiu"`. E `evidence.kpiLatestBlobSha` é hash de blob git, obtenível offline
(`git hash-object` bate com a API remota).

**Isto não é o limite já declarado.** A F-E substituiu uma alegação falsa por outra **mais forte** — *"um
porteiro que não olhou o head não tem como produzi-lo"* — e a **cercou com o guard de prosa**, o que trava a
correção futura.

### B-5 · `validateJunta` é allow-by-default no objeto que define a independência

Alçada nova declarada (`revisor`, `achador`) **nasce ignorada**: não é exigida, não entra em
`junta.identities`, não entra no conjunto de colisão. Medido: porteiro com identidade `X-REVISOR` **LIBERA**;
executor do merge com ela **AUTORIZA**; pós-merge **FECHA**. Controle com `planner` **NEGA**.

No mesmo arquivo, `verifyAttestation` é **deny-by-default** (foi assim que `independentOf` morreu no ciclo 1).
Mesma entrega, mesma classe de artefato, **direções opostas de falha** — e o lado permissivo é justamente o
objeto que produz o conjunto de colisão. A lei (§C7.4-bis) nomeia `analista/revisor`; o esquema não tem slot.
**Na divergência ganha o código, que é o lado mais curto e mais permissivo.**

### B-6 · As 86 cercas podem sumir sem nada ficar vermelho

`package.json` — que **define** `governance:check`, único ponto onde as 86 cercas executam — está **fora** da
superfície que exige junta 5/5 (confirmado pelo orquestrador). Reescrevendo o script para omitir um arquivo de
teste: **86/86 → 30/30**, com `tsc` exit 0, suíte exit 0 e **sem escalada**. Junta 3/3 autorizaria.

Agravante estrutural: `tsconfig.json` é `include: ["src/**/*.ts"]` — os `.mjs` do gate e os testes **nunca
entram no `tsc`**. O critério "build vermelho" é **estruturalmente indisponível**; todo o fail-closed repousa
na suíte, e este achado remove a suíte.

Fora da superfície também: o próprio manifesto de allowlist, `scripts/post-merge-cleanup.sh` (executado pelo
finalizador) e `tests/kpi-release-tooling.test.ts`.

### B-7 · `SCRIPTS_GATE` × `SCRIPTS_DO_GATE` divergem em silêncio

Seis strings idênticas, dois literais, zero import entre eles. Script novo só no código escala mas **nunca é
varrido pelas cercas**; removido só do teste, deixa de ser varrido. Nos dois casos: **86/86, exit 0**.

### B-8 · `permissions` do workflow não é mínima, e o repositório é PÚBLICO

`contents: read` + `pull-requests: write` + `checks: write` no nível do workflow, herdado pelos quatro jobs;
só um usa os três. Eleva acima do default do repo (`read`) justamente no job que **qualquer anônimo dispara**.
Agravante: `log-execucao.md:3764` afirma *"permissões mínimas"* — artefato afirmando o que a execução não
produz, na superfície de segurança.

**A-2 correlata:** terceiro anônimo pode publicar `failure` no SHA do repo base via PR de fork e **expirar
qualquer autorização à vontade**. Direção fail-closed, mas é negação de serviço sobre o gate.

---

## Achados de prosa e escopo — não bloqueantes, registrados

- **"17 vezes"** na prosa do teste e da pendência: medido **18** em `bc1c1f7` e em `66cb221`, **16** em
  `c5f0368`. 17 não corresponde a nenhum estado commitado. A asserção executada (`>= 10`) é imune.
- **`P-GOV-POLARIDADE-CERCA-IRMA` diz que o script "recusa" as rotas vetadas.** Medido: não há allowlist de
  rota; as rotas simplesmente **não existem** no arquivo, e o que guarda isso é o teste 74. A propriedade vale;
  **o verbo excede o mecanismo** — mesma classe, num arquivo fora da cerca de prosa.
- **Rótulo "25 espelhos"** no teste, quando são 26 desde `bc1c1f7`. A asserção é dinâmica; rótulo, não
  propriedade.
- **`ALVO_MODELO` é case-sensitive e literal**: `GPT-5.6-SOL` e a paráfrase *"roda em Sol com raciocínio
  ultra"* passariam. Zero instâncias vivas + backstop executável ⇒ mesma fórmula do `P-GOV-POLARIDADE-CERCA-IRMA`.
- **`requiredChecks` faz `r.bypass_actors || []`**: ruleset com o campo **ausente** é tratado como sem bypass e
  **permite**. Hoje a API sempre devolve o campo.

## Honestidade metodológica registrada

**O votante anti-teatro declarou duas mutações que NÃO aplicaram** (literal não casou) e **não as contou** —
*"mutação que não aplicou com bateria verde é exatamente o falso verde que este papel existe para não
produzir"*. Refez com o texto exato.

**Ele também produziu um falso vermelho no próprio baseline** e o rastreou: `core.autocrlf=true` fez
`git archive` materializar 108 bytes CR. Refeito com `-c core.autocrlf=false`, virou verde. **É candidato
provável** — não confirmado — à medição de bytes CR que o orquestrador fez e não conseguiu reproduzir nem
explicar. O guard do D-2 torna a propriedade independente da materialização, que é a correção certa.

**Divergência factual sobre o próprio enunciado, e a correção dela.** O orquestrador informou 40 commits; dois
votantes mediram **44**. Remedido depois: **40 desde `b444906`** (o commit em que a branch de governança
começou) e **44 desde `origin/main`**. **Nenhum dos dois estava errado** — contavam bases diferentes, e nenhum
dos dois declarou qual base usava. A primeira redação desta ata registrou a divergência como erro do
orquestrador; era erro da própria ata. Fica a regra: **contagem de commits declara a base**, pela mesma razão
que afirmação de estado declara o commit em que foi medida.

## O que a junta NÃO conseguiu medir

Estado vivo do ruleset (nunca aplicado; aplicá-lo é proibido a revisor) · comportamento do branch protection
com dois check-runs homônimos no mesmo SHA (já é `P-GOV-CHECK-COMO-JOB` fatia 1) · se rulesets em repo de
usuário público aceitam `integration_id` e `~DEFAULT_BRANCH` como o template escreve · runtime do Codex
(`fable` validado por doc oficial, não por sonda local) · `npm test` completo e o job `backend` da CI
(dependem de Postgres/Redis).

---

## Encaminhamento

**REPROVADO.** Abre o **ciclo 3** (§C7.4): crítico reabre a premissa **desde o objetivo**, com pesquisa de
≥5 fontes, teto de 6 agentes. A premissa a reabrir é dura e foi enunciada por três votantes com evidência
executada: **o desenho do bootstrap não fecha**, e o mecanismo de prova do atestado afirma mais do que mede.

Os cinco votantes ficam **inelegíveis** para planejador, desenvolvedor, revisor, porteiro e executor
pós-merge do ciclo 3.
