# Evidência incremental — inspetor de terreno, junta do ciclo 3 do B-TRC-01 (PR #426)

- Instância: `inspetor-trc01c3-opus` · papel: inspetor de terreno · modelo que rodou: **Claude Opus 5.5** (nível menor, §C7.6, DECLARADO).
- **Troca de executor declarada:** o mandato previa o Codex (GPT-5.6 Sol); o Codex está ocupado (`D-IAS-EXTERNAS-PRIMEIRO`), e o Claude Opus cobre.
- Objeto: `7c220467f754341a699c18c241fa9965c1a35638`. Medições na ref do objeto (§A7).
- Início: 2026-10-18 (UTC no corpo de cada item).

| Item | Estado |
|---|---|
| 0 Corpo do inspetor (md5 EOL-neutro) | VERDE |
| 0b Mandatos (md5 EOL-neutro) | VERDE COM RESSALVA |
| 1.1 Head/árvore | VERDE |
| 1.2 Plano de isolamento | VERDE |
| 1.3 Resíduos | VERDE COM RESSALVA |
| 2.1 Ata anterior "a re-verificar" | VERDE |
| 2.2 Ciclo ≥4 | NÃO APLICÁVEL |
| 2.3 Plano do ciclo | VERDE COM RESSALVA |
| 3.1/3.1-bis Inelegibilidade | VERDE COM RESSALVA |
| 3.2 Competência | VERDE |
| 3.3 Corpo carregado × julgado | VERDE COM RESSALVA |
| 4.1 Espelho S0 | VERDE |
| 4.2 Baseline `npm run check` | VERDE (forma da CI) |
| 4.3 Check-runs | VERDE |
| 5.1 Perda de jurado | VERDE |

---

## Item 0 — corpo do inspetor (19:1xZ)
- Comando: `git show 7c220467…:.claude/agents/inspetor-de-terreno-da-junta.md | tr -d '\r' | md5sum`
- Saída: `89b4563001df748a4016ae57b05fbd20` (163 linhas, `model: opus`). Bate com o md5 publicado pelo orquestrador.
- Veredito parcial: VERDE. Corpo seguido na íntegra.

## Item 0b — mandatos (md5 EOL-neutro, disco de `w-trc01`)
- Comando: `for f in inspetor-trc01c3 cadeira-a cadeira-b cadeira-c; do tr -d '\r' < 00-mandatos/$f.md | md5sum; done`
- Saída: inspetor `a92974fb72873fea5ed2e0d3d54fdfa5` · a `bae2ba9ef73a1bfb3e4b2f5b2ff5eb3c` · b `dd1d08cd57b9210945b311cf5dce794b` · c `f0409b03f6052e0dcee9db4e06d9844f` — os 4 batem com os publicados.
- `git ls-files 00-mandatos | wc -l` = 0 (não rastreados); `git check-ignore` ec=1 (não ignorados — entram no próximo commit do orquestrador).
- Basta o md5 publicado? O corpo do inspetor não exige que o mandato esteja commitado; exige verificação por execução (regra fail-closed) e, no 3.3, comparação EOL-neutra do que é carregado com o que é julgado. O md5 publicado no disparo, conferido por execução sobre o disco, prova a identidade do texto NESTE instante. Ele não prova a imutabilidade depois: arquivo não rastreado pode mudar sem rastro. Logo: basta para liberar, com ressalva — o orquestrador versiona os 4 mandatos com estes md5 ANTES (ou junto) do primeiro voto, e cada cadeira confere o md5 do seu mandato no disparo.
- Veredito parcial: VERDE COM RESSALVA (R-1).
- Instância: o mandato nomeia `inspetor-trc01c3-cdx` (Codex/Sol); quem roda é `inspetor-trc01c3-opus` (Claude Opus 5.5), troca de executor no mesmo nível menor (§C7.6), motivo `D-IAS-EXTERNAS-PRIMEIRO` (Codex ocupado).

## Item 1.1 — head e árvore (19:1xZ)
- Comandos: `git rev-parse HEAD` · `git ls-remote origin refs/heads/feat/traccar-b-trc-01` · `gh pr view 426 --json headRefOid,state,isDraft,mergeable`
- Saída: as três fontes = `7c220467f754341a699c18c241fa9965c1a35638`; PR OPEN, rascunho=false, MERGEABLE.
- `git status --porcelain`: 55 ` M`, `git diff --ignore-cr-at-eol --name-only | wc -l` = 0 → os 55 são só fim de linha (autocrlf), conteúdo = objeto.
- md5 EOL-neutro blob × disco dos 5 arquivos de código/teste do delta h2→objeto (`field-dispatch-prisma.repository.ts`, `field-dispatch.repository.ts`, `field-dispatch.types.ts`, `traccar-operator-at-fix-time.test.ts`, `traccar-position-ingestion-db.test.ts`): 5/5 IGUAL.
- Não rastreados: `.npmtest-503.log` (12/10, 2 MB), `check_md5.cjs` e `check_md5.js` (18/10 00:07, 962 B, script de md5 git×disco, inerte), os 4 mandatos + `00-quedas.md` + esta evidência + `agent-orchestration/omega/reprovacoes/R-B-TRC-01-ciclo2.md`. Nenhum arquivo de código mutado.
- Processo vivo: `Get-CimInstance Win32_Process` com linha de comando contendo `w-trc01|w-jc3|w-jc2` → NENHUM. O único `codex exec` vivo (PID 19912, gpt-5.6-sol) roda com `-C C:\Users\AMP\Documents\GitHub\ERP_Techsolutios` (a outra junta), não em `w-trc01`.
- Veredito parcial: VERDE. Soltos alheios = ressalva inerte (R-2), reportados e não varridos.

## Item 1.3 — resíduos (19:2xZ)
- Comando: `git worktree list --porcelain` · `ls -d C:/Users/AMP/w-jc*` · `docker ps -a --format "{{.Names}}\t{{.Status}}\t{{.Ports}}"` · `git -C w-jc2-b{,3} status --porcelain` · `dir /AL` (junction/symlink).
- Saída: `C:/Users/AMP/w-jc2-b` e `C:/Users/AMP/w-jc2-b3` **SÃO worktrees registrados** (detached em `2043c584…` = h2 do ciclo 2) — **diverge do fato do orquestrador** ("existem no disco, mas não como worktrees"); o próprio mandato do inspetor (l.115–121) já os listava como worktrees. Árvores limpas (porcelain 0, sem não rastreados), `node_modules` como diretório real, `dir /AL` não acha junction nem symlink. Resíduo INERTE (sem mutação, sem privilégio). Não apagados (ordem do orquestrador; quem inspeciona não arruma).
- Docker `ps -a`: só `erp-postgres` e `erp-redis` (base viva, Up 16 h). **Nenhum container órfão** `jur-*`/`crit-*`/`jtrc01c*`. Também **nenhum `j07cb1c2-*` de pé neste instante** — o orquestrador disse que a outra junta tem containers vivos; medido agora: 0 trabalhos com container. A conta "2 no limite" deve ser re-medida por prefixo antes de cada subida (a regra já manda).
- Worktrees vivos da outra junta (`w-07cb1`, `w-j07cb1c2-c1-cdx`, `w-j07cb1c2-c3`) e alheios (`w-agapi2`, `w-dash`, `w-planos`): não são resíduo desta junta, não são alvo.
- Arquivos `jur-probe*`/`*-probe.ts` em `w-trc01`: nenhum (lista de não rastreados no item 1.1).
- Veredito parcial: VERDE COM RESSALVA (R-3: w-jc2-b/b3 são worktrees registrados, inertes, declarados; remoção só por `git worktree remove --force` pelo orquestrador, fora desta inspeção).

## Item 1.2 — plano de isolamento (19:3xZ)
- Comando: `grep -n -i -o -E "w-jc3-[a-z]+|jtrc01c3-[a-z]-|4776[0-9]|4777[0-9]|base viva…|npm ci…|junction" 00-mandatos/cadeira-{a,b,c}.md` + leitura da seção "O terreno" de cada HIPOTESE.
- Saída: os 3 mandatos declaram por escrito: worktree próprio detached no objeto (`w-jc3-a`, `w-jc3-b`, `w-jc3-c`; a (c″) também `w-jc3-c-h2` em h2), `npm ci` próprio sem junction; Postgres/Redis descartáveis por prefixo `jtrc01c3-a-` (47761/47771), `jtrc01c3-b-` (47762/47772, Postgres só se preciso), `jtrc01c3-c-` (47763/47773), só em 127.0.0.1, porta testada antes, senha só por ambiente; contagem por prefixo antes de subir (limite 2 trabalhos, base viva fora); base viva, portas do dono e servidores públicos de demonstração do Traccar nunca são alvo; em `w-trc01` só os 2 arquivos de saída; remoção pelo nome, nunca prune.
- Veredito parcial: VERDE.

## Item 2.1 — afirmações herdadas marcadas "A RE-VERIFICAR"
- Comando: leitura da seção `### A RE-VERIFICAR` das 3 HIPOTESES; `sed -n 22p J-B-TRC-01-ciclo1.md`, `sed -n 40,48p J-B-TRC-01-ciclo2.md`, `sed -n 416,417p` do plano.
- Saída: os 3 mandatos trazem a seção "Nada desta lista é fato herdado (§C7.1-bis) … A RE-VERIFICAR", com a regra: a cadeira RE-EXECUTA no objeto o que o item dela toca, e o que não toca ela não julga e **não declara verdadeiro**. A frase do plano l.416–417 "Não reabrir sem razão nova" fica neutralizada pela regra do mandato (re-executar e só levar a achado com medição e razão nova) — não há herança como fato.
- Veredito parcial: VERDE (ponto (iii) do §3.10 do plano atendido).

## Item 2.2 — ciclo ≥ 4?
- Ciclo 3 → o item 2.2 do corpo não se aplica. A auditoria da máquina do ciclo 3 deixou de ser obrigatória (`D-GOV-PROPORCIONAL` 8(2), §C7 item 8 do CLAUDE.md do objeto). O §C7.4 (topo em toda reprovação de junta) foi atendido: o plano do ciclo 3 abre com "Papel: planejador-mestre (`planejador-trc01-ciclo3`) · Modelo: Fable (claude-fable-5-1) … Sem fallback acionado" e contém a auditoria da reprovação (§1) — medido por `git show <objeto>:docs/revisoes/TRACCAR/B-TRC-01-ciclo3-plano.md | sed -n 1,20p`.
- Veredito parcial: NÃO APLICÁVEL / VERDE.

## Item 2.3 — plano do ciclo
- Comando: `git show <objeto>:docs/revisoes/TRACCAR/B-TRC-01-ciclo3-plano.md | grep -n "^#"` e leitura de §3.2, §3.7 e §3.10.
- Saída: o plano existe no objeto; nomeia o objeto do ciclo 2 (`2043c584`) e manda julgar o "head novo do PR #426 com check-runs concluídos"; §3.2 PERMITIDO/PROIBIDO; §3.7 bateria com forma declarada (container Linux pelo `teste-linux.sh`, TAP, números esperados: ≥132 nas 15 suítes, 391 na forma `backend-postgres`, `skipped 2` na forma `backend`, 366 em field-dispatch/work-order).
- Insumos no objeto (re-medido por `git cat-file -e`): plano e relatório do dev do ciclo 3, atas dos ciclos 1 e 2, `PLANO_TRACCAR.md` = sim.
- `R-B-TRC-01-ciclo2.md`: **NÃO está no objeto** (`git ls-tree -r <objeto> | grep -c R-B-TRC-01-ciclo2` = 0); existe no disco de `w-trc01`, não rastreado, 2170 B, md5 EOL-neutro `8d572cd2b60744174b75525dd3f9cb3c`; nomeia quem achou (a (c′)), quem planejou (`planejador-trc01-ciclo3`, Fable) e quem desenvolveu (`dev-trc01-c3-opus`).
- Ordem do dono *"ataque só a c"*: está no cabeçalho do plano do ciclo 3 (l.13–14) e no R-ciclo2 (l.20); `grep -i -c "ataque s"` em `decisoes.md` = 0 no objeto e na `origin/main`. É decisão explícita do dono (§A1.1), já escrita em artefato versionado no objeto (o plano). Não impede o start: a regra que a junta aplica está escrita na ref julgada.
- §C7.6 / divergência menor de registro: o plano §3.10 diz que o diff toca "os 2 arquivos de `src/`"; o diff h2→objeto toca **3** (`field-dispatch-prisma.repository.ts`, `field-dispatch.repository.ts`, `field-dispatch.types.ts`) — medido por `git diff --name-only $h2 <objeto> -- src`. É mérito da (b″) (escopo), não terreno; vai como ponteiro no parecer.
- Veredito parcial: VERDE COM RESSALVA (R-4: R-ciclo2 fora do objeto — a (b″) item 3 o lê do disco e deve conferir o md5 acima; R-5: "ataque só a c" fora de `decisoes.md`, entra no próximo PR de registro).

## Item (i) do §3.10 — diff sem banco
- Comando: `h2=$(sed -n 3p J-B-TRC-01-ciclo2.md | grep -o -E "[0-9a-f]{40}" | head -1); git merge-base --is-ancestor $h2 <objeto>; git diff --name-only $h2 <objeto> -- prisma migrations | wc -l; … -- .github; … -- Kpis`
- Saída: h2=`2043c5840c8f60fe91538840aaefb3420a11cfe3`, ancestral ec=0; `prisma`/`migrations` = 0, `.github` = 0, `Kpis` = 0; 36 arquivos no delta h2→objeto. Nenhum guardião de banco a exigir.
- Veredito parcial: VERDE.

## Item 3.1 / 3.1-bis — inelegibilidade por nome (19:4xZ)
- Fonte primeira: `git show <objeto>:agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md` (301 linhas; idem na `origin/main`). `grep -c -i` para `jurado-trc01c3-a-rls-e-regressao`, `jurado-trc01c3-b-escopo-superficie-registro`, `jurado-trc01c3-c-tabela-de-motivos`, `trc01c3`, `inspetor-trc01c3`, `dev-trc01-c3-opus`, `planejador-trc01-ciclo3` → **0** em todos, no objeto e na `origin/main`. Nenhuma SEPULTADA/RESERVADA colide.
- Atas (o obituário não absolve): `git grep -h -o -i -E "[a-z0-9-]*trc01c?2?-[a-z0-9-]+"` sobre `J-B-TRC-01-ciclo2.md`, `votos/B-TRC-01-ciclo2`, `votos/B-TRC-01`, `R-B-TRC-01-ciclo1.md` e `docs/revisoes/TRACCAR` no objeto → identidades anteriores: cadeiras ciclo 1 `jurado-trc01-a-rls-e-banco(-cdx/-cdx2/-cdx3)`, `jurado-trc01-b-superficie-e-segredo(-cdx/-cdx2)`, `jurado-trc01-c-contrato-e-atribuicao(-claude)`; ciclo 2 `jurado-trc01c2-a-rls-banco-e-ci`/`-a-cdx`, `jurado-trc01c2-b-escopo-superficie-e-trava`/`-b-cdx`/`-b-opus`/`-b-gemini2`, `jurado-trc01c2-c-viatura-no-tempo`/`-c-opus` (achador do P1); inspetores `inspetor-trc01-cdx`, `inspetor-trc01c2-cdx`; DBA `dba-trc01-cdx(2)`, `dba-trc01-c2-cdx`; pré-checagem `precheck-trc01-c2-codex`; devs `dev-trc01-claude/-codex`, `dev-btrc01-claude`, `dev-trc01-503-*`, `dev-trc01-c2-*`, `dev-trc01-c3(-opus)`; planejadores `planejador-trc01-ciclo2/-ciclo3`. **Nenhuma** é `jurado-trc01c3-*` nem `inspetor-trc01c3-opus`. `git grep -c "jurado-trc01c3|inspetor-trc01c3" origin/main -- agent-orchestration` = 0; `grep -r` na árvore da sessão = 0.
- Papéis únicos: achou = `jurado-trc01c2-c-opus`; planejou = `planejador-trc01-ciclo3` (Fable); desenvolveu = `dev-trc01-c3-opus`; redator dos mandatos = `redator-mandatos-07cb1-opus`; inspetor = `inspetor-trc01c3-opus` (eu). As 3 cadeiras são identidades distintas entre si e de todos os anteriores.
- Ressalva R-6: o obituário não tem NENHUMA linha do B-TRC-01 (ciclos 1 e 2 fecharam sem sepultar, contra a regra 5 dele). A conferência por ata cobre o caso agora; o registro fica devido ao PR de registro.
- Veredito parcial: VERDE COM RESSALVA.

## Item 3.2 — competência
- O achado em julgamento é o (c′)-P1 (atribuição do operador no instante do fix; plano §1). (c″) tabela de motivos / atribuição no tempo cobre; (a″) RLS e regressão de banco cobre o predicado novo sob papel sem bypass; (b″) escopo/superfície/registro cobre o pathspec e a trava. Nenhum achado sem cadeira.
- Veredito parcial: VERDE.

## Item 3.3 — corpo carregado × corpo julgado (EOL-neutro)
- Comando: para cada corpo, `git show <objeto>:<p> | tr -d '\r' | md5sum` × `tr -d '\r' < w-trc01/<p> | md5sum` × o mesmo na árvore da sessão (`ERP_Techsolutios`, `main` 684e9afd).
- Saída (objeto = disco de `w-trc01` = publicado pelo orquestrador, 6/6):
  - (a″) `.claude` a454ff5c98827787825ab0d141ad94c5 · `.agents` 7f224a874af8c2036235837cf236ceb7
  - (b″) `.claude` 370d771dd16bdb3a52934d5e7bbb1ff4 · `.agents` 7663620fc679db6c4479af639e2e12fc
  - (c″) `.claude` dca9e2c64ac326b6fafcd6fbb1a2fe2a · `.agents` b9652c2d69b8908f0b5d2c8b64f11529
  - Árvore da sessão: os 6 **AUSENTES** (a `main` não tem os corpos). Logo NÃO podem ser carregados por `subagent_type` a partir da sessão; os mandatos já mandam disparar (b″)/(c″) como general-purpose com o corpo do blob no prompt e (a″) no Codex com o corpo no prompt. Ressalva R-7: o orquestrador cola o corpo do BLOB e cada cadeira confere o md5 acima antes de votar (os mandatos já trazem a trava "md5 divergente → não vota").
- Normas citadas nos 3 corpos (`grep -o` de §/item/D-*) existem no `CLAUDE.md` do objeto: §C7.4-bis, §C7.6-bis, §C7.1-bis, 1-ter(a)(c), §C7.5, §C7.7 (item 7), item 8 (1)…(5), §C4, §C5; `D-TRACCAR-HTTP-PRIVADO-AWS`, `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`, `D-PAUSA-GRAVA-E-PARA`, `D-MEDIR-NA-REF-ALVO`, `D-GOV-PROPORCIONAL` presentes; `D-TRC-DECISOES-DO-DONO-2026-10-11` e `D-TRC01-VEHICLE-ASSIGNED-AT` presentes em `decisoes.md` do objeto. Nenhuma cláusula inexistente citada. As §3.x são do plano do ciclo 3, presente no objeto.
- Normas de ORQUESTRAÇÃO citadas nos mandatos e ausentes da ref julgada: `D-IAS-EXTERNAS-PRIMEIRO` e "no máximo 2 trabalhos com container" (estão na `origin/main` `decisoes.md` l.3739/l.3737, não no objeto). Não são régua de mérito; regem executor e terreno, são decisão do dono (§A1.1) e são mais restritivas — aplicam-se à orquestração, não ao voto. Registrado, não bloqueia.
- Veredito parcial: VERDE COM RESSALVA (R-7).

## Item 4.1 — fatia S0, espelho Codex (worktree próprio `C:/Users/AMP/w-jc3-insp`, detached no objeto, porcelain 0)
- Comando: `timeout 120 node scripts/sync-agent-agents.mjs --check; echo ec=$?` + `git ls-tree -r --name-only HEAD .claude/agents` × `.agents/agents` (recursivo, inclui `especialistas/`).
- Saída: `[agents-sync] OK — 64 agentes, espelho consistente.` ec=0. `.claude/agents` 64 · `.agents/agents` 65 (a diferença é só `README.md`, o protocolo de emulação Codex); `especialistas/` 41 × 41.
- Veredito parcial: VERDE.

## Item 4.3 — check-runs do objeto
- Comando: `timeout 60 gh api "repos/thiagodorgo/ERP_Techsolutios/commits/7c220467…/check-runs?per_page=100" --jq …`
- Saída: total=14, todos `completed|success` (2× cada: docker, backend-postgres, authority-portal, backend, flutter, owner-portal, frontend — gatilhos push e pull_request); último a concluir: docker 18:56:08Z. Nenhum `queued`/`in_progress`/`cancelled`.
- Veredito parcial: VERDE.

## Portas candidatas (terreno das cadeiras)
- Comando: `Get-NetTCPConnection -State Listen | ? { 47761,47762,47763,47771,47772,47773 -contains $_.LocalPort }`
- Saída: listen_count=0 — as 6 portas estão livres agora. (Cada cadeira testa de novo antes de subir — o mandato manda.)

## Item 5.1 — plano de perda de jurado
- Comando: `grep -n -i -E "perda|sucessor|00-quedas|menos de 3" 00-mandatos/inspetor-trc01c3.md`; `grep -c -i "substituir um ca" 00-mandatos/cadeira-{a,b,c}.md`.
- Saída: mandato do inspetor l.214–218: queda → linha no `00-quedas.md` desta junta pelo orquestrador (P6); sucessor com identidade NOVA com sufixo, re-executa o que a evidência registrou (P3); voto perdido nunca conta; a junta não fecha com menos de 3 votos; executor sem cota (Codex no limite, Opus esgotado) para e registra onde está, sem descer degrau (§C7.6-bis). Os 3 mandatos das cadeiras trazem o modelo do §C7.7 com a linha [P3] (1 ocorrência cada). `00-quedas.md` existe com o cabeçalho P6.
- Veredito parcial: VERDE.

## Item 4.2 — baseline honesto (worktree próprio `C:/Users/AMP/w-jc3-insp`, detached no objeto, porcelain 0)
- Passada 1 (FORMA INCOMPLETA, minha): `npm ci --no-audit --no-fund` (ec=0, 326 pacotes, 19:22→19:25Z) seguido direto de `npm run check > check.txt 2>&1; ec=$?` → **ec=2**, 266 `error TS`, dos quais 178 são `TS2305: Module '"@prisma/client"' has no exported member …`. Causa: o Prisma Client não foi gerado. A CI (`ci.yml` l.79–106, job `backend`) roda `npm ci` → `sync-agent-agents --check` → `npm run db:generate` → `migrate deploy` → `npm run check`; eu pulei o `db:generate`. **É artefato da minha execução, não do objeto.** Fica registrado, não apagado.
- Passada 2 (FORMA DA CI, sem banco): `DATABASE_URL='postgresql://inerte:inerte@127.0.0.1:1/inerte' npm run db:generate` (a URL só satisfaz o `prisma.config`; o generate não conecta; porta 1 sem servidor; nunca a base viva) → ec=0, "Generated Prisma Client (v7.8.0)"; depois `npm run check > check2.txt 2>&1; ec=$?` → **ec=0, 0 `error TS`** (19:27:35Z). `git status --porcelain` = 0 depois (o generate só escreve em `node_modules`).
- CI do objeto, que é insumo (item 4.3): `backend` e `backend-postgres` `completed|success` (2× cada).
- Disco: `df -h /c` → 9,6 GB livres (96% usado) antes do `npm ci`.
- Veredito parcial: VERDE.

## Limpeza e terreno no fim (19:28Z)
- Processos com `w-jc3-insp` na linha de comando = 0 → `git worktree remove --force C:/Users/AMP/w-jc3-insp` ec=0; diretório ausente; `worktree list | grep -c w-jc3-insp` = 0. Subpasta `scratchpad/insp-trc01c3` (npmci/check/check2/gen.txt) removida. Nenhum container criado por mim. Nada mais em `w-trc01` além da evidência e do parecer.
- Docker às 19:28Z: `j07cb1c2-c2-runner`, `j07cb1c2-c2-pg` (1 grupo de trabalho da OUTRA junta) + `erp-postgres`, `erp-redis` (base viva). → Agora: 1 de 2 vagas ocupada; cabe UMA cadeira do Traccar com container por vez enquanto o grupo `j07cb1c2` viver. (Às 19:2xZ eram 0 grupos; o estado muda e se conta por prefixo antes de cada subida.)
- Disco: 9,7 GB livres.
