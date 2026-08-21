# R-GOV-PORTEIRO-PRE-MERGE — ciclo 1

Data: 2026-08-21

Entrega reprovada: commit `f3ba01becc3912c385b9ccee5adc512c5074ffa2`

Status do ciclo: **REPROVAÇÃO REGISTRADA — aguarda planejamento independente**

## Alçadas e identidades

| Alçada | Agente/pessoa | Identidade | Participação neste ciclo |
|---|---|---|---|
| Origem da decisão | Thiago (dono) | usuário | Determinou porteiro pré-merge independente e Sol/ultra apenas nos papéis cirúrgicos de alto raciocínio. |
| Planejamento anterior | `/root/planejador_modelo_sol` | agente isolado | Planejou a entrega reprovada; não pode planejar/corrigir/votar neste ciclo. |
| Desenvolvimento anterior | `/root/dev_governanca_porteiro` | agente isolado | Escreveu o commit reprovado; não pode planejar/corrigir/votar neste ciclo. |
| Achador/revisor 1 | `/root/auditor_ci_governanca` | Kant | Auditoria independente, read-only; **VOTO CONTRA**. |
| Achador/revisor 2 | `/root/critico_governanca` | Erdos | Crítica adversarial independente, read-only; **REPROVADO**. |
| Achador/revisor 3 | `/root/validador_governanca` | Banach | Validação independente, read-only; **REPROVADO**. |
| Fábrica do ciclo 1 | `/root/fabrica_governanca_c1` | agente isolado | Apenas cria especialistas e consolida evidência; não planeja, corrige, revisa nem vota. |

## Evidências consolidadas dos achadores

Os itens abaixo registram **defeito, evidência e motivo**. Não constituem plano nem prescrição de correção.

### GOV-C1-001 — configuração de modelo/esforço não é executável de modo interoperável

- Evidência: `.claude/agents/planejador-mestre.md:5` e
  `.claude/agents/porteiro-pos-merge.md:5` receberam `model: gpt-5.6-sol`.
- Evidência: não foi comprovado gateway/configuração local que torne esse identificador válido no Claude
  Code; o ambiente local também não permitiu validar com o CLI `claude`.
- Evidência: no Codex, os arquivos em `.agents/agents/` são definições portáteis; não foi comprovada chamada
  executável que passe `model: gpt-5.6-sol` e `reasoning_effort: ultra`.
- Motivo: a obrigação de modelo/esforço pode falhar justamente nos papéis marcados como críticos, e a prose
  não comprova o override efetivo.

### GOV-C1-002 — o GitHub não impõe o porteiro como condição de merge

- Evidência remota: `gh api repos/thiagodorgo/ERP_Techsolutios/branches/main/protection` respondeu `404
  Branch not protected`.
- Evidência remota: `gh api repos/thiagodorgo/ERP_Techsolutios/rulesets` respondeu `[]`.
- Evidência no diff: o commit não altera `.github/workflows/**`; o workflow existente não expõe check
  requerido de porteiro vinculado ao `headRefOid`.
- Motivo: o merge continua tecnicamente possível sem parecer, com parecer expirado ou relativo a outro SHA;
  o gate permanece voluntário.

### GOV-C1-003 — snapshot do candidato é incompleto e sujeito a TOCTOU

- Evidência: o protocolo congela o head, mas não demonstrou congelamento/verificação equivalente do SHA da
  base, corpo do PR e conjunto de checks.
- Evidência: a releitura do `headRefOid` ocorre dentro da auditoria, sem mecanismo remoto comprovado que
  invalide automaticamente o parecer diante de mudança posterior.
- Motivo: o objeto avaliado pode deixar de ser o objeto efetivamente mergeado sem que a autorização expire
  de forma técnica.

### GOV-C1-004 — o parecer não possui persistência externa canônica comprovada

- Evidência: o papel exige uma linha final no chat, mas não define local durável obrigatório fora do head
  candidato.
- Evidência: persistir o parecer por commit no próprio candidato mudaria o SHA que ele acabou de autorizar.
- Motivo: a autorização não pode ser correlacionada e auditada de forma estável com PR, identidade e SHA.

### GOV-C1-005 — superfícies operacionais antigas ainda contradizem a nova ordem

- Evidência reportada nas revisões: referências antigas continuam em
  `.claude/skills/erp-techsolutions-code-auditor/references/codex-pr-workflow.md`, no espelho `.agents/`,
  `docs/claude-code-handoff/README.md`, `agent-orchestration/omega/prompt-rodada-saneamento-infra.md`,
  `agent-orchestration/omega/lista-saneamento.md` e
  `agent-orchestration/codex/comandos/B-O6R-01-identity-authority.md`.
- Motivo: algumas dessas superfícies ainda se apresentam como instrução ativa e ensinam porteiro pós-merge
  ou “junta verde = merge”.

### GOV-C1-006 — fechamento pós-merge não é verificável nem acionável

- Evidência: não existe papel persistido do executor pós-merge, gatilho, formato obrigatório de fechamento
  ou verificador de identidade/backfill/reconciliação.
- Evidência: o backfill ainda aparece associado ao “bloco seguinte” em superfícies do contrato.
- Motivo: a separação declarada não é auditável, e o próximo bloco pode depender de uma etapa sem executor
  ou prova definida.

### GOV-C1-007 — composição de junta conflitante

- Evidência reportada: `comando-template.md` inclui o planejador na composição da junta.
- Motivo: isso conflita com a separação total de alçadas, segundo a qual quem planeja não revisa nem vota.

### GOV-C1-008 — tooling alterado sem trilha KPI/history correspondente

- Evidência: `scripts/sync-agent-agents.mjs` foi alterado no commit `f3ba01b`.
- Evidência: a entrega foi tratada como documental/tooling sem atualização KPI/history.
- Motivo: a mudança alcança código executável de tooling, enquanto o contrato KPI-por-PR abrange alteração de
  código, teste ou escopo.

### GOV-C1-009 — `approved_head` possui regras contraditórias

- Evidência: `CLAUDE.md`, `AGENTS.md` e `comando-template.md` determinam `approved_head: null` na autoria e
  backfill pós-merge; `EXECUTION_MODEL.md` afirma que ele pode ser preenchido no head candidato.
- Evidência: gravar o SHA candidato no próprio commit produziria outro SHA.
- Motivo: não existe uma regra única que possa ser obedecida sem circularidade.

### GOV-C1-010 — fluxo anterior não possui plano/allowlist rastreável suficiente

- Evidência: o commit altera 36 paths; o handoff cita literalmente apenas 2 desses paths e não registra
  allowlist exata de escopo permitido/proibido.
- Evidência: o handoff identifica o desenvolvedor, mas não demonstra no artefato um fluxo completo desde
  achado e plano independente até a autoria.
- Motivo: o escopo real e a separação das alçadas não são auditáveis desde a origem.

## Perguntas obrigatórias de contaminação e dado podre

1. **A composição cobre a competência que o achado exige?** Sim. Kant cobriu CI/GitHub e enforcement;
   Erdos cobriu crítica adversarial e consistência/TOCTOU; Banach cobriu contrato, escopo, validação e
   interoperabilidade. Foram três revisores distintos e independentes do planejamento/desenvolvimento.
2. **Quem achou é quem consertou?** Não. Os três achadores atuaram read-only e não modificaram o repo. O
   agente-fábrica deste ciclo também não corrige. Qualquer correção pertence a um novo desenvolvedor após
   plano escrito por outro agente independente.
3. **O planejador usou dado podre?** Sim. O planejamento anterior assumiu, sem prova executada, que
   frontmatter OpenAI funcionaria no Claude, que prose impediria merge, que a busca cobriu todas as
   superfícies ativas e que a alteração de tooling não exigia KPI/history.

## Especialistas criados pela fábrica no ciclo 1

- `guardiao-enforcement-github-porteiro`: audita protection/ruleset/required status, vínculo de head+base,
  persistência externa e janela TOCTOU; não corrige.
- `guardiao-interoperabilidade-modelos-claude-codex`: audita frontmatter por ferramenta, aplicação real de
  Sol/ultra no Codex e ausência de default global; não corrige.

Definições permanentes em `.claude/agents/especialistas/`, com papéis espelhados em
`.agents/agents/especialistas/`.

## Limite desta atuação

Este registro não contém decisão de arquitetura nem plano de correção. O próximo passo do protocolo exige
um planejador novo, distinto de todas as alçadas acima; a implementação exige outro agente também distinto.
