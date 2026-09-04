# J-B-O6R-ARNES — ata da junta · bloco `B-O6R-ARNES` (arnês de teste)

> **VEREDITO: APROVADO por maioria — 3 APROVADO · 0 REPROVADO · 0 voto perdido.** Nenhum veto efetivo.
> Head julgado **`d4cf978`** (PR #359, base `origin/main` = `6efe5ad`); head final após as correções que
> a própria junta exigiu: **`0c37fa2`**. Junta concluída em **2026-08-28**.
> Votos verbatim em `votos/B-O6R-ARNES/01`–`03`; pareceres do inspetor em `00a` e `00b`.
>
> **A primeira junta sob `D-JUNTA-ESCOPO-E-CALIBRACAO`** — e ela funcionou como desenhada: **11 achados,
> zero `bloqueia`**. Os cinco achados de classe **`pre-existente`** viraram **pendências nomeadas com dono**
> em vez de derrubar o bloco. É exatamente o que faltou ao `B-O6R-02` no ciclo 4.

## 1. O que este bloco fez

A classe do arnês de teste saiu do `B-O6R-02` por decisão do dono (`D-JUNTA-ESCOPO-E-CALIBRACAO` §5) e
fechou sozinha, primeiro. O financeiro fora reprovado no ciclo 4 por um defeito que **não criou e estava
proibido de consertar**: `tests/audit-security.test.ts` é de 08/06, `tests/helpers/auth-identity-fixture.ts`
nasceu no bloco anterior em 19/08, e a branch do financeiro começou em 20/08.

**Três entregas**, todas provadas por execução com vermelho-controle medido antes:

| | O quê | Medido |
|---|---|---|
| 1 | **Mecanismo único** de escrita de catálogo — os três últimos escritores fora do `withRoleCatalogLock` entraram | serialização **parcial não protegia nem os serializados**: as vítimas do `XX000` incluíam `rls-tenant-isolation` e `auth-identity-backfill-db`, que **tomavam** o lock |
| 2 | **Teardown que não deixa papel vivo** — resiliente por statement, **ruidoso**, com segunda tentativa da sequência inteira (armadilha `2BP01`) | mata os dois anti-padrões opostos: a sequência sem catch e o `.catch(() => undefined)` |
| 3 | **Piso de denominador** no runner — arquivo que termina sem registrar teste e sem declarar skip fica **vermelho e nomeado** | antes: `ec=0` com o guard mudo |

**O número que o bloco existia para consertar:** canônica 3 em **10 rodadas idênticas** — `2597 · 2595 ·
fail 0 · skip 2 · ec 0`, **`XX000` zero** e **Δpapéis zero**. O ciclo 4 do financeiro media 7/10 verdes e
deixava 2 papéis órfãos com escrita em todas as 115 tabelas, inclusive `financial_entries`.

## 2. Composição e papéis (§C7.4-bis — ata sem isto = ciclo inválido)

| Papel | Quem | Elegibilidade |
|---|---|---|
| **Planejador** | `planejador-mestre`, instância nova, Fable por contrato — plano em `9b3b5d1` | não desenvolveu, não votou |
| **Desenvolvedor** | instância `general-purpose` designada pelo orquestrador em 2026-08-28 — commits `c6ae7fa`→`d4cf978` | não planejou, não votou |
| **Inspetor de terreno** | `inspetor-de-terreno-da-junta`, 2 instâncias (1ª BLOQUEADO, 2ª LIBERADO COM RESSALVA) | não vota, não conserta |
| **Fábrica** | `agente-fabrica` — 5 agentes em `e74b469`, mais o titular da cadeira 1 em `bd0d700` | — |
| **Cadeira · catálogo/arnês (veto)** | `jurado-arnes-catalogo-postgres` | identidade nova; 0 colisões nas atas |
| **Cadeira · runner/denominador** | `jurado-arnes-runner-denominador` | identidade nova |
| **Cadeira · diff/escopo/registro (veto)** | `jurado-arnes-diff-escopo-registro` | identidade nova |
| **Suplentes nomeados antes do início** | `jurado-arnes-suplente-{catalogo-postgres, runner-denominador, diff-escopo-registro}` | nenhum precisou entrar |
| **Achador (origem do bloco)** | `jurado-c4-suplente-arnes-concorrente`, do ciclo 4 do `B-O6R-02` | **inelegível** aqui |
| **Orquestrador** | sessão `503c6f08` / `erp-techsolutios-a6` | — |

**Sem `critico-adversarial`:** a regra nova o reserva para blocos de invariante. O bloco toca só `tests/` e
`scripts/`; o diff contra a base em `src/`, `prisma/`, `.github/`, `CLAUDE.md`, `AGENTS.md`, `frontend/`,
`mobile/` e lockfiles é **vazio**, conferido pelo orquestrador, pelo inspetor e pela cadeira 3.

**Substituição da cadeira 1 (ressalva R-A do inspetor), consignada:** o §13.1 do plano nomeava
`jurado-c5-arnes-catalogo-postgres`. O inspetor **BLOQUEOU** na 1ª passada: o corpo dele é o contrato de
**outra junta** — mandato do ciclo 5 do `B-O6R-02`, drills `D26/D26b`, head de outro bloco, e **formato de
voto sem o campo `escopo`**. Sob a regra "escopo sem evidência = `dentro-do-bloco`", uma cadeira **com veto**
sem o campo produziria votos capazes de reprovar este bloco por achado pré-existente — **a classe de defeito
que criou este bloco**. Erro de montagem do orquestrador, apanhado pelo gate. O titular novo nasceu em
`bd0d700`; `jurado-c5-arnes-catalogo-postgres` ficou **intocado e reservado** para a junta do ciclo 5.

### As três perguntas do §C7.4-bis

**(a) A composição cobre a competência que o achado exige?** Sim — catálogo Postgres sob `node --test`
paralelo, runner/denominador e diff/escopo/registro cobrem as classes do achado do ciclo 4 e as propriedades
PA–PG do plano. A cadeira que o achado central exigia (catálogo) foi a que mediu mais fundo.

**(b) Quem achou o defeito é quem o consertou?** Não. O achador é do ciclo 4 do financeiro e é inelegível
aqui; planejador, dev e jurados são identidades distintas. **Mas houve um caso a registrar:** o dev achou e
consertou **dois defeitos próprios** (`14fb8fb`, `1676a5b`). Foi honesto reportá-los, e por isso o briefing
mandou tratá-los como **sinal, não absolvição** — as três cadeiras verificaram se a classe do
`.catch(() => undefined)` morreu ou mudou de lugar, e se o piso foi exercitado com fixture **dentro e fora**
do repositório. Verificado: a classe morreu no escopo do bloco; o resíduo dela **fora** do escopo virou
achado `pre-existente` (cadeira 1, achado 3).

**(c) O planejador estava usando dado podre?** Não no essencial — o plano previa 5/13 vermelhas na bateria
barata pré-correção; o dev mediu 7/13 e a cadeira 1 mediu 3/13. **A divergência foi resolvida por execução
pela própria cadeira**, e não a favor de ninguém: a classe reproduz nas três medições, a frequência varia com
interleaving e carga, **0/13 nunca ocorreu** (o controle vale), e o controle do dev era **mais** vermelho que
o do jurado — logo não infla o resultado pós-correção. Duas imprecisões do plano viraram achados de `nota`
(o "260 arquivos" é do head financeiro; esta base tem 247).

## 3. Os 11 achados — a regra nova em operação

**Zero `bloqueia`.** Nenhum veto efetivo (veto só derruba com `bloqueia` **e** `dentro-do-bloco`).

### `dentro-do-bloco` — corrigidos ANTES do merge, com a evidência da própria junta (`0c37fa2`)

| Cadeira | Achado | Correção |
|---|---|---|
| runner (`ajuste`) | A canônica 1 publicava denominador **2358**; re-execução no head final deu **2359 idêntico em N=3**. O 2358 era medição de commit intermediário, antes de `1676a5b` acrescentar um caso | número corrigido nos três registros |
| catálogo (`ajuste`) | O registro dizia **"6 arquivos"** na bateria barata; nenhuma combinação de 6 que contenha as vítimas nomeadas fecha o denominador 37 — são **sete** | a **lista exata** dos 7 arquivos com a contagem de cada um passou a constar: *a lista é parte da FORMA, e sem ela o 37 não é reproduzível por terceiro* — que é a própria propriedade P8 que o bloco declara |

### `dentro-do-bloco` — `nota`, sem ação neste PR

- **`Kpis/app.js` fora da lista fechada da §5** (1 linha, a `var FROZEN`): o §5 lista os quatro artefatos de
  KPI e omite o arquivo onde a cópia congelada mora, embora o guard permanente a exija. O dev declarou a
  divergência antes de consolidar (§A2); a cadeira 3 a julgou legítima. **O §5 do próximo plano de KPI
  precisa incluí-lo.**
- **O "260 arquivos" do §11 do plano** é a contagem do head financeiro; esta base tem **247**.
- **Resíduo de morte dura (SIGKILL)** de papel de família registrada sobrevive até 60 min antes de o sweep
  alcançá-lo — o varredor depende do relógio, não do teardown de quem morreu.

### `pre-existente` — **não reprovaram**; viraram pendências nomeadas com dono

| Achado | Dono |
|---|---|
| **Vazamento linear de +10 linhas por rodada verde** (+5 `auth_identities`, +5 `auth_identity_link_events`) — atribuído por execução isolada a `core-saas-prisma` (+4/+4) e `core-saas-role-authority-db` (+1/+1); a aritmética fecha sem resíduo sem dono; produtores de 27/05 e 19/08, **anteriores ao bloco** e nominalmente PROIBIDOS na §5 | `P-ARNES-VAZAMENTO-LINEAR-IDENTIDADES` · `B-O6R-02` ciclo 5 |
| **`tests/rls-tenant-isolation.test.ts` continua com teardown não-resiliente** e a família `rls_test_` está fora do sweep — se o `DROP OWNED` falhar, a role fica viva e nada a recolhe | `P-ARNES-RLS-TEST-FORA-DO-SWEEP` |
| **Nenhum dos 3 escritores assevera a identidade da conexão** (`current_user`/`rolsuper`/`rolbypassrls`) dentro do próprio teste | pendência nova, bloco de arnês seguinte |
| **Vermelho intermitente do `authority-portal.test.ts:162`** (scrypt round-trip) em 1 de 2 rodadas da suíte inteira — fora da classe deste bloco | pendência nova, a atribuir |
| **Vermelho ambiental da canônica 1** (`core-saas-role-authority.test.ts` aborta sem `DATABASE_URL`) | `P-ARNES-CANONICA1-VERMELHO-AMBIENTAL` |

**É esta linha que muda a rodada.** No ciclo 4 do financeiro, um achado desta natureza — pré-existente, fora
do escopo permitido do bloco — derrubou a entrega inteira e custou nove dias. Aqui, cinco deles foram
registrados com dono e o bloco seguiu.

## 4. O que as cadeiras executaram (resumo; verbatim nos votos)

- **Catálogo:** vermelho-controle próprio na base (N=13, com o `statement:linha` e o objeto de catálogo de
  **cada** vermelho nomeados por execução — `pg_namespace.nspacl` do schema `public`); D37 pós (13/13, 0
  `XX000`, denominador 37 idêntico, `roles=1` após cada rodada); **D42 canônica 3 N=10** com snapshot completo
  de papéis, grants, linhas das 115 tabelas e conexões antes e depois de **cada** rodada; D38 (sem o lock de
  um lado: **81 ocorrências** de `XX000` em N=50 — `0/50` teria sido drill inconclusivo); D39 (`MAX_DROP_ATTEMPTS`
  2→1: o papel **sobrevive** e o teardown **lança nomeando** — as duas metades do aceite); D43 (sweep recolhe
  só as órfãs velhas de família registrada e **reporta**; `zzz_probe_` e a de timestamp novo **intocadas**).
  **Pegou a armadilha do ciclo 4:** os 2 "hits" de `XX000` por rodada no grep são o **nome do teste** da
  sonda, não erro — o mesmo "err=2" que enganou uma medição anterior.
- **Runner:** D40 com fixture **dentro e fora** do repositório (era a fixture fora que cegara o drill do dev);
  D41 nas duas pontas com o porte conferido verbatim contra os blobs; assinatura TAP por fixture própria;
  caça a falso-positivo; canônicas 1 e 2 re-medidas com N e forma.
- **Diff/escopo/registro:** os quatro diffs vazios contra a base; a lista de 14 arquivos contra a §5; a
  allowlist do ratchet provada **por mutação**; os pisos §6 contados por execução; o KPI com `mvp_*` intocados;
  e o julgamento das duas divergências que o dev declarou.

## 5. Terreno e limpeza

Inspetor em duas passadas (`00a` BLOQUEADO, `00b` LIBERADO COM RESSALVA). Cada cadeira usou worktree próprio
com `npm ci` próprio (**junction proibida**) e cluster Postgres descartável em porta própria. Ao fim:
`git worktree list` sem nenhum `jur-arnes-*` e `docker ps -a` só com a base viva — **teardown completo,
conferido pelo orquestrador**. A base viva `erp-postgres`/`erp-redis` nunca foi alvo de ninguém.

## 6. Registro

Head aprovado `d4cf978`; head final `0c37fa2` (correções de **registro apenas** — `git diff` em `tests/`,
`scripts/`, `src/`, `prisma/` e `Kpis/app.js` **vazio**), exigidas pela própria junta e aplicadas com a
evidência dela. PR #359. `merge_commit` e `approved_head` recebem backfill pós-merge (§C3.5).
