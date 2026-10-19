papel: inspetor-de-terreno-da-junta (identidade nova) · modelo: Claude Opus 5.5 (nível menor, DECLARADO — D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO) · mandato_md5: 5d47fef07d2f9d9e166d4adc48d55346 · corpo_md5_eol_neutro: 89b4563001df748a4016ae57b05fbd20 (origin/main 684e9afd)

# Parecer — inspetor de terreno — junta de segurança do B-TRC-01 (PR 426)

**Veredito: LIBERADO COM RESSALVA**

- **Objeto:** head `31cdd0300b653b50b9ebd795c294ccdb37442491` do ramo `feat/traccar-b-trc-01`. Medido por `gh pr view 426`, por `git ls-remote` e pelo worktree, e de novo às 23:53:54Z. O PR está OPEN e não é rascunho. O merge-base é `9566d55b`.
- **CI:** 14 check-run, todos concluídos com success. São 7 jobs nos runs `push` 38184334677 e `pull_request` 38184337296.
- **Ciclo:** 1. Não há ata, reprovação nem voto anterior deste bloco na ref.
- **Régua:** unanimidade de 3 com veto e teto de 2 ciclos (§C7 item 8(1)(2), §8.10 do plano).
- **Evidência completa:** os comandos e as saídas estão em `insp-trc01-evidencia.md`, no mesmo diretório.

## Itens

| Item | Resultado | Comando e forma (resumo) |
|---|---|---|
| 1.1 Head e árvore | VERDE | O head é o mesmo nas 3 fontes. O delta `0cccacbc..31cdd030` são só os 4 mandatos. Em w-trc01, `status` mostra 52 ` M` em `.agents/agents/**`, todos **byte-idênticos** ao blob: são fantasmas do stat-cache, sem mutação. Os 21 arquivos centrais (traccar, migrações, schema, rls, server, env, compose e os 2 testes do T13) estão iguais ao head, comparados EOL-neutro (0 divergentes). Não há processo vivo no worktree do dev. |
| 1.2 Plano de isolamento | VERDE | Os 3 mandatos (l.56-60) dão a cada cadeira worktree próprio `w-jtrc-{a,b,c}`, `npm ci` próprio, Postgres e Redis em container `jtrc01-{a,b,c}-` só em 127.0.0.1, e Traccar só por digest. A base viva, as portas do dono e os servidores públicos de demonstração nunca são alvo. |
| 1.3 Resíduos | VERDE | Medido com `docker ps -a`, `network ls`, `compose ls` e `ls -d w-*`: 0 `trc01-*`, 0 `jtrc01-*`, 0 `jur-*` ou `crit-*`, 0 rede Traccar, 0 `w-jtrc-*`, 0 probe solto e 0 artefato ignorado em w-trc01. Os únicos restos são inertes e de outros contextos (nota N3). |
| 2.1 Ata anterior | VERDE | É o ciclo 1. Os corpos mandam re-medir tudo: "Nada entra como fato … herdar invalida o voto". |
| 2.2 Auditoria do ciclo 3 | N/A | Ciclo 1. |
| 2.3 Plano do ciclo | VERDE com ressalvas R1 e R2 | Os insumos estão no ramo: plano v2.1 (1995 linhas), emendas v2.2 e v2.3, README com a ordem de leitura, relatório do dev (672) e decisão do T13 (61). O §8.3 traz o permitido e o proibido, o §8.8 a bateria com forma declarada e o §8.9 as 45 MUT. |
| 3.1 / 3.1-bis Inelegibilidade | VERDE | O OBITUÁRIO no head não cita trc nem traccar (0 ocorrências). `git grep jurado-trc01-*` só acha os corpos e os mandatos, nenhuma ata. Os inelegíveis foram medidos por nome nas fontes e nenhum colide com as cadeiras (lista abaixo). |
| 3.2 Competência | VERDE com nota N1 | As cadeiras cobrem RLS e banco (a), superfície e segredo (b), e contrato e atribuição (c). Juntas re-executam 41 das 45 MUT, o que inclui todo o mínimo do §8.9 (01-15, 17-22, 30-45). |
| 3.3 Corpo carregado × julgado | VERDE com ressalva R3 | Os 3 corpos não existem no diretório da sessão (0 arquivos) e não carregam por nome. Os mandatos mandam colar o blob do head. As normas citadas existem no `CLAUDE.md` do head, que é igual à main (`f6704aa4…`), e os `D-*` existem em `decisoes.md`. |
| 4.1 S0, espelho Codex | VERDE | `node scripts/sync-agent-agents.mjs --check` saiu com ec=0: 55 agentes, espelho consistente e recursivo. As 3 cadeiras estão rastreadas nos dois espelhos. |
| 4.2 Baseline | VERDE | No worktree próprio detached em 31cdd030, com `npm ci` próprio e `prisma generate` com URL fictícia só no env, `npm run check` saiu com **ec=0**. `git diff --check 9566d55b 31cdd030` também saiu com ec=0. |
| 4.3 Check-runs | VERDE | `gh api …/commits/31cdd030…/check-runs` deu total=14, todos `completed`/`success`. Nenhum está cancelado ou na fila. |
| 5.1 Plano de perda de jurado | VERDE | Os corpos (a l.110, b l.101, c l.109) dizem: "não fecha com menos de 3 votos de mérito", "voto perdido nunca conta como aprovação" e "queda (P3): mesma identidade, mesmo mandato". As quedas vão para `00-quedas.md` pelo orquestrador (P6). |

**Inelegibilidade, medida por nome nas fontes:**
- `planejador-traccar-01` e `planejador-traccar-02`
- `critico-traccar-r1` e `critico-traccar-r2`
- o agente da API `claude-opus-5-5`, que escreveu as emendas v2.2 e v2.3
- `dev-trc01-claude` e `dev-trc01-codex`
- o orquestrador, autor da decisão do T13
- a fábrica
- a instância do `agente-dba-guardiao`
- os porteiros 405, 411 e 414
- este inspetor

Nenhum desses nomes é `jurado-trc01-a`, `-b` ou `-c`.

## Ressalvas (para o briefing, em destaque)

- **R1. O número do ciclo não está declarado.** Mandatos e corpos só dizem "teto de 2 ciclos", mas os corpos esperam que "o mandato declara o ciclo". Pelo registro, este é o **ciclo 1**. A régua é a mesma nos ciclos 1 e 2. O disparo de cada cadeira deve dizer "ciclo 1".
- **R2. A migração aditiva ainda não tem aprovação do `agente-dba-guardiao`.** O §8.10 do plano e o checklist do comando (l.147, desmarcado) a exigem, e o dev escreveu em l.644: "não convocado por mim". A falta não impede o início da junta, mas o "pronto" e o merge não fecham sem essa aprovação. A instância convocada fica inelegível como jurado.
- **R3. Os corpos têm de ser colados do blob do head, com conferência do md5.** O diretório da sessão (main 684e9afd) não tem os corpos, então cada cadeira é disparada como general-purpose com o corpo colado. Os md5 EOL-neutros dos blobs no head (LF, CR=0) são:
  - `jurado-trc01-a-rls-e-banco`: `725c583fc448803e57251e33bb05ba07`
  - `jurado-trc01-b-superficie-e-segredo`: `b7c63c7d058361a4dddb31b3f2191037`
  - `jurado-trc01-c-contrato-e-atribuicao`: `e1d8770fa15e8b6984da8cf52ea1dff9`

  O general-purpose ganha Write e Edit, que o corpo (Read, Grep, Glob, Bash) nega. Por isso a limitação tem de constar por escrito no disparo, e cada cadeira escreve só os 2 arquivos dela.

## Notas

- **N1. Quatro mutações não estão em cadeira nenhuma: MUT-25, MUT-26, MUT-27 e MUT-29.** O plano as deixou fora do mínimo por desenho, e o dev rodou as 45. Duas delas tocam regra do dono ou dado de localização:
  - MUT-26: Traccar sem porta no host.
  - MUT-27: SSE sem coordenada.

  O mandato da (b) cobre "nenhuma porta fora de 127.0.0.1". Fica com o orquestrador decidir se basta.
- **N2. O md5 cru dos mandatos é o do disco, não o do blob.** Os mandatos no disco de w-trc01 têm EOL misto (22 a 26 CR); o blob tem LF. O md5 cru do disparo (`5d47fef0…`) corresponde ao disco. Medido EOL-neutro, o conteúdo é idêntico ao blob:

  | Mandato | md5 EOL-neutro do blob |
  |---|---|
  | inspetor | `5fae110a…` |
  | a | `e8492c97…` |
  | b | `30b1b53f…` |
  | c | `1dc181d7…` |

  Ao conferir mandato, comparar EOL-neutro (§C7.1-ter(c)).
- **N3. Restos inertes de outros contextos.** São os containers `erp-postgres-alt` (Exited há 3 semanas) e `pastrack-teste-banco-teste-1` (Exited), e os worktrees detached `w-port424` e `w-pvpr` do orquestrador. Os de outra junta são `w-03a` e `w-insp-03a`, com um `du` vivo, e não são alvo.
- **N4. O objeto mudou depois que os mandatos foram gerados.** Eles foram gerados em `0cccacbc`, com check-runs 12 e 8 pendentes. O objeto de agora é `31cdd030`, com 14/14 verdes. O delta é só os 4 mandatos. Cada cadeira resolve o head de novo, como o mandato manda.
- **N5. A imagem do Traccar aprovada já está em cache.** O digest `sha256:03ebb7ed…51951eda` é o mesmo de `docker-compose.traccar.yml:45` e de `decisoes.md`.
- **N6. Os vermelhos que o mandato dá como conhecidos não aparecem neste head.** T15, A11 e o relógio do Console (#427) não ocorrem: o CI está 14/14.

## Limpeza

O worktree `C:/Users/AMP/w-insp-trc01` foi removido pelo nome (`git worktree remove --force`, ec=0, não existe mais). Os temporários meus no scratchpad e o `/tmp/ca.txt` foram removidos. Um `du` órfão meu (PID 18528) foi encerrado. Não criei container, rede nem volume. A base viva e as portas do dono não foram tocadas. No w-trc01 escrevi só a evidência e este parecer. Disco: 16G livres.
