papel: inspetor-de-terreno-da-junta (identidade nova) · modelo: Claude Opus 5.5 (nível menor, DECLARADO, D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO) · mandato_md5: 4a5c44a1b54ecc81ab2992dc289ea9d5 · corpo_md5_eol_neutro: 89b4563001df748a4016ae57b05fbd20 (origin/main@684e9afd = head b75a0c2e = disco da sessão)

# Parecer: inspetor de terreno da junta B-O6R-03a (PR 425, dinheiro, ciclo 1)

**Veredito: LIBERADO COM RESSALVA**

**Objeto julgado:** `b75a0c2e96a80b2f54cc629fe856d16660ccbe86`, ramo `fix/expense-sync-atomic`. Resolvi o head por duas fontes, `git ls-remote` e `gh pr view 425`, no início (23:41:43Z) e no fim (23:54:22Z), e ele não mudou. Os mandatos C1, C2, C3 e o meu nomeiam `5cee8e57` na seção MEDIDO. O delta `5cee8e57..b75a0c2e` é um commit só, com os 4 arquivos `00-mandatos/*.md`, e não muda nada em src, tests ou docs.

Evidência completa, item a item, com comando, saída e veredito parcial: `insp-03a-evidencia.md`, no mesmo diretório.

## Itens

| Item | Comando (forma) | Resultado |
|---|---|---|
| 0 Corpo e mandato | `git show origin/main:.claude/agents/inspetor-de-terreno-da-junta.md \| tr -d '\r' \| md5sum`; `md5sum` do mandato | 89b45630… e 4a5c44a1…, os dois conferem com o disparo |
| 1.1 Head e árvore | `ls-remote` + `gh pr view`; `git -C w-03a status --porcelain`; `git diff --quiet`; laço EOL-neutro blob × disco | **VERDE**. Head = b75a0c2e. A w-03a mostra 52 ` M` em `.agents/agents` e `.claude/agents`. São fantasmas de stat-cache: `git diff --quiet` deu ec=0 e o laço deu 52/52 idênticos ao blob. Não há mutação viva |
| 1.2 Plano de isolamento | mandatos C1–C3, bloco "O terreno", e plano §8.1 l.317 | **VERDE**. Cada cadeira tem worktree detached próprio `C:/Users/AMP/w-j03a-cN`, `npm ci` próprio sem junction, container próprio com prefixo `j03a-cN-` e papel sem BYPASSRLS. A base viva não é alvo. Os 3 caminhos estão livres agora |
| 1.3 Resíduos | `docker ps -a`; `git ls-files -o`; `find *-probe.ts`; `git status --ignored`; `git worktree list` | **VERDE, com resíduo inerte**. Não há nenhum `jur-*`, `crit-*`, `j03a-*` nem `pl03a2-*`, nem probe solto. Os resíduos inertes estão em R6 |
| 2.1 Ata anterior e afirmações herdadas | `ls`/`git grep` em `omega/juntas` e `omega/reprovacoes` | **VERDE, com ressalva R3**. Não existe ata anterior (ciclo 1). D-03a = A é decisão do dono (decisoes l.3432) e por isso não é herança |
| 2.2 Ciclo ≥ 4 | idem | **Não se aplica** (ciclo 1) |
| 2.3 Plano do ciclo | plano v2 §6.2 e §10.2; EMENDA-v3 | **VERDE**. Lista permitida e proibida com caminhos exatos (l.261–285). A bateria declara a forma: Git Bash + `timeout`, `CORE_SAAS_PERSISTENCE=memory`, `DATABASE_URL` só do container próprio, T-A 3× sem skip. A v3 só muda as contagens (≥47). O passo 0 da v3 está registrado (decisoes l.3533–3560) |
| 3.1 / 3.1-bis Inelegibilidade | `OBITUARIO-IDENTIDADES.md` (head = origin/main) lido antes; `git grep -l -i <nome> b75a0c2e` | **VERDE**. Os 3 nomes têm 0 ocorrência no obituário (34 SEPULTADA, 0 RESERVADA vigente). Fora dos 6 corpos e do plano §8.1, os nomes não aparecem em nenhuma ata J-*, R-*, crítica ou relatório. Inelegíveis medidos: `planejador-b-o6r-03a` (v1), `planejador-b-o6r-03a-v2-codex`, `critico-b-o6r-03a-r1`, `critico-b-o6r-03a-r2-opus` e a tentativa r2 do Codex, o agente da API (pré-crítica e emenda v3), `dev-03a-codex` e `dev-03a-claude`. Nenhum coincide com os jurados |
| 3.2 Competência | descrição dos 3 corpos × achados A-01, A-02, A-04..A-07 | **VERDE**. C1 cobre banco, transação e RLS. C2 cobre fail-closed de replay, legado e prova por ator. C3 cobre suíte, escopo e registro |
| 3.3 Corpo carregado × julgado | `git show b75a0c2e:<corpo> \| tr -d '\r' \| md5sum` nos 2 espelhos × disco w-03a × sessão | **VERDE, com ressalvas R2 e R4**. O corpo julgado é o único que existe e está commitado nos 2 espelhos. As normas citadas existem no CLAUDE.md do head |
| 4.1 S0 espelho | `node scripts/sync-agent-agents.mjs --check`, recursivo | **VERDE**: "OK — 55 agentes, espelho consistente", ec=0. O cruzamento próprio só acha `.agents/agents/README.md` a mais |
| 4.2 Baseline | worktree próprio, `npm ci`, `prisma generate` com URL inalcançável, `npm run check > log 2>&1; ec=$?` | **VERDE**: ec=0 |
| 4.3 Check-runs | `gh api repos/thiagodorgo/ERP_Techsolutios/commits/b75a0c2e…/check-runs?per_page=100` (latest) e `?filter=all` | **VERDE**. No latest: total=14, não-verdes 0, pendentes 0. São 7 jobs × 2 runs (push 38183712358 e pull_request 38183715689 attempt 2), e o `backend-postgres` deu success nos dois. A falha anterior entra em R7 |
| 5.1 Perda de jurado | seção "Quórum, ciclo, queda e PAUSA" dos corpos; plano §8.3 | **VERDE, com RESSALVA FORTE R2**. O plano existe: menos de 3 votos de mérito não fecha, voto perdido nunca aprova, P1/P3/P5/P6 aplicados e `00-quedas.md` mantido pelo orquestrador |

## Conferência por cadeira

O corpo de cada jurado exige que o parecer confira estes quatro pontos para ele.

| Cadeira | Nome | Corpo commitado (md5 EOL-neutro, `.claude`, head b75a0c2e) | Espelho `.agents` | Worktree próprio | Cluster próprio |
|---|---|---|---|---|---|
| C1 | `jurado-o6r03a-v2-banco` | `4afc985059608ce41053a15d9366578f` | presente, S0 OK | `C:/Users/AMP/w-j03a-c1` (livre) | prefixo `j03a-c1-` (nenhum existe) |
| C2 | `jurado-o6r03a-v2-replay` | `8ef06bc866bef9987f28e32c4b70b213` | presente, S0 OK | `C:/Users/AMP/w-j03a-c2` (livre) | prefixo `j03a-c2-` (nenhum existe) |
| C3 | `jurado-o6r03a-v2-regressao` | `1fdfb5c1108376ebdcc4f49b102166e9` | presente, S0 OK | `C:/Users/AMP/w-j03a-c3` (livre) | prefixo `j03a-c3-` (nenhum existe) |

## Ressalvas (colocar em destaque no briefing das cadeiras)

- **R1. O objeto real é `b75a0c2e`, e não o `5cee8e57` da seção MEDIDO dos mandatos.** O delta entre os dois são só os mandatos. Se o orquestrador versionar esta evidência e este parecer no ramo, o head anda e o novo head passa a ser o objeto. Este LIBERADO vale para esse novo head somente se as duas condições abaixo forem verdadeiras antes da 1ª cadeira começar:
  - o delta `b75a0c2e..<novo>` se restringe a `agent-orchestration/omega/juntas/votos/B-O6R-03a/**`;
  - os check-runs do novo head estão CONCLUÍDOS. Se estiverem `queued` ou `in_progress`, contam como ausentes (§C7.1-bis).
- **R2 (FORTE). A cláusula de queda dos 3 corpos contraria o P3.**
  - Os corpos dizem "Queda por infraestrutura relança a MESMA identidade, você (P3)" (banco l.157, replay l.164, regressao l.165).
  - O P3 do CLAUDE.md do head (l.602) e a fonte, `PROTOCOLO-JUNTA-RESILIENTE.md` l.37, dizem o contrário: "voto perdido não conta; o sucessor tem identidade nova". A "mesma identidade" que os corpos usam é a retomada de PAUSA (P7), não a de queda.
  - Na queda vale o contrato: sucessor com identidade nova, que re-executa os comandos do arquivo do caído e depois mede a cauda.
  - O texto dos corpos não muda o quórum nem o mérito, por isso não bloqueia.
- **R3. Marcar "A RE-VERIFICAR" no briefing:**
  - "o incidente R11a do dev, desfeito e conferido por sha256 (13/13)", que vem do relatório do dev e do decisoes l.3557–3560;
  - "o binário anterior relança", que vem do drill 3a do dev.
  - Os mandatos já colocam os dois dentro de itens de execução (C3 item 2 e C2 item 1). Falta só o rótulo explícito para nenhuma cadeira tomar isso como fato.
- **R4. Os disparos das cadeiras ainda não existem.** Em `prompts/` só há `hip-03a-C{1,2,3}.txt`. Os 3 corpos não existem no diretório da sessão (main 684e9afd) nem na origin/main, então cada cadeira tem de ser `general-purpose` com o corpo do blob do head. O disparo tem de publicar os md5 da tabela acima. Se o md5 recebido divergir, a cadeira não vota.
- **R5. Disco e processos.**
  - O disco tinha 16 GB livres antes do meu `npm ci` e caiu para 15 GB depois: cerca de 1 GB por worktree. Voltou a 16 GB depois da limpeza.
  - Com 3 cadeiras deste bloco e a junta paralela do PR 426, é preciso re-medir o piso de 10 GB antes de CADA cadeira.
  - O limite de 2 cadeiras simultâneas (P5) é por junta. O de 2 processos Claude (`D-CLAUDE-2-PROCESSOS`, decisoes l.3062) é global, para as duas juntas somadas.
- **R6. Resíduos inertes, que não são alvo:**
  - `erp-postgres-alt`, parado há 3 semanas;
  - `pastrack-teste-banco-teste-1`, de outro projeto;
  - 29 diretórios ignorados `storage/checklist-attachments/<uuid>/` na w-03a;
  - os diretórios órfãos `.claude/worktrees/san2-r` e `san300` na árvore principal, fora do `git worktree list`;
  - `w-insp-trc01`, que é do inspetor paralelo do PR 426.
- **R7. CI como insumo do voto.**
  - O attempt 1 do run pull_request teve o `backend` em failure (job 114601472771): tests 3339, pass 3335, fail 2, skipped 2. As duas falhas são o T15 (`processo filho não encerrou em 10105ms`) e o seu pai, B-SAN3-05.
  - Essa falha já está registrada como `P-SAN3-05-T15-TETO-DE-RELOGIO` (pendencias l.10403), ABERTA, dono `B-ARNES-2`, "bloqueia: não", com o mesmo sintoma, e não toca o código do 03a.
  - A nova rodada (attempt 2) e o run push deram `backend` em success: 3339 tests, 3337 pass, 0 fail, 2 skipped.

## Limpeza

- Criei o worktree `C:/Users/AMP/w-insp-03a` (detached, com `npm ci` e `prisma generate`) e o removi com `git worktree remove --force` (ec=0). Ele não aparece mais no `worktree list`.
- Apaguei os logs `insp03a-*` do scratchpad.
- Não criei nenhum container nem toquei na base viva.
- Na w-03a escrevi só `insp-03a-evidencia.md` e este parecer.
