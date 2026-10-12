# Brief do bloco B-AGENTE-API-2: o agente da API vira braço de trabalho, e o Claude para de ser o gargalo

## Decisão do dono (literal, 2026-10-11)
- *"quero um plano para colocarmos o codex e api para trabalhar, vc eu quero na orquestração e tarefas pequenas, quando o codex cair vc cobre ele e a api temos que forçar o uso dela ja que ela tem a mesma inteligencia que vc e nao tem o contexto vc deve informar o contexto correto para api para que ela faça o que vc manda certo."*
- *"o negocio aqui é usar vc de forma que o limite nao seja atingido e o negocio nao pare..."*
- *"siga"*: aceita o plano do orquestrador e o teto diário de **US$ 15** para a API.

**Regras que o dono aceitou:**
- O Claude (plano Max, com limite) só orquestra e faz tarefas pequenas, e não lança agente Claude por padrão.
- A execução vai para o Codex.
- Leitura, revisão e texto vão para a API, paga por uso.
- Quando o Codex cai, leitura e texto vão para a API; a execução espera, salvo no caminho crítico.

## Ponto de partida (na `main` 1d4d2834)
O agente em `scripts/agente-claude-api/` foi mergeado no #417 e corrigido no #418.
- **Hoje faz:** `revisar-pr <N>`, `investigar "<pergunta>"` e `verificar-conta`, só leitura, em worktree descartável.
- **Já tem:** cerca no código, orçamento por execução, auditoria JSONL e parecer com schema estrito.
- **Primeiro uso real:** #416, US$ 0,277, 5 turnos, 57 s.
- **Docs do bloco anterior:** `docs/revisoes/GOV/B-AGENTE-API-{brief,plano,dev,revisao,ajustes,gramatica,gramatica-revisao}.md`.

## O que este bloco entrega
1. **Pacote de contexto: `--contexto <arquivo.md>`** em todas as tarefas. É um arquivo com as seções:
   - OBJETIVO;
   - FONTE (SHA + arquivos e linhas a ler);
   - REGRAS (trechos citados);
   - JÁ MEDIDO;
   - HIPÓTESES (cada uma com o comando que a derrubaria);
   - FORA DO ESCOPO;
   - ACEITE;
   - ORÇAMENTO.

   O agente o recebe como DADO rotulado, nunca como instrução de sistema, e o parecer declara o md5 do pacote recebido. Inclua um modelo do pacote em `scripts/agente-claude-api/pacotes/MODELO.md`.
2. **Tarefa `redigir --entregavel <tipo>`:** produz texto em Markdown SÓ na pasta de saída, nunca no repo.
   - Tipos iniciais: `registro` (pendência ou decisão), `ata`, `corpo-pr`, `hipoteses-mandato`, `corpo-cadeira` e `rascunho-plano`.
   - A saída traz o texto pronto e a lista do que ele leu para escrever.
3. **Tarefa `propor-patch`:** produz um diff unificado na pasta de saída e NUNCA o aplica. O orquestrador aplica num worktree com `git apply --check` e testa. O agente pode ler e rodar a lista fechada, mas não escrever no worktree, e o diff passa pelas MESMAS regras de caminho negado da cerca: não propõe mudança em `.env*`, chaves, `.git` nem fora do repo.
4. **Teto diário:**
   - Antes de cada execução, soma o `usd_estimado` dos `resumo.json` do DIA (UTC) na pasta de saídas e recusa começar se a soma mais o teto da execução passar do teto diário.
   - O teto padrão é US$ 15, configurável por `ERP_AGENTE_TETO_DIARIO_USD`. Em 2026-10-11 o dono liberou US$ 25 para o dia (*"pode usar ate 25 usd na api hoje"*).
   - Um livro `saidas/uso-AAAA-MM-DD.jsonl` registra cada execução.
5. **Paralelismo:** até 3 execuções ao mesmo tempo, com pastas de saída e worktrees de nomes únicos e uma trava por arquivo de lock.
6. **Despachante sem IA:** um script (PowerShell ou Python da biblioteca padrão) que lê uma FILA (`fila.jsonl`: tarefa, executor `api` ou `codex`, parâmetros, prioridade) e executa em ordem.
   - A API roda até 3 em paralelo; o Codex roda 1 por vez, pelo `run-codex-visivel.ps1` do dono.
   - Grava o status de cada item (`pendente`, `rodando`, `ok`, `falhou`, `parcial`) e o caminho do resultado.
   - Detecta o limite do Codex ("try again at", só na execução atual) e marca o item como `aguardando-codex`, sem relançar sozinho.
   - O despachante NUNCA faz commit, merge, push nem `git` de escrita. Isso é do orquestrador.

## Restrições
- Mesma cerca do #417/#418. Nenhuma tarefa nova escreve no repositório. `propor-patch` só gera arquivo na pasta de saída.
- **Escopo PERMITIDO:** `scripts/agente-claude-api/**`, `docs/revisoes/GOV/B-AGENTE-API-2-*.md` e, para o registro, `agent-orchestration/controle/decisoes.md` e `pendencias.md`.
- **Escopo PROIBIDO:** `src/**`, `prisma/**`, `migrations/**`, `infra/**`, `.github/**`, `package.json`, os lockfiles JS e `Kpis/**`.
- A suíte continua sem rede, com cliente falso. Um teste manual contra a API real, marcado, é do orquestrador ANTES do merge (lição do #418).

## Governança
- §C7 item 8(1): ferramenta de processo, com um revisor independente e CI verde.
- **Plano:** topo, GPT-6 Astra no Codex. **Dev:** GPT-5.6 Sol no Codex. **Revisor de segurança:** GPT-5.6 Sol no Codex, identidade diferente do dev.
- Nenhum agente Claude, salvo cobertura.
- KPI congelado.
