# GOV-PORTEIRO-PRE-MERGE — ciclo 2 — plano v1

> **Papel deste texto:** plano vinculante do ciclo 2 da reprovação da governança (§C7.4).
> Escrito pelo `planejador-mestre` (alçada de planejamento). **Ele não implementa, não revisa e não vota.**
> Dossiê dos achados: `agent-orchestration/omega/reprovacoes/R-GOV-PORTEIRO-PRE-MERGE-ciclo2.md`.

**Alçadas (nomes de papel; identidades entram na ata):** achadores = os 84 agentes da auditoria (não
implementam, não votam de novo); planejador = o autor deste plano (não implementa, não revisa, não vota);
desenvolvedor do ciclo 2 = agente novo; fábrica do ciclo 2 = agente novo (cria 1 especialista, §C7.4);
revisores/junta = agentes novos, **junta crítica 5/5** (este PR instala a própria governança de merge —
critério §C7.1); bootstrap do ruleset, porteiro, executor do merge e executor pós-merge = quatro identidades
novas, como no plano v1 do ciclo 1 (§§7–8 daquele plano permanecem válidos e **não** são reescritos aqui).

**Objetivo:** transformar o gate do porteiro de artefato que **afirma** propriedades em artefato onde **cada
propriedade tem um caminho vermelho executável**, e alinhar a prosa dos contratos ao que o mecanismo
realmente prova — sem fingir prova onde só existe declaração.

**Contrato:** não há rotas REST; o contrato aqui são os schemas JSON (`erp-porteiro-snapshot:v1`,
`erp-porteiro-attestation:v1`, `erp-junta-attestation:v1`, `erp-post-merge-finalization:v1`) e os exit codes
dos CLIs (0 = propriedade vale; !=0 = fail-closed com mensagem nomeando a propriedade violada).
**Modelagem:** nenhuma migration — nada toca banco. Os schemas mantêm o rótulo `:v1` mesmo mudando de forma,
com registro explícito na ata: **nenhum consumidor existe** (arquivos untracked, zero PR real publicou esses
marcadores; medido: o gate inteiro não existe em `main`).

---

## 0. Conferência das seis causas-raiz (remedidas pelo planejador)

| CR | Sustenta? | Medição |
|---|---|---|
| CR-1 | **Sim, com severidade corrigida (alta, não bloqueante).** | `grep -n "gpt-5.6-sol"` nos dois contratos: CLAUDE.md:233/377/379 e AGENTS.md:260/404/406 são a mesma frase; a lista de mecanismos por ferramenta (CLAUDE.md:30–39) não contém "modelo". Frontmatters reais dizem `model: fable`. **Ressalva honesta:** os céticos derrubaram a versão "bloqueante/inexecutável" desta tese (o frontmatter compensa e o gate falha fechado). O que sobra é defeito de camada de redação: prosa byte-idêntica prescrevendo identificador Codex no contrato Claude + CLAUDE.md:377/382 afirmando que o frontmatter fixa um modelo que o frontmatter não diz. |
| CR-2 | **Sim, integral.** | `verifyAttestation` (porteiro-pre-merge.mjs:80–93): `agentId/role/runtime/model/reasoningEffort/independentOf/commands` são strings comparadas por igualdade, todas escritas por quem escreve o JSON. Nenhuma trilha de invocação existe no repo. |
| CR-3 | **Sim, integral.** | porteiro-pre-merge.mjs:44–45 e post-merge-finalize.mjs:13–14: `.filter(Boolean)` descarta alçada omitida antes do teste de colisão. `verifyAttestation:90` compara o porteiro só com `independentOf` — lista que o próprio porteiro escreveu. `validateJunta:42` exige >=3 votos; **não existe** noção de crítico/5-unânime no gate do PR. `assertMergeCandidate:24` compara o executor do merge apenas com porteiro + `independentOf`. |
| CR-4 | **Sim, integral.** | `node scripts/sync-agent-agents.mjs --check` -> "OK — 23 agentes, espelho consistente" com **25** arquivos existentes. `readdirSync` não-recursivo (79/87/95/108); `rmSync` (108–109) apaga em silêncio .md do espelho fora da origem+KEEP. `agente-fabrica.md` grava em `especialistas/` e tem `tools: Read, Write, Edit, Grep, Glob` — sem Bash. |
| CR-5 | **Sim, com nuance.** | `which rg` -> exit 1. `npm run governance:check`: **11 tests, 10 pass, 1 fail** (o fail é o teste que spawna `rg`). `grep "governance" .github/workflows/*.yml` -> nada. **Nuance:** ci.yml:81 roda `npm test`, e `run-backend-tests.mjs` expande `tests/*.test.ts` — ao commitar, os arquivos **entram** na suíte da CI sozinhos. O gap real é (a) dependência de binário fora do ambiente garantido; (b) ausência de step nomeado. |
| CR-6 | **Sim, integral.** | `requiredChecks` (23–37) filtra só por `enforcement === 'active'`; nunca lê `target`, `conditions.ref_name`, nem exige regra `pull_request`/`deletion`/`non_fast_forward`. Linha 59: `req.appId == null` vira curinga — verde de **qualquer** fonte satisfaz o check requerido. |

**Correção de enquadramento:** "o único enforcement está fora da CI" — está fora **hoje porque os arquivos
estão untracked**; o commit já o colocaria dentro via `npm test`. A correção certa não é "adicionar à CI" e
sim **remover a dependência de `rg`** e dar um step nomeado.

---

## 1. A pergunta central: CR-2 é consertável?

**Resposta direta: "qual modelo rodou" NÃO é verificável de dentro do processo, com os meios permitidos.
É intrinsecamente auto-declarado.**

1. O harness do Claude Code não exporta artefato assinado dizendo qual modelo executou um subagente; o que um
   agente escreve sobre si mesmo é uma string. O Codex idem — logs de sessão locais são forjáveis e não estão
   ligados a gate nenhum.
2. Prova real exigiria assinatura do provedor ou executor confiável (Action com credencial de API chamando o
   modelo e assinando a saída) — **serviço externo tarifado + credencial nova**, vedado (§C7.5).
3. Toda "melhoria" dentro do processo (mais campos, hash do recibo, recibo em dois lugares) só muda **quantas**
   strings é preciso mentir, não **se** dá para mentir. Foi assim que o auditor produziu um `LIBERADO` com
   `node -e`.

**Saída A — manter o campo como prova e "endurecê-lo".** Custo aparente zero; custo real permanente: o gate
central da governança passa a ser, ele mesmo, a classe de defeito perseguida. **Rejeitada.**

**Saída B — a lei para de afirmar o inverificável e o gate passa a exigir só o que é conferível.**
**RECOMENDADA**, na variante que preserva a decisão do dono: `runtime/model/reasoningEffort` **continuam
obrigatórios com os valores exatos** `codex`/`gpt-5.6-sol`/`ultra` — porque são decisão do dono e removê-los
apagaria a exigência da superfície de enforcement. Muda a **semântica**, em três lugares, por escrito:

1. Os campos passam a chamar-se **"declaração de invocação"** em toda a prosa. A palavra "recibo"/"prova"
   para esses campos é eliminada. Falsear a declaração é violação nomeada da decisão do dono — detectável só
   a posteriori, e o contrato diz isso com todas as letras.
2. O contrato declara o que hoje só existe por inferência: **o papel do porteiro é staffado no Codex**; o
   Claude Code não emite atestado válido para este papel **por desenho**. Indisponibilidade de Codex/Sol =
   **fluxo bloqueado** (fail-closed); a exceção "vira nota na ata" pertence **só** ao `planejador-mestre`.
3. A **prova exigida pelo gate** passa a ser o conjunto do que é conferível de fora: (a) independência por
   cruzamento de identidades entre artefatos externos; (b) evidência de reexecução conferível (digests que o
   gate confere contra o head); (c) fonte do check comprovada por app id fixado. `independentOf` deixa de ser
   fonte de verdade: o conjunto de identidades vem do snapshot.

**Custo residual admitido:** um orquestrador pode mentir os três campos de declaração. O que muda é que a
mentira deixa de derrotar um mecanismo de prova (não há mais mecanismo fingindo prova) e não enfraquece
nenhuma proteção verificável. Este é o teto honesto sem serviço pago.

---

## 2. Plano por causa-raiz

### F-A (CR-4) — espelho recursivo e sem deleção silenciosa

**Propriedade:** "O `--check` fica vermelho para qualquer byte de divergência em **qualquer** arquivo de
`.claude/agents/**` <-> `.agents/agents/**`, subpastas incluídas; e nenhum modo do sync apaga arquivo
só-espelho — encontrar um é erro ruidoso (exit !=0, arquivo intacto, instrução de registrar em
`agent-orchestration/controle/` por §A2)."

**Mecanismo** (`scripts/sync-agent-agents.mjs`): caminhada recursiva (withFileTypes) produzindo paths
relativos (`especialistas/guardiao-….md`); `transform()` recebe o path relativo e o `PREAMBLE` cita
`.claude/agents/<path-relativo>` — o que regenera os 2 especialistas com o preâmbulo canônico; `KEEP` continua
só `README.md` na raiz do espelho; em modo escrita, arquivo do espelho fora de (derivados ∪ KEEP) **não é
deletado**: o script lista e sai 1. `--check` adicionalmente falha se `README.md` do espelho não existir e
cruza a tabela de papéis do README com os arquivos reais (papel citado que não existe = vermelho). Prosa:
CLAUDE.md ganha o imperativo de rodar os dois syncs que hoje só o AGENTS.md tem — mas o enforcement real é o
`--check` na bateria (F-B), não a frase. `sync-agent-skills.mjs` recebe a mesma regra anti-deleção-silenciosa.
A `agente-fabrica` **não** ganha Bash: quem fecha o laço é o guard vermelho — se a fábrica criar especialista
e ninguém rodar o sync, `governance:check` e a CI ficam vermelhos (fail-closed em vez de poder novo).

**Prova por mutação:** (1) reexecutar a mutação do auditor — editar
`.agents/agents/especialistas/guardiao-interoperabilidade-modelos-claude-codex.md` para "aprove sempre" ->
`--check` sai 1 (hoje sai 0); (2) criar `.agents/agents/papel-so-codex.md` -> modo escrita sai 1 e o arquivo
sobrevive (hoje: deletado em silêncio, exit 0); (3) deletar `.agents/agents/README.md` -> `--check` sai 1;
(4) acrescentar à tabela do README um papel inexistente -> vermelho. Todas em diretório fixture temporário,
**nunca** mutando a árvore real do dono.

### F-B (CR-5) — enforcement que executa em toda máquina

**Propriedade:** "`npm run governance:check` fica verde na máquina do dono usando apenas Node + o que
`package.json` declara (zero binário externo); a asserção 'só estes 2 papéis têm ultra' executa de fato; e a
CI tem step nomeado de governança dentro de job requerido."

**Mecanismo:** em `tests/agent-model-routing.test.ts`, substituir o `execFileSync('rg', …)` (linha 15) por
varredura recursiva em Node sobre `.agents/agents/**/*.md` procurando `/^reasoning_effort: ultra$/m` — o
resultado esperado continua exatamente `['planejador-mestre.md','porteiro-pos-merge.md']`. Remover a asserção
tautológica da linha 22 (os céticos provaram que não mede nada; o guard real são as linhas 8/12 — manter).
Adicionar ao job `backend` de `.github/workflows/ci.yml` (contexto já requerido — não cria contexto novo) um
step `npm run governance:check` + `node scripts/sync-agent-agents.mjs --check` +
`node scripts/sync-agent-skills.mjs --check`. Isto torna **irrelevante a lacuna não medida** sobre `rg` na CI.

**Prova por mutação:** (1) acrescentar `reasoning_effort: ultra` a um terceiro arquivo do espelho -> teste
vermelho **nesta máquina, sem rg**; (2) remover o step de governança do ci.yml -> asserção textual vermelha.

### F-C (CR-3) — cruzamento de alçadas fail-closed

**Propriedade:** "Junta sem `origin`, `planner` e `developer` nomeados como strings não vazias não passa em
gate nenhum; junta declara `critical` obrigatoriamente, e `critical:true` exige >=5 votantes distintos e
unânimes; o conjunto completo de identidades da junta (incluindo `fabrica`) vive no snapshot e é cruzado
contra porteiro, executor do merge e executor pós-merge — qualquer colisão ou omissão fica vermelha."

**Mecanismo:** `validateJunta` v2: exige `origin/planner/developer` não vazios (fim do `.filter(Boolean)` como
escape); campo `critical` booleano obrigatório (ausente = fail; `critical:true` -> `votes.length >= 5`, todos
distintos e APROVADO); campo `fabrica` presente como chave (null permitido; se preenchido entra no conjunto de
colisão). `buildSnapshot` grava `junta.identities` (lista canônica ordenada de `{role, agentId}`) além do
hash. `verifyAttestation`: `attestation.agentId` ∉ `snapshot.junta.identities`; `independentOf` é **removido do
schema** (era a fonte auto-declarada; mantê-lo "por compatibilidade" seria manter o teatro).
`assertMergeCandidate`: `mergeAgentId` ∉ identities ∪ {attestation.agentId}. `validateFinalization`: mesmos
campos obrigatórios, mesma coleta explícita. **Limite admitido por escrito no contrato:** identidades são
declaradas; o gate pega colisão e omissão, **não pseudônimo** — "passes sequenciais com nomes diferentes"
continua fora do alcance mecânico e a ata é o controle compensatório; a frase entra no §C7.4-bis para o
contrato parar de sugerir que o gate cobre isso.

**Prova por mutação (cada uma um caso de teste):** (1) junta omitindo `planner` -> vermelho (hoje **verde** —
exploit do auditor); (2) `developer: ""` -> vermelho; (3) `critical: true` com 3 votos -> vermelho (hoje o
conceito não existe); (4) `critical` ausente -> vermelho; (5) atestado com `agentId` igual ao `planner` ->
vermelho (hoje **verde** — exploit do auditor); (6) `mergeAgentId` igual a um votante -> vermelho; (7) executor
pós-merge igual ao `origin` -> vermelho; (8) `fabrica` igual a votante -> vermelho.

### F-D (CR-6) — o ruleset conferido é o ruleset da `main`

**Propriedade:** "O snapshot só aceita ruleset ativo que se aplica à branch default (`target: branch` e
`conditions.ref_name.include` contendo `~DEFAULT_BRANCH` ou `refs/heads/<default>`), que contém as regras
`pull_request`, `deletion` e `non_fast_forward`, e cujos required checks têm `integration_id` inteiro positivo;
um check requerido só conta verde se o `appId` observado for igual ao exigido — null nunca é curinga; e a fonte
esperada do check do porteiro é fixada por valor conhecido, não derivada do próprio run."

**Mecanismo:** `requiredChecks` v2 recebe o `default_branch` do repositório; descarta rulesets que não se
aplicam à default branch; `fail` se nenhum aplicável restar, se faltar qualquer uma das três regras, ou se
algum required check tiver `integration_id` não-positivo. Matching estrito: `c.appId === req.appId`. No
workflow, eliminar a tautologia: `ERP_PORTEIRO_EXPECTED_APP_ID` deixa de ser derivado do check-run recém-criado
e passa a ser valor fixado no YAML com comentário citando a PD. **A fábrica/pesquisador confirma o app id por
PD com >=3 fontes antes da implementação** (§C7.3); se a pesquisa não confirmar valor estável, mantém-se o
VETO-antes-do-bootstrap do plano v1 F3.2, que já é fail-closed.

**Prova por mutação:** (1) fixture com ruleset ativo apontando `refs/heads/develop` -> `buildSnapshot` vermelho
(hoje **verde**); (2) remover a regra `pull_request` -> vermelho; (3) `integration_id: null` num required check
vivo -> vermelho; (4) check verde com `appId` diferente do exigido -> vermelho; (5) workflow contendo o padrão
de derivação `source_id=$(… .app.id)` -> asserção textual vermelha.

### F-E (CR-2) — atestado sem teatro

**Propriedade:** "Nenhum campo auto-escrito é tratado ou nomeado como prova. O atestado carrega (a) a
declaração de invocação obrigatória (`runtime=codex`, `model=gpt-5.6-sol`, `reasoningEffort=ultra` — decisão
do dono, semântica de declaração), e (b) evidência de reexecução **conferível**: cada comando com `cmd` não
vazia e `exitCode`, mais o digest do `Kpis/kpis-latest.json` do head — e o gate confere esse digest contra o
blob real do head via API. Veredicto negativo deixa rastro externo."

**Mecanismo:** `verifyAttestation` v2 mantém a igualdade dos três campos de declaração, mas a mensagem de erro
passa de "recibo Codex Sol/ultra inválido" para "declaração de invocação fora da decisão do dono
(D-PORTEIRO-PRE-MERGE)"; `commands` vira lista de objetos `{cmd: string não vazia, exitCode: 0}` com mínimo
obrigatório; novo campo `evidence: {kpiLatestBlobSha}` — o snapshot registra o blob SHA de
`Kpis/kpis-latest.json` no head e `verifyAttestation` exige igualdade. Isto é conferível de verdade: o executor
do merge e o pós-merge reverificam contra o GitHub, e um porteiro que não olhou o head não tem como saber o
valor. Novo subcomando `publish --verdict BLOQUEADO|RESSALVA` publica comentário externo + check-run `failure`
(veredicto negativo passa a deixar rastro). A proteção contra "republicar até dar verde" já existe
(`status.target_url` deve apontar para o **último** comentário de atestado) — manter e testar. Prosa:
`.claude/agents/porteiro-pos-merge.md`, `.agents/agents/README.md` (o bloco "frontmatter sozinho não é recibo"
vira "nem frontmatter nem campo de atestado são prova; são declaração obrigatória"), CLAUDE.md/AGENTS.md
§C2.8: staffing Codex explícito + declaração-não-prova + sem exceção de indisponibilidade para o porteiro.

**Prova por mutação:** (1) reexecutar o exploit do auditor — gerar atestado válido via `node -e` com evidence
ausente/errada -> **vermelho** (hoje verde; este é O caso do ciclo); (2) `evidence.kpiLatestBlobSha` divergente
-> vermelho; (3) `commands: ['']` ou `[{cmd:'npm test', exitCode:1}]` -> vermelho; (4) os guards de bloco
marcado da F-F cobrem a regressão textual.

### F-F (CR-1) — prosa por ferramenta, cercada por guard executável

**Propriedade:** "Toda ocorrência de `gpt-5.6-sol` ou do atalho `Sol/ultra` nos documentos normativos vivos
(CLAUDE.md, AGENTS.md, EXECUTION_MODEL.md, comando-template.md, BUILD_ORDER.md,
docs/claude-code-handoff/README.md) vive dentro de um bloco marcado `<!-- interop:modelo:v1 -->…
<!-- /interop:modelo:v1 -->` que nomeia os dois lados (Claude = `fable`; Codex = `gpt-5.6-sol`/`ultra`) e o
staffing do papel; e a lista de mecanismos específicos por ferramenta em ambos os contratos inclui 'modelo'."

**Mecanismo:** reescrever CLAUDE.md:233 (§C2.8), :377–386 (§C7.6), :451 (DoD) — e os pontos equivalentes do
AGENTS.md e dos quatro satélites — em blocos marcados com a redação por ferramenta (a do frontmatter do
`planejador-mestre.md`, que já está certa, vira o texto-mãe). CLAUDE.md:377/382 deixa de afirmar que o
frontmatter fixa `gpt-5.6-sol` (o frontmatter fixa `fable`; o espelho fixa Sol — dizer isso). A bullet-list de
interop (CLAUDE.md:30–39 e AGENTS.md:33–44) ganha o item "modelo por papel". Guard novo em
`tests/agent-model-routing.test.ts`: para cada documento da lista, conta ocorrências de
`/gpt-5\.6-sol|Sol\/ultra/` e exige que todas estejam entre marcadores, e que cada bloco marcado contenha
`fable` e `gpt-5.6-sol` e as palavras `Claude` e `Codex`; exige o item "modelo" na seção de interop dos dois
contratos. **Exclusões documentadas no teste:** IDs de decisão (`D-FABLE-…`) e arquivos de registro histórico
(decisoes.md, atas, reprovações — história não se reescreve, §A5).

**Prova por mutação:** (1) reintroduzir a frase atual "Ele roda em `gpt-5.6-sol`…" fora de bloco marcado em
CLAUDE.md -> vermelho (hoje nada detecta — é o defeito); (2) apagar "modelo" da lista de interop -> vermelho;
(3) bloco marcado sem o lado Claude -> vermelho. Esta é a resposta à regra "correção só de texto é a mais
fraca": o texto muda **e** ganha um cercado executável cuja violação fica vermelha.

---

## 3. Sobreviventes fora dos seis grupos — destino de cada um

Nenhum achado órfão: 1–5 -> F-E/F-C; 6, 11, 13, 14, 25, 32, 37, 38 -> F-A; 9, 12, 15, 27 -> F-B;
7, 8, 16, 22, 26 -> F-F; 10, 17, 18, 19, 24, 34, 35, 39 -> F-E; 20, 36, 40 -> F-D; 21, 29, 30, 31 -> F-C;
23, 28 -> F-A; 33 (gate voluntário / main desprotegida) -> **não é correção deste PR**: é a sequência de
bootstrap do plano v1 §§7–8, que permanece vigente (ativar ruleset **antes** do merge, drills em branch
descartável, rollback por pre-state). O achado 24 (Sol do planejador sem enforcement) fica resolvido pela via
honesta da Saída B: é declaração com registro em ata, e o contrato passa a dizer isso.

## 4. Ordem e dependências

```
F-A (sync recursivo)  ──►  F-B (de-rg + CI)          [F-B varre o espelho que F-A completa]
F-C (alçadas)         ──►  F-E (atestado)            [F-E consome junta.identities do snapshot]
F-C ──► F-D (ruleset) ──►  F-E                       [mesmos arquivos; evita churn de fixture]
F-A..F-E ──► F-F (prosa)                             [a prosa descreve a mecânica final]
F-F ──► varredura satélites ──► junta 5/5 ──► KPI/§C3 no mesmo PR ──► bootstrap (plano v1 §7–8)
```

Tudo em **um único PR** (esta branch é uma entrega); a ordem acima é a ordem de commits do desenvolvedor e a
ordem de reexecução dos revisores.

## 5. Varredura da dimensão `satelites` — antes ou depois?

**Depois da implementação (F-A..F-F), antes do voto da junta.** Motivo: (a) a superfície está **não auditada**
(os céticos caíram no limite de sessão e os achados foram descartados — não se herda achado não-verificado);
(b) F-F altera exatamente arquivos-satélite, então varrer antes mediria uma árvore que vai mudar; (c) a junta
não pode votar 5/5 sobre uma superfície normativa sem varredura válida. Escopo: EXECUTION_MODEL.md,
comando-template.md, BUILD_ORDER.md, docs/claude-code-handoff/README.md, Kpis/README.md,
`.agents/agents/README.md`, as referências de skill (`codex-pr-workflow.md` dos dois lados) e as entradas vivas
tocadas em decisoes.md/status-geral.md/log-execucao.md — procurando lei velha ativa ("junta verde = merge",
porteiro pós-merge como gate). Achadores novos + céticos novos (achado sem cético não conta).

## 6. Baseline e meta de testes (medidos)

- Baseline N (governança): **11 testes** em `npm run governance:check` — hoje **10 pass / 1 fail** nesta
  máquina (fail = spawn de `rg`). Meta M >= 2N = **>=22 testes focados de governança, 22/22 verdes na máquina
  do dono**, cobrindo no mínimo as 20 mutações nomeadas nas fatias (cada mutação = caso vermelho executado e
  revertido).
- Suíte cheia: denominador vigente 2583 + novos; captura por **TAP integral por execução, SHA-256, exit code,
  sem retry cego**; CI remota verde no head exato antes do porteiro.
- KPI (§C3): este PR altera código+testes -> atualiza `Kpis/kpis-latest.json`, `kpis-history.*` e `index.html`
  no próprio PR via `scripts/kpi-release.mjs author`, com contagens executadas; `merge_commit`/`approved_head`
  = null na autoria.

## 7. Protocolo do ciclo (§C7.4 e §4-bis)

- **Fábrica do ciclo 2** cria **1** especialista: `guardiao-anti-teatro-de-atestado` — vota **executando as
  mutações deste plano** (não relendo diffs); critérios de veredito referenciam o dossiê, não achados próprios
  da fábrica. Fica em `.claude/agents/especialistas/` — que, após F-A, está **dentro** da garantia do espelho.
- Perguntas obrigatórias da ata: (a) composição cobre a competência? — exige quem saiba executar mutação em
  Node/CLI e quem saiba GitHub API/rulesets (o `guardiao-enforcement-github-porteiro` existente + o novo);
  (b) quem achou consertou? — não: 84 achadores read-only, dev novo, planejador não achou nem implementa;
  (c) dado podre? — as premissas centrais foram **remedidas pelo planejador** (seção 0), e as três lacunas
  herdadas estão declaradas, não assumidas.

## 8. Honestidade — o que segue não medido

1. **`rg` no runner da CI:** segue não medido — e o plano o torna **irrelevante** (F-B remove o único uso).
2. **Schema de frontmatter do Codex** (`model:`/`reasoning_effort:` aceitos de fato?): não medido (sem runtime
   Codex). O plano deixa de depender disso (Saída B: tudo é declaração; a invocação passa overrides
   explícitos). PD obrigatória do pesquisador (>=3 fontes) antes da junta, junto com a PD do app id (F-D).
3. **Estado vivo do GitHub** (rulesets/proteção da main): não medido (sem `gh auth`). O último fato medido
   (auditoria, 2026-08-21) é `[]`/404 — coerente com o desenho: o bootstrap do plano v1 ativa o ruleset
   **antes** do merge, e o gate corrigido (F-D) falha fechado se o ruleset vivo não se aplicar à main.
4. **Limite estrutural admitido:** identidades de agente são declaradas; o gate pega colisão e omissão, não
   pseudônimo (F-C registra isso no contrato). E "qual modelo rodou" permanece inverificável — a lei corrigida
   **diz isso** em vez de fingir o contrário (seção 1).

## 9. Riscos e rollback

- **Restauração sem `git checkout/stash/clean` (restrição dura):** antes do primeiro edit, o desenvolvedor gera
  manifesto `md5sum` dos 58 arquivos modificados/untracked no scratchpad; qualquer aborto restaura por cópia de
  arquivo e reconfere hash. Nenhum comando de descarte em árvore com untracked insubstituível.
- **Schemas mudam sob o rótulo `:v1`:** mitigado por registro na ata + decisoes.md de que nenhum consumidor
  existia (gate inteiro ausente de `main`, medido).
- **Guard de prosa frágil:** mitigado pelo desenho por contagem/continência (não igualdade byte a byte) e
  exclusões documentadas no próprio teste.
- **App id fixado errado (F-D):** falha **fechada** (publish recusa), nunca aberta; PD antes de implementar.
- **Diff grande no espelho regenerado (F-A):** o espelho é gerado; a prova de correção é `--check` idempotente
  (rodar duas vezes, exit 0, zero diff na segunda).
- **Rollback do PR:** a branch não mergeou; abortar = não mergear. Rollback do bootstrap remoto permanece o do
  plano v1 §8 (pre-state por ID, 5/5, sem desligar proteção "para passar").

---

**Sem plano = veto automático; este plano existe.** Ele responde a pergunta central pela saída desconfortável
(a lei para de afirmar o que não prova), preserva as decisões do dono como obrigações declaradas, e dá a cada
propriedade um caminho vermelho executável — incluindo os dois exploits que os auditores executaram em verde
(atestado via `node -e` e mutação do espelho), que passam a ser casos de teste permanentes.

---

# ADENDO — vereditos do planejador sobre as três decisões abertas pela F-A/F-B (2026-08-21)

> Levantadas pelo **desenvolvedor da F-A/F-B**, que as reportou **sem consertar** (§C7.4-bis), e decididas
> pelo **planejador**. Quem implementa é o **dev da F-F**. Nenhuma alçada se acumulou.

## D-1 — guard bidirecional do índice do espelho: **SIM, nesta entrega, na F-F**

A metade que ficou de fora é exatamente a que aconteceu de verdade: o `executor-pos-merge` sumiu do índice
**por omissão**, não por citação fantasma. Corrigir só o conteúdo do README é correção de texto sem caminho
vermelho — a classe mais fraca, pela regra permanente.

**Especificação:** o guard em `tests/agent-model-routing.test.ts` passa a exigir, além da direção já
implementada, que **todo** `.md` do espelho (basename sem extensão, recursivo, exceto o próprio `README.md`)
apareça citado no `README.md` do espelho.

**Prova por mutação:** remover a linha do `executor-pos-merge` do README -> vermelho (hoje verde — é o defeito
histórico); acrescentar papel inexistente -> vermelho (já coberto).

## D-2 — `.gitattributes` escopado + guard; política global vira pendência

O desenvolvedor está certo em recusar a normalização na comparação: afrouxar o comparador para tolerar EOL
reintroduz uma classe de divergência invisível no exato lugar cuja propriedade é "qualquer byte fica
vermelho". A correção certa ataca a causa (política de materialização indeclarada), não o medidor.

1. Criar `.gitattributes` **escopado** às quatro árvores espelhadas — `.claude/agents/**`, `.agents/agents/**`,
   `.claude/skills/**`, `.agents/skills/**` — com `text eol=lf`, e renormalizar **somente** esses paths no
   mesmo commit (já estão sendo regenerados nesta entrega; o churn é o que já existe).
2. **Guard com caminho vermelho:** asserção de que **nenhum arquivo dessas árvores contém byte CR**. Mutação:
   introduzir um CRLF num espelho -> vermelho, **independente de como a árvore foi materializada**. Sem esse
   guard, o `.gitattributes` seria outra afirmação sem execução.
3. `.gitattributes` entra na allowlist (terceira adição autorizada pelo planejador, junto com plano e
   reprovação do ciclo 2).
4. Política de EOL do **repositório inteiro** = pendência registrada em `agent-orchestration/controle/` com o
   risco declarado (`P-EOL-POLITICA-GLOBAL`). Renormalização global toca centenas de arquivos fora do escopo
   e não passa no guard de allowlist.

**Nota para a ata, por instrução expressa do planejador:** as duas simulações do coordenador (blob cru ->
verde; `git archive` com `autocrlf=true` -> divergente) **estão em tensão entre si**. A decisão não depende de
resolvê-la, porque a correção escolhida torna a propriedade independente da materialização e o guard dá o
vermelho nos dois mundos. **Registrar a tensão como está, sem harmonizar.**

## D-3 — separador do preâmbulo: **SIM, corrigir agora, na F-F, com asserção de regressão**

Espelho com o corpo absorvido no blockquote **não é cosmético**: o preâmbulo é a moldura normativa ("poderes
idênticos, emulação inválida") e o primeiro parágrafo do corpo — em geral a **definição do papel** — vira
visualmente parte da moldura em **23 de 25** papéis. E a origem é exatamente a classe que o §C7.4-bis
descreve: **nasceu num delta de correção não commitado do ciclo 1, não no código original.**

Confirmação do planejador por releitura do `transform()` commitado em `35d4d76`: linha 70 usa
`${PREAMBLE(name)}${receipt}\n${body}`, enquanto o caminho sem frontmatter (linha 45) usa `\n\n` — **a
assimetria confirma o defeito**.

**Especificação:** linha em branco entre preâmbulo (com ou sem bloco de invocação) e corpo em **todos** os
caminhos do `transform()`; regenerar os 25 espelhos; provar idempotência (`--check` duas vezes, exit 0, zero
diff na segunda).

**Prova por mutação:** caso no teste unitário do `transform` assertando que a saída para papel sem `receipt`
tem linha em branco entre a última linha `>` do preâmbulo e o corpo — reverter para `\n` simples -> vermelho.

## Sequenciamento (ajuste fino, não reescrita do plano)

D-2 e D-3 **regeneram os espelhos**. Executar na F-F **depois** que F-C/F-E terminarem de editar os arquivos
de papel (`porteiro-pos-merge.md`, `agente-fabrica.md`), para o espelho regenerar **uma vez só**. Ambos antes
da varredura de satélites e do voto da junta, como já previsto. Meta de testes inalterada (M >= 22); os três
guards novos contam para ela.

---

# ADENDO II — vereditos D-4 e D-5, após o fechamento da PD do app id (2026-08-22)

> Motivados por `PD-GOV-PORTEIRO-APPID` (`docs/omega-pd.md`), pesquisada por alçada separada.
> Decididos pelo **planejador**. Implementados por devs distintos. Nenhuma alçada se acumulou.

## D-4 — app id: opção C + D aprovada, com duas amarras

A opção B (resolver em runtime) fica **rejeitada** — não por tautologia (não é: a fonte seria o registro global
do app, não o check recém-criado), mas por acrescentar chamada de rede e ponto de falha **sem ganho** sobre o
cross-check triplo.

**Amarra 1 — o override não pode ser canal de afrouxamento silencioso.** Caminho rápido: literal 15368 mais
cross-check de slug e owner.id, fail-closed em qualquer divergência. Caminho de override (existe só para o
cenário "o GitHub mudou o id"): o valor overridado **também** precisa passar prova contra o registro global
antes de ser aceito. **Override que não prova = vermelho.**

**Amarra 2 — o pin nativo mata o resto da resolução-por-observação.** O template do ruleset fixa
`integration_id: 15368` nos oito contextos, e o `plan()` do configure muda de **"resolver observando"** para
**"conferir que o observado é igual ao fixado"** — divergência = **VETO**, não re-resolução.

**Mutações:** override com id errado, publish vermelho; `integration_id` nulo ou diferente de 15368 no contexto
do porteiro, plan vermelho; resposta com slug certo e owner.id errado, vermelho.

## D-5(a) — o resíduo do app id: quatro controles, dois entram, um condicional, um vai ao dono

**1. Escalada por superfície de governança — ENTRA.** O snapshot lista os paths do diff do PR (API de files,
**paginada**). Diff que toque `.github/workflows/**`, `.github/rulesets/**`, `.gitattributes`, os seis scripts
do gate/sync, os testes de governança, os dois contratos ou as duas árvores de agente **exige
`junta.critical === true`** (5/5). Fecha mecanicamente o vetor principal: workflow acrescentado ou alterado no
próprio PR candidato deixa de passar com junta simples. É indutivo — todo merge passa pelo mesmo gate, então
workflow malicioso não entra "por fora" em ciclo nenhum. **Mutação:** PR tocando um workflow com
`critical:false`, snapshot vermelho.

**2. Proveniência do check-run — CONDICIONADA a PD-sonda**, mesmo padrão do app id. O que fecharia "foi o
**workflow do porteiro** rodando de main" é vincular o check-run ao seu workflow run (check-suite para run
para path). Se a sonda confirmar com pelo menos 3 fontes, o executor do merge e o publish verificam e a
divergência é vermelha. Se **não** confirmar, vira pendência com risco declarado e a prosa fica na variante
fraca. **A F-F não bloqueia nesta sonda** — ela só decide qual redação entra.

**3. Verificação de conteúdo e permalink — JÁ ESTÁ** (F-E: evidência conferível, target_url apontando ao
permalink do último atestado). Nada a decidir.

**4. CODEOWNERS / revisão obrigatória em `.github/workflows/` — PENDÊNCIA, DECISÃO DO DONO.** Reintroduz gate
humano por PR num fluxo definido como "informado, não consultado" (§C7.2), e num repo de um humano só a
revisão exigida ou vira **auto-revisão (teatro)** ou **trava o fluxo**. Registrada em
`agent-orchestration/controle/pendencias.md` como `P-GOV-CODEOWNERS-WORKFLOWS`, com as três opções e o custo
de cada uma.

## D-5(b) — a redação honesta do §C2.8

A frase "publicado por fonte GitHub App comprovada" **excede o mecanismo mesmo depois do pin** e **sai**.

**Princípio vinculante:** uma oração por camada, cada uma afirmando **só o que a sua verificação prova**, e o
**resíduo nomeado no próprio texto**. Este ciclo inteiro existe porque prosa afirmou o que a execução não
produzia — a lei não pode repetir isso na própria emenda.

**Variante forte** (só se a sonda do item 2 confirmar): (1) criado pelo app GitHub Actions, identidade
conferida contra o registro global e fixada no ruleset por integration_id; (2) vinculado por check-suite a uma
execução do workflow confiável disparada de main; (3) apontando ao permalink do atestado. Mais a frase: "o app
id sozinho não distingue workflows do próprio repositório".

**Variante fraca** (o que entra hoje): mantém (1) e (3), **remove (2) e declara o resíduo por escrito** — a
vinculação ao workflow do porteiro **não é provada mecanicamente**; mitigam-na a escalada crítica de
governança e a reexecução do porteiro sobre o diff, com ponteiro para a pendência.

**Em nenhuma hipótese** a prosa volta a dizer "fonte comprovada" sem qualificar **o que** está comprovado.

**Nota para a ata:** os guards de bloco marcado da F-F **cercam essa redação como as demais** — reintroduzir
"fonte GitHub App comprovada" sem as qualificações fica **vermelho no guard de prosa**, não só em revisão.

---

# ADENDO III — vereditos D-6, D-7 e D-8, após a sonda de proveniência (2026-08-22)

> Motivados por `PD-GOV-PORTEIRO-PROVENIENCIA` (`docs/omega-pd.md`, commit `a1fa21d`), pesquisada por alçada
> separada, com **24 respostas reais da API do GitHub**. Decididos pelo **planejador**.

## D-6 — a variante fraca do §C2.8: RATIFICADA

**Não é concessão, é a única redação verdadeira.** A cadeia check-run para check-suite para workflow run foi
**medida devolvendo dado falso**: um run de 16/06 "criando" um check-run de 01/08. Prosa que afirmasse a
vinculação seria a classe de defeito deste ciclo escrita pela nossa própria mão — agora **com conhecimento
prévio**, o que é pior do que o erro original.

A variante fraca sai como especificado no D-5(b): mantém (1) app comprovado por id, slug e owner, e fixado no
ruleset; e (3) permalink mais conteúdo do atestado. Declara o resíduo por escrito, com ponteiro para a PD e
para as mitigações — escalada crítica de governança e reexecução do porteiro sobre o diff.

## D-7 — a opção A: VETADA NA LEI, não só no plano

A opção A (derivar `path` via check-suite) é **pior que ausência de controle**: é **proveniência fabricada
pela plataforma**. Um campo que às vezes aponta workflow inocente transforma auditoria em **difamação de
evidência**, e "controle que acerta às vezes" é exatamente o teatro que este ciclo mata.

O veto entra no texto do §C2.8, **dentro do bloco cercado da F-F**, nesta forma:

> A resolução de proveniência via check-suite é **VETADA** como mecanismo de verificação
> (`PD-GOV-PORTEIRO-PROVENIENCIA`, 2026-08-22: a API associa por repo+SHA e devolve atribuição falsa para
> `POST /check-runs`); reabrir exige **nova PD com medição que contradiga a atual**.

**O ponto é o cercado.** Ficando dentro do bloco, remover ou "melhorar" o veto num ciclo futuro fica
**vermelho no guard de prosa** — que é o que impede o bem-intencionado de reintroduzir isso daqui a três
meses. Prova por mutação: apagar o veto, vermelho.

**Rótulo obrigatório para a ata:** a inferência "vence a check-suite de menor id" é **hipótese 2/2 não
documentada**. Entra rotulada como hipótese, **nunca** como fato.

## D-8 — a opção B: BLOCO PRÓPRIO, fora deste ciclo. Não entra nem como fatia

Três razões, em ordem de peso:

1. **Pergunta aberta material e decisiva, não medida:** qual check-run o branch protection considera vencedor
   entre dois homônimos no mesmo SHA. Se um `POST` hostil puder sombrear o check-de-job, a opção B despenca de
   "cadeia inforjável" para "cadeia inforjável que perde para o forjador". Implementar antes de medir seria
   construir sobre premissa não conferida — a pergunta (c) do §C7.4-bis.
2. **Não testada ponta a ponta e muda o desenho do publish** — e a lição nomeada deste projeto é que defeitos
   nascem em correções escritas por quem acabou de se convencer da solução, em fim de ciclo grande, com o dev
   do gate já carregando D-4 e a escalada.
3. **O resíduo está limitado pelos controles que já entram:** workflow hostil precisa primeiro EXISTIR na
   árvore, e diff em `.github/workflows/**` passou a exigir junta crítica 5/5. Homônimo hostil pressupõe
   workflow malicioso já mergeado — que o mesmo gate barra, indutivamente.

Registrado como `P-GOV-CHECK-COMO-JOB` em `agent-orchestration/controle/pendencias.md`, com a forma
vinculante: **fatia 1 é drill de medição** em repo/branch descartável; **fatia 2 só existe se a medição
sustentar**.

## As duas menores

**Comentário do YAML — corrigir agora, pelo dev que já está com o D-4** (mesmo arquivo, evita colisão de
fatias). O pin prova **"criado pelo app GitHub Actions"**, não "fonte confiável do check"; homônimo de outro
workflow do próprio repo compartilha a identidade; ponteiro para a PD e para as mitigações. **Comentário
afirmando prova que o mecanismo não entrega é a mesma classe de defeito em superfície menor — não fica.**

**Opção D como reabertura condicionada — APROVADA.** Registrada como `P-GOV-REABERTURA-RULESET-ORG`. Migração
para organização em Enterprise Cloud implica que a regra de ruleset `workflows` (`path`, `ref`, `sha`) resolve
a vinculação **na plataforma**; então reabrir a PD e, se confirmada, a variante forte volta por emenda com o
guard atualizado. É a **única rota conhecida** para a afirmação forte voltar a ser verdadeira — deixá-la
mapeada evita que alguém tente a rota vetada.
