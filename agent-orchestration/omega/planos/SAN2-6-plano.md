# SAN2-6 — plano: o contrato vira AUTOSSUFICIENTE antes do handoff do ciclo 5 (P1–P6 inline · teto por extenso · README do Codex)

**Bloco:** SAN2-6 (rodada Ω-SAN2) · **branch** `docs/san2-6-contrato-p1p6-teto` · **base** `b324258`
(= main `e6a6461` + parecer do porteiro do #367) · **worktree** `.claude/worktrees/san2-r`.
**Planejador:** `planejador-mestre` em Fable (`D-PLANEJADOR-MODELO-FABLE`). **Quem executa é OUTRO
agente** (§C7.4-bis): este plano não implementa; o dev não rejulga o diagnóstico; a junta não é nenhum
dos dois. **Data:** 2026-09-01.

**Ordem do dono (literal):** *"coloque P1–P6 inline no contrato e também adicione ao contrato que o
ciclo 5 é a última tentativa, publique e deixe salvo no repo"*

---

## §1 — Objetivo, ator, fluxo

**Objetivo.** Tornar `CLAUDE.md`/`AGENTS.md` executáveis SEM salto de referência nos dois pontos que
protegem a tentativa única do ciclo 5: (a) **P1–P6 inline** no §C7.7, com norma + caso + Modelo de
mandato — hoje o item 7 é um resumo de 11 linhas que aponta para `PROTOCOLO-JUNTA-RESILIENTE.md`, e um
executor sob pressão não dá o salto; (b) a cláusula de que **o ciclo 5 do `B-O6R-02` é a última
tentativa** — hoje ela vive só em `controle/decisoes.md` (D-TETO-DOIS-CICLOS), e os contratos, lidos
isolados, sugerem que o bloco já estourou o teto de 2; (c) o **README do Codex** (`.agents/agents/
README.md`) parar de ensinar o teto REVOGADO e de tabelar papéis que não existem, e passar a nomear os
dois gates fail-closed que governam o início do ciclo 5. O PR também paga as **3 dívidas de KPI** que o
porteiro do #367 nomeou.

**Ator/fluxo.** Não há rota, payload, model ou migration: bloco 100% documental/registro
(contrato/README/protocolo/KPI/pendências). Contrato REST e modelagem: **N/A — declarado, não omitido.**
Fluxo: dono (ordem literal) → este plano → dev (edita os 6 arquivos do §5) → junta (maioria de 3, §8)
→ merge → porteiro.

**Governança da inserção na fila.** O porteiro do #367 liberou "ciclo 5 do B-O6R-02" como próximo
bloco. O SAN2-6 entra ANTES por **ordem literal do dono** (fonte de verdade nº 1, §A1) — a inserção não
contorna o gate: o parecer continua valendo para o ciclo 5, e as 3 dívidas que ele atribuiu ao "PR do
ciclo 5" são **reatribuídas ao SAN2-6 com registro §A2** (precedente: o SAN2-5 fez o mesmo com o item
B.10 do porteiro do #366, registrado na entrada 149 do history). Motivo de mérito, além da ordem: o
ciclo-teto tem UMA tentativa; ela não deve partir de contrato não-autossuficiente nem pagar dívida
alheia.

---

## §2 — Diagnóstico MEDIDO (por mim, nesta sessão, no worktree em `b324258` — nada herdado)

1. **P1–P6 não está inline.** `grep -cE '\bP[1-6]\b' CLAUDE.md AGENTS.md` → **0 / 0**.
   `grep -c 'ciclo 6'` → **0 / 0** (nenhum contrato diz que não existe ciclo 6).
2. **§C7.7 atual = resumo com ponteiro.** `CLAUDE.md` l.431-441 e `AGENTS.md` l.459-469 (11 linhas,
   texto idêntico entre si): citam "o essencial" e apontam para
   `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md`.
3. **Nenhum contrato diz que o ciclo 5 é a última tentativa.** §C7.4 (C l.380-399 / A l.408-427) diz
   teto = 2 e cita o ciclo 5 do `B-O6R-02` **só como história** ("chegou ao ciclo 5 com 16 identidades
   queimadas", C:393/A:421) — lido isolado, sugere teto estourado. A aplicação em voo vive só em
   `agent-orchestration/controle/decisoes.md` l.1786-1792; o literal de l.1790-1791 é:
   *"**`B-O6R-02`** está no **ciclo 5**, que já era o teto anterior e continua sendo o dele: o ciclo 5
   já é a última tentativa sob qualquer das duas regras. Se reprovar, **para** — como já estava
   previsto."*
4. **README do Codex — defeitos medidos.** Papéis no disco: **23 de cada lado**
   (`ls .claude/agents/*.md | wc -l` = 23; `.agents/agents/` = 23 papéis + o próprio README). O README
   diz **24** em l.5, l.6 e l.43. `grep -c 'omega5p' .agents/agents/README.md` = **6** (l.24, 49, 56,
   57, 58, 66) e **0** nos dois contratos — os 5 papéis Ω5P tabelados NÃO existem no disco. l.33-36
   ensina o teto REVOGADO ("ciclos 1–2 fábrica… ciclos 4–5 replanejam") e l.68 repete ("reabre a
   premissa nos ciclos 4–5"). **Faltam na tabela** os dois que existem no disco e governam o início do
   ciclo 5: `inspetor-de-terreno-da-junta` e `porteiro-pos-merge`. E `.claude/agents/especialistas/`
   tem **8 corpos** (`*-c5-*`) que o espelho NÃO cobre — `node scripts/sync-agent-agents.mjs --check`
   dá ec=0 "23 agentes" sendo **cego a subdiretório** (`P-SYNC-AGENTS-NAO-RECURSIVO`, ABERTA,
   `pendencias.md` l.5169; consignado também pelo porteiro do #367).
5. **AGENTS.md diz "24" em 2 lugares próprios:** l.150 ("os **24 papéis**") e l.586 ("24 agentes… 24
   papéis espelhados"). `CLAUDE.md`: **0 ocorrências** (grep ec=1) — a correção de contagem é
   AGENTS.md+README, não do CLAUDE.md.
6. **Micro-drift de espelho no §C7.4 (pré-existente, registrado aqui por §A2):** C:388 "A
   `agente-fabrica` **continua**" × A:416 "A fábrica de agentes **continua**". Canônico = CLAUDE.md.
7. **EOL: os 3 arquivos-alvo são 100% CRLF.** `tr -cd '\r' | wc -c` == `wc -l`: CLAUDE.md **542/542**,
   AGENTS.md **591/591**, README **97/97**. (Medido com `tr`; `grep -c $'\r'` devolve 0 falso neste
   ambiente.) Qualquer editor que normalize EOL produz mudança de massa disfarçada de inserção.
8. **KPI.** `Kpis/kpis-latest.json` l.63-67: `blocks_completed` = **156**, com a condição literal
   "sobe para **157 SÓ QUANDO O SAN2-5 MERGEAR**" — o #367 mergeou (`e6a6461`, topo da main).
   `Kpis/kpis-history.json`: **150 entradas**; a 150 (SAN2-5) está com `pr`/`merge_commit`/
   `approved_head` **null** e cita "**442 0**"/"**100 0**" na prova APPEND-ONLY **sem âncora de head
   inline** (a âncora só aparece no rabo pós-voto da mesma descrição). Ata `J-SAN2-5.md`: head julgado
   **`5256b49`** ≠ headRefOid `657928f`.
9. **As 3 dívidas do porteiro do #367** (parecer `omega/juntas/votos/SAN2-5/00c-porteiro-pos-merge-367.md`,
   "Dívida do PRÓXIMO PR"): (1) backfill §C3.5 pr 367 · `e6a6461` · `5256b49`; (2) `blocks_completed`
   156→157; (3) ancorar "442 0"/"100 0" ao head em que valem.
10. **A emenda de prática só existe em ata.** `J-SAN2-2.md` l.86-96: cadeiras C2/C4 morreram **5× no
    mesmo ponto** (transição medir→gravar); correção que funcionou = **voto-esqueleto** (`EM APURAÇÃO`
    por item, gravado ao medir) + **fatiar item grande** (item de 6 sub-chaves: queda custou 1/6).
    Regra extraída: *a granularidade do registro acompanha a da medição.* O
    `PROTOCOLO-JUNTA-RESILIENTE.md` (fonte) não a contém.

---

## §3 — O que fazer, item a item, com o texto exato que passa a valer

**As três decisões de desenho deste plano, com argumento:**

- **D-a (forma do inline).** Cada P vira **norma operativa completa** (caminhos, limiares, formato) +
  **1 linha de caso** ("o que aconteceu quando não existia"), mais o **Modelo de mandato verbatim** e
  4 linhas de deveres do orquestrador. Ficam SÓ na fonte: os "por quês" longos, a forense das 14
  quedas e a discussão da hipótese do P6. Por quê: norma sem caso vira ritual que a próxima rodada
  "otimiza" para fora; caso sem norma não executa; e o arquivo longo já provou que ponteiro não é
  lido sob pressão. Orçamento duro contra inchaço: **inserção líquida ≤60 linhas por contrato** —
  estourou, corta-se linha de *Caso*, nunca norma nem o Modelo de mandato.
- **D-b (a emenda de J-SAN2-2 entra como EMENDA ao P2, não como P7).** Três razões: (i) a própria ata
  diz que ela "emenda a prática do P2" — o objeto é o mesmo (evidência/voto em arquivo) e o defeito era
  a transição medir→gravar ser ato único; (ii) "P1–P6" é nome de série já citado em `decisoes.md`,
  postmortem e atas — criar P7 só no contrato bifurcaria a numeração contra a fonte, e renumerar a
  fonte é reescrever norma mergeada; (iii) para não nascer drift contrato⊃fonte, a MESMA emenda é
  **apensada (append-only) ao `PROTOCOLO-JUNTA-RESILIENTE.md`** neste PR (§3.5) — o invariante
  "contrato ⊆ fonte" sobrevive.
- **D-c (a contagem de papéis corrige-se AQUI, não vira pendência).** Tabela intitulada "24 papéis"
  com 23 no disco é falsa de qualquer jeito; a correção é no MESMO arquivo das outras edições (custo
  marginal zero); e o número novo fica alinhado a uma prova executável (o `--check` do sync imprime
  "23 agentes"). Adiar seria entregar um handoff "autossuficiente" com contagem sabidamente falsa — a
  junta deste próprio bloco teria de reprovar.

### 3.1 — Cláusula do teto: novo bullet no §C7.4, nos DOIS contratos (idêntico)

**Onde:** logo após o bullet "Registro dos ciclos segue em `omega/reprovacoes/…`" — `CLAUDE.md` insere
após a l.391; `AGENTS.md` após a l.419 (antes do parágrafo "Por quê, medido").

**Texto exato (o trecho entre aspas é transcrição literal de `controle/decisoes.md` l.1790-1791;
manter "última tentativa sob qualquer das duas regras" numa linha só — é a âncora de prova §4.3):**

```
   - **Blocos em voo sob o teto antigo — aplicação, transcrita de `D-TETO-DOIS-CICLOS`
     (`agent-orchestration/controle/decisoes.md`):** blocos **novos** nascem sob o teto de 2; e
     "**`B-O6R-02`** está no **ciclo 5**, que já era o teto anterior e continua sendo o dele: o ciclo 5 já é a
     última tentativa sob qualquer das duas regras. Se reprovar, **para** — como já estava previsto."
     **Não há ciclo 6.** Após reprovação no teto, o único caminho é o dossiê ao dono.
```

### 3.2 — P1–P6 inline: o item 7 do §C7 é SUBSTITUÍDO integralmente, nos DOIS contratos (idêntico)

**Onde:** `CLAUDE.md` l.431-441 e `AGENTS.md` l.459-469 (as 11 linhas atuais saem; entra o bloco das
duas caixas abaixo, contíguo). `PROTOCOLO-JUNTA-RESILIENTE.md` **permanece como fonte** — nada sai dele.

**Texto exato que passa a valer (byte-idêntico nos dois contratos) — parte 1/2:**

````
7. **Protocolo de junta resiliente (decisão do dono, 2026-08-29 — `D-JUNTA-RESILIENTE`) — P1–P6, inline.**
   Toda junta, inspeção de terreno e porteiro seguem as seis normas abaixo. Origem medida: **14 quedas de
   agente em ~28 disparos (~50%)** numa única sessão, todas `server_error` de streaming — postmortem em
   `omega/POSTMORTEM-QUEDAS-2026-08-29.md`; narrativa completa e "por quês" longos em
   `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md` (a fonte; em divergência, ela vale).
   O protocolo muda **como o trabalho sobrevive à morte de quem o fez** — quóruns, vetos, identidade nova,
   separação de papéis (§C7.4-bis) e o teto de dois ciclos ficam intactos.

   - **P1 — Evidência incremental.** Após **CADA item medido**, apensar a
     `agent-orchestration/omega/juntas/votos/<JUNTA>/<cadeira>-evidencia.md` três linhas: **comando
     executado → saída resumida → veredito parcial do item**. Nunca só no fim. *Caso:* trabalho ~90%
     feito virou 100% perdido — um inspetor morreu na limpeza com a inspeção pronta; com o arquivo, a
     morte custa só a cauda não medida.
   - **P2 — Voto-arquivo-primeiro.** O voto (`<cadeira>-voto.json`, mesmo diretório) é escrito **ANTES**
     da mensagem final; a mensagem final é **1 linha** apontando o arquivo. Vale para pareceres de
     inspetor e porteiro (`.md`). *Caso:* três jurados morreram streamando o voto — sob P2, essas mortes
     teriam custado zero. **Emenda voto-esqueleto (J-SAN2-2; medida: 5 quedas no MESMO ponto, a
     transição medir→gravar):** o artefato de saída **nasce como esqueleto** com os itens `EM APURAÇÃO`
     e cada item é gravado **ao ser medido**; item grande também se fatia (item de 6 sub-chaves: a queda
     custou 1/6, não 6/6) — **a granularidade do registro acompanha a da medição**: onde medir tem N
     passos, gravar tem N passos.
   - **P3 — Perda de jurado (emenda à R2).** Voto perdido não conta; o sucessor tem identidade nova — e:
     *"**Nada conta sem re-execução própria** — mas evidência **registrada em arquivo** pelo caído (P1) é
     **roteiro de re-execução barata**: o sucessor re-roda cada comando registrado e compara a saída, e
     só então mede a cauda que faltou. **Conclusão sem comando registrado continua sendo não-insumo**,
     inclusive parcial favorável."* *Caso:* a R2 nasceu da contaminação por afirmação herdada (ciclo 4 do
     financeiro) — isso fica; re-rodar comando escrito custa segundos e É verificação própria.
````

**Texto exato — parte 2/2 (continua na mesma numeração, sem linha entre as partes):**

````
   - **P4 — Mandato ≤3 itens · medir ≠ julgar.** Cadeira com mais de 3 itens vira **duas cadeiras**;
     medição pesada separa **medir** (uma fatia; só números, com N e forma) de **julgar** (outra fatia) —
     o padrão 4a/4b; logs e saídas longas só no arquivo de evidência, nunca na mensagem final. *Caso
     (lição corrigida):* mandato longo não mata — 4 agentes morreram na mensagem 1; morte ≈ exposição ×
     taxa da janela. Mandato curto reduz exposição E custo da perda.
   - **P5 — Disparo escalonado.** Máximo **2 jurados em paralelo**; o terceiro só quando um concluir.
     **2 quedas em <30 min → pausa de ~15 min** antes de qualquer redisparo, registrada no arquivo de
     quedas. *Caso:* as quedas agrupam no tempo; redisparar dentro da janela ruim multiplicou as perdas.
   - **P6 — Registro padronizado de quedas.** Toda queda = 1 linha em `votos/<JUNTA>/00-quedas.md`,
     colunas fixas: `agente | modelo (pin/herdado) | mandato (nº itens) | fase da morte | erro | custo do
     redo`. *Caso:* a hipótese "pinar modelo reduz queda" (1/5 × ~13/23 no postmortem) tem n pequeno
     demais — só a série decide; sem ela, cada sessão redescobre o problema.

   **Modelo de mandato (colar no disparo de cada cadeira — verbatim da fonte):**
   ```
   Após CADA item: apense a <cadeira>-evidencia.md → comando · saída resumida · veredito parcial.  [P1]
   Antes da mensagem final: escreva <cadeira>-voto.json. Mensagem final = 1 linha apontando o arquivo.  [P2]
   Máximo 3 itens; logs longos só no arquivo de evidência.  [P4]
   Se você substituir um caído: re-execute cada comando do <cadeira>-evidencia.md dele e compare, depois
   meça a cauda. Conclusão sem comando registrado NÃO é insumo.  [P3]
   ```
   **Do orquestrador (não do agente):** dispara ≤2 em paralelo e aplica a pausa de janela instável (P5);
   commita evidência e voto após cada conclusão (agente não commita); preenche `00-quedas.md` no momento
   da perda (P6); na ata, consigna quedas, custo real de redo e o que o suplente re-executou vs mediu de
   novo.
````

O bloco todo tem **59 linhas** e substitui 11 → inserção líquida de **+48** por contrato, mais **+5** do
bullet do §3.1: **+53, dentro do orçamento de ≤60** (D-a). Estourou na execução? Corta *Caso*, nunca norma.

### 3.3 — Correções que são SÓ do `AGENTS.md` (linhas próprias do adaptador Codex)

1. **l.150:** "os **24 papéis**" → "os **23 papéis**".
2. **l.586 (linha da tabela):** "24 agentes em `.claude/agents/*.md`" → "23 agentes em
   `.claude/agents/*.md`" e "**24 papéis espelhados**" → "**23 papéis espelhados**".
3. **l.416 (alinhamento §A2 do micro-drift §2.6; canônico = CLAUDE.md):** "A fábrica de agentes
   **continua**" → "A `agente-fabrica` **continua**". Consolidação registrada no §3.7 — nada em silêncio.

### 3.4 — README do Codex (`.agents/agents/README.md`) — 9 edições

O README está no `KEEP` do `sync-agent-agents.mjs` (l.27): o script **preserva-o** — ele é mantido à
mão e SÓ existe deste lado. Logo: edita-se o README **diretamente** (via ferramenta Edit, nunca sed);
os 23 papéis espelhados **NÃO se tocam à mão** (qualquer mudança neles seria via `.claude/agents/` +
script — este bloco não muda nenhum corpo de papel).

1. **l.5:** "são 24 agentes isolados" → "são 23 agentes isolados".
2. **l.6:** "os **mesmos 24 papéis**" → "os **mesmos 23 papéis**".
3. **l.43:** "## Os 24 papéis por função" → "## Os 23 papéis por função".
4. **l.24:** "adote `planejador-mestre` (ou `omega5p-planejador` na rodada de Pátios) e publique o" →
   "adote `planejador-mestre` e publique o".
5. **Remover as 5 linhas de tabela dos papéis Ω5P que não existem no disco:** l.49
   (`omega5p-planejador`), l.56-58 (`omega5p-dev-backend`, `omega5p-dev-frontend`,
   `omega5p-dev-portal`) e l.66 (`omega5p-avaliador`). Medido §2.4: 0 referências a eles fora do
   README — nada órfão.
6. **l.68 (linha do crítico):** substituir por:
   `| `critico-adversarial` | ataque | Ataca o plano antes do código; obrigatório nos blocos de invariante — dinheiro/segurança/permissão/perda de dado (§C7.1-ter(b)). |`
7. **Passo 5 da emulação (l.33-36) — substituir as 4 linhas por (texto exato):**

```
5. **Reprovação — teto de DOIS ciclos (`D-TETO-DOIS-CICLOS`; o teto de 5 está REVOGADO):** no ciclo 2
   corrige-se (quem achou NÃO conserta — §C7.4-bis) e volta-se à junta com **identidade nova** na
   cadeira que reprovou; **reprovou no ciclo 2 → PARA e vira dossiê ao dono — não há ciclo 3.**
   Registre em `agent-orchestration/omega/reprovacoes/R-<entrega>-<ciclo>.md`. Em voo: o `B-O6R-02`
   está no ciclo 5, que já era o teto dele — **o ciclo 5 é a última tentativa**; se reprovar, para.
```

8. **Nova nota após o passo 6 (antes da "Regra da dúvida") — texto exato:**

```
> **Resiliência de junta (P1–P6 — §C7.7 do `AGENTS.md`, inline):** toda cadeira grava **evidência
> incremental** em `agent-orchestration/omega/juntas/votos/<JUNTA>/<cadeira>-evidencia.md` a cada
> item, escreve o **voto em arquivo ANTES da mensagem final** (mensagem final = 1 linha), nasce como
> esqueleto `EM APURAÇÃO`, mandato ≤3 itens, máximo 2 disparos em paralelo, quedas em `00-quedas.md`.
```

9. **Duas adições que fecham o handoff do ciclo 5** — (a) nova seção de tabela após "Junta / VETO"
   (após l.75) com os DOIS gates que existem no disco e não estavam tabelados; (b) nota sobre as
   cadeiras efêmeras não espelhadas, apensada ao blockquote de abertura (após l.12). Textos exatos:

```
### Gates fail-closed (não julgam mérito; sem o parecer deles nada começa)
| Papel | Poder | Função |
|---|---|---|
| `inspetor-de-terreno-da-junta` | **gate (fail-closed)** | Antes de TODA junta: terreno limpo — worktree próprio por jurado que muta, cluster Postgres descartável por jurado, insumos do briefing, inelegibilidade por nome, fatia S0, baseline honesto. Sem o `LIBERADO` dele a junta não começa (§C7.1-bis). |
| `porteiro-pos-merge` | **gate (fail-closed)** | Após TODO merge: promessa do PR × diff real, contagens REEXECUTADAS, KPI com backfill, ata da junta, pendências por amostragem, limpeza §C5 — só então autoriza o início da próxima demanda (§C2.8). |
```

```
>
> **Cadeiras efêmeras de ciclo (`.claude/agents/especialistas/`) NÃO são espelhadas:** o sync é cego a
> subdiretório (`P-SYNC-AGENTS-NAO-RECURSIVO`, ABERTA — o `--check` ec=0 não prova nada sobre elas).
> Os 8 corpos de jurado do ciclo 5 do `B-O6R-02` (`*-c5-*`) vivem lá; Codex: leia-os direto de
> `.claude/agents/especialistas/` na raiz do repositório.
```

Com as edições 5 e 9a, a tabela fica com **23 linhas de papel** (21 existentes que já estavam + 2
gates) — o título "23 papéis" passa a ser verdade conferível por `ls`.

### 3.5 — Emenda voto-esqueleto APENSADA à fonte (`PROTOCOLO-JUNTA-RESILIENTE.md`, append-only)

**Onde:** ao FINAL do arquivo (hoje 97 linhas; nenhuma linha existente muda — prova §4.6). **Texto
exato:**

```

## Emenda (2026-09-01, medida na junta `J-SAN2-2`) — voto-esqueleto: a granularidade do registro acompanha a da medição

As cadeiras C2 e C4 do `J-SAN2-2` morreram **cinco vezes no mesmo ponto**: a transição *medir → gravar
o voto*. O P2 mata a morte streamando o voto, mas o voto continuava sendo **ato único**. A correção que
funcionou, em duas escalas, passa a ser norma de P1/P2:

1. **voto-esqueleto**: o artefato de saída (evidência E voto) **nasce como esqueleto** com os itens
   `EM APURAÇÃO`, e cada item é gravado **ao ser medido**;
2. **item grande também se fatia**: o item 3 da C4 virou objeto de 6 sub-chaves e a queda seguinte
   custou 1/6 em vez de 6/6.

Regra: **onde medir tem N passos, gravar tem N passos.** Inline nos contratos desde o SAN2-6 (§C7.7,
dentro do P2).
```

### 3.6 — KPI: as 3 dívidas do porteiro do #367 + a entrada do próprio bloco (§C3)

1. **`Kpis/kpis-latest.json` — `blocks_completed` 156 → 157** (l.64), com `note` nova contendo, no
   mínimo: a condição literal da entrada SAN2-5 cumprida ("sobe para 157 SÓ QUANDO O SAN2-5 MERGEAR" —
   mergeou); a re-medição própria (`git rev-parse main origin/main` = `e6a6461` nos dois, `gh pr view
   367` = MERGED); a reatribuição §A2 das 3 dívidas do porteiro do #367 ao SAN2-6 (precedente SAN2-5 ×
   B.10/#366); e a próxima condição: **"sobe para 158 SÓ QUANDO O SAN2-6 MERGEAR"**.
2. **`Kpis/kpis-history.json`, entrada 150 (SAN2-5)** — preencher `pr: 367`, `merge_commit:
   "e6a6461"`, `approved_head: "5256b49"` e apensar ao FINAL da `description` o colchete de backfill
   (estilo das entradas #362-#366), contendo obrigatoriamente: (a) que `5256b49` é o head JULGADO,
   lido na ata `J-SAN2-5.md` l.4, **NÃO** o headRefOid `657928f` (delta = correções pós-voto
   C3-A1/C3-A5, registro puro); (b) a re-medição própria dos hashes; (c) a **ÂNCORA DE HEAD** (dívida
   3): os números "442 0" (plano) e "100 0" (pendencias.md) da prova APPEND-ONLY **valem no head
   `5256b49`**; no squash `e6a6461` os mesmos arquivos medem **506 0** e **121 0** (o pós-voto apensou
   depois da medição) — o claim de append-only vale nos dois heads; norma da ERRATA C3-A1: todo número
   de diff vem com o head em que vale; (d) a reatribuição §A2 ("o porteiro nomeou o PR do ciclo 5; o
   SAN2-6 entrou antes por ordem do dono e paga, para o ciclo-teto não pagar dívida alheia").
3. **Nova entrada 151 (SAN2-6), append** — `pr`/`merge_commit`/`approved_head` **null na autoria**
   (§C3.5); `blocks_completed` **157**; trilhas de teste **CARREGADAS com marcador §C3.3** (backend
   2609/2611 · smoke 1126/1126 · flutter 864/864 · contratos 34/34) com a prova de não-toque:
   `git diff --name-only main...HEAD -- src/ tests/ prisma/ mobile/ frontend/ scripts/ .github/` =
   **vazio** nas duas pontas; `mvp_demo` 99% / `mvp_vendavel` 88% **INTOCADOS** (§C3.4 — contrato não é
   escopo de produto); descrição diz o que entrou (P1–P6 inline + teto + README + emenda na fonte + 3
   dívidas pagas) E o que não entrou (§5 deste plano, nomeado item a item).
4. **Painel:** `node scripts/kpi-freeze.mjs` (reinjeta o fallback embutido do `app.js` — `Kpis/app.js`
   só muda por ESTE script) e depois `--check` ec=0; guard `tests/kpi-dashboard-charts.test.ts`
   reexecutado (16/16); `node --check Kpis/app.js`. Nenhuma dimensão nova nasce → nenhuma mudança
   estrutural no `index.html` (§C3.0 satisfeito por hidratação).

### 3.7 — Registros (`controle/` + rastreabilidade §A2)

1. **`agent-orchestration/controle/pendencias.md` (append):** nova pendência
   `P-CLAUDE-ABERTURA-PRECEDENCIA-DESATUALIZADA` — BAIXA · `pre-existente` (texto de 2026-07-28,
   D-INTEROP) · **dono: o dono (decisão humana)**: `CLAUDE.md` l.3-6 diz "valem o `AGENTS.md` e as
   fontes de verdade" e a regra de espelhamento ~25 linhas abaixo diz o contrário (prevalece o
   `CLAUDE.md`; o `AGENTS.md` já está certo). Mexer na abertura do contrato canônico não é deste bloco
   (§5). SEM correção proposta (§C7.4-bis).
2. **No mesmo append, sub-seção "Registro §A2 (SAN2-6)":** (a) consolidação do micro-drift §2.6
   (A:416 alinhado ao canônico); (b) reatribuição das 3 dívidas do porteiro do #367 ao SAN2-6.
3. **Regenerar `agent-orchestration/controle/pendencias-indice.md` PELO script**
   (`python agent-orchestration/controle/gerar-indice-pendencias.py` — executar script ≠ editar
   `scripts/**`; o gerador vive em `controle/`): diff eol-neutro deve conter só as linhas da pendência
   nova (lição C3-A5 do #367).
4. **`agent-orchestration/docs/status-geral.md` (append ≤5 linhas):** SAN2-6 entregue, ordem do dono,
   PR#, e que o próximo bloco segue sendo o ciclo 5 (parecer do porteiro do #367 intacto).

---

## §4 — Como provar (cada prova é executável; saídas esperadas ditas ANTES)

1. **P1–P6 presentes:** `grep -cE '\*\*P[1-6] —' CLAUDE.md` = **6**; idem `AGENTS.md` = **6**.
   `grep -c 'Modelo de mandato' CLAUDE.md AGENTS.md` ≥ 1 cada.
2. **Emenda nos três lugares:** `grep -c 'granularidade do registro acompanha a da medição'` ≥1 em
   `CLAUDE.md`, `AGENTS.md` e `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md`.
3. **Teto literal:** `grep -cF 'última tentativa sob qualquer das duas regras'` = **1** em `CLAUDE.md`,
   **1** em `AGENTS.md`, **1** em `controle/decisoes.md` (a fonte) — a mesma string nos três é a prova
   de transcrição, não paráfrase. `grep -c 'Não há ciclo 6' CLAUDE.md AGENTS.md` = 1/1.
4. **Paridade §A2 (o trecho fica IDÊNTICO):** extrair de cada contrato o bloco do item 4 ao item 7 do
   §C7 (`awk '/^4\. \*\*Protocolo de dificuldade — TETO/,/^---/' CLAUDE.md > /tmp/c7c.txt` e o mesmo
   para `AGENTS.md`, usando o scratchpad e não `/tmp`); `diff <(tr -d '\r' < c7c.txt) <(tr -d '\r' <
   c7a.txt)` = **0 linhas** (o micro-drift §2.6 morre junto).
5. **EOL sem mudança de massa:** pós-edição, `tr -cd '\r' < f | wc -c` **==** `wc -l < f` para
   `CLAUDE.md`, `AGENTS.md` e `.agents/agents/README.md` (seguem 100% CRLF); `git diff --numstat`
   mostra por arquivo **inserções ≤75 e remoções ≤20** — qualquer remoção na casa de 542/591/97 =
   conversão de EOL disfarçada = **parar e reverter o arquivo**.
6. **Append-only na fonte:** `git diff --numstat -- agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md`
   = `N 0` (zero remoção) e as 97 linhas originais intactas
   (`git show HEAD:...PROTOCOLO... | head -97` idêntico eol-neutro ao `head -97` do novo).
7. **README × disco:** `grep -c 'omega5p' .agents/agents/README.md` = **0**;
   `grep -c '24 papéis\|24 agentes' .agents/agents/README.md AGENTS.md` = **0/0**;
   `grep -c 'inspetor-de-terreno-da-junta\|porteiro-pos-merge' .agents/agents/README.md` ≥ **2**;
   `ls .claude/agents/*.md | wc -l` = **23** = o número que o README passa a alegar;
   `node scripts/sync-agent-agents.mjs --check` ec=0 "23 agentes" — **consignando que é cego a
   `especialistas/`** (não é prova sobre os 8 corpos; §2.4).
8. **KPI:** `node -e` conferindo: history = **151** entradas; entrada 150 com `pr===367`,
   `merge_commit==='e6a6461'`, `approved_head==='5256b49'`; entrada 151 com os três `null`;
   `blocks_completed.value===157` no latest; a string `5256b49` presente no colchete de backfill E a
   âncora dos números ("valem no head") presente. `node scripts/kpi-freeze.mjs --check` ec=0;
   `node --test --import tsx tests/kpi-dashboard-charts.test.ts` 16/16; `node --check Kpis/app.js`.
9. **Higiene:** `git diff --check` limpo; `git status --porcelain` sem tocar nada fora do §5;
   `git diff --name-only main...HEAD -- src/ tests/ prisma/ mobile/ frontend/ scripts/ .github/
   .claude/agents/` = **vazio**.

---

## §5 — Escopo (caminhos exatos)

**PERMITIDO (fechado — 9 alvos):**
- `CLAUDE.md` — SÓ §C7.4 (bullet novo §3.1) e §C7.7 (substituição §3.2). Nenhuma outra seção.
- `AGENTS.md` — os mesmos dois + l.150, l.586, l.416 (§3.3).
- `.agents/agents/README.md` — as 9 edições do §3.4.
- `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md` — **APPEND-ONLY** (§3.5).
- `Kpis/kpis-latest.json` · `Kpis/kpis-history.json` · `Kpis/app.js` (este SÓ via `kpi-freeze.mjs`).
- `agent-orchestration/controle/pendencias.md` (append §3.7) + `pendencias-indice.md` (regenerado por
  script).
- `agent-orchestration/docs/status-geral.md` (append ≤5 linhas).
- `agent-orchestration/omega/planos/SAN2-6-plano.md` (este arquivo).
- Artefatos da junta SAN2-6: `agent-orchestration/omega/juntas/J-SAN2-6*.md` +
  `agent-orchestration/omega/juntas/votos/SAN2-6/*`.

**PROIBIDO (além do §C4 padrão):** `src/**` · `tests/**` (inclusive o guard E2c — segue não-nascido,
dito no KPI) · `prisma/**` · `migrations/**` · `scripts/**` (executar pode; editar não —
`P-SYNC-AGENTS-NAO-RECURSIVO` é de OUTRO bloco) · `.github/**` (a linha do `ci.yml` é do ciclo 5) ·
`frontend/**` · `mobile/**` · `.claude/agents/**` (nenhum corpo de papel, nem `especialistas/`) ·
`.agents/agents/*.md` exceto `README.md` (papéis só via script) · `Kpis/index.html` ·
`agent-orchestration/codex/comandos/B-O6R-02-ciclo5-plano.md` (é do ciclo 5) · a branch
`feat/o6r-b02-financial-uow` e o worktree `agent-af6ea` · lockfiles · `.env` · **base viva
`erp-postgres`/`erp-redis` — nem leitura** (bloco não tem nada que precise de banco).

**O que NÃO entra (declarado, com destino):**
1. A imprecisão de `CLAUDE.md` l.3-6 (abertura contradiz a regra de espelhamento 25 linhas depois) →
   **pendência com dono** (§3.7.1). Mexer na abertura do canônico é decisão humana.
2. `P-SYNC-AGENTS-NAO-RECURSIVO` (tornar o sync recursivo) → `scripts/**` é de outro bloco; aqui só a
   NOTA no README que neutraliza o dano para o handoff (§3.4.9b).
3. Qualquer coisa do ciclo 5 em si: S0 de absorção, `ci.yml`, corpos `*-c5-*`, drills, censo das 68
   órfãs. O SAN2-6 prepara o TABULEIRO documental; não move nenhuma peça do jogo.
4. O guard E2c (`tests/junta-voto-escopo-guard.test.ts`) → segue inexistente; re-medição manual na
   abertura de cada junta continua (consignação do porteiro do #367).
5. `Kpis/kpis-history.md` (espelho Markdown parado desde o #360 — pré-existente, entrada 150 já o
   consigna) e `P-KPI-RECENT-CONGELADO` → blocos próprios.

---

## §6 — Bateria de validação (ordem exata) + armadilhas MEDIDAS desta sessão

**Baseline honesto de testes:** bloco documental — **nenhum teste novo nasce e nenhum teste de produto
é reexecutado** (trilhas CARREGADAS §C3.3). Baseline de guards N=16 (`kpi-dashboard-charts`),
reexecutado. **Meta M≥2N: NÃO SE APLICA** — afirmar o contrário fabricaria número (§C3.3).

**Bateria (na ordem):**
1. As provas §4.1–§4.4 (grep de presença, emenda, teto literal, extração+diff de paridade).
2. §4.5 EOL: `tr -cd '\r' | wc -c` == `wc -l` nos 3 CRLF; `git diff --numstat` dentro das faixas.
3. §4.6 append-only da fonte; §4.7 README × disco + `sync-agent-agents.mjs --check`.
4. KPI: `node scripts/kpi-freeze.mjs` → `--check` ec=0 → asserts §4.8 →
   `node --test --import tsx tests/kpi-dashboard-charts.test.ts` (16/16) → `node --check Kpis/app.js`.
5. `npm run check` (tsc — prova que nada de código foi arrastado).
6. Índice de pendências regenerado = commitado (diff eol-neutro só com as linhas novas).
7. `git diff --check` · `git status --porcelain` (só os arquivos do §5) · §4.9 diff de não-toque.
8. Limpeza §C5: só scratchpad (bloco não builda nada); reportar em 1 linha.

**Armadilhas (todas MEDIDAS nesta sessão ou nas duas anteriores — carregar no mandato do dev):**
- **`sed`/`perl -i` NÃO tocam os contratos**: em modo texto removem CR e convertem o arquivo INTEIRO de
  CRLF para LF — mudança de massa disfarçada de inserção. Editar com a ferramenta **Edit** (âncora de
  texto exata) ou Write de arquivo completo com EOL preservado.
- **`grep -c $'\r'` NÃO conta CR aqui** (devolveu 0 para arquivo com 494 CRs) — medir com
  `tr -cd '\r' | wc -c`.
- **`md5sum`/`git status` mentem sob `core.autocrlf=true`** — comparar conteúdo eol-neutro
  (`tr -d '\r'` dos dois lados), nunca hash de disco.
- **Nada de `git archive`+`tar`** para medir conteúdo de commit (fabrica divergência por CR —
  §C7.1-ter(c)); usar `git show <rev>:<caminho>`.
- **Heredoc com aspas quebra em comando longo** (medido de novo NESTA sessão: chunk de ~120 linhas
  falhou com "unexpected EOF"; ≤60 linhas passou íntegro) — gravar por Edit/Write; se heredoc, chunks
  pequenos com verificação após cada um.
- **O `--check` do espelho é CEGO a subdiretório** — ec=0 não prova nada sobre `especialistas/` (§2.4).
- **O item 7 novo contém fence ``` interno** — conferir que o render do markdown não engole a lista
  (fence indentado 3 espaços, como no protótipo §3.2).

---

## §7 — Riscos + rollback

| # | Risco | Mitigação |
|---|---|---|
| R1 | **Inchar o contrato** (o custo real que o dono paga a cada leitura) | Orçamento duro D-a: líquido ≤60 linhas/contrato (medido no plano: +53); "por quês" longos ficam na fonte; junta C1 confere o orçamento como item de voto |
| R2 | **Quebrar a paridade §A2** (contratos divergem no trecho comum) | Texto escrito UMA vez e aplicado byte-idêntico; prova §4.4 (extração + diff eol-neutro = 0); C2 re-executa |
| R3 | **Mudança de massa EOL** (sed/normalizador converte 542/591/97 linhas) | Proibição de sed; prova §4.5 (CR==linhas + faixas de numstat); reverter o arquivo inteiro ao primeiro sinal |
| R4 | **Transcrição infiel** (parafrasear norma e mudar o sentido) | Núcleos verbatim nomeados: frase do teto (§4.3, grep -F contra a fonte), emenda R2 do P3, Modelo de mandato; C1 confere fonte×contrato |
| R5 | **Contrato ⊃ fonte** (emenda só no contrato = drift por construção) | §3.5 apensa a MESMA emenda à fonte no mesmo PR; prova §4.2 (3 arquivos) |
| R6 | **Backfill com hash errado** (headRefOid `657928f` no lugar do head julgado — classe já pega 2× pelo porteiro) | Valores transcritos do parecer E conferidos na ata `J-SAN2-5.md` l.4; assert §4.8 pina `5256b49` |
| R7 | **README quebrar a emulação Codex** (remover linha ainda referenciada) | Medido §2.4: omega5p = 0 referências fora do README; gates e especialistas são ADIÇÕES; sync --check no fim |
| R8 | **Escopo escorregar para o ciclo 5** (a tentação de "já consertar" o guard E2c, o sync, o ci.yml) | §5 nomeia cada um com destino; junta reprova por escopo, não só por mérito |

**Rollback:** bloco 100% git (docs/JSON) — `git revert` do squash restaura tudo; nenhum estado fora do
repo (nenhum container, nenhum banco, nenhum artefato de build). O painel volta junto porque hidrata
dos JSON revertidos + `kpi-freeze.mjs` do estado anterior.

---

## §8 — Junta e quórum (sob `D-JUNTA-ESCOPO-E-CALIBRACAO`), decidido com argumento

**Quórum: MAIORIA de 3.** Argumento: o gatilho de unanimidade do §C7.1-ter(b) é por MATÉRIA do bloco —
dinheiro, segurança, permissão ou perda de dado — e este bloco não toca nenhuma: é
contrato/registro/KPI, diff de produto vazio. O contra-argumento ("edita as regras da própria junta,
então mereceria quórum maior") foi considerado e rejeitado: inflar quórum por precaução meta é
exatamente a espiral que `D-TETO-DOIS-CICLOS` mediu e matou (escalar reduz a chance de aprovação sem
aumentar a de acerto), e o precedente está posto — o `J-SAN2-5`, bloco da MESMA natureza (governança de
junta, registro e painel), rodou sob maioria de 3 ("quórum exigia maioria; saiu unânime", parecer do
porteiro do #367). `critico-adversarial` NÃO obrigatório (não é bloco de invariante — §C7.1-ter(b));
o mandato adversarial de transcrição está na C1.

**Cadeiras (mandatos ≤3 itens — P4; identidades NOVAS; nenhuma pode ser o planejador nem o dev —
§C7.4-bis; todas sob P1–P6 + emenda voto-esqueleto: este bloco come a própria comida):**
- **C1 — Fidelidade de transcrição (VETO):** (1) frase do teto × `decisoes.md` l.1790-1791 (grep -F);
  (2) P1–P6 + Modelo de mandato + emenda × fonte e × `J-SAN2-2.md` (núcleos verbatim); (3) orçamento
  D-a (líquido ≤60/contrato, medido por numstat).
- **C2 — Paridade e terreno de texto (VETO):** (1) extração §4.4 = diff 0 entre os contratos;
  (2) EOL §4.5 (CR==linhas, faixas de numstat, nada de sed); (3) README × disco §4.7 (23, omega5p=0,
  2 gates, nota especialistas) + append-only da fonte §4.6.
- **C3 — KPI e dívidas (VETO):** (1) backfill 367/`e6a6461`/`5256b49` + âncora "442 0"/"100 0" (§4.8);
  (2) 157 no latest + entrada 151 com null/§C3.3/§C3.4; (3) guards (freeze --check, charts 16/16,
  `node --check`) + índice de pendências regenerado.

**Antes da junta:** `inspetor-de-terreno-da-junta` (fail-closed, §C7.1-bis) — com a nota de que
nenhuma cadeira muta a árvore (bloco de leitura+prova; o único que muta é o dev, antes, no worktree
`san2-r`); clusters descartáveis dispensados COM REGISTRO no parecer do inspetor (não há banco no
bloco). **Depois do merge:** `porteiro-pos-merge` — que deve encontrar as 3 dívidas do #367 PAGAS e
nomear as do SAN2-6 (backfill §C3.5 da entrada 151 + `blocks_completed` 157→158) para o PR seguinte,
que é o **ciclo 5**. Reprovação: teto de 2 (§C7.4) — ciclo 2 com identidade nova na cadeira que
reprovou; reprovou de novo, dossiê ao dono.

---

*Plano gravado seção a seção conforme fechava (emenda voto-esqueleto aplicada a ele mesmo). Fontes
lidas nesta sessão: contratos em `b324258`, `decisoes.md` l.1770-1814, `PROTOCOLO-JUNTA-RESILIENTE.md`
integral, `J-SAN2-2.md` l.75-107, `J-SAN2-5.md` (via parecer), parecer do porteiro do #367 integral,
`kpis-latest.json` l.55-84, `kpis-history.json` entradas 149-150, `sync-agent-agents.mjs` l.27/100-108.*
