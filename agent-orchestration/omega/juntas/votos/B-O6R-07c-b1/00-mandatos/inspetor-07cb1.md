# Mandato — Inspetor de terreno da junta — B-O6R-07c-b1 (PR 440, junta, ciclo 1)

## MEDIDO

Estado do PR 440 pela ferramenta do B-GOV-MANDATO, extraida sem edicao de origin/chore/mandato-refs-e-preflight para a pasta mandatos-07cb1 do scratchpad do redator e executada a partir de C:/Users/AMP/w-07cb1, medido por: `bash <scratch-do-redator>/mandato-refs.sh 440`
```
# refs do PR #440 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-17T03:25Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/o6r07cb1-despacho-atribui
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      b198fe358b41186b2598ab258ccb735da8c04cbc
merge-base:      4fe7524ecbcc68b3e69336453cc774ed5937cb1c
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #440
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)

```

Os arquivos que o ramo muda contra a base dele (merge-base com origin/main), 28 no total, medido por: `git diff --name-only "$(git merge-base origin/main HEAD)" HEAD | paste -sd" "`
```
.agents/agents/especialistas/jurado-07cb1-c1-escopo-e-rbac.md .agents/agents/especialistas/jurado-07cb1-c2-mobile-e-conflito.md .agents/agents/especialistas/jurado-07cb1-c3-despacho-censo-persistencia.md .claude/agents/especialistas/jurado-07cb1-c1-escopo-e-rbac.md .claude/agents/especialistas/jurado-07cb1-c2-mobile-e-conflito.md .claude/agents/especialistas/jurado-07cb1-c3-despacho-censo-persistencia.md docs/revisoes/SAN3/B-O6R-07c-b1-dev.md prisma/migrations/20260877000000_backfill_work_order_assignment_from_active_dispatches/migration.sql src/modules/checklists/checklist.controller.ts src/modules/checklists/checklist.service.ts src/modules/field-dispatch/field-dispatch-prisma.repository.ts src/modules/field-dispatch/field-dispatch.repository.ts src/modules/field-dispatch/field-dispatch.service.ts src/modules/mobile/mobile-checklist-sync.ts src/modules/mobile/mobile-evidence-sync.ts src/modules/mobile/mobile-evidence-upload.ts src/modules/mobile/mobile-work-order-sync.ts src/modules/work-orders/work-order-prisma.repository.ts src/modules/work-orders/work-order.repository.ts src/modules/work-orders/work-order.service.ts src/modules/work-orders/work-order.types.ts tests/fixtures/o6r07c-classificacao-vias.json tests/helpers/o6r07c-census.ts tests/o6r07c-b-scope-db.test.ts tests/o6r07c-b-scope.test.ts tests/o6r07c-census-guard.test.ts tests/o6r07c-subresource-scope.test.ts tests/san3-05-acessos-de-plataforma-guard.test.ts
```

As decisoes do dono que a junta aplica, por linha de agent-orchestration/controle/decisoes.md no objeto, em origin/main e em origin/docs/registro-17-10 (o ramo do PR 441, ABERTO e ainda nao mesclado na main), medido por: `O=b198fe358b41186b2598ab258ccb735da8c04cbc; f=agent-orchestration/controle/decisoes.md; for r in $O origin/main origin/docs/registro-17-10; do for id in D1-07c D2-07c D-07CB-EMENDA-RECOMENDACOES D-DESP-INICIO-ATENDIMENTO D-INICIO-ATENDIMENTO-CONFIRMADO D-07CB1-TRAVA-ATE-B2 D-07CB1-DESPACHO-OS-ENCERRADA D-07CB1-TECNICO-SEM-ATIVAR-RASCUNHO D-GEMINI-PRO-API-TETO D-BRACOS-E-DOCKER-17-10; do n=$(MSYS_NO_PATHCONV=1 git show "$r:$f" | grep -n -i -e "$id" | cut -d: -f1 | head -3 | paste -sd,); echo "$r $id: ${n:-ausente}"; done; done`
```
b198fe358b41186b2598ab258ccb735da8c04cbc D1-07c: 3166,3424,3654
b198fe358b41186b2598ab258ccb735da8c04cbc D2-07c: 3171,3425,3655
b198fe358b41186b2598ab258ccb735da8c04cbc D-07CB-EMENDA-RECOMENDACOES: 3658
b198fe358b41186b2598ab258ccb735da8c04cbc D-DESP-INICIO-ATENDIMENTO: ausente
b198fe358b41186b2598ab258ccb735da8c04cbc D-INICIO-ATENDIMENTO-CONFIRMADO: ausente
b198fe358b41186b2598ab258ccb735da8c04cbc D-07CB1-TRAVA-ATE-B2: ausente
b198fe358b41186b2598ab258ccb735da8c04cbc D-07CB1-DESPACHO-OS-ENCERRADA: ausente
b198fe358b41186b2598ab258ccb735da8c04cbc D-07CB1-TECNICO-SEM-ATIVAR-RASCUNHO: ausente
b198fe358b41186b2598ab258ccb735da8c04cbc D-GEMINI-PRO-API-TETO: ausente
b198fe358b41186b2598ab258ccb735da8c04cbc D-BRACOS-E-DOCKER-17-10: ausente
origin/main D1-07c: 3166,3424,3654
origin/main D2-07c: 3171,3425,3655
origin/main D-07CB-EMENDA-RECOMENDACOES: 3658
origin/main D-DESP-INICIO-ATENDIMENTO: ausente
origin/main D-INICIO-ATENDIMENTO-CONFIRMADO: ausente
origin/main D-07CB1-TRAVA-ATE-B2: ausente
origin/main D-07CB1-DESPACHO-OS-ENCERRADA: ausente
origin/main D-07CB1-TECNICO-SEM-ATIVAR-RASCUNHO: ausente
origin/main D-GEMINI-PRO-API-TETO: ausente
origin/main D-BRACOS-E-DOCKER-17-10: ausente
origin/docs/registro-17-10 D1-07c: 3166,3424,3654
origin/docs/registro-17-10 D2-07c: 3171,3425,3655
origin/docs/registro-17-10 D-07CB-EMENDA-RECOMENDACOES: 3658,3719
origin/docs/registro-17-10 D-DESP-INICIO-ATENDIMENTO: 3699,3709
origin/docs/registro-17-10 D-INICIO-ATENDIMENTO-CONFIRMADO: 3719
origin/docs/registro-17-10 D-07CB1-TRAVA-ATE-B2: 3709,3719
origin/docs/registro-17-10 D-07CB1-DESPACHO-OS-ENCERRADA: 3710
origin/docs/registro-17-10 D-07CB1-TECNICO-SEM-ATIVAR-RASCUNHO: 3711
origin/docs/registro-17-10 D-GEMINI-PRO-API-TETO: 3715,3723
origin/docs/registro-17-10 D-BRACOS-E-DOCKER-17-10: 3716
```

O texto de origin/docs/registro-17-10 que substitui a P3 da emenda (o atendimento iniciado comeca em "No local"), medido por: `MSYS_NO_PATHCONV=1 git show origin/docs/registro-17-10:agent-orchestration/controle/decisoes.md | sed -n 3719p`
```
- **`D-INICIO-ATENDIMENTO-CONFIRMADO` (decisão do dono, 2026-10-17, ~02:45Z).** Perguntado sobre o conflito `P-CONFLITO-INICIO-ATENDIMENTO` (15/10 dizia `on_route`; 17/10, "No local"), o dono respondeu: ***"no local..."***. O "atendimento iniciado" começa em **No local** e **substitui a P3 de `D-07CB-EMENDA-RECOMENDACOES`** nesse ponto. A trava do #440 (`D-07CB1-TRAVA-ATE-B2`) já implementa isto; o `B-O6R-07c-b2` também segue "No local".
```

A governanca que a emenda de 15/10 fixa para este bloco, medido por: `sed -n 84,87p docs/revisoes/SAN3/B-O6R-07c-b-emenda-2026-10-15.md`
```
Bloco de permissão: **junta completa** (inspetor de terreno, 3 cadeiras, unanimidade com veto).
- C1: escopo por objeto e RBAC (403/404, união de papéis, superior e segregação).
- C2: mobile/offline e conflito (contratos de sync, idempotência).
- C3: despacho e atribuição, Traccar, censo/T11 e persistência (se o prisma for autorizado).
```

Os corpos das tres cadeiras no objeto sao os do disco do worktree do dev, nos dois espelhos, por md5 EOL-neutro (o valor do md5 vai no disparo, nao aqui: fronteira 22 do pre-voo), medido por: `O=b198fe358b41186b2598ab258ccb735da8c04cbc; for c in c1-escopo-e-rbac c2-mobile-e-conflito c3-despacho-censo-persistencia; do for d in .claude .agents; do p=$d/agents/especialistas/jurado-07cb1-$c.md; a=$(MSYS_NO_PATHCONV=1 git show "$O:$p" | tr -d "\r" | md5sum); b=$(tr -d "\r" < "$p" | md5sum); [ "$a" = "$b" ] && echo "$p objeto x disco: IDENTICO" || echo "$p objeto x disco: DIVERGE"; done; done`
```
.claude/agents/especialistas/jurado-07cb1-c1-escopo-e-rbac.md objeto x disco: IDENTICO
.agents/agents/especialistas/jurado-07cb1-c1-escopo-e-rbac.md objeto x disco: IDENTICO
.claude/agents/especialistas/jurado-07cb1-c2-mobile-e-conflito.md objeto x disco: IDENTICO
.agents/agents/especialistas/jurado-07cb1-c2-mobile-e-conflito.md objeto x disco: IDENTICO
.claude/agents/especialistas/jurado-07cb1-c3-despacho-censo-persistencia.md objeto x disco: IDENTICO
.agents/agents/especialistas/jurado-07cb1-c3-despacho-censo-persistencia.md objeto x disco: IDENTICO
```

O modelo de mandato do CLAUDE.md secao C7.7, verbatim no objeto, medido por: `MSYS_NO_PATHCONV=1 git show b198fe358b41186b2598ab258ccb735da8c04cbc:CLAUDE.md | sed -n 693,700p`
```
   Após CADA item: apense a <cadeira>-evidencia.md → comando · saída resumida · veredito parcial.  [P1]
   Antes da mensagem final: escreva <cadeira>-voto.json. Mensagem final = 1 linha apontando o arquivo.  [P2]
   Máximo 3 itens; logs longos só no arquivo de evidência.  [P4]
   Se você substituir um caído: re-execute cada comando do <cadeira>-evidencia.md dele e compare, depois
   meça a cauda. Conclusão sem comando registrado NÃO é insumo.  [P3]
   Se receber PAUSA: termine o comando em curso, grave `## PAUSA <hora UTC>` em <cadeira>-evidencia.md
   (head · feito · falta · próximo comando · arquivos meio-escritos) e pare sozinho com 1 linha apontando
   o arquivo. Não inicie item novo.  [P7]
```

Os worktrees que existem agora com os nomes deste tabuleiro ou do bloco vizinho (w-j07cb1c<N> e w-insp-07cb1 aparecem aqui se ja tiverem sido criados; o numero da cadeira sai entre sinais de menor e maior porque a checagem 4 do pre-voo leria o nome como SHA), medido por: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree list | grep -i -E "w-07cb1|w-j07cb1|w-insp-07cb1|w-arnes2" | awk "{print \$1, \$3, \$4}" | sed -E "s,[[:space:]]+\$,,; s,(w-j07cb1c)([0-9]),\1<\2>,"`
```
C:/Users/AMP/w-07cb1 [fix/o6r07cb1-despacho-atribui]
C:/Users/AMP/w-arnes2 [fix/arnes-2-testes-instaveis]
```

A arvore do dev (C:/Users/AMP/w-07cb1) esta no objeto e as linhas que o git status lista, fora os 5 arquivos nao rastreados desta junta (mandatos e quedas), sao so de fim de linha, medido por: `echo "porcelain=$(git status --porcelain | wc -l) conteudo_sem_CR=$(git diff --ignore-cr-at-eol --name-only | wc -l) nao_rastreados=$(git status --porcelain --untracked-files=all | grep -i -c "^??")"; git rev-parse HEAD`
```
porcelain=56 conteudo_sem_CR=0 nao_rastreados=5
b198fe358b41186b2598ab258ccb735da8c04cbc
```

Docker agora: grupos de trabalho vivos com prefixo tl ou j (o limite da casa e 3 trabalhos), e containers erp- (base viva) ou j07cb1- de pe, medido por: `echo "grupos_tl_ou_j=$(timeout 30 docker ps --format "{{.Names}}" | grep -i -E "^(tl|j)" | cut -d- -f1 | sort -u | wc -l) erp_ou_j07cb1=$(timeout 30 docker ps --format "{{.Names}}" | grep -i -c -E "^(erp-|j07cb1-)")"; df -h /c | tail -1; date -u +%Y-%m-%dT%H:%MZ`
```
grupos_tl_ou_j=0 erp_ou_j07cb1=2
C:              238G  226G   13G  95% /c
2026-10-17T03:26Z
```

O corpo do inspetor fixa o modelo, e e o mesmo no objeto e na origin/main nos dois espelhos, medido por: `O=b198fe358b41186b2598ab258ccb735da8c04cbc; for p in .claude/agents/inspetor-de-terreno-da-junta.md .agents/agents/inspetor-de-terreno-da-junta.md; do MSYS_NO_PATHCONV=1 git show "$O:$p" | grep -n -i "^model:"; a=$(MSYS_NO_PATHCONV=1 git show "$O:$p" | tr -d "\r" | md5sum); b=$(MSYS_NO_PATHCONV=1 git show "origin/main:$p" | tr -d "\r" | md5sum); [ "$a" = "$b" ] && echo "$p objeto x origin/main: IDENTICO" || echo "$p objeto x origin/main: DIVERGE"; done`
```
5:model: opus
.claude/agents/inspetor-de-terreno-da-junta.md objeto x origin/main: IDENTICO
4:model: opus
.agents/agents/inspetor-de-terreno-da-junta.md objeto x origin/main: IDENTICO
```

O que o contrato na origin/main diz do Gemini, e a regra de segundo revisor, medido por: `MSYS_NO_PATHCONV=1 git show origin/main:CLAUDE.md | sed -n 558,562p; MSYS_NO_PATHCONV=1 git show origin/main:agent-orchestration/controle/decisoes.md | grep -n -i -e "D-GEMINI-SEGUNDO-REVISOR. (decis" | cut -c1-60`
```
   **Gemini, pelo Antigravity** (declaração do dono, 2026-10-13, `D-GEMINI-PRO-NIVEL-CODEX`; e decisão do dono,
   2026-10-14, `D-GEMINI-SEGUNDO-REVISOR`): o **Gemini Pro** equivale ao nível menor e só entra pela assinatura, sem
   faturamento novo. **Leitura do orquestrador, declarada (§A6):** o **Gemini Flash** fica abaixo do nível menor e não
   ocupa cadeira, inspetor, porteiro nem dev de bloco de risco. Como revisor de PR, o Gemini entra **só como segundo
   revisor**, e o achado dele é conferido antes de valer; e não faz design (`D-DESIGN-SO-CLAUDE`).
3636:- **`D-GEMINI-SEGUNDO-REVISOR` (decisão do dono, 2026-
```

## HIPOTESE

O papel e o inspetor-de-terreno-da-junta (contrato secao C7.1-bis, fail-closed), instancia nova para a junta de PERMISSAO do bloco
  B-O6R-07c-b1 (PR 440, ciclo 1, o ultimo P0 do Omega6R), rodando no Claude Code em Claude Opus, no nivel menor (o corpo fixa
  model: opus, medido acima), declarado no parecer; usa o corpo .claude/agents/inspetor-de-terreno-da-junta.md do objeto e declara na
  1a linha do parecer o papel, o nome da instancia, o modelo, o mandato_md5 deste arquivo e o md5 EOL-neutro do corpo; nao julga
  merito e nao vota derruba com: `head -1 C:/Users/AMP/w-07cb1/agent-orchestration/omega/juntas/votos/B-O6R-07c-b1/insp-07cb1-parecer.md | grep -ic 'mandato_md5'` (novo)

O objeto e o head do PR 440 resolvido pelo proprio inspetor por git ls-remote e por gh pr view, so com os check-runs CONCLUIDOS
  (gh api da lista de check-runs do commit; ausencia, queued, in_progress ou cancelled bloqueia o start; vermelho e insumo do voto);
  os insumos estao na ref: o plano docs/revisoes/SAN3/B-O6R-07c-plano.md, a emenda
  docs/revisoes/SAN3/B-O6R-07c-b-emenda-2026-10-15.md (governanca nas linhas 84-87), o relatorio do dev
  docs/revisoes/SAN3/B-O6R-07c-b1-dev.md e os tres corpos nos dois espelhos derruba com: `grep -ic 'check-run' C:/Users/AMP/w-07cb1/agent-orchestration/omega/juntas/votos/B-O6R-07c-b1/insp-07cb1-parecer.md` (novo)

As decisoes do dono de 17/10 que a junta aplica (D-DESP-INICIO-ATENDIMENTO, D-INICIO-ATENDIMENTO-CONFIRMADO, D-07CB1-TRAVA-ATE-B2,
  D-07CB1-DESPACHO-OS-ENCERRADA, D-07CB1-TECNICO-SEM-ATIVAR-RASCUNHO, D-GEMINI-PRO-API-TETO, D-BRACOS-E-DOCKER-17-10) estao escritas
  so em origin/docs/registro-17-10 (PR 441, aberto), ref empurrada, e valem como fonte 1 (secao A1); o inspetor confere isso por
  conta propria e registra no parecer duas tensoes (secao A2), sem resolve-las: a P3 da D-07CB-EMENDA-RECOMENDACOES (on_route) foi
  SUBSTITUIDA pela D-INICIO-ATENDIMENTO-CONFIRMADO ("No local", linha 3719 do registro, medida acima); e a D-GEMINI-PRO-API-TETO
  (API com teto de US$ 5) diverge do texto do CLAUDE.md na origin/main, linhas 558-562 ("so entra pela assinatura, sem
  faturamento novo"), medido acima derruba com: `grep -ic 'registro-17-10' C:/Users/AMP/w-07cb1/agent-orchestration/omega/juntas/votos/B-O6R-07c-b1/insp-07cb1-parecer.md` (novo)

O tabuleiro tem tres cadeiras de identidade nova, cada uma com o seu executor, todos no nivel menor e declarados: C1
  jurado-07cb1-c1-escopo-e-rbac no Codex em GPT-5.6 Sol esforco medio, a partir de cerca de 04:15Z (quando o limite do Codex
  renova, segundo o orquestrador); C2 jurado-07cb1-c2-mobile-e-conflito no Gemini 3.1 Pro pelo Gemini CLI, com teto de US$ 5
  (D-GEMINI-PRO-API-TETO) e sob a D-GEMINI-SEGUNDO-REVISOR (o achado do Gemini e conferido antes de valer); C3
  jurado-07cb1-c3-despacho-censo-persistencia no Claude Code em Claude Opus 5.5; os corpos estao rastreados no objeto nos dois
  espelhos e o S0 fica verde (node scripts/sync-agent-agents.mjs --check, rodado no worktree do inspetor); corpo carregado e corpo
  julgado conferidos de forma EOL-neutra contra o md5 que o orquestrador publica no disparo derruba com: `grep -ic 'sync-agent-agents' C:/Users/AMP/w-07cb1/agent-orchestration/omega/juntas/votos/B-O6R-07c-b1/insp-07cb1-parecer.md` (novo)

A inelegibilidade e conferida POR NOME contra a lista dos tres corpos e contra
  agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md: inelegiveis o planejador-b-o6r-07c e o autor da emenda de 15/10; os
  devs dev-b-o6r-07c-b1-argon e dev-b-o6r-07c-b1-opus e sucessores; o critico-adversarial da critica do b1, o critico-b-o6r-07c-r1 e
  o critico-b-o6r-07c-r2; os achadores coordenador-de-acessos, guardiao-fail-closed, jurado-b07a-autorizacao-e-alcada,
  jurado-b07a-c2-autorizacao-s e quem achou o Omega6R-SEC-002; as cadeiras da junta do 07c-a (jurado-07ca-c1-escopo-por-objeto,
  jurado-07ca-c2-censo-e-guard, jurado-07ca-c3-regressao-escopo) e quem as substituiu; o porteiro-pos-merge, a agente-fabrica, o
  orquestrador e este redator (redator-mandatos-07cb1-opus); nenhuma cadeira ocupa mais de um papel derruba com: `grep -ic 'inelegib' C:/Users/AMP/w-07cb1/agent-orchestration/omega/juntas/votos/B-O6R-07c-b1/insp-07cb1-parecer.md` (novo)

O terreno: a arvore C:/Users/AMP/w-07cb1 e a do dev e so recebe os arquivos de saida da junta (o inspetor confere que nenhum
  processo vivo do dev escreve nela e que o conteudo segue igual ao objeto); C:/Users/AMP/w-arnes2 e qualquer w-arnes2-mut sao de
  OUTRO bloco (o T15, com dev em uso) e nao sao tabuleiro desta junta: o inspetor reporta, nao varre e nao exige remocao;
  worktrees proprios detached no objeto C:/Users/AMP/w-j07cb1c<N>, com N o numero da cadeira (ou sufixo b), cada
  um com npm ci proprio e sem junction (secao C7.1-ter(c)); C1 e C2 rodam em memoria, sem banco; so a C3 tem cluster descartavel
  (prefixo j07cb1-c3-, rede propria, nenhuma porta publicada); a casa roda no maximo 3 trabalhos com container ao mesmo tempo
  (D-BRACOS-E-DOCKER-17-10) e cada cadeira conta os grupos tl e j vivos antes de subir container; a base viva e as portas 5432,
  6379, 3000, 5173, 5050 e 8899 nunca sao alvo derruba com: `grep -ic 'arnes2' C:/Users/AMP/w-07cb1/agent-orchestration/omega/juntas/votos/B-O6R-07c-b1/insp-07cb1-parecer.md` (novo)

O baseline e o plano de perda de jurado ficam declarados no parecer: baseline honesto medido pelo inspetor no proprio worktree e o
  livre em C: (o corpo das cadeiras manda parar abaixo de cerca de 2 GB); queda vira linha no 00-quedas.md desta junta pelo
  orquestrador (P6), o sucessor re-executa o que a evidencia registrou (P3), voto perdido nunca conta e a junta nao fecha com menos
  de 3 votos; executor sem cota (Codex no limite, teto do Gemini atingido, Opus esgotado) para e registra onde esta, sem descer
  degrau (secao C7.6-bis); o inspetor declara, sem resolver, que o CLAUDE.md diz "o sucessor tem identidade nova" (P3) e os corpos
  dizem "Queda relanca a MESMA identidade" derruba com: `grep -ic 'perda de jurado' C:/Users/AMP/w-07cb1/agent-orchestration/omega/juntas/votos/B-O6R-07c-b1/insp-07cb1-parecer.md` (novo)

O veredito e LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO, e o parecer NOMEIA cada cadeira com o seu executor, o seu worktree e o
  seu prefixo de container, porque e isso que cada cadeira confere na legalidade; a evidencia e incremental com hora em
  C:/Users/AMP/w-07cb1/agent-orchestration/omega/juntas/votos/B-O6R-07c-b1/insp-07cb1-evidencia.md e o parecer em
  C:/Users/AMP/w-07cb1/agent-orchestration/omega/juntas/votos/B-O6R-07c-b1/insp-07cb1-parecer.md, escrito antes da mensagem final
  (P1, P2), que o orquestrador versiona; worktree proprio detached C:/Users/AMP/w-insp-07cb1, removido pelo nome; nunca tail -f;
  timeout no que executa; PAUSA grava a secao PAUSA e para (P7) derruba com: `grep -icE 'LIBERADO|BLOQUEADO' C:/Users/AMP/w-07cb1/agent-orchestration/omega/juntas/votos/B-O6R-07c-b1/insp-07cb1-parecer.md` (novo)

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo de origin/chore/mandato-refs-e-preflight copiado para um arnes local no scratchpad do redator (unica alteracao, na linha 211: RAIZ fixada em C:/Users/AMP/w-07cb1; o mandato-refs.sh entra pela costura MANDATO_REFS; o carimbo de 14 digitos da migracao, citado entre aspas no AVISO, sai trocado por um marcador porque a checagem 4 o cobraria fora do caminho) medido por: `MANDATO_REFS=<scratch-do-redator>/mandato-refs.sh bash <arnes>/mandato-preflight.sh <este-mandato> 440 2>&1 | sed -E "s,'[0-9]{14}','<14 digitos da migracao>',"; echo ec=$?`
```
COLAGEM    l.6-20: refs do PR #440 confere com a saida atual
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<14 digitos da migracao>' em prisma/migrations/20260877000000_backfill_work_order_assignment_from_active_dispatches/migration.sql — l.24

PRE-VOO OK — C:/Users/AMP/w-07cb1/agent-orchestration/omega/juntas/votos/B-O6R-07c-b1/00-mandatos/inspetor-07cb1.md
ec=0
head=b198fe358b41186b2598ab258ccb735da8c04cbc
utc=2026-10-17T03:27:00Z
```
