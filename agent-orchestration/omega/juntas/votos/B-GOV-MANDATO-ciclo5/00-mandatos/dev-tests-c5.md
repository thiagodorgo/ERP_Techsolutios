# Mandato — dev de testes do ciclo 5 — ciclo 4 do B-GOV-MANDATO (PR 393)

## MEDIDO

Forma do mandato: campos declarados, decisao do dono D-MANDATO-FORMA registrada em origin/main medido por: `MSYS_NO_PATHCONV=1 git -C C:/Users/AMP/w-mandato show origin/main:agent-orchestration/controle/decisoes.md | grep -ic '^## D-MANDATO-FORMA'`
```
1
```

Estado do PR 393 no instante do lancamento, pela ferramenta do bloco medido por: `bash scripts/mandato-refs.sh 393`
```
# refs do PR #393 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-04T13:07Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            chore/mandato-refs-e-preflight
base:            origin/main
estado:          OPEN | rascunho=true | MERGEABLE
head do PR:      8d6dcefe905269757c4e3136426e4843c907ac23
merge-base:      b404815ce3d1f1b8e5121bd1526978f7222e7479
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   NAO DETERMINAVEL (a ata casa o PR mas NAO declara aprovacao: nenhuma linha '- **approved_head:**')
                 objeto declarado 7462b75bfb7768556a2da2ee13f9ac92e9198872 (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:10 @head-do-PR) — aprovacao nao legivel por maquina
                 objeto declarado 4c8819effd0b9f7a1ef8040eaa1707ca8342fdad (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:96 @head-do-PR) — aprovacao nao legivel por maquina
                 objeto declarado 28b4defdc067387f384e06614e033e0976e9912b (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:215 @head-do-PR) — aprovacao nao legivel por maquina
                 objeto declarado 371b09b26cf51ee28996074c81e2f91dca585cc3 (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:331 @head-do-PR) — aprovacao nao legivel por maquina
                 agent-orchestration/omega/juntas/J-B-GOV-PAUSA.md (mencao no corpo) @head-do-PR
                 agent-orchestration/omega/juntas/J-B-GOV-SEM-TETO.md (mencao no corpo) @head-do-PR
                 NAO invente: sem a linha '- **approved_head:**' numa ata que se declare
                 sobre este PR, a ferramenta NAO afirma qual head a junta aprovou.
```

O merge-base do head com origin/main e igual a origin/main (a main de agora esta integrada no ramo) medido por: `cd C:/Users/AMP/w-mandato && [ "$(git merge-base origin/main HEAD)" = "$(git rev-parse origin/main)" ] && echo IGUAL || echo DIFERENTE`
```
IGUAL
```

A junta 3 reprovou 2 x 1; achados por gravidade em cada voto, lidos do JSON de cada evidencia medido por: `for n in 1 2 3; do f=C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo3/C$n-evidencia.md; echo "C$n: bloqueia=$(grep -ic '"gravidade": *"bloqueia"' $f) ajuste=$(grep -ic '"gravidade": *"ajuste"' $f) nota=$(grep -ic '"gravidade": *"nota"' $f)"; done`
```
C1: bloqueia=4 ajuste=3 nota=3
C2: bloqueia=2 ajuste=3 nota=1
C3: bloqueia=0 ajuste=3 nota=7
```

Os seis bloqueantes do ciclo 3, por id medido por: `grep -h -ioE '"id": *"C[123]c-0[0-9]"[^}]*"gravidade": *"bloqueia"' C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo3/C*-evidencia.md | grep -ioE 'C[123]c-0[0-9]' | sort -u | paste -sd' '`
```
C1c-01 C1c-02 C1c-03 C1c-04 C2c-01 C2c-02
```

O parecer da auditoria: presenca da secao 8 (conserto da maquina) e da secao 9 (atestacao), contadas (0 = ausente); os registros R existentes medido por: `grep -ic '^## 8\. Conserto da máquina' C:/Users/AMP/w-mandato/agent-orchestration/omega/reprovacoes/R-B-GOV-MANDATO-ciclo3-auditoria.md; grep -ic '^## 9\.' C:/Users/AMP/w-mandato/agent-orchestration/omega/reprovacoes/R-B-GOV-MANDATO-ciclo3-auditoria.md; ls C:/Users/AMP/w-mandato/agent-orchestration/omega/reprovacoes/ | grep -i MANDATO`
```
1
1
R-B-GOV-MANDATO-1.md
R-B-GOV-MANDATO-2.md
R-B-GOV-MANDATO-3.md
R-B-GOV-MANDATO-4.md
R-B-GOV-MANDATO-ciclo3-auditoria.md
```

As tres pendencias do conserto da maquina estao no ramo medido por: `grep -ioE '^## P-GOV-MAQUINA-393-[A-Z0-9-]+' C:/Users/AMP/w-mandato/agent-orchestration/controle/pendencias.md | paste -sd' '`
```
## P-GOV-MAQUINA-393-D-M1-DOIS-LADOS ## P-GOV-MAQUINA-393-D-M2-MANDATO-ARTEFATO ## P-GOV-MAQUINA-393-D-M3-FALHA-INTERNA
```

Os corpos de cadeira jurado-mandato no ramo: os dos ciclos 1 a 4 sao inelegiveis para o ciclo 5, e os tres com sufixo e (c1e, c2e, c3e) sao as cadeiras do ciclo 5 medido por: `ls C:/Users/AMP/w-mandato/.claude/agents/especialistas/ | grep -i jurado-mandato | paste -sd' '`
```
jurado-mandato-c1-prevoo-fail-closed.md jurado-mandato-c1c-invariancia-de-forma.md jurado-mandato-c1d-invariancia-e-morte-interna.md jurado-mandato-c1e-enumeracao-e-simetria.md jurado-mandato-c2-pergunta-feita.md jurado-mandato-c2c-cobertura-por-mutacao.md jurado-mandato-c2d-cobertura-e-dois-lados.md jurado-mandato-c2e-cobertura-e-conferencia.md jurado-mandato-c3-escopo-kpi-registro.md jurado-mandato-c3b-fronteira-numero-registro.md jurado-mandato-c3c-fronteira-numero-registro.md jurado-mandato-c3d-escopo-kpi-registro-mandato.md jurado-mandato-c3e-escopo-kpi-registro.md
```

## HIPOTESE

O papel e o dev de testes do ciclo 5 do B-GOV-MANDATO (PR 393), identidade NOVA dev-tests-ciclo5-b-gov-mandato (nao achou, nao planejou,
  nao vota e nao e nenhuma identidade dos ciclos 1 a 4), rodando no Claude Code em Opus 5.5 (decisao do dono de 2026-10-04: Claude em Opus
  nas janelas sem Codex, uma tarefa por vez; Fable e Astra suspensos ate o reset semanal); declara na 1a linha do relatorio o papel, a
  identidade, o modelo e o mandato_md5 deste arquivo derruba com: `head -1 C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEVT5.md | grep -ic 'mandato_md5'`

Item 1: a entrega E1 do passo 2 da secao 16.4 do plano docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md, como emendada pela secao 16-bis
  (inclusive o caso de caminho versionado que monta o proprio mini-repositorio e a lista historica de 10): os casos da secao 16.2 e da
  16.3 no guard do pre-voo e o da C2d-01 no guard do refs, enunciando a PROPRIEDADE (o SHA achado pelo conteudo, o mesmo enumerador para
  cobrar e absolver) e nunca a forma de um mutante, so por adicao (nenhuma linha removida), num commit local T5 em Conventional Commits
  com git diff --cached --check como trava em linha propria derruba com: `grep -ic 'T5' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEVT5.md`

Item 2: o vermelho-controle historico sobre o pre-voo do head em arnes pristino (a receita da secao 15.8, com o pre-voo do head como
  artefato anterior ao conserto S5a): cada caso novo visto VERMELHO no artefato atual pelo motivo enunciado, e a lista historica comparada
  por conjunto com a que a secao 16-bis fixa (o que sobra e o que falta); o dev de testes nao le scripts novos (nao existem ainda) e nao
  edita scripts, docs nem Kpis derruba com: `grep -icE 'vermelho-controle|historic' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEVT5.md`

Item 3: o relatorio passa pelo pre-voo do head (bash scripts/mandato-preflight.sh sobre o proprio relatorio, numero 393) com o veredito
  colado; o dev nao empurra (o orquestrador empurra o commit T5 do worktree do dev) derruba com: `grep -ic 'PRE-VOO' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEVT5.md`

O terreno: worktree proprio detached C:/Users/AMP/w-devt5 no head do ramo, npm ci proprio sem junction, prisma generate com DATABASE_URL
  ficticia so no ambiente do comando; o worktree fica de pe ate o orquestrador empurrar, depois e removido pelo nome com 0 processo vivo;
  evidencia incremental com hora em C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEVT5.md (novo) (P1); mensagem final de 1 linha (P2); nunca tail -f nem MSYS_NO_PATHCONV exportada; nunca
  git config sem --worktree; timeout em tudo; base viva nunca alvo; sob PAUSA grava a secao PAUSA e para (P7) derruba com: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree list | grep -ic 'w-devt5'`

## MEDIDO

Pre-voo deste mandato no head do lancamento medido por: `cd C:/Users/AMP/w-mandato && bash scripts/mandato-preflight.sh agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo5/00-mandatos/dev-tests-c5.md 393; echo ec=$?`
```
COLAGEM    l.11-31: refs do PR #393 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo5/00-mandatos/dev-tests-c5.md
ec=0
head=8d6dcefe905269757c4e3136426e4843c907ac23
blob-preflight=093499a8d5715416c84c1a492c3f6d2ef49ce29c
blob-refs=e1ed8f0d6c9a77672252d63965330fd92721e0ec
utc=2026-10-04T13:07:57Z
```
