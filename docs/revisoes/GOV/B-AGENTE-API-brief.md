# Brief do bloco B-AGENTE-API — agente Python sobre a API do Claude, com cerca

## A decisão do dono (literal, 2026-10-10)
- *"vamos criar um agente, um script em python que consiga usar a api do claude e nos ajudar aqui?"*
- *"coloque guard rails, faça uma cerca e de mais autonomia a esse agente, não muita, mas que ele consiga ajudar mais sem probabilidades altas de dar merda, pode fazer o agente, coloque ele numa pasta para que possamos usar no repo e no git"*
- Antes, o orquestrador condicionou: chave só por variável de ambiente; nada de execução autônoma com escrita; provar qual conta paga.

**O que isto reabre:** reabre parcialmente a `D-API-ESTEIRA-CONGELADA` (2026-10-10), só para este agente.

**O que continua proibido:** o executor autônomo que o classificador barrou ("Create Unsafe Agents") NÃO volta. Se o classificador barrar o bloco, PARA-SE e o orquestrador relata ao dono; nada de contornar.

## O que o agente é
Um programa Python no repositório, em `scripts/agente-claude-api/`, sobre o SDK oficial `anthropic`. Ele roda um laço de ferramentas MANUAL, porque o laço é quem impõe a cerca.

Começa com duas tarefas:
- `revisar-pr <N>`: revisor de PR leve. Lê o diff e as regras do contrato, explora o código e devolve um parecer.
- `investigar "<pergunta>"`: investigação só leitura, que devolve uma resposta com evidência.

Ele NÃO conserta, NÃO commita, NÃO faz push, NÃO mergeia e NÃO comenta em PR. Quem lê o parecer e age é o orquestrador.

## A autonomia ("mais, não muita") — nível 1
- O agente decide sozinho o que ler e o que verificar, dentro de um worktree DESCARTÁVEL.
  - O próprio script cria esse worktree com `git worktree add --detach` no SHA alvo, e o remove ao fim com `git worktree remove --force`.
  - Ele nunca opera no checkout principal nem em worktree de outro bloco.
- **Ferramentas de leitura:**
  - ler arquivo, com teto de bytes;
  - listar diretório;
  - buscar (`git grep`);
  - `git log`, `git show`, `git diff` e `git ls-files` em modo só leitura;
  - `gh pr view`, `gh pr diff` e `gh pr checks` (só leitura).
- **Verificações de lista FECHADA:** `git diff --check`, `node scripts/sync-agent-agents.mjs --check`, `npm run check` e `node --test --import tsx tests/<arquivo>.test.ts`.
  - O teste vale só para arquivo existente que não seja `-db`, com timeout.
  - Todas rodam no worktree descartável, com ambiente LIMPO: sem `ERP_AGENTE_ANTHROPIC_KEY`, `ANTHROPIC_API_KEY`, `DATABASE_URL`, `REDIS_URL` nem variável de segredo.
  - Para rodar `npm run check` e os testes, o script faz `npm ci` próprio no worktree descartável, sem junction, e só quando a tarefa pedir. Declare o custo de disco.
- **Única escrita permitida:** os próprios arquivos de saída, numa pasta de execução ignorada pelo git.

## A cerca (o plano define cada uma com o teste que a prova e a mutação que a quebraria)
1. **Raiz confinada.** O caminho resolvido (realpath, que segue symlink e junction) tem de estar dentro do worktree descartável.
   - Negar `.env*`, `*.pem`, `*.key`, `id_*`, `.git/` interno e `node_modules/`.
   - Negar também qualquer caminho fora da raiz: absoluto, `..`, unidade de disco diferente e UNC.
2. **Comandos.** Allowlist por argv validado, sempre com `shell=False`.
   - Rejeitar metacaractere e flag fora da lista: `git push`, `git commit`, `git checkout`, `gh pr merge`, `gh pr comment`, `gh api` com método diferente de GET, `npm install`, `docker`, `curl`, redirecionamentos, entre outros.
   - Timeout por comando e saída truncada com aviso.
3. **Orçamento.** Tetos de turnos, de chamadas de ferramenta, de tokens de entrada e saída somados (com `usage`, incluindo cache) e de custo estimado em US$.
   - Preço do Opus 5.5: $4 entrada, $20 saída e $0,20 leitura de cache por MTok.
   - Ao estourar, para e grava parecer PARCIAL marcado como tal.
4. **Segredos.** Redação por padrão em tudo o que sai: log, parecer e resultado de ferramenta devolvido ao modelo.
   - Padrões mínimos: chave Anthropic, AWS, GitHub, Google, URL com senha e bloco de chave privada.
   - O conteúdo de arquivo negado nunca vai ao modelo.
5. **Auditoria.** Um JSONL por execução, com cada chamada: ferramenta, argumentos, código de saída, bytes, duração e tokens. Mais um resumo com o custo e o modelo que de fato respondeu.
6. **Parada.** Um arquivo `STOP` na pasta da execução encerra no próximo turno, gravando parcial. Ctrl+C também grava parcial, no estilo P7 do contrato.
7. **Conta e modelo.**
   - A chave vem de uma variável PRÓPRIA, `ERP_AGENTE_ANTHROPIC_KEY`, NUNCA de `ANTHROPIC_API_KEY`. Com esse nome padrão no ambiente
     do usuário, o próprio Claude Code passaria a usar a chave e cobraria os créditos da API no lugar do plano Max.
   - Se a variável não estiver no processo (gravada depois de a sessão abrir), o script a lê do ambiente do usuário do
     Windows (`HKCU\Environment`) e a passa EXPLICITAMENTE ao cliente (`api_key=`). Nunca a imprime nem a grava em log.
   - O script recusa se `ANTHROPIC_BASE_URL` apontar para outro host que não `api.anthropic.com`, e ignora `ANTHROPIC_AUTH_TOKEN`.
   - Chave de usuário (`sk-ant-usr…`, medida em 2026-10-10: a API respondeu 400 'not scoped to a workspace') exige o cabeçalho
     `anthropic-workspace-id`. O script lê o ID de `ERP_AGENTE_ANTHROPIC_WORKSPACE` (ID não é segredo, mas vem do mesmo lugar:
     processo, ou o ambiente do usuário do Windows) e o envia em todo pedido. Chave de workspace dispensa o cabeçalho. Sem
     chave, ou com chave de usuário sem o ID, o script PARA antes de qualquer chamada, com mensagem clara.
   - O modelo é `claude-opus-5-5`, com esforço explícito: nível menor pela `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`, declarado no parecer.
   - Se usar o fallback do servidor, registrar no parecer qual modelo respondeu.
   - Registrar o `request-id` e os cabeçalhos de rate limit da resposta, como prova de que a cobrança foi na conta da API.
8. **Saída estruturada.** Uma ferramenta final `entregar_parecer` com schema estrito.
   - Campos: veredito, achados com gravidade (`bloqueia`, `ajuste` ou `nota`), escopo, arquivo, linha, evidência (comando e saída) e motivo; mais comandos executados, limitações e custo.
   - O Opus 5.5 recusa `tool_choice` forçado, então o prompt manda chamar a ferramenta e o laço trata o caso de ela não vir.
   - O script grava o JSON validado e um `.md` legível.
9. **Injeção.** Conteúdo lido do repositório, do PR ou da saída de comando é DADO, nunca instrução. O prompt de sistema diz isso, e a cerca não depende de o modelo obedecer.

## Referências obrigatórias para o dev (nunca adivinhar o SDK)
O skill `claude-api` desta sessão está em `C:/Users/AMP/AppData/Local/Temp/claude/bundled-skills/2.1.296/ce59948a71c1387402a3496c3d3f4a10/claude-api/`. Leia:
- `python/claude-api/README.md` e `python/claude-api/tool-use.md`;
- `shared/tool-use-concepts.md`, `shared/error-codes.md` e `shared/prompt-caching.md`.

Pontos já sabidos:
- No Opus 5.5 não existe `thinking` desligado nem `budget_tokens`; use `output_config.effort`. O `tool_choice` forçado dá 400.
- Erros se tratam por cadeia de classes tipadas.
- Faça cache do system prompt e das ferramentas.

## Escopo e terreno
- **Permitido:**
  - `scripts/agente-claude-api/**`: código, `requirements.txt` com versão fixada, `README.md` de uso em PT-BR, `.gitignore` local para `.venv/` e `saidas/`, e testes em `unittest` da biblioteca padrão, que rodam SEM rede e com cliente falso;
  - `agent-orchestration/controle/decisoes.md`: a decisão `D-AGENTE-CLAUDE-API`;
  - `agent-orchestration/controle/pendencias.md`, se houver residual.
- **Proibido:** `src/**`, `prisma/**`, `migrations/**`, `infra/**`, `.github/**`, `.env`, `package.json`, os lockfiles JS e `Kpis/**`.
- **O venv** fica em `scripts/agente-claude-api/.venv/`, ignorado pelo git. Não instale nada no Python global.
- **Testes da cerca:** cobrem escape de caminho (inclusive symlink/junction), arquivo negado, comando proibido, metacaractere, redação, estouro de orçamento, `STOP` e parecer sem `entregar_parecer`. Nenhum teste chama a API.
- **Primeiro uso real:** só depois do merge e com a chave do dono, como revisor do PR #416.

## Governança
- §C7 item 8(1): ferramenta de processo, revisada por um revisor independente com olhar de segurança (`agente-secops`), mais CI verde, sem junta.
- Papéis: plano em Fable; dev em Opus; revisor em Opus. KPI congelado.
