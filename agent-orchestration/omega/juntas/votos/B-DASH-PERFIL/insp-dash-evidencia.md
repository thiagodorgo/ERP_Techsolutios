Troca de executor: `inspetor-dash-cdx`, Codex GPT-5.6 Sol, esforço médio, nível menor, objeto `849bf840f2bdecae87b82a17b26adf505d8a2a8e`, `mandato_md5=77a107f3a9e34b56bd9967e49d07370c`; substitui o `model: opus` no mesmo nível por `D-IAS-EXTERNAS-PRIMEIRO`.

# Evidência incremental — inspetor de terreno — B-DASH-PERFIL — ciclo 1

- Objeto: `849bf840f2bdecae87b82a17b26adf505d8a2a8e`
- PR: `#446`
- Limite do papel: terreno apenas; mérito não julgado (`CLAUDE.md` §C7.1-bis).

## 0. Corpo e contrato

**Comandos:** `git -C C:/Users/AMP/w-dash show 849bf840...:.claude/agents/inspetor-de-terreno-da-junta.md`; MD5 sobre UTF-8 após normalização CRLF/CR→LF; leitura integral de `CLAUDE.md` e `PROJECT_MEMORY.md` no mesmo objeto.

**Saída resumida:** corpo canônico `md5=89b4563001df748a4016ae57b05fbd20`, exatamente o publicado. O papel limita esta execução ao terreno e proíbe julgamento de mérito.

**Veredito parcial:** VERDE.

## 1. Isolamento e resíduos

### Item 3 — árvore, worktrees, Docker e base viva

**Comandos:** `git -C C:/Users/AMP/w-idash rev-parse HEAD && git status --porcelain`; comparação EOL-neutra dos 64 caminhos do diff `merge-base...objeto` entre o blob e `C:/Users/AMP/w-dash`; classificação completa de `git -C C:/Users/AMP/w-dash status --porcelain --untracked-files=all`; `git worktree list --porcelain`; enumeração de diretórios `w-jdash-*`; busca de probes nos untracked; `docker ps -a`; contagens `jdash-*` e trabalhos running não `erp-*`; `docker inspect erp-postgres erp-redis`; inspeção de `node_modules` (`Attributes`, `LinkType`, `Target`).

**Saída resumida:** `C:/Users/AMP/w-idash` está detached exatamente em `849bf840...` e limpo. Os 64 arquivos do bloco na árvore `w-dash` são EOL-neutro idênticos ao objeto. A única mutação rastreada em `w-dash` são 55 arquivos ` M .agents/**`, todos EOL-neutro idênticos ao objeto; não há outro rastreado alterado. Há exatamente os cinco artefatos prévios da redação (quatro mandatos + `00-quedas.md`) e os dois outputs deste inspetor. Zero `jur-probe*`/`*-probe.ts` solto. Zero worktree `w-jdash-*`; somente o worktree temporário deste inspetor. Zero container `jdash-*`; zero trabalho Docker running fora de `erp-*`. A base viva permanece `erp-postgres`/`erp-redis`, healthy, mesmos containers, `RestartCount=0`; foi apenas inspecionada. `node_modules` do inspetor é diretório próprio, sem `LinkType`/`Target`, portanto não é junction/symlink.

**Plano exigido às cadeiras:** cada identidade usa o worktree exclusivo e o cluster/rede próprios nomeados no Item 2, sem porta publicada; nunca toca `erp-*` nem 5432/6379/3000/5173/5050/8899. P5: começar C1+C2 (máximo dois trabalhos); C3 somente após um terminar e limpar. Mutações de prova só em cópia descartável, com restauração por hash e teardown.

**Veredito parcial de isolamento:** VERDE.

## 2. Insumos e mandatos

### Item 1 — objeto, CI, mandatos, corpos e S0

**Comandos:** `git ls-remote origin refs/heads/fix/dash-perfil`; `gh pr view 446 --json ...`; `gh api repos/thiagodorgo/ERP_Techsolutios/commits/849bf840.../check-runs`; MD5 EOL-neutro dos quatro arquivos de `00-mandatos/`; pré-voo dos quatro mandatos com `mandato-preflight.sh`/`mandato-refs.sh` de `origin/chore/mandato-refs-e-preflight`, raiz adaptada para `C:/Users/AMP/w-dash`; `git rev-parse <objeto>:<corpo>` + MD5 EOL-neutro dos seis corpos; `node scripts/sync-agent-agents.mjs --check` em `C:/Users/AMP/w-idash` detached no objeto.

**Saída resumida:** remoto e PR #446 apontam para `849bf840f2bdecae87b82a17b26adf505d8a2a8e`; PR OPEN, não draft, mergeável; CI `14/14`, todos `completed/success`. Mandatos: inspetor `77a107f3a9e34b56bd9967e49d07370c`, C1 `d93c0139a8f63a8b85e70347bf67d608`, C2 `ec4cb9b8671efc0a77dbfe09ddc0a813`, C3 `f373ad80d9424858a20a3964dc5e6a62`; 4/4 hashes conferem e 4/4 pré-voos retornam `PRE-VOO OK`, `ec=0`. Os seis blobs existem e os seis MD5s conferem com os publicados: C1 `.claude/.agents` `1af93b3df464a6442c8dc97cf31bb22e` / `10f73b163cba5f61f5866bcaf3d7764d`; C2 `afee3f7f17f45301dde10ad9a5970c78` / `5198368e48305248c114d9960e78b5b9`; C3 `f707a03b8995f5ff8a34872ee78502fc` / `24b0e3dd0824114469196e4b3990cffa`. S0: `[agents-sync] OK — 73 agentes, espelho consistente.`, `ec=0`.

**Regra para mandatos não commitados:** o corpo do inspetor exige execução e integridade do briefing, não commit dos mandatos; MD5 publicado + MD5 local idêntico + pré-voo reexecutado basta para estes insumos externos ao objeto.

**Demais insumos:** plano, crítica e dois relatórios de dev existem no objeto; a emenda externa existe e tem MD5 `efdfa8e6dc8895aad4be03039aed21da`. O plano nomeia escopo permitido/proibido e bateria com forma. Nos quatro mandatos, plano/crítica/emenda/relatórios são expressamente `A RE-VERIFICAR` (C1=2, C2=2, C3=3 e inspetor=1 ocorrências); nenhuma conclusão herdada é tratada como fato. Ciclo 1: ata anterior e auditoria de máquina de ciclo ≥4 não se aplicam.

**Veredito parcial do Item 1:** VERDE.

## 3. Papéis, inelegibilidade e corpos

### Item 2 — inelegibilidade por nome e composição proposta

**Comandos:** leitura PRIMEIRO de `849bf840...:agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md`; `git grep -n -i -F <nome> 849bf840... -- agent-orchestration/omega/juntas/** agent-orchestration/omega/reprovacoes/** docs/juntas/**`; leitura dos cabeçalhos e seções de sucessão de `B-DASH-PERFIL-plano.md`, `-critica.md`, `-dev.md` e `-emenda-dev.md`; MD5 EOL-neutro dos seis corpos na árvore de sessão `C:/Users/AMP/w-dash` contra os blobs do objeto.

**Saída resumida:** os candidatos `jurado-dash-c1-cdx`, `jurado-dash-c2-gemini` e `jurado-dash-c3-cdx-b` não estão SEPULTADOS nem RESERVADOS no obituário e têm zero ocorrência como votantes nas atas/reprovações pesquisadas. Ficam inelegíveis e fora das cadeiras: `plan-b-dash-perfil-cdx` (planejou), `critico-adversarial` (criticou), `planejador-dash-emenda-gemini`, `fabrica-dash-gemini`, `dev-b-dash-perfil-codex`, `dev-b-dash-perfil-codex2`, `dev-b-dash-perfil-gemini`, `dev-b-dash-perfil-gemini2`, `dev-b-dash-perfil-gemini3`, `dev-b-dash-perfil-opus` e `dev-dash-emenda-cdx`. Os seis corpos carregáveis da sessão são EOL-neutro idênticos aos seis corpos julgados no objeto.

**Composição nomeada:** C1 `jurado-dash-c1-cdx`, Codex GPT-5.6 Sol, worktree `C:/Users/AMP/w-jdash-c1-cdx`, cluster/rede `jdash-c1-cdx-*`; C2 `jurado-dash-c2-gemini`, Gemini 3.1 Pro, worktree `C:/Users/AMP/w-jdash-c2-gemini`, cluster/rede `jdash-c2-gemini-*`; C3 `jurado-dash-c3-cdx-b`, Codex GPT-5.6 Sol como primeira IA externa livre no disparo escalonado, worktree `C:/Users/AMP/w-jdash-c3-cdx-b`, cluster/rede `jdash-c3-cdx-b-*`. Claude Opus é somente reserva declarada. Cada cadeira usa `npm ci` próprio, zero junction/symlink e nenhuma porta publicada.

**Veredito parcial do Item 2:** VERDE; as três competências exigidas pelos corpos cobrem cadeia de acesso, troca de organização e regressão/escopo.

## 4. S0, baseline e CI

**Comandos:** S0 e CI conforme Item 1; `npm ci` próprio em `w-idash`; `npm run db:generate` com `DATABASE_URL` descartável `127.0.0.1:65432` somente para geração, sem conexão; `npm run check` com exit code direto.

**Saída resumida:** `npm ci` instalou 326 pacotes no worktree próprio. A primeira tentativa de `check`, antes de gerar o Prisma Client, falhou por cliente ausente; `db:generate` gerou o cliente local sem acessar base/porta proibida; a repetição de `npm run check` terminou `ec=0`. O worktree continuou sem alteração rastreada. CI remota 14/14 verde e S0 `ec=0`.

**Veredito parcial:** VERDE; baseline honesto atual confirmado.

## 5. Quórum e perda de jurado

**Comandos:** leitura do plano e dos quatro mandatos; contagem dos marcadores `P3`, `P5`, `P6`, `worktree`, `cluster` e `base viva` em cada mandato; leitura de `origin/main:agent-orchestration/controle/decisoes.md` para `D-EMENDA-ANTES-DO-CODIGO`, `D-IAS-EXTERNAS-PRIMEIRO` e limite Docker posterior.

**Saída resumida:** bloco de PERMISSÃO, ciclo 1, unanimidade de 3 com veto. P3 exige sucessor de identidade nova e reexecução; P6 registra queda em `00-quedas.md`; P5 limita a dois jurados/trabalhos paralelos e pausa após duas quedas em 30 minutos. O limite vigente do Docker é dois trabalhos, excluída a base viva. Emenda-before-code e IAs externas primeiro constam em `origin/main`.

**Veredito parcial:** VERDE.

## 6. Limpeza

**Comando:** resolução absoluta de `C:/Users/AMP/w-idash`; `git -C C:/Users/AMP/w-dash worktree remove --force C:/Users/AMP/w-idash`; nova listagem de worktrees e containers `jdash-*`.

**Saída resumida:** `REMOVE_EC=0`, caminho inexistente após a remoção, nenhum `w-idash`/`w-jdash-*` registrado e zero container `jdash-*`. Nenhum container, rede ou volume foi criado; `node_modules` próprio foi removido junto com o worktree.

**Veredito parcial:** VERDE.
