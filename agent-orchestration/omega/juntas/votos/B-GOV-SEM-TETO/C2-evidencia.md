# VOTO-394-C2 — 2ª INSTÂNCIA

**Cadeira:** C2 — consistência normativa · **identidade:** `jurado-semteto-c2-consistencia-normativa` (2ª instância; a 1ª caiu sem veredito — NADA herdado, nem o parcial de 1,7 KB, que NÃO foi aberto)
**Modelo:** Opus 5.5 (claude-opus-5-5), rodando como `general-purpose` (tem Write/Edit, que o corpo nega: Edit NÃO usado; Write usado SÓ para 3 fragmentos de texto no scratchpad, apensados a este arquivo por Bash — nada escrito no repositório nem em worktree)
**Corpo aplicado:** `C:/Users/AMP/w-teto/.claude/agents/especialistas/jurado-semteto-c2-consistencia-normativa.md` · md5 EOL-neutro `635f79df868b907d5b8a1843f9646855` (cru idêntico: o arquivo não tem CR) — CONFERE com o mandato
**Não li** `VOTO-394-C1.md`, `VOTO-394-C3.md`, nem nenhum `c1-*`/`c3-*`, nem o parcial da 1ª instância.

## Divergências corpo × mandato do orquestrador (declaradas, não escolhidas em silêncio)
- worktree: corpo diz `w-stc2`; mandato diz `w-jst2` → usei `C:/Users/AMP/w-jst2` (mandato é quem me lança; `w-stc2` não existia).
- gravação: corpo manda `c2-evidencia.md`/`c2-voto.json` em `votos/B-GOV-SEM-TETO/`; mandato proíbe escrever no repo → evidência única aqui no scratchpad.
- população do item 2: uso a UNIÃO (corpo: contratos + 5 gates ×2 + README + extensão gerada; mandato: + PROTOCOLO-JUNTA-RESILIENTE, EXECUTION_MODEL, comando-template, skills, todos os corpos).
- item 1: corpo cobre só o item 4; mandato cobre §C7.1-bis + item 4 + §C7.7 → meço os três.

## Status dos itens
- ITEM 1: MEDIDO — VERDE (espelho idêntico nos 3 blocos, borda provada, diff simétrico 64×64)
- ITEM 2: MEDIDO — VERDE (lista gerada pela propriedade = exatamente V-07…V-11, todas na pendência com linha e data; R1–R5 achados; mutações discriminam)
- ITEM 3: MEDIDO — trava do ciclo 4 PROVADA por mutação; 1 ajuste (duas leituras contra head pré-#394) + notas

## Terreno (P1)
- `gh pr view 394 --json headRefOid` = `7ad08690bad5e9cbc4d34fe6905b14c6ac634046`; `git ls-remote origin refs/heads/docs/sem-teto-auditoria-no-3` = `7ad08690bad5e9cbc4d34fe6905b14c6ac634046` → COINCIDEM. Head NÃO andou.
- `origin/main` = `fc3363e38aabd77f54e6b53034128182f8000571`; `git merge-base origin/main 7ad08690` = `fc3363e3…` (= a própria main).
- worktree: `git worktree add --detach C:/Users/AMP/w-jst2 7ad08690…` ec=0; `test -e C:/Users/AMP/w-jst2/.git` → existe; HEAD = 7ad08690.
- Objeto = head (o mandato diz "head inspecionado 7ad08690"), logo delta objeto→head vazio por identidade de commit.

## ITEM 1 — espelho (P1)
**Comando:** `git show 7ad08690:{CLAUDE,AGENTS}.md > c2v2/obj.*` ; `python c2v2/extract.py obj.CLAUDE.md obj.AGENTS.md` (extrator com início casando EXATAMENTE 1 vez — senão recusa; fim = 1ª linha após o início que casa o regex de fim). Saída em `c2v2/item1a.json`, ec=0.

| bloco | arquivo | início | fim | nº linhas | CR | md5 cru | md5 EOL-neutro |
|---|---|---|---|---|---|---|---|
| §C7.1-bis (`^   **1-bis. INSPE` → antes de `^2. O humano`, 1 hit no arquivo) | CLAUDE | 391 | 409 | 19 | 0 | 615ded3e4ee6352fa15dee9be6beeb23 | idem |
| | AGENTS | 419 | 437 | 19 | 0 | 615ded3e4ee6352fa15dee9be6beeb23 | idem |
| §C7.4 item 4 (`^4. **Protocolo de dificuldade` → antes de `^4-bis.`, 1 hit cada) | CLAUDE | 413 | 445 | 33 | 0 | db96a8bd950fa0ca4954ba8f22078393 | idem |
| | AGENTS | 441 | 473 | 33 | 0 | db96a8bd950fa0ca4954ba8f22078393 | idem |
| §C7.7 (`^7. **Protocolo de junta resiliente` → antes do 1º `^---` após o início) | CLAUDE | 524 | 576 | 53 | 0 | 7c9294e60e2cbee08c6cc375d2444412 | idem |
| | AGENTS | 552 | 604 | 53 | 0 | 7c9294e60e2cbee08c6cc375d2444412 | idem |

Nota de dado podre no corpo: a leitura da fábrica ("item 4 termina em *Por quê, medido*", ~412–445) está superada — no objeto o item 4 termina em "…(§C7.5) são independentes disto e continuam valendo integralmente." (CLAUDE l.444 / AGENTS l.472); o parágrafo "Por quê, medido" saiu no diff. O extrator alcança essa cauda (M3 abaixo).

**Mutações (cópias em c2v2/, `python c2v2/mut1.py`, saída `item1-mut.json`, ec=0; toda substituição asserida ≠ pristino):**
- M1 (1º `ciclo 4`→`ciclo 5` no item 4 da cópia AGENTS): EOL-neutro db96a8bd…→04572ddd… **diverge** ✔
- M2 (item 4 da cópia AGENTS → CRLF, 32 CR): cru a6d5ea71… diverge, EOL-neutro **continua db96a8bd…** ✔ (neutralidade provada)
- M3 (` X` no fim da última linha não vazia antes de `4-bis.`): 9bf02a83… **diverge** ✔ — o extrator alcança a cauda
- M3b (a linha em branco antes de `4-bis.` vira `X`): 3ff70d94… diverge ✔ ; M3c (cauda do 1-bis) f25b878e… ✔ ; M3d (cauda do §C7.7, "novo.") fea4f203… ✔
- M3e (cabeça do 1-bis alterada): extrator RECUSA (início casa 0 vezes) — fail-closed ✔

**(b) simetria do diff:** `git diff fc3363e3 7ad08690 -- CLAUDE.md` e `-- AGENTS.md`, linhas +/- EOL-neutras como multiconjunto (`c2v2/sym.py`): **64 × 64, só-CLAUDE = 0, só-AGENTS = 0** → nenhuma linha de FERRAMENTA nem de REGRA COMUM assimétrica. (Diferenças de ferramenta pré-existentes — ex. "`agente-pesquisador-web`" × "subagente pesquisador web" no item 3 — estão fora das linhas +/-.)
- M4 (linha de regra comum injetada só na cópia do diff CLAUDE): só-CLAUDE = 1 ✔ (assimetria aparece).

**Veredito parcial item 1: VERDE.** Os três blocos alterados são byte-idênticos (cru e EOL-neutro, 0 CR em cada), borda provada nas duas pontas, resto do diff simétrico.

## ITEM 2 — nenhuma regra VIVA contradiz a nova (P1)
**Gerador:** `c2v2/gen.py <commit> <out> [path=cópia]` — lê **blobs** por `git show <commit>:<p>` (nunca o disco). Classificador: `c2v2/classify.py`. Logs: `gen-obj.log`, `gen-mb.log`, `cls-obj.log`, `cls-mb.log`; tudo ec=0.

**(a) População — N=138 no objeto (132 no merge-base).** Critério: OBRIGATÓRIA = `CLAUDE.md`, `AGENTS.md`, `.agents/agents/README.md` (protocolo de emulação), 5 gates × 2 espelhos; MANDATO/COMPANHEIROS = `PROTOCOLO-JUNTA-RESILIENTE.md`, `EXECUTION_MODEL.md`, `comando-template.md` (raiz e `docs/claude-code-handoff/`), `PROJECT_MEMORY.md` (o CLAUDE.md manda ler antes de todo bloco), `BUILD_ORDER.md`, `API_CONTRACTS.md`, `docs/claude-code-handoff/CLAUDE.md`; EXTENSÃO = **todo** arquivo de texto rastreado em `.claude/agents/**`, `.agents/agents/**`, `.claude/skills/**`, `.agents/skills/**` (superconjunto da extensão por citação de §C7.4/ciclo N). No objeto os corpos rastreados são 23 + 3 especialistas (`jurado-semteto-*`) por espelho.
Varredura complementar fora da população (`git grep` em `scripts tests .github src frontend/src mobile/flutter_app/{lib,test} docs agent-orchestration`): **0** em código/teste/CI; ocorrências só em registro (atas, R-, votos, planos, decisoes, pendencias, status-geral, codex/comandos) e em `omega/plano-mestre.md` (plano da RODADA Ω v3, `361f2c18` 2026-07-13, protocolo de 5) → HISTÓRICO (plano encerrado).

**(b) Sementes.**
1. As 4 do mandato, ocorrências na população, *case-sensitive / -i*: objeto — `D-TETO-DOIS-CICLOS` 13/13 · `Não há ciclo 3` **4/6** · `dossiê ao dono` 2/2 · `teto de dois ciclos` 6/6. Merge-base — 6/6 · **2/3** · **3/5** · **3/6**. **A busca sensível a caixa era cega:** no merge-base perdia 6 ocorrências (README l.61 "não há ciclo 3", "Dossiê ao dono" com D maiúsculo, "TETO DE DOIS CICLOS" nos títulos); no objeto a diferença 4/6 está só nas citações do meu próprio corpo. Fora dos corpos `jurado-semteto-*`, no objeto as sementes só casam `D-TETO-DOIS-CICLOS` em CLAUDE:414 / AGENTS:442 / README:59 — as três são o enunciado da **revogação** (VIVO, não contradiz).
2. Camada gerada: 4-gramas normalizados (sem acento, ≥2 tokens não-stopword) da entrada `D-TETO-DOIS-CICLOS` de `decisoes.md@fc3363e3` (l.1748–1793) + item 4 do `CLAUDE.md@fc3363e3`, **menos** os do item 4 do objeto → **638** n-gramas. (A 1ª execução no merge-base subtraía o item 4 do próprio commit varrido e ficou cega a R2 — corrigido para referência FIXA no item 4 do objeto; registrado aqui.)
3. Classe (S3), todos `-i`: `m[aá]x(imo)?\.?\s*(de\s*)?\d` · `\d+\s*[ªºa]\s*(falha|reprova)` · `ciclos?\s*\d\s*[–—-]\s*\d` · `ciclos?\s*[≥>]=?\s*\d` · `[úu]ltim[ao]\s+(tentativa|ciclo)|o\s+[úu]ltimo\b` · `n[ãa]o\s+h[áa]\s+ciclo` · `\bteto\b` · `ap[óo]s\s+(o\s+)?(ciclo\s*)?\d+\s*(falh|reprov|ciclo)` · `\bciclos?\s+\d` · `\d+\s+(tentativas|rodadas|ciclos)` · e frase com `ciclo|reprova` + `\bpara\b|parada|PARA|dossi|dono|humano|interven`. Mais uma varredura larga (`ciclo|rodada|reprova|tentativa|dossi|teto|PARA|numeral-por-extenso + ciclo/reprova/rodada/falha/vez`) para ler à mão o que o gerador não marcou: 207 linhas fora dos corpos semteto, lidas; nenhuma regra de contagem nova.

**(c) Critério VIVO × HISTÓRICO (aplicado igual; `classify.py`):** H1 caminho de registro (decisões/pendências/status/atas J-/BRIEFING/votos/R-/docs/revisoes/Kpis/codex/comandos) → HISTÓRICO; V2 corpo `jurado-semteto-*` → VIVO-meta (cita a regra como objeto de medição, não a prescreve); H2 marcada revogada/riscada → HISTÓRICO; H3 linha com data **e** verbo no passado em arquivo vivo → HISTÓRICO; resto em arquivo vivo → VIVO. Contradiz = (1) teto/parada/chamada ao dono por contagem, (2) passo obrigatório de protocolo revogado em ciclo numerado, (3) afirma que a regra revogada continua; excluídas as linhas que enunciam a revogação ("revoga", "sem teto", "não para o bloco").

**Resultado no objeto:** 335 ocorrências geradas → VIVO-meta 202 (corpos semteto, todas citação) · VIVO sem contradição 122 · **VIVO + contradiz: 11 linhas = 5 regras**:

| # | arquivo:linha (objeto) | camada que pegou | classe/regra | contradiz? | origem (git blame no objeto) | na pendência? |
|---|---|---|---|---|---|---|
| V-07 | `.claude/agents/validador-mestre.md:100` · `.agents/…:106` | S3 C-max-N, C-Na-falha | VIVO / V1 | (1) "Máximo 2 ciclos…; na 3ª falha = CONDIÇÃO DE PARADA… (reportar ao humano)" | `bed17db3` 2026-07-08 · espelho `0fa2726c` 2026-07-28 | SIM, :100 (:106) |
| V-08 | `.claude/agents/critico-adversarial.md:3,6` · `.agents/…:3,13` | S3 C-ciclos-N-M | VIVO / V1 | (2) "Nos ciclos 4–5 … reabre a premissa … ≥5 fontes". O "máx 2 rodadas" é ataque/defesa do PLANO antes do código → **não** é teto de ciclo (decidido pelo que regula) | `21fdf516` 2026-07-10 · `0fa2726c` | SIM, :3/:6 (:3/:13) |
| V-09 | `.claude/agents/avaliador-mapas.md:17` · `.agents/…:24` | S2 + S3 | VIVO / V1 | (2) "ciclo 3 reabre premissa com pesquisa ≥5" | `56a6077b` 2026-07-13 · `0fa2726c` | SIM, :17 (:24) |
| V-10 | `.claude/agents/agente-fabrica.md:8` · `.agents/…:15` | S3 C-ciclo-num | VIVO / V1 | (2) "Especialistas do ciclo 3" × item 4 / README:124,128 "a cada ciclo" | `21fdf516` 2026-07-10 · `0fa2726c` | SIM, :8 (:15) |
| V-11 | `EXECUTION_MODEL.md:273–278` (tabela; o classificador marca a l.278, as l.275–277 saem pelas camadas S2/S3; a tabela é UMA regra) | S2 + S3 C-apos-N, C-teto | VIVO / V1 (companheiro "detalhe completo") | (1)+(2) "após 5 falho → parada + dossiê ao humano" | `39eb46cc` 2026-07-28; último commit no arquivo `7fada65e` 2026-08-15 | SIM, :273–278 |

**Nada além delas ficou vivo e contraditório.** VIVO sem contradição: item 4, §C7.1-bis e §C7.7 novos; README passo 5 + l.124/128; PROTOCOLO l.5–6; inspetor 2.2 novo; P4 "Máximo 3 itens" e P5 "máximo 2 disparos" (não são ciclos); §C7.6 "replanejamento do protocolo de dificuldade" (sem contagem). HISTÓRICO dentro de arquivo vivo: CLAUDE/AGENTS 361, 369, 379–380 (narrativa do §C7.1-ter), 549 (caso do P3); README 136/144/159 (adendos datados); inspetor 24–29, 60, 71, 143; guardiao:9; arnes:9,84; EXECUTION_MODEL 301–323 (exemplo); API_CONTRACTS 483/502 (rótulo de episódio "B-O6R-02 ciclos 4–5"); **PROJECT_MEMORY.md:37** ("B-O6R-02 … 🚧 ciclo 5 — teto do §C7.4") — linha de status do snapshot datado 2026-08-28 (§0 do arquivo) → HISTÓRICO, mas num arquivo que o CLAUDE.md manda ler antes de todo bloco: **nota**, não regra.

**Prova de ausência dos V-01…V-06 no objeto** (contagem `-i` em CLAUDE / AGENTS / inspetor .claude / inspetor .agents / PROTOCOLO / README, merge-base → objeto): "teto de dois ciclos ficam intactos" [1,1,0,0,0,0] → zeros; "dono passa a ser chamado" [1,1,…] → zeros; "parecer do crítico + PD" [1,1,…] → zeros; "Se ciclo ≥ 3" [0,0,1,1,0,0] → zeros; "não há ciclo 3" [1,1,0,0,0,1] → zeros; "teto de DOIS ciclos" [2,2,0,0,1,1] → zeros; "ciclos 1–2" [1,1,0,0,0,2] → zeros.

**Controles de recall** (no merge-base, onde R1–R3 ainda existem): R1 CLAUDE:522 / AGENTS:550 ACHADO (S1+S3) · R2 CLAUDE:435–436 / AGENTS:463–464 ACHADO **só pela camada S2** (nenhuma semente e nenhum padrão S3 casam — hipótese da fábrica confirmada) · R3a CLAUDE:395 ACHADO (S3 C-ciclo-geq) · R3b inspetor:73 / espelho:79 ACHADO (S3) · R4 critico:3 ACHADO (S3) · R5 validador:100 ACHADO (S3). **5/5.** No objeto: R1/R2/R3 ausentes (removidos pelo PR); R4 = V-08 e R5 = V-07 presentes e na pendência. Controle do classificador no merge-base: 34 VIVO+contradiz (o próprio item 4 antigo, R1, R2, R3a, R3b, R4, R5, README:61/63, PROTOCOLO:6, V-09, V-10, V-11).

**Mutações (cópias; substituição provada por `cmp`, ec=1 = difere):**
- M2.1 recall: cópia de `validador-mestre.md` + "Na quarta reprovação consecutiva, suspenda o bloco e aguarde o humano." (nenhuma semente) → gerador PEGA (S3 frase-ciclo+parada, l.103 da cópia), classificador: **VIVO / contradiz (1)** ✔
- M2.2 outro lado: linha datada no passado ("Em 2026-08-29 o teto era de dois ciclos: o bloco reprovou no ciclo 2, parou e virou dossiê ao dono.") em `decisoes.md` → **HISTÓRICO (H1)** ✔; M2.3 a MESMA linha num corpo vivo → **HISTÓRICO (H3)** ✔; M2.4 a prescritiva no registro → HISTÓRICO (H1). Classes diferentes → o critério discrimina.

**Escopo:** V-07…V-11 = `pre-existente` (git blame acima, 2026-07-08 a 2026-07-28, antes do `D-TETO` de 2026-08-29; a linha usada é o blame no objeto, cujos commits nesses trechos são squash da `main`); arquivos fora do §5/§6 do plano; **o plano os nomeou** (§3.1/§3.3(b)) e a `P-GOV-CICLOS-CORPOS-ORFAOS` (pendencias.md l.9773 do objeto) os lista com linha, espelho e data — inventário feito. Não reprovam.

**Observação fora do objeto (nota, pre-existente):** os PRs abertos #389 (`bc3e736b`) e #388 (`a24f58b5`) rastreiam 6 corpos de especialista (`jurado-o6r04a-c2-*` ×4, `jurado-o6r11-c2-*` ×2) com "CICLO 2 — o ÚLTIMO (D-TETO-DOIS-CICLOS: reprovar aqui manda o bloco a dossiê ao dono)". São corpos de juntas de ciclo 2 já montadas (identidade não reutilizável), mas **entram na `main` com esse texto quando esses PRs mergearem**, e o teste de encerramento da `P-GOV-CICLOS-CORPOS-ORFAOS` ("busca … nos corpos dos dois espelhos devolve 0 linhas vivas") vai reencontrá-los. Não é defeito do #394.

**Veredito parcial item 2: VERDE.**

## ITEM 3 — o gatilho tem mecanismo? (P1)
**Tabela gerada por script** (`python c2v2/item3.py c2v2/obj.CLAUDE.md` → `item3-obj.json`, ec=0; o extrator recusa se `^4. **Protocolo de dificuldade` ou `^4-bis.` casarem ≠ 1 vez). Linhas do `CLAUDE.md@7ad08690` (AGENTS = +28, bloco byte-idêntico pelo item 1).

| # | elemento | arquivo:linha (objeto) | teste das duas leituras | veredito da linha |
|---|---|---|---|---|
| i | quando | CLAUDE.md:419–420 ("Se o ciclo 3 também produzir achado `bloqueia`"), :420 ("antes de abrir o ciclo 4"), :427 ("Conta o `bloqueia` que reprova o ciclo 3 — o `pre-existente` não reprova … nem abre ciclo 4"), :428–429 ("a auditoria é a do ciclo 3: o parecer dela serve aos ciclos seguintes") | UMA vez (a do ciclo 3), escopo `dentro-do-bloco` que reprova. Gate (2.2) usa o MESMO arquivo `…-ciclo3-auditoria.md` para todo ciclo ≥ 4 → coerente. Caso-limite: ciclo 3 reprovado SEM `bloqueia` (ex.: "não consigo medir") — pelo gatilho a auditoria não é obrigatória; pelo §C7.1-bis/2.2 a junta do ciclo 4 não é liberada sem ela. Ações diferentes na hora de abrir o ciclo 4, **convergentes** na junta (o gate força o superconjunto); declarado na T-24 "Efeito" (decisoes.md) | PRESENTE · nota |
| ii | quem convoca | CLAUDE.md:429 "O orquestrador a convoca." | leitura única | PRESENTE |
| iii | quem conduz + inelegibilidade | CLAUDE.md:426–427 "Conduz a auditoria uma identidade que **não votou, não planejou e não desenvolveu** no bloco." | por exclusão; sem corpo/modelo (M-02, na pendência) | PRESENTE |
| iv | perguntas | N **= 5** (a)–(e), CLAUDE.md:421–426. O regex do meu corpo `\([a-z]\)` conta **6** porque o texto novo traz "(§C7.1-ter(a))" em :428 — contagem refinada (parêntese precedido de espaço) = 5 | instrumentos, todos no objeto: (a) re-execução dos comandos registrados em `omega/juntas/votos/<JUNTA>/<cadeira>-evidencia.md` (P1; 379 arquivos em `votos/`) e `R-*` (44 em `reprovacoes/`); (b) `omega/juntas/OBITUARIO-IDENTIDADES.md` + grep em `J-*`/`R-*` (método do inspetor 3.1/3.1-bis/3.2); (c) o plano do ciclo e a re-medição das premissas dele (§C7.4-bis(c)); (d) registro — § "Mandato por cadeira" do briefing + ata/parecer do inspetor; a ferramenta de máquina (`scripts/mandato-preflight.sh`, `mandato-refs.sh`) **não existe** no objeto nem na `origin/main` (só no #393, OPEN, `mergeCommit null`) — a T-23 reescreveu (d) para não depender dela (0 ocorrências de "pré-voo/preflight" no CLAUDE.md do objeto); (e) pareceres do inspetor (`votos/*/00-inspetor*.md`) | PRESENTE · (d) nota |
| v | desfecho "sã" | CLAUDE.md:432–433 "máquina sã → o ciclo 4 abre" | abre-o quem conduz o bloco (orquestrador), por "CONTINUA-SE" | PRESENTE |
| vi | desfecho "defeituosa" | conserta-se :433; quem auditou não conserta :433–434; conserto registrado no arquivo do parecer :434; sem registro o inspetor não libera :434–435 (+ inspetor 2.2 l.74–75). **AUSENTES:** por qual processo (bloco? junta?), **quem verifica** que o conserto consertou (o gate confere presença), **o que limita a espera** | nomeados em `P-GOV-AUDITORIA-MAQUINA-PECAS-ABERTAS` (M-04 resto) com dono (orquestrador → dono para prazo) | PRESENTE-PARCIAL · nota (pendência com dono) |
| vii | quem decide sã×defeituosa, critério | veredito nomeado :430; **quem decide: AUSENTE no contrato** (só na T-22 de decisoes.md: "quem conduz"; quórum de 1); **critério sobre as respostas (a)–(e): AUSENTE** em contrato, corpo e pendência | o mesmo conjunto de respostas admite os dois vereditos | nota (discricionário; cabe no M-02 "corpo do auditor", mas o critério não está nomeado lá) |
| viii | registro | CLAUDE.md:429 `omega/reprovacoes/R-<entrega>-ciclo3-auditoria.md` = inspetor 2.2 l.74 | leitura única | PRESENTE |
| ix | TRAVA | contrato CLAUDE.md:430–431 + §C7.1-bis :395–396; corpo `inspetor-de-terreno-da-junta.md:73–76` (espelho `.agents` 79–82; bloco 2.2 md5 EOL-neutro `e34e5ec8…` idêntico nos dois; `sync-agent-agents.mjs --check` ec=0 "26 agentes, espelho consistente") | ver prova por mutação abaixo — **AMBÍGUA contra head pré-#394** (achado C2-3-1) | PRESENTE · **ajuste** |
| x | relato de não-convergência | dever :441 "O orquestrador relata, a cada ciclo…"; **onde: AUSENTE; quem lê/consequência: AUSENTE** | dever sem destinatário nem efeito = letra morta até ser desenhado | nota (M-06, na pendência) |

**Mutações da tabela (mesmo script, cópias; `cmp` ec=1):** M3.1 apagar a frase "Conduz a auditoria…" → linha (iii) = **AUSENTE** ✔. M3.2 apagar a pergunta (e) → N refinado **5→4** ✔ (o regex cru do corpo cai 6→5 — o critério do corpo precisava do refinamento por causa do "§C7.1-ter(a)" novo; declarado).

**A TRAVA DO CICLO 4 — prova por mutação** (`c2v2/trava.py`: lê o item 2.2 do TEXTO do corpo — limiar, artefato exigido, cláusula do conserto, consequência — e aplica a cenários; nada de memória):
- **MB0 corpo do objeto, ref julgada = CLAUDE.md do objeto:** S1 ciclo 4 sem parecer (com crítico+PD presentes) → **BLOQUEADO — falta parecer da auditoria** ✔ · S3 ciclo 4 "defeituosa" sem conserto → **BLOQUEADO** ✔ · S6 ciclo 7 sem parecer → **BLOQUEADO** ✔ · S2/S4 → satisfeito · S5 ciclo 3 → não se aplica. Idem no espelho `.agents`.
- Vermelhos-controle (o simulador lê o texto): MB1 corpo do merge-base (2.2 antigo "ciclo ≥ 3: crítico + PD ≥5") → S1 **satisfeito** (o gate velho libera o ciclo 4 sem auditoria) e S2 bloqueia por falta de crítico+PD ✔ · MB2 "≥ 4"→"≥ 5" → S1 "não se aplica" ✔ · MB3 "= **BLOQUEADO**"→"= ressalva" → S1 sem consequência ✔ · MB4 sem a cláusula do conserto → S3 satisfeito ✔.
- **Conclusão: SIM — pelo texto do corpo, um ciclo 4 sem o parecer sai `BLOQUEADO`**, quando a ref julgada carrega o contrato do objeto.

**MUTAÇÃO NOVA (minha, não listada por corpo, briefing nem plano) — a ref julgada com o contrato pré-#394.** O item 3.3 do MESMO corpo (`inspetor…md:110–112`, `72fcdcde` 2026-09-08) manda: "confira que **norma citada existe** … na ref julgada (`grep` no `CLAUDE.md` do head). **Cláusula inexistente = o item que a cita NÃO se aplica**". Medi que os três PRs de bloco abertos carregam no head o §C7.4 ANTIGO (`TETO DE DOIS CICLOS`=1, `AUDITORIA DA MÁQUINA`=0, `ciclo3-auditoria`=0): #393 `c32f77b5` (o bloco que a decisão manda "retomar no ciclo 3"), #388 `a24f58b5` (B-O6R-11, ciclo 3 aberto por decisão do dono em 2026-09-25), #389 `bc3e736b`; os três com merge-base `fc3363e3`, sem o #394. Aplicando o corpo do objeto (2.2 novo + 3.3) com a ref = esses heads:
- leitura CLÁUSULA (a cláusula que o 2.2 executa — auditoria / `…-ciclo3-auditoria.md` — não existe na ref) → S1 = **LIBERADO pelo 2.2 ("o item NÃO se aplica")**, nos três heads;
- leitura SEÇÃO (o identificador §C7.4 existe) → S1 = **BLOQUEADO**, nos três;
- ref = objeto → BLOQUEADO nas duas leituras.
Duas leituras, **ações opostas**. Nada no objeto prescreve que um bloco em ciclo ≥ 3 integre a `main` pós-#394 antes da junta do ciclo 4 (o plano §0.6 fixa "o #393 integra por merge" para conflito/KPI, sem amarrar ao ciclo 4). E o 3.3 empurra para a leitura que desliga ("nunca se bloqueia por norma que não está escrita"), enquanto a regra de ouro fail-closed empurra para a que bloqueia.

**Segunda mutação nova (nota):** o 2.2 dispara por "Se ciclo ≥ 4", e o corpo **não tem item que derive o número do ciclo do repositório** (grep por número/ciclo corrente/`R-<entrega>-<ciclo>` no corpo: só o caminho do 2.2). Um briefing que declare "ciclo 3" com `R-<entrega>-3.md` e a ata do ciclo 3 já existentes passa pelo 2.1 (a ata do "ciclo anterior" = 2 existe) e o 2.2 "não se aplica". O número que liga a trava vem do plano/briefing, não de medição.

**As peças abertas (P-GOV-AUDITORIA-MAQUINA-PECAS-ABERTAS) — sem elas, funciona ou é letra morta?** O **gatilho funciona** para a primeira auditoria: convocação (orquestrador), condutor elegível por exclusão, 5 perguntas com instrumento no objeto, registro em caminho fixo, veredito binário, e trava no gate para a junta do ciclo 4 e para o conserto — tudo com `arquivo:linha`. O que as peças abertas custam: M-02 + a falta de critério (vii) tornam o veredito **discricionário**; M-04 resto torna o conserto verificado só por **presença** e a espera **sem limite**; M-05 = uma auditoria por bloco (coerente com a T-24; recorrência é pergunta ao dono); M-09 = duplicação inofensiva com o §C7.4-bis. **O relato de não-convergência (M-06) é, hoje, letra morta** — dever sem destino nem consequência —, mas é mitigação, não o gatilho, e está nomeado com dono.

**Veredito parcial item 3:** as seis linhas obrigatórias (i–vi) PRESENTES (vi parcial, faltas nomeadas com dono); instrumentos de (a)–(e) existem no objeto; trava provada por mutação (BLOQUEADO + 4 vermelhos-controle); **um achado `ajuste`** (C2-3-1: a trava admite duas leituras com ações opostas contra head que não carrega o contrato pós-#394, o que hoje é o caso dos três PRs de bloco abertos, inclusive o #393); notas: T-24 superconjunto, (vii) sem critério, (x) letra morta, número do ciclo declarado.

## VOTO (P2) — equivalente ao `c2-voto.json` do corpo, gravado aqui porque o mandato proíbe escrever no repositório

```json
{
 "jurado": "jurado-semteto-c2-consistencia-normativa — 2ª INSTÂNCIA (identidade nova; nada de briefing, plano, ata ou do parcial da 1ª instância herdado como fato)",
 "modelo": "Opus 5.5 (claude-opus-5-5) — frontmatter do corpo diz `opus`",
 "corpo_aplicado": "C:/Users/AMP/w-teto/.claude/agents/especialistas/jurado-semteto-c2-consistencia-normativa.md · md5 EOL-neutro 635f79df868b907d5b8a1843f9646855 (= mandato)",
 "cadeira": "C2 — consistência normativa",
 "head_medido": "7ad08690bad5e9cbc4d34fe6905b14c6ac634046 (gh pr view 394 = git ls-remote, medido no início e no fim — NÃO andou) · objeto = head · merge-base fc3363e38aabd77f54e6b53034128182f8000571 (= origin/main)",
 "leitura_de_outras_cadeiras": "não li VOTO-394-C1.md, VOTO-394-C3.md, nenhum c1-*/c3-*, nem o parcial da 1ª instância",
 "voto": "APROVADO",
 "achados": [
  {"id":"C2-3-1","defeito":"a trava do ciclo 4 admite duas leituras com ações OPOSTAS quando a ref julgada não carrega o contrato pós-#394","evidencia":"inspetor-de-terreno-da-junta.md:73–76 (2.2, dd79c96f 2026-09-28) × :110–112 (3.3 'norma citada existe na ref julgada … cláusula inexistente = o item NÃO se aplica', 72fcdcde 2026-09-08); heads #393 c32f77b5, #388 a24f58b5, #389 bc3e736b: CLAUDE.md com 'TETO DE DOIS CICLOS'=1 e 'ciclo3-auditoria'=0; `python c2v2/trava.py obj.claude.inspetor… <head> CLAUSULA|SECAO` → S1 (ciclo 4 sem parecer) = LIBERADO na leitura cláusula, BLOQUEADO na leitura seção; com ref = objeto, BLOQUEADO nas duas","gravidade":"ajuste","escopo":"dentro-do-bloco (a trava 2.2 nasceu neste bloco, dd79c96f; o 3.3 é pré-existente mas a dependência de cláusula só presente pós-#394 é do bloco, e o bloco que a decisão nomeia — #393 — está hoje num head pré-#394)","motivo":"a propriedade 'o gate que corre antes da junta do ciclo ≥ 4 exige a auditoria em qualquer head julgado' não vale para heads que não integraram a main pós-#394; nada no objeto amarra essa integração à junta do ciclo 4"},
  {"id":"C2-3-2","defeito":"disparo: ciclo 3 reprovado sem `bloqueia` — o gatilho (CLAUDE.md:419–420, :427) não obriga a auditoria; o §C7.1-bis (:395–396) e o 2.2 não liberam a junta do ciclo 4 sem ela","evidencia":"texto citado; T-24 'Efeito' em decisoes.md declara","gravidade":"nota","escopo":"dentro-do-bloco","motivo":"duas leituras na abertura do ciclo 4, convergentes na junta (o gate impõe o superconjunto); declarado"},
  {"id":"C2-3-3","defeito":"(vii) o contrato não diz quem decide 'sã × defeituosa' nem o critério sobre as respostas (a)–(e)","evidencia":"item3-obj.json: 'quem decide' AUSENTE, 'critério' AUSENTE; só a T-22 de decisoes.md diz 'quem conduz'","gravidade":"nota","escopo":"dentro-do-bloco","motivo":"veredito discricionário; não aparece nomeado na P-GOV-AUDITORIA-MAQUINA-PECAS-ABERTAS (cabe no M-02)"},
  {"id":"C2-3-4","defeito":"(x) 'o orquestrador relata, a cada ciclo…' sem destino nem consequência","evidencia":"CLAUDE.md:441; onde/quem lê AUSENTES","gravidade":"nota","escopo":"dentro-do-bloco — já na pendência (M-06)","motivo":"dever sem efeito = letra morta até ser desenhado"},
  {"id":"C2-3-5","defeito":"(vi) quem verifica que o conserto consertou e o que limita a espera: ausentes","evidencia":"CLAUDE.md:433–435; inspetor 2.2 confere presença","gravidade":"nota","escopo":"dentro-do-bloco — já na pendência (M-04 resto), com dono","motivo":"conserto verificado por presença; espera sem limite"},
  {"id":"C2-3-6","defeito":"o número do ciclo que liga a trava ('Se ciclo ≥ 4') vem do plano/briefing; o corpo não o deriva do repositório","evidencia":"grep no corpo do inspetor: nenhuma instrução de contar `R-<entrega>-<ciclo>`/atas; 2.1 só confere a ata do ciclo ANTERIOR declarado","gravidade":"nota","escopo":"pre-existente quanto ao método do inspetor (2.1 e o fail-closed são anteriores: d2839039 2026-08-30 / 72fcdcde 2026-09-08); o uso como trava é do bloco","motivo":"a entrada da trava não é medida"},
  {"id":"C2-2-1","defeito":"PROJECT_MEMORY.md:37 'B-O6R-02 … 🚧 ciclo 5 — teto do §C7.4'","evidencia":"linha do snapshot datado 2026-08-28 (§0), arquivo que o CLAUDE.md manda ler antes de todo bloco","gravidade":"nota","escopo":"pre-existente (snapshot de 2026-08-28; fora do §5 do plano)","motivo":"HISTÓRICO pelo critério, mas em documento de leitura obrigatória"},
  {"id":"C2-2-2","defeito":"fora do objeto: #389 e #388 rastreiam 6 corpos de especialista com 'CICLO 2 — o ÚLTIMO (D-TETO-DOIS-CICLOS …)'","evidencia":"git ls-tree bc3e736b / a24f58b5 -- .claude/agents/especialistas + grep","gravidade":"nota","escopo":"pre-existente (corpos de 2026-09-20, noutros PRs)","motivo":"entram na main no merge deles; o teste de encerramento da P-GOV-CICLOS-CORPOS-ORFAOS vai reencontrá-los"}
 ],
 "criterios_que_nao_puderam_falhar": [
  "nenhum vermelho-controle deixou de ficar vermelho (item 1: M1/M2/M3/M3b/M3c/M3d/M3e/M4; item 2: M2.1–M2.4 e R1–R5 5/5; item 3: M3.1, M3.2, MB1–MB4)",
  "declarado contra o corpo (dado podre, não contra o objeto): (a) a leitura da fábrica de que o item 4 termina em 'Por quê, medido' está superada — no objeto essa cauda saiu; (b) o regex `\\([a-z]\\)` do corpo conta 6 (o '§C7.1-ter(a)' novo) e a mutação (e) o leva a 5, não 4 — usei a contagem refinada (5→4)",
  "declarado contra mim: a 1ª execução da camada S2 no merge-base subtraía o item 4 do próprio commit varrido e ficou cega a R2; corrigido (referência fixa no objeto) e re-executado antes de concluir"
 ],
 "pendencias_que_aceito": [
  "P-GOV-CICLOS-CORPOS-ORFAOS (pendencias.md l.9773 do objeto): V-07…V-11 conferidas por linha, espelho e git blame — pré-existentes, bloco dono B-GOV-CICLOS-RESIDUAIS",
  "P-GOV-AUDITORIA-MAQUINA-PECAS-ABERTAS (l.9788): M-02, M-04 resto, M-05, M-06, M-09",
  "C1: fidelidade de T-21…T-25 e do ramo 'máquina defeituosa' (T-11) às palavras do dono",
  "C3: número de arquivos em conflito com o #393, a frase do briefing sobre corpos 'não versionados' (medido por mim só de passagem: os 3 corpos semteto ESTÃO no tree do objeto, nos dois espelhos), KPI e registro"
 ],
 "teardown": "w-jst2 removido por git worktree remove --force (só o meu) · cópias descartadas · nenhum rastreado tocado · base viva intocada · resíduo alheio reportado (ver linha de limpeza)"
}
```

**Limpeza (teardown):** worktree `C:/Users/AMP/w-jst2` (só o meu; nenhum processo com `w-jst2` na linha de comando, conferido por Get-CimInstance) removido por `git worktree remove --force` ec=0 — `test -e` confirma ausência e `worktree list` não o lista · cópias mutantes, JSONs e blobs extraídos em `scratchpad/c2v2/` descartados; ficam só os scripts (`extract.py mut1.py sym.py gen.py classify.py item3.py trava.py`) e os logs, como roteiro de re-execução (P3) · nenhum arquivo rastreado tocado; nada escrito no repositório nem no `w-teto` (só li o corpo lá) · base viva (5432/6379) nunca tocada · resíduo ALHEIO apenas reportado: `w-teto` com 22 ` M` cujo `git diff --stat` e `--ignore-cr-at-eol` saem vazios (stat-cache CRLF, fantasma); `w-e4`/`w-devs2` (c32f77b5), `w-devs393`, `w-devt393`, `w-mandato` e os worktrees de `.claude/worktrees/` não foram tocados.

**Justificativa (resumo):** ITEM 1 — §C7.1-bis (CLAUDE 391–409 / AGENTS 419–437, 19 linhas, 0 CR, md5 615ded3e…), item 4 (413–445 / 441–473, 33 linhas, 0 CR, db96a8bd…) e §C7.7 (524–576 / 552–604, 53 linhas, 0 CR, 7c9294e6…) byte-idênticos cru e EOL-neutro; borda provada pelas mutações de cauda nas três; diff 64×64 linhas +/-, zero assimetria. ITEM 2 — população N=138, sementes com/sem -i (cegueira de caixa medida no merge-base: 6 ocorrências), 638 n-gramas gerados, padrão de classe publicado; R1–R5 achados (R2 só pela camada gerada); a lista VIVA contraditória gerada pela propriedade é exatamente V-07…V-11 (11 linhas, 5 regras), todas pré-existentes por git blame (2026-07-08 a 2026-07-28) e na pendência com linha e data; V-01…V-06 ausentes no objeto (contagem zero); critério discrimina (M2.1 VIVO/contradiz × M2.2/M2.3 HISTÓRICO). ITEM 3 — linhas i–vi presentes (vi parcial, faltas nomeadas com dono), 5 perguntas com instrumento no objeto, trava do ciclo 4 PROVADA pelo texto do corpo (BLOQUEADO; 4 vermelhos-controle), e a mutação nova mostrou que a trava depende de o head julgado carregar o contrato pós-#394 (ajuste C2-3-1).

VOTO: APROVADO — os três blocos alterados (§C7.1-bis, item 4, §C7.7) são idênticos nos dois espelhos (md5 EOL-neutro 615ded3e / db96a8bd / 7c9294e6, borda provada pela mutação da cauda), o resto do diff é simétrico (64×64, 0 linhas só de um lado), as únicas regras VIVAS contraditórias que o gerador pela propriedade acha no objeto são as 5 pré-existentes V-07…V-11, todas na P-GOV-CICLOS-CORPOS-ORFAOS com linha e data (R1–R5 encontrados), e o gatilho tem os seis elementos obrigatórios com instrumento no objeto e trava que bloqueia o ciclo 4 pelo texto do corpo — com um ajuste (C2-3-1: contra head pré-#394 a trava admite leitura que a desliga) e sete notas
