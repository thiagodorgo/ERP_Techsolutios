# GOV-PORTEIRO-PRE-MERGE — ciclo 1 — plano v1

Data: 2026-08-21
Planejador independente: `/root/planejador_governanca_c1c`
Base: `R-GOV-PORTEIRO-PRE-MERGE-ciclo1.md`, `CLAUDE.md`, `AGENTS.md` e os dois guardiões do ciclo 1.
Estado: **PLANO — não autoriza implementação, configuração remota, voto, parecer, merge ou pós-merge**.

## 1. Separação de alçadas

- Este planejador não implementa, revisa, vota, configura GitHub, publica status, faz merge ou pós-merge.
- O desenvolvedor do ciclo 1 será novo e não acumulará alçada anterior.
- Configurar proteção de `main` exige junta crítica **unânime 5/5**, com cinco agentes novos e distintos do
  dono, planejadores, desenvolvedores, achadores, fábrica e futuros executores.
- Executor de bootstrap, porteiro Sol/ultra, executor do merge e executor pós-merge serão quatro identidades
  distintas e não participarão das alçadas anteriores.
- Os guardiões entram na revisão por agentes novos que adotem os papéis; definições não contam como voto.

## 2. Resultado e invariantes

Tornar o merge de `main` tecnicamente dependente de parecer independente, externo ao head candidato e ligado
a repositório + PR + head + base + corpo + checks + junta + ruleset. Apenas
`LIBERADO: merge do PR #<n> no head <sha>` produz o status requerido. Mudança de qualquer componente invalida
o status. Ruleset ativo e strict bloqueia merge sem esse contexto, sem bypass humano/administrativo normal.

1. `main` aceita somente PR; sem push direto, deleção, force-push ou bypass normal.
2. CI requerido e `erp/porteiro-pre-merge` pertencem ao head exato; atualização com a base é strict.
3. Parecer canônico vive no GitHub com permalink, nunca em commit do candidato.
4. Publicação é fail-closed: comentário durável, releitura integral e status verde por último.
5. `approved_head` e `merge_commit` ficam `null` na autoria.
6. Backfill separa head pré-merge aprovado do commit factual de merge.
7. Planejador não revisa/vota; identidade repetida em alçadas incompatíveis reprova.
8. Sol/ultra é cirúrgico no Codex; nenhum default global.

## 3. Matriz dos dez achados

| Achado | Mudança | Aceite bloqueante |
|---|---|---|
| C1-001 | Claude usa `model: fable`; sync traduz só a allowlist Codex para Sol/ultra; chamada Codex passa os dois overrides. | Frontmatter por ferramenta, invocação e recibo comprovados; nenhum outro papel herda override. |
| C1-002 | Ruleset ativo: PR, strict update, CI e `erp/porteiro-pre-merge` requeridos; `bypass_actors=[]`. | GET remoto reproduz o desejado; drill sem status não mergeia. |
| C1-003 | Snapshot inclui repo/PR/head ref+OID/base ref+OID/body SHA-256/checks/ruleset/junta. | Alteração de qualquer campo impede publicação ou invalida status. |
| C1-004 | Parecer JSON em comentário externo; status aponta ao permalink e registra identidade/runtime. | Head não muda; fonte esperada do status é provada remotamente. |
| C1-005 | Seis superfícies antigas recebem `SUPERSEDIDO` e link ao contrato vigente. | Guard não acha “junta verde = merge”/porteiro pós-merge ativo fora de histórico rotulado. |
| C1-006 | Papel, gatilho, formato e verificador do executor pós-merge. | Identidade distinta; PR/head/merge/backfill/limpeza verificáveis. |
| C1-007 | Template remove planejador da junta e valida unicidade de alçadas. | Planejador votante ou identidade duplicada falha. |
| C1-008 | Tooling atualiza latest/history/painel por script com números executados. | History sem append ou diff manual inconsistente falha. |
| C1-009 | `approved_head=null` na autoria; backfill usa o head do parecer após merge. | Nenhuma regra ativa permite preencher no candidato ou usar merge SHA. |
| C1-010 | Manifesto de allowlist e guard de diff; fluxo nominal completo. | Path fora do manifesto falha antes do push. |

## 4. Fatias de implementação (outro agente)

### F1 — modelos por ferramenta

1. `.claude/agents/planejador-mestre.md` e `.claude/agents/porteiro-pos-merge.md` usam o identificador Claude
   válido `model: fable`; nenhum OpenAI ID no frontmatter Claude.
2. `scripts/sync-agent-agents.mjs` mapeia somente esses dois papéis para a saída Codex com
   `model: gpt-5.6-sol` e `reasoning_effort: ultra`. Os demais mantêm default da sessão.
3. Codex exige chamada real com `model="gpt-5.6-sol"`, `reasoning_effort="ultra"` e fork compatível com
   override. Recibo registra agent id, role, runtime, modelo e esforço; papel portátil não é prova.
4. Executor pós-merge não recebe Sol/ultra por default.

### F2 — snapshot e parecer não circular

1. `scripts/porteiro-pre-merge.mjs snapshot --pr <n>` gera JSON canônico v1: repo/PR, head/base refs+OIDs,
   SHA-256 do corpo byte a byte, checks requeridos ordenados por `context+appId`, ruleset id+hash, junta e
   blob OID. Falha em draft/fechado, base não `main`, check ausente/não verde ou junta incompleta.
2. `verify` aceita somente `LIBERADO` literal, identidade independente e recibo Codex Sol/ultra. Ressalva,
   bloqueio, campo desconhecido, SHA abreviado ou fonte invisível falham.
3. `publish` cria comentário `erp-porteiro-attestation:v1`, obtém permalink, relê todo o snapshot e só então
   publica `erp/porteiro-pre-merge=success` no head, com `target_url` do comentário. Falha intermediária
   deixa status ausente/failure.
4. `.github/workflows/porteiro-pre-merge.yml` invalida em `synchronize`, `edited` (base/body), `reopened`,
   `converted_to_draft`, check requerido negativo e push na base. Evento assíncrono não é atomicidade.
5. `scripts/merge-authorized-pr.mjs` é a superfície de merge: relê snapshot/ruleset/status/permalink e usa
   compare-and-swap `expectedHeadOid`. Divergência aborta antes da API. Merge manual/UI fica proibido e o
   fechamento acusa qualquer ocorrência.

### F3 — ruleset e bootstrap

1. `.github/rulesets/main.template.json`: enforcement `active`, `refs/heads/main`, PR obrigatório,
   delete/non-fast-forward proibidos, strict required status, contextos CI exatos e porteiro, sem bypass.
2. `scripts/configure-main-ruleset.mjs` oferece `plan`, captura pre-state, resolve/prova a fonte esperada de
   cada status/check, aplica por ID e relê. Se a fonte confiável do porteiro não puder ser vinculada no
   GitHub real, há **VETO antes de configurar**; não degradar para contexto forjável.
3. `apply/rollback` exige ata crítica 5/5, head final, CI verde e executor de bootstrap distinto. Nenhum
   token/segredo entra em arquivo, log, comentário ou artefato.
4. Bootstrap: PR final → CI no head → junta 5/5 → executor distinto ativa/prova ruleset antes do merge →
   PR fica bloqueado sem status → porteiro novo Codex Sol/ultra publica parecer/status → outro agente faz
   merge CAS → executor pós-merge novo fecha fatos. Não há merge antecipado “para instalar o gate”.

### F4 — pós-merge e KPI

1. Criar `.claude/agents/executor-pos-merge.md` e espelho: papel factual, sem voto/mérito, verifica
   `merged=true`, PR, head aprovado externo, base, merge commit, ruleset e identidades; executa limpeza C5.
2. `scripts/post-merge-finalize.mjs` publica fechamento externo v1 no PR com permalink. Sem esse fechamento,
   não começa mudança substantiva do próximo bloco.
3. `scripts/kpi-release.mjs author` atualiza latest + append JSON/MD + fallback; mantém os dois SHAs nulos.
   `backfill --from-pr <n>` aceita apenas parecer+fechamento válidos e projeta `approved_head` pré-merge e
   `merge_commit` factual como campos distintos.
4. Para não criar PR infinito, a projeção entra como primeira operação do próximo PR autorizado, antes de
   mudança substantiva. PR puramente factual não incrementa `blocks_completed` nem gera backfill sobre si;
   essa exceção precisa ser ratificada pela junta 5/5 desta governança.

### F5 — contrato e superfícies supersedidas

1. Harmonizar contratos/template/KPI/build-order/handoff/log/status/decisão: status requerido, bootstrap,
   executor e dois SHAs distintos.
2. `comando-template.md`: planejador só planeja; junta só contém revisores/votantes independentes. Ata exige
   origem→plano→dev→cada revisor/votante→bootstrap→porteiro→merge→pós.
3. Preservar história, mas adicionar `SUPERSEDIDO` e link vigente em:
   `.claude/skills/erp-techsolutions-code-auditor/references/codex-pr-workflow.md`, espelho `.agents/`,
   `docs/claude-code-handoff/README.md`, `agent-orchestration/omega/prompt-rodada-saneamento-infra.md`,
   `agent-orchestration/omega/lista-saneamento.md` e
   `agent-orchestration/codex/comandos/B-O6R-01-identity-authority.md`.
4. A reprovação recebe somente identidade deste planejador e link deste plano.

## 5. Allowlist exata por dono da escrita

### Planejador deste ciclo

- `agent-orchestration/omega/planos/GOV-PORTEIRO-PRE-MERGE-ciclo1-plano-v1.md`
- `agent-orchestration/omega/reprovacoes/R-GOV-PORTEIRO-PRE-MERGE-ciclo1.md` (só identidade + link)

### Desenvolvedor futuro

- `CLAUDE.md`; `AGENTS.md`; `EXECUTION_MODEL.md`; `comando-template.md`; `BUILD_ORDER.md`; `Kpis/README.md`
- `.github/workflows/porteiro-pre-merge.yml`; `.github/rulesets/main.template.json`; `package.json`
- `scripts/sync-agent-agents.mjs`; `scripts/configure-main-ruleset.mjs`;
  `scripts/porteiro-pre-merge.mjs`; `scripts/merge-authorized-pr.mjs`;
  `scripts/post-merge-finalize.mjs`; `scripts/kpi-release.mjs`
- `tests/agent-model-routing.test.ts`; `tests/porteiro-pre-merge-governance.test.ts`;
  `tests/kpi-release-tooling.test.ts`
- `.claude/agents/planejador-mestre.md`; `.claude/agents/porteiro-pos-merge.md`;
  `.claude/agents/executor-pos-merge.md`; `.claude/agents/especialistas/guardiao-enforcement-github-porteiro.md`;
  `.claude/agents/especialistas/guardiao-interoperabilidade-modelos-claude-codex.md`
- `.agents/agents/README.md`; `.agents/agents/planejador-mestre.md`; `.agents/agents/porteiro-pos-merge.md`;
  `.agents/agents/executor-pos-merge.md`; `.agents/agents/especialistas/guardiao-enforcement-github-porteiro.md`;
  `.agents/agents/especialistas/guardiao-interoperabilidade-modelos-claude-codex.md`
- `.agents/agents/agente-ci-doutor.md`; `.agents/agents/agente-dba-guardiao.md`;
  `.agents/agents/agente-devops-provisionador.md`; `.agents/agents/agente-fabrica.md`;
  `.agents/agents/agente-finops.md`; `.agents/agents/agente-pesquisador-web.md`;
  `.agents/agents/agente-secops.md`; `.agents/agents/avaliador-mapas.md`; `.agents/agents/cognicao-visual.md`;
  `.agents/agents/coordenador-de-acessos.md`; `.agents/agents/critico-adversarial.md`;
  `.agents/agents/dev-mapas.md`; `.agents/agents/estrategista.md`; `.agents/agents/frontend-pixel-master.md`;
  `.agents/agents/guardiao-fail-closed.md`; `.agents/agents/inspetor-de-arnes-concorrente.md`;
  `.agents/agents/inspetor-de-rotas.md`; `.agents/agents/master-teste-telas-rotas.md`;
  `.agents/agents/planejador-mapas.md`; `.agents/agents/validador-mestre.md`
- `.claude/skills/erp-techsolutions-code-auditor/references/codex-pr-workflow.md`;
  `.agents/skills/erp-techsolutions-code-auditor/references/codex-pr-workflow.md`
- `docs/claude-code-handoff/README.md`; `agent-orchestration/omega/prompt-rodada-saneamento-infra.md`;
  `agent-orchestration/omega/lista-saneamento.md`;
  `agent-orchestration/codex/comandos/B-O6R-01-identity-authority.md`
- `agent-orchestration/codex/HANDOFF-CLAUDE-2026-08-20.md`;
  `agent-orchestration/codex/log-execucao.md`; `agent-orchestration/controle/decisoes.md`;
  `agent-orchestration/docs/status-geral.md`
- `agent-orchestration/omega/planos/GOV-PORTEIRO-PRE-MERGE-ciclo1-allowlist.txt`
- `Kpis/kpis-latest.json`; `Kpis/kpis-history.json`; `Kpis/kpis-history.md`; `Kpis/app.js`;
  `Kpis/index.html`

### Outras alçadas

- Junta: `agent-orchestration/omega/juntas/J-GOV-PORTEIRO-PRE-MERGE-ciclo1.md`.
- Porteiro/executor: comentário/status/check externo; não alteram o head candidato.
- Pós-merge: fechamento externo; projeção KPI posterior só por script e PR autorizado.

Todo path não listado é **proibido**, especialmente `prisma/**`, `migrations/**`, `infra/**`, `.env*`,
lockfiles, `src/**`, `frontend/**`, `mobile/**`, `portals/**`, deploy workflows e Figma. Guard compara
`git diff --name-only origin/main...HEAD` ao manifesto. Gerados `.agents/agents/` só mudam pelo sync.

## 6. Validação local e CI

1. `node scripts/sync-agent-agents.mjs --check`; `node scripts/sync-agent-skills.mjs --check`.
2. `node --check` nos seis scripts e em `Kpis/app.js`.
3. Três testes focados: `agent-model-routing`, `porteiro-pre-merge-governance`, `kpi-release-tooling`.
4. Mutations: Claude com OpenAI ID; Codex sem effort; papel extra com Sol; head/base/body/check trocado;
   comentário ausente; ressalva; identidade repetida; bypass/strict=false; `approved_head` na autoria; path
   fora da allowlist. Cada mutação fica vermelha e é revertida.
5. `node scripts/kpi-freeze.mjs --check`; guards KPI; `npm run check`; `npm run lint`; `npm test`;
   `npm run build`; `git diff --check`.
6. CI do PR final reproduz tudo no mesmo head; mudança após junta reinicia revisão, 5/5 e porteiro.

## 7. Drills remotos após 5/5 e antes de proteger `main`

1. Criar base e PR descartáveis `governance/ruleset-drill-<sha>` sob regra equivalente; nunca usar `main`
   em tentativa negativa. Registrar IDs exatos para cleanup.
2. Sem status, merge deve ser rejeitado; se ocorrer, atinge só a base descartável e bloqueia bootstrap.
3. Parecer com head/base/body/check errado, ressalva ou identidade repetida não produz verde.
4. No caso válido, editar body, mover base e head separadamente; cada evento retira verde/bloqueia merge.
5. Check requerido negativo e ruleset alterado invalidam autorização.
6. Executar snapshot→comentário→releitura→status→merge CAS no PR descartável; provar permalink/creator.
7. Apagar somente objetos de drill pelos IDs capturados; GET final prova ausência. Nunca wildcard/listagem.

## 8. Rollback e DoD

- Antes do apply, salvar JSON remoto, ID/ETag/hash e head na ata. Rollback não desliga proteção para passar:
  exige autorização 5/5 e executor novo, restaura exatamente o pre-state por ID e relê.
- Falha mantém `main` bloqueada e abre novo ciclo; não usar bypass.
- Parar antes do apply se fonte confiável, strict/no-bypass, permissão ou rollback não forem comprováveis;
  parar imediatamente se segredo aparecer ou drill puder mergear em `main`.
- DoD: dez achados; bateria+mutations+drills verdes; PR/CI no head; junta 5/5; ruleset antes do merge;
  parecer Sol/ultra externo; merge CAS; fechamento distinto; limpeza reportada.

## 9. Emenda vinculante — evidência da suíte cheia local (CI-Doutor, ciclo 1)

Data: 2026-08-21

Achador independente: `/root/analista_flake_governanca` (CI-Doutor; não corrige, não planeja e não vota).

Planejador desta emenda: `/root/planejador_flake_governanca` (não implementa, não revisa e não vota).

### 9.1 Fatos que não podem ser reescritos

1. O denominador oficial desta árvore é **2583 testes**.
2. A primeira execução cheia local terminou vermelha, com **2578 pass e 1 fail**. Ela é evidência histórica:
   não pode desaparecer, ser reclassificada como verde nem ser usada como valor do KPI corrente.
3. Há três execuções cheias posteriores verdes, todas com o mesmo denominador **2583**. Elas reduzem a
   evidência de defeito determinístico, mas não apagam a rodada vermelha.
4. A causa da rodada vermelha permanece **indeterminada**, porque o TAP integral daquela execução não foi
   preservado. Não há evidência suficiente para atribuir a falha ao produto, ao teste ou ao ambiente.

### 9.2 Decisão mínima

**Nenhuma mudança de código, teste, runner ou novo script está autorizada por este achado.**
`scripts/run-backend-tests.mjs` já força `--test-reporter=tap` e propaga o exit code real; a lacuna foi a não
preservação da saída integral. A correção deste achado é exclusivamente procedural e documental.

Em toda execução local relevante da suíte cheia a partir desta emenda:

1. capturar stdout+stderr integrais em um arquivo TAP **novo por execução**, sem sobrescrever a tentativa
   anterior, e preservar o exit code de `npm test`;
2. registrar no relatório da entrega: head exato, comando, ambiente de persistência declarado pelo runner,
   `tests/pass/fail/skipped/todo/cancelled`, exit code, caminho/identificador do TAP e SHA-256 do arquivo;
3. nunca disparar retry automático ou uma nova tentativa antes de registrar a anterior; uma nova execução é
   evidência adicional, não substituição;
4. não versionar o TAP volumoso no repositório. Mantê-lo fora da árvore de trabalho até a revisão, e removê-lo
   somente na limpeza autorizada depois que hash, sumário e conclusão estiverem persistidos.

Não é necessário criar comando novo: o chamador redireciona a saída integral já emitida por `npm test` para
arquivo único, preserva `$LASTEXITCODE` e calcula o SHA-256. Qualquer proposta de helper futuro exige novo
achado e novo plano; este ciclo não autoriza path de código adicional.

### 9.3 KPI e critério de liberação

- O KPI backend corrente deriva **somente da última execução cheia válida**, lendo do TAP dessa execução
  `pass` como valor e `tests` como total. Não se faz média, soma, escolha do melhor resultado nem conversão da
  rodada vermelha em KPI.
- O history/nota do KPI precisa declarar explicitamente: primeira rodada `2583 tests / 2578 pass / 1 fail`,
  TAP integral não preservado e causa indeterminada; três rodadas posteriores verdes com denominador 2583;
  e qual delas, identificada por hash, sustenta o KPI publicado.
- Antes da candidatura ao porteiro, o **CI remoto precisa estar verde no head exato** do PR. Verde local,
  ainda que repetido, não substitui CI remoto nem autoriza merge.
- Se reaparecer a assinatura `2583 tests / 1 fail`, ou se o TAP novo revelar repetição do mesmo teste/stack,
  o fluxo reabre a reprovação antes da junta/porteiro. O TAP integral passa a ser a evidência do achador; não
  se permite novo retry até classificação independente.

### 9.4 Proibições

Esta emenda não autoriza retry cego, mascaramento, `skip`/quarentena, relaxamento de asserção, aumento de
timeout, mudança de concorrência/ordem, alteração funcional ou ampliação da allowlist. Sem TAP da rodada
vermelha, qualquer uma dessas ações seria correção sem causa medida e contaminação do ciclo.
