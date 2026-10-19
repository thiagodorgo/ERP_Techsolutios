papel: inspetor-de-terreno-da-junta · instância: inspetor-trc01c3-opus · executor: Claude Code · modelo: Claude Opus 5.5 (nível menor, §C7.6, DECLARADO) · troca: o mandato previa o Codex (GPT-5.6 Sol, instância `inspetor-trc01c3-cdx`) e quem roda é o Claude Opus · motivo: o Codex está ocupado (`D-IAS-EXTERNAS-PRIMEIRO`) · mandato_md5 (EOL-neutro): a92974fb72873fea5ed2e0d3d54fdfa5 · corpo_md5 (EOL-neutro, blob do objeto): 89b4563001df748a4016ae57b05fbd20

# Parecer do inspetor de terreno: junta do CICLO 3 do B-TRC-01 (PR #426, ingestão do Traccar, junta de SEGURANÇA)

## Veredito: **LIBERADO COM RESSALVA**

O tabuleiro está limpo e justo. Nenhum item ficou vermelho. As ressalvas R-1 a R-10, abaixo, vão em destaque no briefing das cadeiras. Nenhuma delas bloqueia o start.

- **Objeto:** `7c220467f754341a699c18c241fa9965c1a35638`. As três fontes batem: `git rev-parse`, `git ls-remote origin refs/heads/feat/traccar-b-trc-01` e `gh pr view 426`. O PR está OPEN, não é rascunho e está MERGEABLE.
- **Check-runs:** 14 de 14, todos `completed|success`. O último a concluir foi o `docker`, às 18:56:08Z.
- **h2 (o objeto do ciclo 2):** `2043c5840c8f60fe91538840aaefb3420a11cfe3`, lido da linha 3 da ata do ciclo 2. É ancestral do objeto (ec=0).
- **Medido na ref do objeto (§A7).** A evidência, comando a comando, está em `insp-trc01c3-evidencia.md`, na mesma pasta.
- **Nota para a legalidade das cadeiras:** os mandatos delas nomeiam o parecer do "inspetor-trc01c3-cdx" neste caminho. Este é esse parecer, com o executor trocado e declarado na 1ª linha. A instância que inspecionou é a `inspetor-trc01c3-opus`.

## Cadeiras e terreno de cada uma (conferir na legalidade)

| Cadeira | Identidade (corpo no objeto) | Executor e modelo | Worktree próprio (detached) | Prefixo de container | Portas (127.0.0.1) | md5 do corpo `.claude` / `.agents` (EOL-neutro) | md5 do mandato |
|---|---|---|---|---|---|---|---|
| (a″) RLS e regressão | `jurado-trc01c3-a-rls-e-regressao` | Codex, GPT-5.6 Sol, esforço médio | `C:/Users/AMP/w-jc3-a` (+ o de h2, se usar) | `jtrc01c3-a-` | 47761 / 47771 | a454ff5c98827787825ab0d141ad94c5 / 7f224a874af8c2036235837cf236ceb7 | bae2ba9ef73a1bfb3e4b2f5b2ff5eb3c |
| (b″) escopo, superfície e registro | `jurado-trc01c3-b-escopo-superficie-registro` | Claude Code (general-purpose limitado a Read/Grep/Glob/Bash), Claude Opus 5.5 | `C:/Users/AMP/w-jc3-b` | `jtrc01c3-b-` | 47762 / 47772 (Postgres só se preciso) | 370d771dd16bdb3a52934d5e7bbb1ff4 / 7663620fc679db6c4479af639e2e12fc | dd1d08cd57b9210945b311cf5dce794b |
| (c″) tabela de motivos (atribuição no tempo) | `jurado-trc01c3-c-tabela-de-motivos` | Claude Code (general-purpose limitado a Read/Grep/Glob/Bash), Claude Opus 5.5 | `C:/Users/AMP/w-jc3-c` + `C:/Users/AMP/w-jc3-c-h2` | `jtrc01c3-c-` | 47763 / 47773 | dca9e2c64ac326b6fafcd6fbb1a2fe2a / b9652c2d69b8908f0b5d2c8b64f11529 | f0409b03f6052e0dcee9db4e06d9844f |

Às 19:2xZ as 6 portas estavam livres (`Get-NetTCPConnection -State Listen`, 0 ocorrências). Cada cadeira testa a porta de novo antes de subir.

## Itens do corpo: o que medi e o resultado

| Item | Resultado | Como medi (resumo; o detalhe está na evidência) |
|---|---|---|
| 1.1 Head e árvore | VERDE | Em `w-trc01`, 55 arquivos aparecem como ` M`, mas `git diff --ignore-cr-at-eol` dá 0: só fim de linha. Os 5 arquivos de src/teste do delta h2→objeto têm md5 EOL-neutro igual ao blob. Nenhum processo vivo com `w-trc01` na linha de comando. |
| 1.2 Plano de isolamento | VERDE | Os 3 mandatos declaram tudo por escrito: worktree próprio, `npm ci` próprio sem junction, Postgres/Redis descartáveis por prefixo, só em 127.0.0.1, base viva e portas do dono fora, remoção pelo nome. |
| 1.3 Resíduos | VERDE COM RESSALVA (R-2, R-3) | `docker ps -a`: nenhum órfão `jur-*`/`crit-*`/`jtrc01c*`. Os resíduos estão descritos em R-2 e R-3. |
| 2.1 Ata anterior | VERDE | Os 3 mandatos marcam o que as atas aprovaram (ciclo 1 l.22, ciclo 2 l.40–48, plano l.416–417) como **A RE-VERIFICAR**: a cadeira re-executa o que o item dela toca e não declara verdadeiro o que não toca. Ponto (iii) do §3.10 do plano atendido. |
| 2.2 Ciclo ≥ 4 | Não se aplica | É o ciclo 3. A auditoria da máquina não é obrigatória (`D-GOV-PROPORCIONAL` 8(2)). O topo auditou e replanejou: o plano do ciclo 3 foi escrito pelo `planejador-trc01-ciclo3` em Fable, sem fallback. |
| 2.3 Plano do ciclo | VERDE COM RESSALVA (R-4, R-5, R-10) | Plano no objeto, com §3.2 PERMITIDO/PROIBIDO, a bateria §3.7 com forma declarada e a §3.10. Os insumos estão no objeto: os planos do ciclo 3 e do Traccar, o relatório do dev do ciclo 3 e as atas dos ciclos 1 e 2. |
| (i) do §3.10: diff sem banco | VERDE | De h2 ao objeto, `prisma`/`migrations` = 0, `.github` = 0 e `Kpis` = 0. Não há guardião de banco a exigir. |
| 3.1 / 3.1-bis Inelegibilidade | VERDE COM RESSALVA (R-6) | Conferida por nome. O obituário, no objeto e na `origin/main`, dá 0 para os 3 nomes novos, para `inspetor-trc01c3`, `dev-trc01-c3-opus` e `planejador-trc01-ciclo3`. O `git grep` das atas e votos dos ciclos 1 e 2 enumera todas as identidades anteriores (cadeiras e todos os ocupantes, inclusive os 4 da (b′) e o achador `jurado-trc01c2-c-opus`, mais inspetores, DBAs, pré-checagem, devs e planejadores) e nenhuma é `jurado-trc01c3-*`. Os papéis estão separados: achou `jurado-trc01c2-c-opus`; planejou `planejador-trc01-ciclo3`; desenvolveu `dev-trc01-c3-opus`; redigiu os mandatos `redator-mandatos-07cb1-opus`; inspecionou `inspetor-trc01c3-opus`. |
| 3.2 Competência | VERDE | (c″) cobre o (c′)-P1, a atribuição no tempo; (a″) cobre o predicado sob RLS; (b″) cobre pathspec, superfície e trava. |
| 3.3 Corpo carregado × corpo julgado | VERDE COM RESSALVA (R-7) | Os 6 corpos batem nas três pontas: objeto, disco e o md5 publicado (EOL-neutro). As normas que os corpos citam existem no `CLAUDE.md` ou no `decisoes.md` do objeto. Nenhuma cláusula inexistente. |
| 4.1 S0 | VERDE | `node scripts/sync-agent-agents.mjs --check` no meu worktree detached no objeto: "OK — 64 agentes, espelho consistente.", ec=0. Recursivo: `especialistas/` 41 × 41; o `.agents` só tem a mais o `README.md`. |
| 4.2 Baseline | VERDE (ver R-9) | Na forma da CI (`npm ci` → `npm run db:generate` → `npm run check`): ec=0 e 0 `error TS`, às 19:27:35Z. Uma 1ª passada minha, sem `db:generate`, deu ec=2 com 266 erros (178 de `@prisma/client` sem membros). Foi artefato da minha forma de execução, e está registrada na evidência. |
| 4.3 Check-runs | VERDE | 14 de 14 `completed|success`: docker, backend-postgres, authority-portal, backend, flutter, owner-portal e frontend, 2 de cada. |
| 5.1 Perda de jurado | VERDE | Declarado no mandato do inspetor (l.214–218) e com a linha [P3] nos 3 mandatos das cadeiras. Ver "Plano de perda de jurado" abaixo. |

## Ressalvas (vão no briefing, em destaque)

- **R-1. Os mandatos não estão versionados.** Os 4 mandatos e o `00-quedas.md` estão no disco de `w-trc01` e fora do git (`git ls-files` = 0; não são ignorados). Medi os md5 EOL-neutros e os 4 batem com os publicados: inspetor a92974fb…, a bae2ba9e…, b dd1d08cd…, c f0409b03…. **Basta o md5 publicado?** Para LIBERAR, sim: o corpo exige verificação por execução e não exige commit, e o md5 conferido sobre o disco prova o texto neste instante. Não prova que o texto fique imutável depois. Por isso o orquestrador versiona os 4 mandatos com estes md5 antes do primeiro voto, ou junto dele, e cada cadeira confere o md5 do próprio mandato no disparo.
- **R-2. Arquivos soltos alheios em `w-trc01`.** São `.npmtest-503.log` (12/10, 2 MB) e `check_md5.cjs`/`check_md5.js` (18/10 00:07, 962 B, um script de md5 git × disco). São inertes e não são do bloco. Reportados, não varridos.
- **R-3. `C:/Users/AMP/w-jc2-b` e `C:/Users/AMP/w-jc2-b3` SÃO worktrees registrados, o que diverge do fato do orquestrador.** O orquestrador disse que "existem no disco, mas não como worktrees". `git worktree list --porcelain` mostra os dois detached em `2043c584` (h2), e o próprio mandato do inspetor (l.115–121) já os listava assim. São resíduo da (b′) do ciclo 2. Estão inertes: porcelain 0, nenhum não rastreado, `node_modules` real, `dir /AL` não acha junction nem symlink. Ficam declarados (ponto (ii) do §3.10). A remoção cabe ao orquestrador, só por `git worktree remove --force`. Não os apaguei.
- **R-4. `R-B-TRC-01-ciclo2.md` não está no objeto.** `git ls-tree -r <objeto> | grep -c R-B-TRC-01-ciclo2` = 0. O arquivo existe em `w-trc01/agent-orchestration/omega/reprovacoes/` sem commit: 2170 B, md5 EOL-neutro `8d572cd2b60744174b75525dd3f9cb3c`. Ele nomeia quem achou (a (c′)), quem planejou (`planejador-trc01-ciclo3`, Fable) e quem desenvolveu (`dev-trc01-c3-opus`). A (b″), no item 3, lê o arquivo do disco e confere este md5. A ausência na ref julgada é matéria de registro: no ciclo 3 vira nota ou pendência e não impede o start.
- **R-5. A ordem do dono *"ataque só a c"* não está em `decisoes.md`.** `grep -c "ataque s"` dá 0 no objeto e na `origin/main`. A ordem está escrita no cabeçalho do plano do ciclo 3 (l.13–14, no objeto) e no R-ciclo2 (l.20). É decisão explícita do dono (§A1.1), já presente na ref julgada pelo plano, e entra no próximo PR de registro. Não impede o start.
- **R-6. O obituário não tem nenhuma linha do B-TRC-01.** Os ciclos 1 e 2 fecharam sem sepultar ninguém, contra a regra 5 do próprio obituário. Hoje a conferência por ata cobre a inelegibilidade. O sepultamento fica devido ao PR de registro.
- **R-7. Os corpos das cadeiras não existem na árvore da sessão.** A `ERP_Techsolutios`, na `main` 684e9afd, não tem os 6 arquivos. Por isso nenhuma cadeira pode ser carregada por `subagent_type`. O disparo segue os mandatos: (b″) e (c″) como general-purpose e (a″) no Codex, todas com o corpo do BLOB do objeto colado no prompt, e cada cadeira confere o md5 da tabela acima antes de votar (md5 divergente → não vota). As normas de orquestração que os mandatos citam, `D-IAS-EXTERNAS-PRIMEIRO` e "no máximo 2 trabalhos com container", estão na `origin/main` (`decisoes.md` l.3739 e l.3737) e não na ref julgada. Elas regem executor e terreno, não a régua de mérito, são decisão do dono e são mais restritivas: aplicam-se à orquestração e não ao voto.
- **R-8. Docker, contado por prefixo.** Às 19:2xZ: 0 grupos de trabalho; só a base viva (`erp-postgres`, `erp-redis`). Às 19:28Z: **1 grupo da outra junta de pé**, `j07cb1c2-c2-runner` e `j07cb1c2-c2-pg`. O sufixo é `c2`; o orquestrador tinha falado em C1 e C3. Enquanto esse grupo viver, há **1 vaga**, então só UMA cadeira do Traccar com container por vez, contando por prefixo imediatamente antes de cada subida, como os mandatos já mandam. A (b″) pode trabalhar sem Postgres.
- **R-9. Quem rodar `npm run check` num worktree novo segue a forma da CI.** A forma é `npm ci` → `npm run db:generate` → `npm run check`. O generate exige `DATABASE_URL` só para carregar o `prisma.config`: uma URL inerte basta, e também a do cluster próprio, nunca a base viva. Sem esse passo, o vermelho é fabricado: 266 erros TS sem defeito nenhum no objeto.
- **R-10. O plano não bate com o diff na contagem de arquivos de `src/`.** O §3.10 do plano diz que o diff toca "os 2 arquivos de `src/`". O diff h2→objeto toca 3: `field-dispatch-prisma.repository.ts`, `field-dispatch.repository.ts` e `field-dispatch.types.ts`. Isto é mérito da (b″), item 1, e não terreno. Fica só o ponteiro.

## Plano de perda de jurado (declarado)

- Toda queda vira uma linha no `00-quedas.md` desta junta, escrita pelo orquestrador (P6). O arquivo já existe com o cabeçalho.
- O sucessor tem identidade NOVA, com sufixo, e re-executa os comandos registrados na evidência de quem caiu antes de medir a cauda (P3).
- Voto perdido nunca conta, e a junta não fecha com menos de 3 votos. A régua é unanimidade de 3 (segurança, §C7 item 8(1)(4)), e no ciclo 3 só defeito de produto GRAVE reprova (8(2)).
- Executor sem cota para e registra onde está, sem descer degrau (§C7.6-bis). Isso vale para o Codex no limite e para o Opus esgotado, inclusive o deste inspetor.
- Pausa do dono: grava a seção PAUSA e para (P7).

## Fatos do orquestrador registrados (sem resolvê-los, §A2)

- O R-ciclo2 está escrito e sem commit. A medição está em R-4.
- *"ataque só a c"* está no plano e no R-ciclo2, mas não em `decisoes.md`. A medição está em R-5.
- `D-IAS-EXTERNAS-PRIMEIRO` e "Docker no máximo 2" estão na `origin/main` (o mandato as mediu nas l.3739 e l.3737), não na base do ramo. A medição está em R-7.
- Arquivos soltos em `w-trc01`: confirmados (R-2).
- `w-jc2-b` e `w-jc2-b3`: **corrigido**. O orquestrador disse que não eram worktrees, mas são worktrees registrados (R-3).
- Outra junta na máquina: confirmado. O prefixo de pé às 19:28Z é `j07cb1c2-c2-*` (R-8).

## Limpeza

Criei o worktree `C:/Users/AMP/w-jc3-insp`, detached no objeto. Confirmei 0 processos nele e o removi com `git worktree remove --force` (ec=0; o diretório não existe mais). Removi a subpasta `scratchpad/insp-trc01c3`. Não subi container nenhum. Em `w-trc01` escrevi só a evidência e este parecer. O disco ficou com 9,7 GB livres.
