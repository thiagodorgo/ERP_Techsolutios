# PARECER DO INSPETOR DE TERRENO — junta do B-O6R-02 ciclo 5 (TETO)

- **Papel:** inspetor-de-terreno-da-junta (instancia NOVA, Fable, fail-closed §C7.1-bis)
- **Data:** 2026-09-03
- **Head a julgar:** bcf6460 · worktree `.claude/worktrees/agent-af6ea607f3ddf8efd` · branch `feat/o6r-b02-financial-uow`
- **Metodo:** cada item abaixo tem o comando executado e a saida obtida. Afirmacao sem execucao nao conta.
- **Registro incremental (P1):** este arquivo cresce a cada medicao, na ordem em que medi.

## ESQUELETO (preenchido a medida que medido)

- [x] M1 — head + arvore do worktree do bloco
- [x] M2 — pais do merge 84bb90b + ancestralidade de 12c3825
- [x] M3 — os 4 criterios de escopo (§10.3, criterio iii re-baseado E4.4)
- [x] M4 — os 8 hashes dos corpos na ARVORE PRINCIPAL vs E1.8 + julgamento do ATO (§2.1 do briefing)
- [x] M5 — inelegibilidade das 3 cadeiras POR NOME (grep nas atas, E1.5)
- [x] M6 — fatia S0 / espelho Codex (sem usar --check como prova de especialistas, E1.6)
- [x] M7 — baseline honesto (npm run check no head, ec por variavel)
- [x] M8 — residuos (docker ps -a, worktrees, untracked da arvore principal)
- [x] M9 — insumos do briefing (diario, terreno pos-absorcao, auditoria, ata c4 marcada a re-verificar, insumos ciclo>=3)
- [x] M10 — plano de perda de jurado (E1.7)
- [x] M11 — pesagem da acumulacao de papeis (§0 do briefing)
- [x] M12 — pesagem da lacuna do critico (§5 do briefing)

---

## M1 — HEAD E ARVORE DO WORKTREE DO BLOCO · **VERDE**

Executado em `.claude/worktrees/agent-af6ea607f3ddf8efd`:

- `git rev-parse --short HEAD` → **`bcf6460`** — bate com briefing §1 e comando.
- `git status --porcelain` → **VAZIO** (ec=0). Nenhuma mutacao viva no worktree do bloco.
- `git config core.autocrlf` → `true` (contexto para as armadilhas §11.2 — por isso toda conferencia de conteudo abaixo e por `git hash-object`/`git show`, nunca md5 de arvore).

## M2 — PAIS DO MERGE E ANCESTRALIDADE · **VERDE**

- `git rev-list --parents -n 1 84bb90b` → `84bb90b6… 12c38251… f895dd25…` — **dois pais**, exatamente `12c3825` (head julgado do c4) e `f895dd2`.
- `git merge-base --is-ancestor 12c3825 HEAD` → **ec=0** — o head julgado do ciclo 4 esta preservado na linhagem.
- `git rev-parse --short origin/main` → **`f895dd2`** — o segundo pai E a main publicada (#368), como declarado.

## M3 — OS 4 CRITERIOS DE ESCOPO (§10.3 do comando) · **VERDE (4/4)**

- **(i)** `git diff --check` (arvore) → vazio, ec=0; `git diff --check 84bb90b HEAD` → vazio, ec=0.
- **(ii)** `git diff --stat HEAD origin/main -- CLAUDE.md AGENTS.md` → **VAZIO**. Contratos intocados.
- **(iii) re-baseado (E4.4/E1.6):** `git diff --name-only 84bb90b HEAD -- 'src/**'` → **VAZIO**. Produto intocado pelas fatias.
  - **Contraprova da armadilha aritmetica, executada:** `git diff --name-only 12c3825 HEAD -- 'src/**'` → exatamente `src/modules/authority/authority-password.ts` (1 arquivo) — a correcao C1 do SAN2-4b vinda da main pela absorcao. Confirmo por execucao que o criterio ANTIGO (contra `12c3825`) reprovaria o bloco por construcao; o re-baseamento e legitimo e necessario.
- **(iv) na forma RULED (terreno pos-absorcao §7, ruling CP-1):** `git diff 84bb90b HEAD -- .github/workflows/ci.yml` → **VAZIO**. A letra original do §10.3(iv) ("uma linha + comentario") foi consumida pelo merge de absorcao; conferi a sustentacao do ruling por execucao:
  - `SUITES=` em `f895dd2` (origin/main) = **27**; em `HEAD` = **34** (as 7 suites, no proprio merge);
  - `git diff --stat f895dd2 HEAD -- .github/workflows/ci.yml` → 1 arquivo, 25+/4- (confinado);
  - comentario de fechamento presente na regiao (l.240 de `84bb90b`): "Fecha o LUGAR RESERVADO da main e P-O6R-B02-SUITES-LIST-CI, cujo dono e este PR."
- **Bonus de consistencia:** `git ls-tree HEAD prisma/migrations/ | grep -c tree` → **106** migrations no head, com `20260871000000_add_reversal_pair_fk` (F4) presente — bate com "105, 106 depois do F4" (§11.3 do comando).

## M4 — OS 8 CORPOS NA ARVORE PRINCIPAL × E1.8, E O ATO DA REPOSICAO · **VERDE, com ressalva nomeada (R2)**

Tudo medido por `git hash-object` (eol-neutro), nunca md5 de arvore (§11.2):

**(a) Os 8 hashes na arvore principal batem 8/8 com a TABELA E1.8** (hash COMPLETO conferido, nao so o curto):

```
critico-c5-adversarial                        dc173575ec77e4c991186635af8418bdea103735  OK
jurado-c5-arnes-catalogo-postgres             254cc4f6f31eb5845b15f1e5a7f3fcba8cbc9ae3  OK
jurado-c5-banco-fk-triggers                   ab726a8c40a8d89e159b9343b704c0f065765f8e  OK
jurado-c5-suplente-arnes-catalogo-postgres    d72915900400211658586a1d782a0e2977553e12  OK
jurado-c5-suplente-banco-fk-triggers          5d1836587b7b031d5a739c1f92e029f9b1a12b73  OK
jurado-c5-suplente-validador-diff-plano       a08aeb2fb5251abe570019720ef8517ef9caa8cf  OK
jurado-c5-validador-diff-plano                0a1f64ce6552d8e2a2612c72876922c6aea0d8d1  OK
suplente-critico-c5-adversarial               deb2543fa118ed526c14c980d5295986886af02a  OK
```

**(b) Verbatim da linhagem, provado:** `git ls-tree bcf6460 -- .claude/agents/especialistas/` devolve **os mesmos 8 blobs, hash a hash** — o que esta na arvore principal E byte-a-byte (modulo EOL) o que esta commitado no head a julgar. Nenhuma edicao no transporte.

**(c) O estado git da mutacao declarada confere com o §2.1 do briefing:** `git status --porcelain -- .claude/agents/especialistas/` na arvore principal → exatamente **2 ` M`** (`critico-c5-adversarial`, `jurado-c5-arnes-catalogo-postgres`) **+ 6 `??`**. Nada alem do declarado.

**(d) Reversibilidade provada:** `git ls-tree HEAD` (demo/investidor) carrega os originais commitados — `critico-c5-adversarial.md` no blob `7c47b0f…` e `jurado-c5-arnes-catalogo-postgres.md` no blob `48abf26…` — exatamente os hashes que o briefing declara como versao pre-apenso. A edicao inversa e possivel a qualquer momento.

**(e) Os corpos ANTECEDEM as fatias do orquestrador:** `git log --oneline bcf6460 -- .claude/agents/especialistas/` mostra que os 8 entraram na linhagem por `e6a6461` (#367, preparo SAN2-5) e chegaram ao head pelo merge `84bb90b`. Os commits de fatia `6986f10`/`5d6c6d3`/`bcf6460` **nao tocam** os corpos. Quem executou F4–F6 nao escreveu nem alterou os juizes que vao julga-lo — isso e medido, nao declarado.

**Julgamento do ATO (§2.1):** a reposicao foi (i) necessaria — sem ela 2 das 3 cadeiras nao resolveriam e 2 corpos rodariam pre-apenso, falha silenciosa; (ii) verbatim — provado em (a)+(b); (iii) declarada — briefing §0/§2.1, nao escondida; (iv) reversivel — provado em (d); (v) sem comando destrutivo. **Nao bloqueia.** Vira a ressalva **R2**: a arvore principal carrega mutacao viva deliberada em `.claude/agents/especialistas/` durante toda a junta — nenhum agente pode rodar `checkout/stash/clean/reset` na arvore principal enquanto a junta nao fechar, e o destino dessa mutacao (commit proprio ou edicao inversa) tem de ser registrado no fechamento do bloco.

## M5 — INELEGIBILIDADE DAS CADEIRAS, POR NOME E POR GREP NAS ATAS (E1.5) · **VERDE**

Forma: `grep -rl <nome>` em `agent-orchestration/` (inclui `omega/juntas/`, `omega/reprovacoes/`, todos os votos) e `docs/juntas/`, na arvore principal — nunca por consulta ao obituario (§1.4: ausencia nao absolve).

- **C2 `jurado-c5-banco-fk-triggers`** e **C3 `jurado-c5-validador-diff-plano`**: aparecem SOMENTE no plano do ciclo 5, no briefing do ciclo 5 e neste parecer. Nunca votaram, acharam, planejaram ou desenvolveram. **Limpo.**
- **C1 `jurado-c5-arnes-catalogo-postgres`**: aparece tambem nos documentos do `B-O6R-ARNES` — e o contexto, lido linha a linha, CONFIRMA a elegibilidade em vez de mata-la: foi **nomeada no §13.1 daquele plano e RECUSADA pelo inspetor daquela junta na 1a passada** (corpo = contrato de outra junta); a ata `J-B-O6R-ARNES.md` l.50–56 consigna a substituicao ("ficou **intocado e reservado** para a junta do ciclo 5"); o parecer 00b daquela junta provou por `git log 77ead96..bd0d700` = vazio que o corpo nao foi tocado; e o voto real da cadeira do ARNES (`01-jurado-arnes-catalogo.json`) declara "nada dela foi herdado". **Nunca serviu — comprovado por grep + leitura, nao por obituario.**
- **Suplentes (3) + `critico-c5-adversarial` + `suplente-critico-c5-adversarial`**: fora do diretorio de votos deste ciclo, aparecem SOMENTE no briefing do ciclo 5. Nunca serviram. (Relevante porque suplente pode virar votante — E1.7.)
- **Votantes do ciclo 4** (contra quem a colisao seria fatal): `jurado-c4-fail-closed-enumeracao` + 4 suplentes `jurado-c4-*` (lidos de `votos/B-O6R-02-ciclo4/`). **Nenhuma interseccao** com as identidades desta junta.
- Nenhuma cadeira colide com a lista E1.5 (12 dos ciclos 1–3, 5 votantes do c4, `jurado-arnes-*`, os 3 especialistas de `12c3825`, planejador/dev do SAN2-5, dev `agent-a6e56e5988c0adbad`).

**Cobertura de competencia (§3.2 do meu contrato):** o achado central do ciclo (FK do par de estorno + `[RLS]` real + saldo sob concorrencia) tem cadeira propria (C2, banco); o numero-sob-forma (canonica 3, denominador, vaza-metro) tem a C1; escopo/pisos/KPI tem a C3. Sem lacuna de competencia nomeavel.

## M6 — FATIA S0 / ESPELHO CODEX · **VERMELHO no espelho, com origem PRE-EXISTENTE provada → ressalva forte (R3), nao bloqueio**

**(a) O check, executado nas duas arvores (ec por variavel):**
- Arvore principal: `node scripts/sync-agent-agents.mjs --check` → **ec=1** — `DIVERGE` nos 2 corpos c5 que o espelho tem (versao pre-apenso) + `FALTA no espelho` nos 6 novos.
- Worktree do bloco (head `bcf6460`): mesmo comando → **ec=1** — `FALTA no espelho` para **os 8** corpos c5. Todo o resto do espelho (agentes de topo + 3 especialistas antigos) consistente: nenhuma outra linha de divergencia.

**(b) A premissa do E1.6/briefing §2.2 ENVELHECEU — e o sentido e seguro:** o script, tanto na arvore principal quanto no blob de `bcf6460`, ja e **recursivo de proposito** (comentario no proprio codigo: "o listing raso ja deixou especialistas/ fora do espelho E do --check dois ciclos seguidos"). A afirmacao "l.66 leitura plana, especialistas invisivel" descreve uma versao anterior. Consequencia: o `--check` agora VE `especialistas/` — e por isso acusa. A junta nao deve herdar a frase "o check nao enxerga especialistas" como fato.

**(c) Origem da lacuna, provada por execucao — e PRE-EXISTENTE a este bloco:**
- `git ls-tree f895dd2 -- .claude/agents/especialistas/` (origin/main, #368) → **os 8 corpos c5 presentes**;
- `git ls-tree f895dd2 -- .agents/agents/especialistas/` → **VAZIO**. A main publicada ja carrega os corpos SEM o espelho Codex. O bloco herdou isso pela absorcao `84bb90b`; espelhar `.agents/**` esta fora do escopo §5 do bloco.

**(d) Por que nao bloqueia (a regra "divergencia = BLOQUEADO" lida pela sua razao de ser):** o risco que essa regra vigia e jurado resolvendo corpo errado/ausente em silencio. Nesta junta, TODOS os agentes resolvem do lado Claude da arvore principal — provado hash a hash no M4 — e a emulacao Codex nao esta em jogo (Codex encerrou no CP-3; ordem do dono moveu a execucao para o Claude Code). O plano que governa a junta (E1.6) fixa: a prova dos corpos e a TABELA DE HASHES, nao o `--check`. Alem disso, "consertar" o espelho agora seria (i) mutacao adicional nao-declarada na arvore principal, ou (ii) commit novo no head a julgar — as duas coisas piores que a ressalva. **Classificacao: `pre-existente` com evidencia de origem (ls-tree de `f895dd2`), dono a nomear — entra como R3.**

**(e) Os 3 ` M` fantasmas da arvore principal, medidos:** `git hash-object` × blob de HEAD para `planejador-mestre.md`, `porteiro-pos-merge.md`, `scripts/sync-agent-agents.mjs` → **identicos, byte a byte** (`f209f8e…`, `9a97167…`, `a87d9a6…`). E stat-cache sob autocrlf, nao mutacao viva. Registro para que nenhum jurado emita a falsa ressalva ja vista antes.

## M7 — BASELINE HONESTO NO HEAD · **VERDE**

No worktree do bloco, head `bcf6460`, arvore limpa:

- `node_modules` e diretorio REAL proprio do worktree — `fsutil reparsepoint query node_modules` → "nao e um ponto de nova analise" (nao ha junction/symlink; E1.4.2 respeitada).
- `npm run check > /tmp/npm-check-c5.txt 2>&1; ec=$?` → **ec=0** (tsc --noEmit limpo). Exit por variavel, nunca por pipe.
- `git status --porcelain` DEPOIS do check → **segue VAZIO** (a medicao nao sujou o terreno).

Sobre os numeros publicados pelo bloco (canonica 3 10/10 denominador 2771 identico e Δroles=0; canonica 2 15/15 com 225 constante; corrida 10/10): **nao os re-executei** — re-execucao com N e forma e exatamente o mandato de merito das cadeiras C1 (canonica 3/vaza-metro) e C3 (canonicas 1-2/pisos), cada uma em cluster descartavel proprio. O que o terreno exige — head certo, arvore limpa, typecheck verde, forma declarada com N (plano §9, diario P1 de 808 linhas commitado) — esta medido e verde. Nenhum baseline meu divergiu do publicado; nada tenho a publicar ao lado.

## M8 — RESIDUOS · **VERDE com 2 notas (entram em R4)**

- `docker ps -a` → `erp-postgres` (Up 5 days, healthy) · `erp-redis` (Up 5 days, healthy) · **`dev-c2-pg`** (postgres:16, Up 8 hours, porta **15432**). O terceiro NAO e residuo de junta passada deste bloco (nomes `jur-*`/`crit-*`: zero): e o cluster descartavel VIVO do bloco vizinho `B-O6R-07` (worktrees `b07`/`dev-c2b-red`, avisado no §11.11 do comando). Nenhum container orfao de rodadas passadas. A base viva nao recebeu comando algum meu (o `docker ps` interroga o daemon, nao o container).
- `git worktree list` → alem da principal e do worktree do bloco: `b07` (vizinho declarado, mutacao viva propria dele), `dev-c2b-red` (vizinho, mutacao viva + um `?? probe-rotas.ts` DELE), `gov-descuido` (**limpo** — `status --porcelain` vazio; a mutacao que a junta ARNES anotou ja nao existe).
- Arvore principal, `git status --porcelain` completo: exatamente a mutacao declarada do §2.1 (2 ` M` + 6 `??` em especialistas), os 3 ` M` fantasmas provados byte-identicos (M6.e), e untracked inertes: `.claude/worktrees/`, o proprio `BRIEFING-B-O6R-02-ciclo5.md` (ainda nao commitado), `votos/B-O6R-02-ciclo5/` (este parecer) e `votos/SAN2-6/` (residuo inerte de outra junta). **Nada alem do declarado + inertes nomeados.**
- Sondas soltas na raiz (`jur-probe*`, `*-probe.ts`): **zero**.

## M9 — INSUMOS DO BRIEFING (§C7.1-bis) · **VERDE, exceto a lacuna do critico (M12)**

- Diario de execucao `B-O6R-02-ciclo5-execucao.md`: presente no worktree, **commitado em `bcf6460`**; terreno pos-absorcao (98 linhas, com o §7 do ruling CP-1); auditoria propria S2 (63 linhas). Conferidos por leitura direta no worktree (o M3.iv usou o §7 do terreno e o confirmou POR EXECUCAO no diff real).
- Ata do ciclo anterior: `votos/B-O6R-02-ciclo4/` presente (3 pareceres de inspetor + 5 votos). O briefing §4 lista as 4 afirmacoes herdaveis e as marca **"a re-verificar"** uma a uma, com a instrucao explicita de nao copiar — conforme exigido.
- Insumos de ciclo >= 3 (§C7.4): o protocolo de dificuldade deste bloco esta na trilha de reprovacoes/planos (ciclo 5 = junta ampliada replaneja — e o proprio plano de 847 linhas com apensos E1/E3/E4 E o produto disso); a deliberacao por escrito esta no §0/"A DELIBERACAO" do plano.
- Plano do ciclo: nomeia head (re-baseado pelo E4/terreno pos-absorcao para `84bb90b`→`bcf6460`), lista de arquivos §5, bateria §9 com forma declarada ("contagem so vale com N e forma").

## M10 — PLANO DE PERDA DE JURADO (`D-JUNTA-RESILIENTE`) · **VERDE**

- E1.7 + briefing §7: suplente nomeado POR CADEIRA antes do inicio (C1/C2/C3 + suplente do critico), com a regra escrita: suplente **re-executa o briefing inteiro**, nao herda medicao; junta nao fecha com menos de 3 votos de merito; voto perdido nunca conta.
- Os 4 corpos de suplente EXISTEM na arvore principal e batem hash a hash com E1.8 (M4.a). O plano de perda nao e promessa: os substitutos estao instalados e conferidos.
- Registro incremental P1 exigido no briefing §7 — este parecer o cumpre (gravado em 8 lotes ate aqui).

## M11 — A ACUMULACAO DE PAPEIS (§0 do briefing) · **PESADA: nao contamina a ponto de impedir a junta → ressalva R1**

Fatos, todos medidos (nao declarados):

- A ordem do dono existe e esta registrada: diario, **"Quarto registro — TROCA DE EXECUTOR (determinacao do dono, 2026-09-02)"** (l.650), com a frase citada ("o codex se foi. vc deve terminar esse bloco") — divergencia §A2 registrada, nao silencio.
- Os corpos das 3 cadeiras, dos 4 suplentes e do critico **antecedem a execucao do orquestrador** (M4.e): entraram na linhagem por `e6a6461` (#367, SAN2-5) e os commits de fatia dele nao os tocam. Quem executou F4–F6 **nao escreveu os proprios juizes**.
- O transporte dos corpos para a arvore principal foi **verbatim, hash a hash** (M4.a/b) — o orquestrador nao teve oportunidade de moldar mandato no caminho.
- A separacao §C7.4-bis nas tres pontas: quem ACHOU (jurados do c4) ≠ quem PLANEJOU (planejador do c5 + dev do SAN2-5, ambos inelegiveis por E1.5) ≠ quem DESENVOLVEU (Codex ate CP-3; orquestrador em F4–F6). A acumulacao residual e dev-parcial + convocante/preparador de terreno — e o gate do terreno (este parecer, identidade independente, Fable) mediu de forma autonoma cada afirmacao estrutural do briefing, achando duas envelhecidas (M6.b, M3.iv — as duas ja corrigidas por documento posterior, e conferidas por execucao).

**Julgamento:** o risco residual — o autor do diff escreve o briefing que enquadra a junta — esta mitigado por (i) corpos congelados pre-execucao, (ii) quorum unanime de 3 com veto por construcao, (iii) briefing que manda re-verificar e publicar divergencia como achado, (iv) este gate. **Nao bloqueia.** Vira **R1**, em destaque: a ata da junta DEVE consignar quem ocupou cada papel (§C7.4-bis — ata sem isso = ciclo invalido), incluir a acumulacao por extenso, e qualquer instrucao do orquestrador a jurado DURANTE a votacao que estreite mandato deve ser registrada no voto como insumo suspeito.

## M12 — A LACUNA DO CRITICO (§5 do briefing) · **E O ITEM QUE BLOQUEIA**

O que medi:

- O parecer do critico do **ciclo 3** (§C7.4) EXISTE: `agent-orchestration/omega/reprovacoes/R-B-O6R-02-ciclo3-premissa.md` (cabecalho conforme protocolo), com PD ≥5 fontes em `docs/omega-pd.md` (l.636). A exigencia historica do meu §2.2 esta cumprida.
- O que NAO existe e o ataque do `critico-c5-adversarial` **ao plano deste ciclo como emendado** — que o plano que governa a junta poe em **S1, antes do codigo** (§8) e mantem DE PROPOSITO: E1.2, "Permanece porque este E bloco de invariante (§C7.1-ter(b), ultima frase)". O §C7.1-ter(b) do CLAUDE.md faz desse ataque a regra nos blocos de invariante — e este e O bloco de invariante financeiro da rodada.
- A licao institucional e medida, nao teorica: no Ω5P PR-03 (tarifas), foi o critico-adversarial que pegou **3 defeitos de cobranca que dba+avaliador nao viram** — dai "critico-adversarial obrigatorio em PR de invariante financeiro".

**Por que bloqueio em vez de ressalvar:** (i) sou fail-closed — insumo que o plano vigente torna obrigatorio e que nao existe nao vira "provavelmente ok"; ressalva tornaria consultivo o que a norma tornou mandatorio, e ninguem re-verificaria antes do voto. (ii) O argumento do teto corta ao CONTRARIO da opcao (c): justamente porque nao ha ciclo 6, o voto desta junta precisa do peso maximo — julgar no teto um plano nunca atacado e a combinacao mais cara possivel da classe que ja custou 2 ciclos no Ω5P. (iii) O custo do conserto e o menor de todo este parecer: uma passada de um agente NAO-votante (max. 2 rodadas por mandato), corpo ja instalado e conferido por hash (M4), sem mudanca de codigo, sem commit, sem re-terraplanagem — e minha segunda passada e barata, porque M1–M11 permanecem validos se nada mais se mover.

O critico atacar um plano ja executado nao e inutil: achado dele vira medicao extra das cadeiras, pendencia nomeada, ou — se derrubar a premissa — exatamente o que o teto existe para expor antes do dossie ao dono.

---

# VEREDITO: **BLOQUEADO** (1 item; conserto barato; re-chamada expressa)

## O item sujo, com a evidencia e o que o limpa

**B1 — Falta o parecer do `critico-c5-adversarial` sobre o plano como emendado.**
- *Evidencia:* briefing §3 declara AUSENTE; §5 confirma que o bloco foi do S0 ao F6 sem a passada S1; nenhum arquivo de parecer do critico existe em `omega/juntas/` ou `omega/reprovacoes/` para o ciclo 5 (grep M5 — o nome so aparece em plano/briefing).
- *O que limpa (nomeio, nao conserto):* o parecer do `critico-c5-adversarial` (nao-votante, corpo `dc17357…` conferido — o terreno para roda-lo JA esta pronto) sobre **o plano como emendado por inteiro** — corpo + ERRATA S0 + EMENDA + E1 (com E1.10) + E3/E4 **+ o terreno pos-absorcao com o ruling do CP-1** (que emendou E3.3 depois dos apensos) — max. 2 rodadas conforme E1.2, gravado incrementalmente (P1) e anexado ao briefing como insumo. Feito isso, **me chamem de novo**: revalido em passada curta (M1/M4/M8 re-medidos + o parecer novo presente) e, mantido o quadro, o veredito da re-passada sera `LIBERADO COM RESSALVA` com as R1–R4 abaixo.

## As ressalvas que valerao na re-passada (numeradas, para o briefing dos jurados)

- **R1 — Acumulacao de papeis (M11):** convocante = autor de F4–F6, por ordem do dono registrada (§A2, diario l.650). A ata consigna papel a papel; instrucao do orquestrador a jurado durante o voto = insumo suspeito, registrado.
- **R2 — Mutacao viva deliberada na arvore principal (M4):** 2 ` M` + 6 `??` em `.claude/agents/especialistas/`, verbatim da linhagem (hash 8/8), reversivel por edicao inversa. NINGUEM roda `checkout/stash/clean/reset` na arvore principal ate a junta fechar; destino (commit ou reversao) registrado no fechamento do bloco.
- **R3 — Espelho Codex de `especialistas/` divergente, classe `pre-existente` (M6):** `--check` ec=1 nas duas arvores; origem provada na main publicada (`f895dd2`: 8 corpos em `.claude/`, ZERO em `.agents/`); fora do escopo §5 do bloco. Precisa de pendencia com dono nomeado (a `P-SYNC-AGENTS-NAO-RECURSIVO` cobre a nao-recursao — JA CORRIGIDA no script — mas nao cobre os 8 espelhos ausentes). Nota aos jurados: a frase do E1.6 "o check nao enxerga especialistas" envelheceu — o script e recursivo nas duas arvores; nao herdem.
- **R4 — Vizinhanca viva (M8):** cluster `dev-c2-pg` (porta 15432) e worktrees `b07`/`dev-c2b-red` com mutacao propria pertencem ao `B-O6R-07` em voo. Nenhum jurado toca neles; porta de cluster novo medida por `netsh ... excludedportrange` e distinta de 15432/5432/6379; lock de git = paciencia (§11.11).

## Linha de limpeza do inspetor

Criei para medir: 3 arquivos em `/tmp` (`sync-check-out.txt`, `sync-check-wt.txt`, `npm-check-c5.txt`) — removidos ao fim; **nenhum** container, worktree, branch ou cluster criado; nenhum comando a `erp-postgres`/`erp-redis`; worktree do bloco conferido limpo ANTES e DEPOIS da unica execucao (`npm run check`); unico arquivo novo no repo = este parecer (entregavel). `sed -i`/`git archive`/heredoc-com-aspas: nao usados em rastreado.
