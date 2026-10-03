# Mandato — dev de scripts, recontagem pos-integracao (K4b-4) — ciclo 4 do B-GOV-MANDATO (PR 393)

## MEDIDO

Forma do mandato: campos declarados, decisao do dono D-MANDATO-FORMA registrada em origin/main medido por: `MSYS_NO_PATHCONV=1 git -C C:/Users/AMP/w-mandato show origin/main:agent-orchestration/controle/decisoes.md | grep -ic '^## D-MANDATO-FORMA'`
```
1
```

Estado do PR 393 no instante do lancamento, pela ferramenta do bloco medido por: `bash scripts/mandato-refs.sh 393`
```
# refs do PR #393 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-03T04:16Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            chore/mandato-refs-e-preflight
base:            origin/main
estado:          OPEN | rascunho=true | MERGEABLE
head do PR:      4535ebb3dd0429f7ceb768dc6ad9d65ee182f1e8
merge-base:      b404815ce3d1f1b8e5121bd1526978f7222e7479
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   NAO DETERMINAVEL (a ata casa o PR mas NAO declara aprovacao: nenhuma linha '- **approved_head:**')
                 objeto declarado 7462b75bfb7768556a2da2ee13f9ac92e9198872 (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:10 @head-do-PR) — aprovacao nao legivel por maquina
                 objeto declarado 4c8819effd0b9f7a1ef8040eaa1707ca8342fdad (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:96 @head-do-PR) — aprovacao nao legivel por maquina
                 objeto declarado 28b4defdc067387f384e06614e033e0976e9912b (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:215 @head-do-PR) — aprovacao nao legivel por maquina
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
0
R-B-GOV-MANDATO-1.md
R-B-GOV-MANDATO-2.md
R-B-GOV-MANDATO-3.md
R-B-GOV-MANDATO-ciclo3-auditoria.md
```

As tres pendencias do conserto da maquina estao no ramo medido por: `grep -ioE '^## P-GOV-MAQUINA-393-[A-Z0-9-]+' C:/Users/AMP/w-mandato/agent-orchestration/controle/pendencias.md | paste -sd' '`
```
## P-GOV-MAQUINA-393-D-M1-DOIS-LADOS ## P-GOV-MAQUINA-393-D-M2-MANDATO-ARTEFATO ## P-GOV-MAQUINA-393-D-M3-FALHA-INTERNA
```

Os corpos de cadeira jurado-mandato no ramo: os dos ciclos 1 a 3 sao inelegiveis para o ciclo 4, e os tres com sufixo d sao as cadeiras do ciclo 4 medido por: `ls C:/Users/AMP/w-mandato/.claude/agents/especialistas/ | grep -i jurado-mandato | paste -sd' '`
```
jurado-mandato-c1-prevoo-fail-closed.md jurado-mandato-c1c-invariancia-de-forma.md jurado-mandato-c1d-invariancia-e-morte-interna.md jurado-mandato-c2-pergunta-feita.md jurado-mandato-c2c-cobertura-por-mutacao.md jurado-mandato-c2d-cobertura-e-dois-lados.md jurado-mandato-c3-escopo-kpi-registro.md jurado-mandato-c3b-fronteira-numero-registro.md jurado-mandato-c3c-fronteira-numero-registro.md jurado-mandato-c3d-escopo-kpi-registro-mandato.md
```

## HIPOTESE

O papel e o dev de scripts e registro do ciclo 4 do B-GOV-MANDATO, a MESMA identidade dev-scripts-ciclo4-b-gov-mandato (Opus 5.5),
  para um passo curto depois da integracao da main no ramo (o merge de integracao feito pelo orquestrador): a recontagem do KPI
  contra a main integrada, como a secao C3 do contrato manda quando a main anda; declara na 1a linha do seu relatorio o papel, a
  identidade, o modelo e o mandato_md5 deste arquivo derruba com: `head -1 C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEVS4C-K4b4.md | grep -ic 'mandato_md5'`

Item 1: o KPI recontado contra a main integrada: blocks_completed igual ao da main mais 1; as metricas que o PR nao exerce (o smoke do
  frontend e o Flutter) carregadas com o ultimo valor oficial da main e nota explicita; o backend_tests do K4b-3 mantido so se a
  integracao nao mudou a contagem (provado por execucao, com N e forma por TAP, ou pela prova de que nenhum arquivo de teste do
  backend entrou com o merge); a entrada do history e o latest atualizados, o app.js so pela saida do kpi-freeze com o --check verde derruba com: `grep -ic 'blocks_completed' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEVS4C-K4b4.md`

Item 2: a linha de trilha em agent-orchestration/docs/status-geral.md e em agent-orchestration/codex/log-execucao.md, e o commit local em
  Conventional Commits com git diff --cached --check como trava; o dev nao toca tests, scripts nem docs/revisoes, e nao empurra (o
  orquestrador empurra a partir do worktree do dev) derruba com: `grep -ic 'kpi-freeze' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEVS4C-K4b4.md`

O terreno: worktree proprio detached C:/Users/AMP/w-devs4c no head do ramo, npm ci proprio sem junction; cluster descartavel proprio so se
  precisar executar o backend, em porta livre provada, removido pelo nome; o worktree fica de pe ate o push, depois removido pelo nome
  com 0 processo vivo; evidencia incremental com hora (P1); mensagem final de 1 linha (P2); nunca tail -f nem MSYS_NO_PATHCONV
  exportada; timeout em tudo; base viva nunca alvo; sob PAUSA grava a secao PAUSA e para (P7) derruba com: `grep -ic 'medido por' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEVS4C-K4b4.md`

## MEDIDO

Pre-voo deste mandato no head do lancamento medido por: `cd C:/Users/AMP/w-mandato && bash scripts/mandato-preflight.sh agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/dev-scripts-k4b4.md 393; echo ec=$?`
```
COLAGEM    l.11-30: refs do PR #393 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/dev-scripts-k4b4.md
ec=0
head=4535ebb3dd0429f7ceb768dc6ad9d65ee182f1e8
utc=2026-10-03T04:17:02Z
```
