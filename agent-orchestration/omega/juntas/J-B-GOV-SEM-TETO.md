# J-B-GOV-SEM-TETO (PR #394) — ciclo 1

- **Objeto julgado:** `7ad08690bad5e9cbc4d34fe6905b14c6ac634046`, resolvido **independentemente pelas três
  cadeiras** (`git rev-parse` cruzado com `gh pr view 394 --json headRefOid`; C3 cruzou também `git ls-remote`).
  Nenhuma viu o head andar.
- **approved_head:** `7ad08690bad5e9cbc4d34fe6905b14c6ac634046`
- **Base:** `origin/main` em `fc3363e3` (#392), ancestral do objeto. **CI no objeto:** 14/14 `success`, 0 não-verdes,
  0 pendentes — medido pelo inspetor e reconfirmado pelo orquestrador (`gh pr view 394 --json statusCheckRollup`).
- **Quórum:** maioria de 3, sem veto, sem crítico (§C7.1-ter(b): o bloco não toca dinheiro, segurança, permissão
  nem perda de dado — diff de `src prisma frontend mobile .github` = 0). A edição do item 2.2 do inspetor não subiu
  o quórum: um hunk, confinado por diff, conferido por C3 e pelo inspetor.
- **Inspetor de terreno (§C7.1-bis):** `LIBERADO COM RESSALVA` — 0 bloqueios, 3 ressalvas (R1 forte: o diretório
  de agentes da sessão está velho e não contém os corpos das cadeiras → as cadeiras rodaram como `general-purpose`
  lendo o corpo do head, com md5 conferido; R2: briefing defasado da emenda; R3: resíduos inertes reportados).
  Parecer do inspetor em Fable 5.1, corpo aplicado = o do head.

## VEREDITO: **APROVADO — 3 × 0**

| cadeira | identidade | md5 EOL-neutro do corpo (`.claude`) | modelo | voto | achados |
|---|---|---|---|---|---|
| C1 — fidelidade da transcrição | `jurado-semteto-c1-fidelidade-transcricao` | `7a676a2fb44be53999d23471a4abd23c` | Opus 5.5 | **APROVADO** | 0 bloqueia · 2 ajuste · 7 nota |
| C2 — consistência normativa | `jurado-semteto-c2-consistencia-normativa` | `635f79df868b907d5b8a1843f9646855` | Opus 5.5 | **APROVADO** | 0 bloqueia · 1 ajuste · 7 nota |
| C3 — escopo, registro e terreno | `jurado-semteto-c3-escopo-registro` | `4396c0fbd8f6b0ddaf1c555cd6137c32` | Opus 5.5 | **APROVADO** | 0 bloqueia · 2 ajuste · 7 nota |

**As três votaram juntas**, em worktrees próprios de caminho curto (`w-jst1/2/3`, removidos por elas), sem ler os
votos umas das outras. **Segunda instância de cada cadeira:** a primeira instância das três caiu com a sessão do
orquestrador ~7 min depois de lançada, **sem veredito**; os parciais foram preservados fora do repositório e
**nenhuma segunda instância os herdou** (C2 declara não ter aberto o seu). Voto perdido não contou como nada.
Todas as cadeiras são `model: opus` no próprio corpo — não houve substituição de modelo.

Evidência completa de cada voto (comandos, saídas, mutações, JSON dos achados) ficou no scratchpad da sessão do
orquestrador (`VOTO-394-C{1,2,3}.md`); o que segue é o que a junta entrega ao registro.

## O que cada cadeira mediu (resumo, com o número)

- **C1:** das **25** elaborações do transcritor sobre as palavras do dono (T-01…T-20 do plano + T-21…T-25 da
  emenda), **23 fiéis** (T-11 e T-25 com ressalva), **1 legislação declarada e neutra** (T-13), **1 não verificável**
  (T-17). O "continuaremos" do dono não carrega condição escondida no texto julgado. A cadeira achou dois furos no
  **próprio** gerador (um pela mutação nova N2c), corrigiu e mediu de novo antes de votar.
- **C2:** espelho `CLAUDE.md` × `AGENTS.md` byte-idêntico nos três blocos alterados (§C7.1-bis `615ded3e`, item 4
  `db96a8bd`, §C7.7 `7c9294e6`; 0 CR; borda provada por mutação da cauda; diff 64 × 64, nenhuma linha só de um
  lado). Regras vivas do teto **geradas pela propriedade** (população 138, `-i`, 638 n-gramas): exatamente as **5
  pré-existentes V-07…V-11**, todas em `P-GOV-CICLOS-CORPOS-ORFAOS` com linha e data, nenhuma fora dela. **Trava do
  ciclo 4 provada por mutação:** ciclo 4 sem o parecer da auditoria sai `BLOQUEADO` pelo texto do corpo do inspetor,
  com 4 vermelhos-controle.
- **C3:** 0 arquivo proibido (§C4 e §6); 20 dos 21 com caminho literal no §6, o índice autorizado por referência e
  **reproduzido pelo gerador** (blob `02841e1d`); o corpo do inspetor com 1 hunk, só no item 2.2, nos dois espelhos.
  **Conflito com o #393: 7 arquivos** (`git merge-tree 7ad08690 × c32f77b5` ec=1: `decisoes.md`, `pendencias.md`,
  `pendencias-indice.md`, 4 de `Kpis/*`). Backfill do #392 conferido **contra a ata**: `approved_head` =
  `7822deaf…` = "Objeto julgado" de `J-B-SAN3-00.md:3` (não o `headRefOid` `5cfcd7d3`); `merge_commit` `fc3363e3`
  = `gh mergeCommit`; `blocks_completed` 167 → 168; guards 29/29; `kpi-freeze --check` ec=0.

## Os ajustes (não reprovam; viram pendência com dono)

- **C1-A1 — o contrato não separa, no ponto de leitura, a decisão do dono do mecanismo do transcritor.** Em
  `CLAUDE.md` l.413–445 (= `AGENTS.md` l.441–473), sob o rótulo "(decisão do dono, 2026-09-27)", 16 proposições
  acrescentam ator, obrigação, condição ou restrição sem marca local; a separação só existe em `decisoes.md`
  ("nenhuma é palavra do dono"). `dentro-do-bloco`.
- **C1-A2 — no ramo "máquina defeituosa", o "continuaremos" depende de um conserto sem executor, sem prazo e sem
  desfecho alternativo.** A condição é explícita e declarada (M-04 na pendência), não escondida. `dentro-do-bloco`.
- **C2-3-1 — contra um head que não carrega o contrato pós-#394, a trava do ciclo 4 admite duas leituras com ações
  opostas.** O item 3.3 do inspetor ("cláusula inexistente na ref julgada = o item não se aplica") desliga a trava do
  2.2 quando a ref julgada é anterior ao #394 — hoje é o caso de #393 (`c32f77b5`), #388 (`a24f58b5`) e #389
  (`bc3e736b`). Com a ref = objeto pós-#394, `BLOQUEADO` nas duas leituras. `dentro-do-bloco`.
- **C3-A1 — o diff pôs no item 4 ~8 linhas normativas novas (T-21, T-22, T-24, T-25) além da reescrita de (d), que
  o §6 do plano proibia; o plano não foi emendado e `decisoes.md` diz "implementa aquele plano" sem registrar a
  divergência.** O mérito do texto é da C1 (fiel). **A divergência fica declarada aqui pelo orquestrador**, que
  mandou a emenda fechar o gatilho sem pedir emenda do plano. `dentro-do-bloco`.
- **C3-A2 — o corpo do PR dizia "nada de código, teste, KPI ou schema" contra 21 arquivos no diff, 4 em `Kpis/`.**
  **Consertado antes do merge** pelo orquestrador (dono do corpo do PR): corpo reescrito para o diff real.

## Notas (21 no total; as que têm consequência)

- **Pré-existentes nomeadas:** C1-N7 (o `validador-mestre` segue com "na 3ª falha = CONDIÇÃO DE PARADA",
  `bed17db3` 2026-07-08 — já é a V-07 da `P-GOV-CICLOS-CORPOS-ORFAOS`); C2-2-1 (`PROJECT_MEMORY.md:37` ainda diz
  "ciclo 5 — teto do §C7.4", snapshot de 2026-08-28); C2-2-2 (#388 e #389 rastreiam 6 corpos de especialista com
  "CICLO 2 — o ÚLTIMO (D-TETO-DOIS-CICLOS)", corpos de 2026-09-20, que entram na `main` quando eles mergearem);
  C3-N6 (4 métricas menores do KPI carregadas sem nota deste PR — regressão entre `b8cd22df` (#391) e `fc3363e3`
  (#392)); C2-3-6 (o número do ciclo que liga a trava vem do briefing, o corpo do inspetor não o deriva do
  repositório).
- **Do bloco, sem força normativa:** citação das palavras do dono normalizada ("gantir" → "garantir") sem marca
  local (C1-N1); paráfrase condicional do "continuaremos" no plano e no briefing, que o texto julgado não carrega
  (C1-N2); `decisoes.md` diz "não muda" sobre "identidade nova nas cadeiras que votaram", que o bloco alterou no
  contrato (a regra em vigor no gate já era essa desde `d2839039`) (C1-N3); briefing defasado da emenda — 5 em vez
  de 7 arquivos de conflito, "não versionados" falso (C3-N5 = ressalva R2 do inspetor); "só deleção" não literal em
  V-01/V-06 (C3-N4); disparo e critério "sã × defeituosa" sem dono nomeado (C2-3-2, C2-3-3 — cabem em M-02);
  `status-geral.md`/`log-execucao.md` sem registro do bloco (C3-N7).

## §C7.4-bis — quem ocupou cada papel

| papel | quem |
|---|---|
| autor da regra (palavras do dono → `3e92b2b8`) | o orquestrador (transcritor; autor das elaborações T-01…T-04 declaradas, as demais medidas pelo planejador) |
| plano + briefing (`43b37e4d`) | `planejador-mestre`, identidade nova para este bloco |
| corpos das cadeiras (`43b37e4d`) | `agente-fabrica`; versionados pelo orquestrador nos dois espelhos |
| emenda + KPI (`dd79c96f`, `7ad08690`) | `dev-semteto-emenda` (Opus 5.5), identidade nova |
| inspeção de terreno | `inspetor-de-terreno-da-junta` (Fable 5.1) |
| julgamento | C1, C2, C3 acima — nenhuma planejou, desenvolveu ou escreveu a regra |
| ata, corpo do PR, pendências dos ajustes, merge | o orquestrador |

Ciclo 1 aprovado: não há reprovação a responder por (a)/(b)/(c).

## O que o orquestrador faz com os ajustes

- **C3-A2** consertado (corpo do PR). **C1-A1, C1-A2, C2-3-1, C3-A1** → `P-GOV-SEM-TETO-AJUSTES-DA-JUNTA`,
  dono o bloco de governança já proposto `B-GOV-CICLOS-RESIDUAIS` (mesmo dono da `P-GOV-CICLOS-CORPOS-ORFAOS` e da
  `P-GOV-AUDITORIA-MAQUINA-PECAS-ABERTAS`). **C3-N6** → `P-KPI-NOTAS-CARREGADAS-REGRESSAO-392`, dono o próximo PR que
  tocar `Kpis/*` — o #393, na integração da `main`.
- **Conduta enquanto C2-3-1 estiver aberta (do orquestrador, não é norma nova):** nenhum PR vai a junta de ciclo ≥ 3
  sem antes integrar a `main` pós-#394 — o #393 é integrado **por merge** antes da inspeção da junta 3 (plano do dia,
  G5). Assim a ref julgada carrega o contrato e a trava tem uma leitura só.
