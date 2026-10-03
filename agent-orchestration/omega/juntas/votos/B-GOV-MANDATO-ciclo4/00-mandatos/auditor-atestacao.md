# Mandato — auditor da maquina, atestacao — ciclo 4 do B-GOV-MANDATO (PR 393)

## MEDIDO

Forma do mandato: campos declarados, decisao do dono D-MANDATO-FORMA registrada em origin/main medido por: `MSYS_NO_PATHCONV=1 git -C C:/Users/AMP/w-mandato show origin/main:agent-orchestration/controle/decisoes.md | grep -ic '^## D-MANDATO-FORMA'`
```
1
```

Estado do PR 393 no instante do lancamento, pela ferramenta do bloco medido por: `bash scripts/mandato-refs.sh 393`
```
# refs do PR #393 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-03T04:44Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            chore/mandato-refs-e-preflight
base:            origin/main
estado:          OPEN | rascunho=true | MERGEABLE
head do PR:      d031518d2ba58b25ae96814452fbda31b868635e
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

Os mandatos do ciclo 4 ja versionados, um por papel medido por: `ls C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/ | paste -sd' '`
```
auditor-atestacao.md conferente-reconferencia.md conferente.md dev-scripts-k4b3.md dev-scripts-k4b4.md dev-scripts.md dev-tests-t4c5.md dev-tests.md fabrica-1bis.md fabrica-1quater.md fabrica-1ter.md fabrica.md planejador-errata.md planejador-errata2.md planejador-errata3.md planejador-errata4.md planejador.md
```

Os quatro corpos novos do ciclo 4 nos dois espelhos, e a fatia S0 medido por: `ls C:/Users/AMP/w-mandato/.claude/agents/especialistas/ C:/Users/AMP/w-mandato/.agents/agents/especialistas/ | grep -icE 'c1d-invariancia-e-morte-interna|c2d-cobertura-e-dois-lados|c3d-escopo-kpi-registro-mandato|conferente-dois-lados-b-gov-mandato-c4'; cd C:/Users/AMP/w-mandato && node scripts/sync-agent-agents.mjs --check >/dev/null 2>&1; echo s0=$?`
```
8
s0=0
```

As matrizes do ciclo 4 publicadas (linhas N= no documento) e a conferencia dos dois lados versionada (0 = ausente) medido por: `grep -ic '^N=' C:/Users/AMP/w-mandato/docs/revisoes/SAN3/B-GOV-MANDATO-ciclo4-mutantes.md; ls C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/ | grep -ic '00-conferencia-dois-lados.md'`
```
3
1
```

## HIPOTESE

O papel e a atestacao da secao 8.7 do parecer agent-orchestration/omega/reprovacoes/R-B-GOV-MANDATO-ciclo3-auditoria.md, pela MESMA
  identidade que auditou a maquina, auditor-maquina-b-gov-mandato-c3 — identidade sem corpo de agente versionado: nasceu como agente
  geral com o mandato verbatim das perguntas (a) a (e) do contrato e nasce de novo do mesmo modo, a partir deste arquivo —, que nao e
  cadeira, nao e dev, nao planejou o conserto e so atesta; declara na 1a linha da evidencia e da mensagem final o papel, a identidade,
  o modelo e o mandato_md5 deste arquivo derruba com: `head -1 C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/ATESTACAO-393-C4.md | grep -ic 'mandato_md5'`

A atestacao acontece depois de existirem as condicoes 2 a 6 da secao 8.6 e antes do inspetor, num worktree detached proprio
  C:/Users/AMP/w-aud4 (caminho curto; conferir que existe) no head do ramo resolvido por git, com npm ci proprio sem junction derruba com: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree list | grep -ic 'w-aud4'`

O auditor re-executa, com comando e saida colada: (d) o pre-voo de cada mandato em
  agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/ pelo REPLAY no commit que o versionou (errata 15.15 do plano),
  todos OK; (c) a secao 15.0(d) do plano
  docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md existe com semente e identidade, e 1 ponto de cada lado reproduz; (a) quanto a A15,
  o corpo da cadeira C1 em .claude/agents/especialistas/jurado-mandato-c1d-invariancia-e-morte-interna.md tem o item morte interna
  com o vermelho-controle sobre o pre-voo anterior ao conserto declarado derruba com: `grep -ic 'passada 2\|morte interna' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/ATESTACAO-393-C4.md`

O resultado e a secao 9 do parecer, escrita so por adicao ao fim do arquivo, no worktree C:/Users/AMP/w-mandato (o orquestrador
  versiona), com o veredito CONSERTO VERIFICADO — maquina sa para o ciclo 4, ou CONSERTO INSUFICIENTE nomeando a peca; nenhuma outra
  linha do parecer e tocada e nenhum outro arquivo e tocado derruba com: `git -C C:/Users/AMP/w-mandato status --porcelain | grep -iv 'R-B-GOV-MANDATO-ciclo3-auditoria.md' | wc -l`

O auditor nao propoe correcao, nao vota e nao herda a §9 de ninguem: cada afirmacao da §9 vem de comando executado por ele; se uma
  peca do conserto nao puder ser medida, o veredito e CONSERTO INSUFICIENTE, nunca a omissao derruba com: `grep -ic 'CONSERTO' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/ATESTACAO-393-C4.md`

O terreno: MSYS_NO_PATHCONV nunca exportada no shell que roda artefato, guard ou ferramenta; sem tail -f; timeout em tudo que
  executa artefato; a base viva erp-postgres 5432 e erp-redis 6379 nunca como alvo (este papel nao precisa de banco); 0 processo vivo
  ao fim; worktree w-aud4 removido pelo nome; evidencia incremental com a hora em cada secao em
  C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/ATESTACAO-393-C4.md,
  e toda falha da API por sobrecarga registrada nela com a hora derruba com: `grep -ic 'medido por' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/ATESTACAO-393-C4.md`

## MEDIDO

Pre-voo deste mandato no head do lancamento medido por: `cd C:/Users/AMP/w-mandato && bash scripts/mandato-preflight.sh agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/auditor-atestacao.md 393; echo ec=$?`
```
COLAGEM    l.11-30: refs do PR #393 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/auditor-atestacao.md
ec=0
head=d031518d2ba58b25ae96814452fbda31b868635e
utc=2026-10-03T04:44:44Z
```
