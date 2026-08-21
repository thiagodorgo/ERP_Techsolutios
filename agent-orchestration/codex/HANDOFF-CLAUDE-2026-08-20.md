# Handoff Codex → Claude Code — 2026-08-20

Este registro existe por pedido explícito do dono para que o Claude Code saiba o que o Codex fez. Ele separa
fato de próximo passo e não substitui `CLAUDE.md`, `controle/` nem a trilha própria da F6.

## Pedidos e decisões do dono nesta sessão

1. Analisar o texto deixado pelo Claude, localizar onde ele parou e continuar no mesmo padrão.
2. Usar junta e porteiro; corrigido pelo dono: a separação de planejador, desenvolvedor e analista vale em
   **todo o fluxo**, não apenas quando há reprovação.
3. Preservar disco crítico, sem parar; depois do aval do porteiro, limpar/compactar e voltar ao trabalho.
4. Usar o modelo avançado da OpenAI somente onde há necessidade especial de raciocínio: quando a documentação
   dizia Fable, o Codex usa `gpt-5.6-sol`; não é default global.
5. Mover o porteiro para **antes do merge**, torná-lo independente e executá-lo em Sol/ultra. Publicar a regra
   como lei do repositório.
6. Documentar as interações no repo para interoperabilidade Codex ↔ Claude Code.

## Onde o Claude havia parado e o que o Codex continuou

- Branch preservada: `feat/o6r-b02-financial-uow`.
- Ponto recebido do Claude: F1+F2 em `9912066`; F3–F5 em `205ef40`.
- O Codex continuou a F6 sob agentes separados e deixou a branch limpa em:
  - `b8ec196` — correção isolada da fixture `title_restore_conflict`;
  - `e4e914a` — consolidação dos invariantes de títulos no PostgreSQL, testes, contratos, KPI e trilha.
- Não houve push nem PR da F6. A branch continua local e foi preservada ao abrir esta governança a partir de
  `main`.

## Alçadas efetivamente usadas na F6

| Alçada | Agente | Observação |
|---|---|---|
| planejamento F6 | `/root/planejador_f6` | plano v3; não implementou/votou |
| ataque do plano | `/root/critico_f6` | reprovou v2 e aprovou robustez de v3; não corrigiu |
| desenvolvimento F6 | `/root/dev_f6` + `/root/dev_f6_finalizador` | autoria; não revisam/votam |
| fábrica ciclo 1 | `/root/fabrica_f6_ciclo1` | criou especialista de fixture |
| achado/inspeção ciclo 1 | `/root/inspetor_fixture_f6` | evidência 66/67; não corrigiu |
| planejamento ciclo 1 | `/root/planejador_f6_ciclo1` | plano de fault injection; não implementou |
| correção ciclo 1 | `/root/dev_f6_ciclo1` | commit `b8ec196`; não revisa/vota |
| desenvolvimento desta lei | `/root/dev_governanca_porteiro` | só documentação; não revisa/vota/porteiro |

Os revisores/votantes finais da F6 e o porteiro pré-merge ainda precisam ser agentes novos.

## Provas já executadas na autoria F6

- `npm run check`, `npm run lint`, `npm run build` e frontend check: verdes.
- Full runner final: **2627 total · 2617 pass · 0 fail · 10 skip**.
- Focados: títulos+rotas **79/79**; entries **67/67**; cinco suítes DB juntas **32/32**, zero skip.
- Lote PostgreSQL N=10: dez iterações com **32/32**, zero skip e zero SQLSTATE proibido.
- Drills D4/D5/D8/D9 vermelhos sob mutação e verdes após restauração, sem resíduo.
- Fonte detalhada: `git show e4e914a:agent-orchestration/omega/task-history/T-O6R-B02-F6.md`.

## Gate local `a109fd7`

O commit `a109fd7` (`chore(o6r): fecha as 4 ressalvas do porteiro do #357`) existe somente na branch local
`chore/ressalvas-porteiro-357`. Não está na ancestralidade de `main`, não tem PR publicado confirmado e é
pré-requisito declarado da F6. Ele precisa de fluxo próprio (planejamento aplicável, junta/CI, porteiro
pré-merge no head exato, merge e fechamento pós-merge) antes de atualizar a F6.

## Disco

- Espaço chegou a aproximadamente 1,5–1,8 GB durante a sessão.
- `docker builder prune -af` limpou o cache interno, mas o VHDX do Docker não encolheu automaticamente.
- O dono removeu arquivos; ao iniciar esta branch havia **11,2 GB livres**.
- `docker_data.vhdx` havia sido medido em aproximadamente 10,09 GB. O roteiro seguro está em
  `docs/limpeza-de-disco.md`.
- Autorização explícita do dono: depois do parecer do porteiro e do merge autorizado, executar limpeza
  pós-merge, compactação aplicável e retomar os trabalhos. Nunca apagar rastreados, `node_modules`, `.env` ou
  untracked permitidos.

## Lei nova implementada nesta branch

- Branch: `docs/governanca-porteiro-pre-merge-sol`, criada de `origin/main` limpa e atualizada.
- Decisões: `D-JUNTA-SEPARACAO-DE-PAPEIS-TODO-FLUXO`, `D-FABLE-PARA-GPT-5-6-SOL` e
  `D-PORTEIRO-PRE-MERGE`.
- Porteiro: agente novo após junta+CI, `gpt-5.6-sol`/`ultra`, head congelado. Única autorização:
  `LIBERADO: merge do PR #<n> no head <sha>`. Ressalva/bloqueio não permitem merge; novo head expira.
- Pós-merge: outro agente distinto faz somente backfill, reconciliação factual, limpeza e compactação.
- Não foi criado `.codex/agents/*.toml`: não existe precedente/schema local confirmado.
- Mudança é governança/tooling, não código/teste/escopo de produto; KPI e `blocks_completed` ficam inalterados.

## Validação desta autoria

- Espelho: `node scripts/sync-agent-agents.mjs --check` — **OK, 22 agentes**. As alterações nos 22 arquivos
  `.agents/agents/*.md` são efeito esperado do preâmbulo comum: ele deixou de permitir emulação sequencial
  pelo mesmo agente e passou a exigir agentes isolados.
- Sintaxe/consistência: `node --check scripts/sync-agent-agents.mjs`, `node --check Kpis/app.js`,
  `node scripts/kpi-freeze.mjs --check` e `git diff --check` — **verdes**.
- Contrato: busca nas superfícies normativas não encontrou regra ativa de Fable, porteiro pós-merge ou
  “verde da junta = merge”; os marcadores Sol/ultra, head exato e autorização literal estão publicados.
- Regressão: `npm run check` e as suítes de contrato do painel KPI — **verdes (22/22)**.

## Próximos passos vinculantes

1. Revisar esta branch por agentes/votantes independentes; publicar PR; aguardar CI.
2. Criar porteiro pré-merge novo em `gpt-5.6-sol`/`ultra`; só mergear se a linha literal citar PR/head exatos.
3. Após merge, outro agente faz backfill/registro, limpeza/compactação e reconciliação.
4. Voltar ao gate `a109fd7` e conduzi-lo pelo fluxo completo novo.
5. Atualizar `feat/o6r-b02-financial-uow` com `main`; apensar a lei no comando e nos planos F6 v3/ciclo 1;
   reexecutar a bateria; formar junta nova; porteiro pré-merge; merge; fechamento pós-merge.
6. Somente então iniciar o próximo bloco O6R autorizado.
