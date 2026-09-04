# Evidencia — C1 `auditor-do-obituario` (SAN2-3, PR #364, head 23d9227)

Registro incremental: cada item apensado APOS medir.

## I1 — A conta 15 SEPULTADAS + 2 RESERVADAS (leitura propria das atas)

**Comando 1** — `grep -n -i "reserv|c5-arnes" juntas/J-B-O6R-ARNES.md` + `sed -n '50,56p'`
Saida (l.51 e l.56, verbatim da ata):
- l.51: "`jurado-c5-arnes-catalogo-postgres`. O inspetor **BLOQUEOU** na 1a passada: o corpo dele e o contrato de"
- l.56: "`bd0d700`; `jurado-c5-arnes-catalogo-postgres` ficou **intocado e reservado** para a junta do ciclo 5."
=> A ata **reserva mesmo** a identidade para o ciclo 5, l.51-56, exatamente como o obituario (l.92) cita.
   A citacao do obituario ("O titular novo nasceu em bd0d700; ... ficou intocado e reservado para a junta do
   ciclo 5") comeca no fim da l.55 e termina na l.56 — **dentro** do intervalo declarado. Citacao FIEL.

**Comando 2** — `grep -rn "critico-c5-adversarial" agent-orchestration/omega/` (exceto o obituario)
Saida relevante: `planos/B-O6R-02-ciclo5-plano.md` linhas **10, 171, 230, 301** — exatamente as quatro
linhas que o obituario (l.93) declara. l.230: "**Cristico:** `critico-c5-adversarial` (criado, `77ead96`)
ataca ESTE PLANO antes do codigo". **Nenhum** arquivo de voto ou ata de caso concluido o traz como autor.
=> Preservado COM razao: e o critico ja escalado do ciclo 5, que ainda nao rodou.

**Comando 3** — `ls juntas/ | grep -i ciclo5` -> exit 1 (vazio); `ls juntas/votos/ | grep -i ciclo5` -> exit 1
(vazio); `ls -la planos/B-O6R-02-ciclo5-plano.md` -> existe (46150 bytes, 29/08).
=> A junta do ciclo 5 **nao rodou**; o plano existe e espera. As duas reservadas nunca votaram.

**Comando 4** — `sed -n '2p' juntas/votos/B-O6R-ARNES/01-jurado-arnes-catalogo.json`
Saida: "...a cadeira anterior jurado-c5-arnes-catalogo-postgres foi recusada pelo inspetor de terreno —
contrato de outra junta (ciclo 5 do B-O6R-02) — e permanece reservada aquela junta; nada dela foi herdado..."
=> **Segunda fonte independente** (voto assinado da cadeira 1 do ARNES) confirma a reserva.

**Comando 5** — `sed -n '92,93p' OBITUARIO-IDENTIDADES.md | grep -o "RESERVADA[^|]*"`
Saida: "RESERVADA — junta do ciclo 5 do `B-O6R-02`" e "RESERVADA — ciclo 5 do `B-O6R-02`".
=> As duas estao marcadas **RESERVADA**, nao SEPULTADA, com a junta de destino nomeada na propria linha
   (exigencia da regra de consulta §1.3 do proprio obituario). O erro caro do bloco **nao foi cometido**.

**Veredito parcial I1: APROVADO.** A conta 15+2 esta certa e as duas reservadas estao preservadas com razao
escrita e nomeada. O obituario corrige o enunciado herdado ("16+1") e registra a divergencia no §5(b) e em
`controle/decisoes.md` (`REGISTRO-SAN2-3-OBITUARIO`) — §A2 cumprida, sem consolidacao silenciosa.

## I2 — As 15 sepultadas sao queimadas de fato; e falta alguem?

**Comando 6 — o universo declarado bate byte a byte.**
`git ls-tree -r --name-only demo/investidor -- .claude/agents/especialistas/` (17 arquivos) vs. os nomes das
tabelas §3.1/§3.2/§3.3 do obituario -> `diff` = **VAZIO**. 17 arquivos = 17 linhas, **mesmos nomes**.
=> Ninguem do universo declarado ficou de fora, e nenhuma linha foi inventada.

**Comando 7 — quem assinou voto (classe `votou`).**
`sed -n 's/.*"jurado"..."\([a-z0-9-]*\).*/\1/p'` em cada `votos/*/0[1-9]*.json` das duas juntas concluidas:
- B-O6R-ARNES (3): jurado-arnes-catalogo-postgres · jurado-arnes-runner-denominador · jurado-arnes-diff-escopo-registro
- B-O6R-02-ciclo4 (5): jurado-c4-fail-closed-enumeracao · jurado-c4-suplente-{ataque-ao-dinheiro, banco-triggers, arnes-concorrente, validador-diff-plano}
=> **8 autores reais**, e o obituario marca **exatamente esses 8** como `votou`. Zero divergencia.

**Comando 8 — os 7 restantes (classe `nomeada-e-preparada`) foram mesmo preparados.**
- 3 suplentes ARNES: `BRIEFING-B-O6R-ARNES.md` **l.49-51** os nomeia um a um na tabela de cadeiras.
- 4 titulares c4 caidos: `grep -c` -> **2 ocorrencias no briefing + 1 na ata** para cada um dos quatro.
=> **Ninguem foi sepultado sem ter votado OU sido nomeado-e-preparado sobre o material do caso.** A classe
   e rotulada honestamente na propria tabela (coluna `Classe`), com o porque escrito (l.59-62 e l.81-83).

**Comando 9 — ACHADO: 15 identidades queimadas FORA do registro.**
Varredura de **todos** os `votos/*/*.json` do repositorio pelo campo autor/cadeira devolve, alem das 8 acima,
mais **15** identidades que assinaram voto em junta **concluida** e **nao constam** do obituario
(`grep -c <nome> OBITUARIO-IDENTIDADES.md` -> **0** para as 15):
B-O6R-REG (3): jurado-reg-diff-escopo · jurado-kpi-numeros-B-O6R-REG · jurado-suplente-trilha-append-only-B-O6R-REG
SAN2-1 (2): jurado-san2-1-kpi-registro-ciclo2 · jurado-triagem-classificacao-san2-1-c2
SAN2-1R (3): jurado-san2-1r-fidelidade-opcao-c · jurado-san2-1r-diff-portagem-2026-08-29 · jurado-suplente-kpi-registro-san2-1r
SAN2-2 (4): provador-de-mutacao-do-espelho · curador-da-lista-suites-ci · zelador-do-contrato-canonico · auditor-do-kpi-honesto
SAN2-R (3): jurado-san2r-diff-espelho-2026-08-29 · jurado-forense-san2r-c1-2026-08-29 · jurado-san2r-kpi-registro
**Forma:** N=15, contadas so nos `.json` com campo de autor; o numero real e MAIOR (jurados caidos e
inspetores nao entram nesta contagem). **Causa:** as 15 nunca existiram como ARQUIVO
(`git ls-tree demo/investidor -- .claude/agents/` -> **0 ocorrencias** para cada nome), e o registro foi
construido a partir do diretorio `especialistas/`, nao a partir das atas.

**ESCOPO = `pre-existente`, com evidencia de data E de origem:**
(a) **Data** — as atas dessas juntas sao anteriores a este bloco: `J-B-O6R-REG.md` **74430cc 2026-08-29**,
    `J-SAN2-1R.md` **87f6ae6 2026-08-29**, `J-SAN2-R.md` **a0a1075 2026-08-29**, `J-SAN2-2.md` **d283903
    2026-08-30** (o proprio merge que liberou este bloco). O commit julgado e `23d9227` **2026-08-30**.
(b) **Origem** — o mandato escrito do bloco e o descarte/registro **dos 16 de `especialistas/`**
    (`planos/SAN2-3-plano.md` l.54-57, citando os porteiros #362/#363: *"obituario dos 16 especialistas"*).
    Identidade sem arquivo nunca esteve no enunciado.
**Nao reprova** (§C7.1-ter). Vira **pendencia nomeada**. Nao proponho correcao (§C7.4-bis).

**Atenuante medido, que impede tratar isso como falsa seguranca:** o proprio documento **declara a
fronteira** (§4: *"cobre identidades descartaveis de caso (as `especialistas/`). Para o resto, aponta as
atas"*) e **se recusa a absolver por ausencia** (§1.4: *"**Ausencia do nome aqui NAO absolve** ... o gate
segue **fail-closed** — nome nao listado exige a conferencia nas atas, nao um passe livre"*). Um compositor
que consulte so a tabela §3 nao recebe passe livre pela regra escrita.

**Veredito parcial I2: APROVADO com 1 achado `pre-existente` (gravidade MEDIA).** Dentro do universo que o
bloco declara, o registro e exato: 17=17, 8 `votou` conferidos contra os arquivos de voto, 7
`nomeada-e-preparada` conferidos contra briefings e atas, **ninguem sepultado sem causa e ninguem faltando**.

## I3 — O obituario serve ao proposito; e o inspetor aponta mesmo para ele

**Comando 10 — as 17 linhas dao nome, motivo e onde atuou.**
`awk -F'|'` sobre as linhas de tabela: **17 linhas, 7 colunas cada, ZERO celulas vazias**
(Identidade · Papel · Status · Classe · Evidencia · Nasceu em). A coluna **Evidencia** cita o arquivo de voto
exato (`votos/<junta>/<n>-<nome>.json`), a ata e o briefing; a coluna **Nasceu em** da o commit e a data.
Contagem derivada da propria tabela: **SEPULTADA=15 · RESERVADA=2**, identica ao placar do §2 (nao ha
divergencia entre o placar declarado e as linhas que o sustentam).
=> Quem compoe junta recebe **nome + motivo + onde atuou + como conferir**. Serve ao proposito.

**Comando 11 — a edicao no inspetor (`git diff main...23d9227`, eol-neutro).**
`+4 linhas` em cada ponta (`.claude/agents/` e `.agents/agents/`), 8 insercoes, **0 remocoes**.
O texto inserido, verbatim:
```
3.1-bis **FONTE PRIMEIRA: `agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md`, lido ANTES do `grep`.**
   `SEPULTADA` = colisao, **BLOQUEADO**; `RESERVADA` so serve a junta nomeada na propria linha (fora dela,
   ou sepulta-la, **BLOQUEADO**). Ausencia do nome la **NAO absolve**: o `grep` nas atas segue obrigatorio.
```
**Comando 12 — o ponto de insercao e o certo.** `grep -n "^3\.\|^## "`: a secao e
`### 3. Papeis — §C7.4-bis`, o item **3.1 e "Inelegibilidade conferida por nome"** (l.75-77) e o novo
**3.1-bis entra em l.79**, imediatamente depois dele e antes do 3.2. `grep -c "3.1-bis"` -> **1** (sem
colisao de numeracao). `ls -la` do caminho citado -> o arquivo **existe** exatamente onde o texto diz.
=> A edicao esta **dentro da conferencia de inelegibilidade**, nao num preambulo decorativo.

**Tres qualidades medidas no texto inserido:**
1. **Fecha o erro caro do bloco pelos DOIS lados:** usar uma `RESERVADA` fora da junta dela **e sepulta-la**
   sao ambos `BLOQUEADO`. O inspetor passa a bloquear exatamente a jogada que este bloco quase cometeu.
2. **Preserva o fail-closed:** "Ausencia do nome la NAO absolve: o `grep` nas atas segue obrigatorio" — a
   fonte nova e ADITIVA, nao substitui a conferencia nas atas.
3. **Neutraliza o achado A-1 do I2 na pratica:** as 15 identidades nao registradas continuam sendo pegas
   pelo `grep` obrigatorio nas atas, que o 3.1-bis manda manter. E por isso que A-1 nao reprova.
   Semantica coerente com o §1 do obituario (regras 1.2/1.3/1.4) — os dois textos dizem a mesma coisa.

**Veredito parcial I3: APROVADO.**

## VEREDITO FINAL — C1 `auditor-do-obituario`: **APROVADO**

I1 APROVADO · I2 APROVADO (1 achado `pre-existente`, media, nao reprova) · I3 APROVADO.
Nenhum achado `dentro-do-bloco`. Achado A-1 publicado com N=15, forma e causa, escopo provado por data
(atas de 29-30/08, anteriores ao head `23d9227`) e por origem (mandato escrito = os 16 de `especialistas/`).
Nao proponho correcao (§C7.4-bis).
