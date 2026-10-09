# FÁBRICA — ciclo 2 do B-SAN3-05 (PR 405) — corpos das três cadeiras da junta 2

- **Papel:** `agente-fabrica`. Escreve os corpos e não executa, não julga e não vota. Pelo §C7.4-bis, esta identidade fica
  **inelegível** para qualquer cadeira desta junta.
- **Modelo:** **Claude Opus**, nos créditos de API. **Substituição declarada (§C7.6-bis):** o bloco não toca dinheiro, e pela
  `D-FABLE-ASTRA-SO-DINHEIRO` (decisão do dono, 2026-10-08) o Fable só roda em bloco de dinheiro. O frontmatter dos três corpos
  continua com `model: fable`, porque o fallback cabe a quem invoca e não ao arquivo. Cada corpo manda a cadeira declarar papel, modelo
  e motivo na 1ª linha da evidência e no voto.
- **Janela:** de 2026-10-09T03:12:28Z a 03:36Z. Prazo 05:50Z, corte duro 05:55Z. Terminei antes do prazo, então não há seção PAUSA.
- **O que a fábrica leu e onde.** Li no disco de `C:/Users/AMP/w-o05` estes arquivos: o plano
  `docs/revisoes/SAN3/B-SAN3-05-plano.md` (C2.1 a C2.6, Fecho e as três erratas ao D4), `R-B-SAN3-05-1.md`, `J-B-SAN3-05.md`,
  `DEV-ciclo2-relatorio.md`, `00-inspetor-terreno.md` (por grep), os arquivos de produto e teste citados nos corpos (por grep, com
  leitura de trechos), a receita `C:/Users/AMP/erp-terreno/receita-pg16.sh` e o `TERRENO-PG16.md`.
  O molde foi lido do **checkout principal** (divergência D-2). Li o head nos arquivos de ref, **sem rodar `git`**:
  `refs/heads/fix/runtime-role-sem-bypass` = `refs/remotes/origin/fix/runtime-role-sem-bypass` = `02544a79cead8d9713354697f8ee78dac1575546`.
  O dev do ciclo 2 (Codex) trabalhava nessa mesma árvore durante a leitura. Por isso cada corpo marca todo arquivo:linha, SHA e
  contagem como **[A RE-VERIFICAR]**.

## ANOMALIA — gravação em `.claude/` negada; os corpos estão no scratchpad

Às 03:24Z o sistema de permissões da sessão **negou** a gravação em `C:/Users/AMP/w-o05/.claude/agents/especialistas/`. Não contornei
o bloqueio (não usei Bash nem outro caminho). Os três corpos foram gravados, **completos**, no scratchpad da sessão:

`C:/Users/AMP/AppData/Local/Temp/claude/C--Users-AMP-w-o05/614ddb03-1721-48aa-989c-1543d4e0e83c/scratchpad/especialistas/`

| cadeira | arquivo | linhas | EOL | md5 (cru = EOL-neutro, 0 CR) |
|---|---|--:|---|---|
| C1 | `jurado-san305-c2-credencial-e-papel.md` | 546 | LF | `1fbee2ba9d4cdb13e79394a584899b06` |
| C2 | `jurado-san305-c2-arnes-e-escopo.md` | 500 | LF | `8a69d12f861c3ff9d33b15168ea674a5` |
| C3 | `jurado-san305-c2-ratchet-e-superficie.md` | 500 | LF | `ac55ed582c1de928f978ba0affcce53b` |

Medi as linhas com `wc -l` e o md5 com `md5sum`. Contei 0 CR com Grep `\r` no diretório. Os três terminam na linha do
`VOTO: ABSTENÇÃO`, então não houve truncamento. **Cabe ao orquestrador:** copiar os três para `.claude/agents/especialistas/`, rodar
`node scripts/sync-agent-agents.mjs` (espelho em `.agents/agents/especialistas/`), rodar `--check` e depois
`git add -f` nos dois espelhos, fazer commit e push. A fábrica não tem `Bash` de produto e não versiona. Faça isso fora de um commit
do dev, porque o worktree é compartilhado. Ao copiar, confira o md5 da cópia contra a tabela acima. **Sem o corpo commitado no ramo
julgado, a cadeira para** (cada corpo diz isso na legalidade).

Também neste arquivo de relatório o `Edit` pediu permissão e não pôde ser usado. O `Write` funcionou, e o relatório foi regravado
inteiro a cada passo (P1).

## Os três corpos — de onde veio cada item

Todos seguem o molde `jurado-san3-09c2-c2-dryrun-e-concorrencia.md` e têm as mesmas seções: frontmatter
`name/description/tools: Read, Grep, Glob, Bash/model: fable`, a pergunta, separação das outras cadeiras, quem escreveu, modelo,
inelegíveis por nome, legalidade, quórum/teto/queda/PAUSA, §A7, a classe caçada, terreno, mandato P1–P7, os três itens com
**Comando / Vermelho / Vermelho-controle**, reprovação por construção, voto JSON e a linha final. Elementos comuns, todos tirados do C2.5:

- **Nomes:** C2.5, tabela das cadeiras, l.1575-1579, coluna "identidade nova (proposta)". Usei esses nomes exatos.
- **Quórum unanimidade de 3 com veto e "último ciclo em que achado não grave bloqueia":** C2.5 l.1555-1560 e §C7 item 8(1)(2).
  Cada achado leva `gravidade` (`bloqueia|ajuste|nota`), `escopo` (`dentro-do-bloco|pre-existente` com evidência) e o campo
  **`classe`** (`grave: <uma das quatro>` ou `não grave`), que o C2.5 exige (l.1559-1560).
- **Inelegíveis por nome:** C2.5 l.1581-1589, mais o dev do ciclo 2 com o nome lido em `DEV-ciclo2-relatorio.md` l.3
  (`dev-ciclo2-b-san3-05`), a fábrica, o orquestrador, o inspetor da junta 2, as outras cadeiras e o obituário.
- **Reprovação por construção:** C2.5 l.1591-1612, **verbatim** nos três corpos, mais os itens próprios de cada cadeira.
- **Objeto e HC = H0:** C2.5 l.1563-1566 e J15 (l.1400). Cada cadeira resolve o objeto por `git ls-remote` e `gh pr view 405`.
- **Terreno:** C2.4 l.1495-1502 (só `git`/`gh` no Windows, o resto em container Linux) e C2.5 l.1569 para os prefixos
  `j05c2-c1-`, `j05c2-c2-`, `j05c2-c3-`. Worktrees `C:/Users/AMP/w-j05c2c{1,2,3}`, imagem `erp-junta-node20-pg16:local`,
  receita `C:/Users/AMP/erp-terreno/receita-pg16.sh`. `erp-postgres`/`erp-redis`/5432/6379/55432 nunca são alvo.
  `docker rm -f -v` só no próprio prefixo, nunca `volume prune`. Sem `tail -f`, tudo sob `timeout`.
- **Mutações:** a tabela das 16 mutações da junta (C2.4 l.1527-1547) foi repartida por cadeira exatamente como o C2.5 manda.
  - **C1:** M-B1a, M-B1b, M-D1, M-D2, M-D3a, M-D3b, M-D4.
  - **C2:** M-B2a, M-B2b.
  - **C3:** M-B3a, M-B3b, M-B3c, M-B3d, M-B4a, M-B4b, M-B4c.
  - Total: 7 + 2 + 7 = 16.
- **Saída padrão (o mandato pode trocar):** `votos/B-SAN3-05/ciclo2/C{1,2,3}-evidencia.md` e `…/ciclo2/C{1,2,3}-voto.json`. As
  quedas ficam em `votos/B-SAN3-05/ciclo2/00-quedas.md` (C2.5 l.1566). É proibido gravar nos `C*-*` do ciclo 1.

### C1 — `jurado-san305-c2-credencial-e-papel`

Competência: C2.5 l.1577, coluna "competência", verbatim.

| item do corpo | linha do C2.5 (l.1577) | fontes no plano usadas no corpo |
|---|---|---|
| 1 — B1: B7 (6 configurações × sucesso e MODOS 1–6, controle positivo do leitor), (i) do T14, M-B1a, M-B1b, cabeçalho e `docs/deployment.md`, B14 | "(1) B1 — …" | C2.1 B1 l.1163-1220; B7 l.1516; acréscimo da linha com tty no Fecho l.1639-1642; B14 l.1523; M-B1a/b l.1532-1533; MODO 0 retirado, Fecho l.1633-1639 |
| 2 — D2 + D1: view sobre view (trava e MODO 6), M-D2, T8d, M-D1, B10 | "(2) D2 + D1 — …" | D2 l.1417-1427; D1 l.1410-1415; J1/J2 l.1386-1387; B10 l.1519; M-D1/M-D2 l.1543-1544 |
| 3 — D3 + D4: T15 (dois sinais do A20, `finally`), M-D3a, M-D3b (ec ≠ 124), T9 pelo `DATABASE_URL`, M-D4 | "(3) D3 + D4 — …" | D3 l.1429-1436; D4 l.1438-1441 **substituído** pelas erratas 1–3 (l.1676-1704); M-D3a/b e M-D4 l.1545-1547 |

O corpo também faz a C1 conferir o **B5** (modo `100755` e `eol=lf` do script) como armadilha de terreno (divergência D-12).

### C2 — `jurado-san305-c2-arnes-e-escopo`

Competência: C2.5 l.1578, verbatim.

| item do corpo | linha do C2.5 (l.1578) | fontes no plano usadas no corpo |
|---|---|---|
| 1 — B2 (a)(b)(d): canário determinístico, guarda estrutural, limpeza em `finally`, filho assíncrono com timeout menor que a janela, M-B2a, M-B2b, mais uma forma própria | "(1) B2 (a)(b)(d) — …" | B2 l.1222-1275 (aceite substituído l.1256-1268; "cuidado de desenho" l.1269-1275); B9 l.1518; M-B2a/b l.1534-1535; RC2 l.1649 |
| 2 — B2 (c) + B6: B8 (N=10, 0 `XX000/23505/40P01` no TAP inteiro, resíduo 0) e B6 (N=3 com denominador idêntico + 1 `controle`) | "(2) B2 (c) + B6 — …" | critério (c) l.1265-1268; B8 l.1517; B6 l.1515; divergência de frequência l.1241-1256 e l.1669-1671 |
| 3 — Escopo e integração: B0, B11, B12, B13 (+ B1/B2, ver D-12) | "(3) Escopo e integração — …" | C2.3 l.1443-1491; B0 l.1509; B11 l.1520; B12 l.1521; B13 l.1522; J10, J16, J20 |

A "forma própria" do item 1 vem da exigência do aceite (b) de que **qualquer outra referência** a `child_process` reprove (l.1263-1265).
Com isso, a cadeira mede a guarda pela propriedade e não só pela mutação do plano.

### C3 — `jurado-san305-c2-ratchet-e-superficie`

Competência: C2.5 l.1579, verbatim.

| item do corpo | linha do C2.5 (l.1579) | fontes no plano usadas no corpo |
|---|---|---|
| 1 — B3, o gerador: B4 (`stderr` vazio, OPS 17, inventário = congelado com motivo por chave), C3A/C3B/C3C/C3E, M-B3a/b/d e uma forma própria | "(1) B3 — gerador — …" (a forma própria vem literal: "**e uma forma própria** dentro do alcance declarado") | B3 l.1277-1334 ((e)(g) l.1321-1330); B4 da bateria l.1513; M-B3a/b/d l.1536-1539; J11 l.1396; J17 l.1402; RC3 l.1650; reprovação por construção item 4 |
| 2 — B3 (f) + C3-F2: igualdade catálogo↔L0 por nome nos dois sentidos e tabela → model, as duas grafias, M-B3c | "(2) B3 (f) + C3-F2 — …" | propriedade l.1295-1297; (f) l.1323-1325; (g) l.1326-1330; calibração l.1331-1334; M-B3c l.1538 |
| 3 — B4, a superfície: router e registro em runtime, um cenário por membro FORCE (rotas + 3 jobs), igualdade de conjuntos, M-B4a/b/c | "(3) B4 — superfície — …" | B4 l.1336-1374 (jobs l.1361-1367; viabilidade l.1368-1374); M-B4a/b/c l.1540-1542; J13/J14; RC4 l.1651; parada do dev l.1487-1491 |

Nos itens 2 e 3, o corpo pede **uma grafia própria** (2(d)) e **uma forma própria de membro sem diferencial** (3(d)), além das
mutações do plano. São "vermelho-controle" da propriedade e seguem o aviso do plano: "cada correção anterior dele reabriu a classe
noutra forma" (l.1671). Não contam como um 4º item: ficam dentro do item que medem.

## Divergências notadas — plano × ramo × pedido (a medir pelas cadeiras; a fábrica não julga)

Cada uma está escrita no corpo da cadeira que a mede, como **ponto de leitura a re-verificar**, nunca como achado.

- **D-1 — Posição das erratas.** O pedido diz que as erratas 1–3 ao D4 ficam "logo antes de `### C2.3`". No disco, elas estão
  **depois** do "STATUS: COMPLETO" e do "Fecho do ciclo 2", nas l.1676-1704 (lidas). O D4 original (l.1438-1441) fica antes do C2.3.
  O conteúdo é o mesmo; só a posição muda. O corpo da C1 manda conferir a posição no objeto.
- **D-2 — O molde não está no ramo.** `jurado-san3-09c2-c2-dryrun-e-concorrencia.md` **não existe** em
  `w-o05/.claude/agents/especialistas/`. Ele foi lido em `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/agents/especialistas/`,
  o checkout principal (outra ref).
- **D-3 — O C2.3 proíbe `.claude/**` e `.agents/**`, mas os corpos precisam estar commitados no ramo.** O C2.3 (l.1484) põe esses
  caminhos no PROIBIDO ("só chegam pela integração da `main`"). Só que o protocolo exige que os corpos desta junta estejam
  **commitados no ramo julgado**. Assim, o B0 ("0 arquivo fora do PERMITIDO") falharia **por construção** quando o orquestrador
  commitar os corpos. O corpo da C2, item 3(a), manda separar esses arquivos como **registro do orquestrador** e declarar isso.
  **Pede registro em `controle/` (§A2) pelo orquestrador antes da junta.**
- **D-4 — O dev escreveu numa área reservada.** O C2.3 diz que `agent-orchestration/omega/juntas/**` é "só o orquestrador … o dev
  não escreve aqui", mas o `votos/B-SAN3-05/DEV-ciclo2-relatorio.md` (do dev) está lá. A C2 mede quem o introduziu e dá a gradação.
- **D-5 — De quem é o dono conferido no D2.** O texto do plano (l.1418-1421) fala do dono da view `W`, a que lê **diretamente** a
  tabela FORCE. A implementação lida no disco parece conferir o dono da view **raiz**: `runtime-role.ts` l.42-48 e
  `db-runtime-role.sh` l.142, os dois com `JOIN pg_class v ON v.oid = vf.root_oid … o.oid = v.relowner`. O teste lido cobre só "as
  duas views do superusuário". A C1, item 2(a), mede os casos de **dono misto** (D2-3 e D2-4) por execução, contando as linhas que o
  papel limpo lê de outra organização.
- **D-6 — Nenhum teste executa a igualdade catálogo↔L0 (B3(f)).** No disco, nenhum teste `san3-05-*` compara
  `pg_class.relforcerowsecurity` com o conjunto do gerador. O T11g (l.552-565) confere só as tabelas da superfície. O T13 "L0 exato"
  (l.207-220) confere `FORCE=109` e três acessores com entradas virtuais. A M-B3c "tem de ficar vermelha" na igualdade (f) (l.1538).
  A C3, item 2(a), procura onde (f) é executável no objeto.
- **D-7 — Prefixos extras aceitos pela guarda do D4.** As expressões de mensagem (l.272, 303, 332) aceitam também os prefixos
  `session_user=` e `current_user=`, além de `atributo:/posse:/view:`. A errata 2 fala de "mensagem de recusa no formato
  `via:rolname`". A C1, item 3(c), cruza a guarda com as erratas nos dois sentidos.
- **D-8 — Guarda estática do B1 por grafia.** A guarda estática do T14 (l.782) é uma regex sobre grafias
  (`san3\.password|:'password'|set_config(...password`), e o plano pede uma guarda **fail-closed** (l.1216-1217). A C1, item 1(c),
  mede variantes de grafia contra a B7.
- **D-9 — Guarda estrutural do T14c por contagem, e um canário que pode nem rodar.**
  - A guarda estrutural (l.1109-1113) é por **contagem**: `spawnCommand(`=2, `runCatalogCommand(`=4, `ROLE_SCRIPT`=5, `spawn(`=2,
    `spawnSync(`=3. O plano pede uma allowlist fechada e nominal que reprove qualquer `exec*/execFile*` (l.1260-1265).
  - As asserções estruturais vêm **antes** do canário no mesmo subteste. Uma M-B2a que apague o texto da trava derruba a guarda, e o
    canário nem roda.
  - O canário espera **400 ms fixos** (l.1132), então só é determinístico se o script, sem a trava, criar o papel em menos de 400 ms.
  - O `runPsqlReadOnly` (l.210-220) roda fora da trava.
  - A C2, item 1, mede tudo isso.
- **D-10 — Candidata à forma própria da C3.** `hasKnownInstantiation = (row) => inst.some(…)` (l.393). O "some" suprime o L1
  `INJETADO` quando **alguma** instanciação é reconhecida. Ela entra como candidata, não como a forma própria da cadeira.
- **D-11 — A superfície ainda confere texto e etiqueta.** O T11g ainda confere nota por texto (`/T11[ac]/`, l.563). A etiqueta
  `FORA-DA-SUPERFICIE` dos jobs (l.82-95, 514-525) não aparece conferida contra tabelas. A C3, item 3(a)(d), mede, com a ressalva do
  `B-ARNES-2` (reprovação por construção, item 2).
- **D-12 — Itens da bateria sem cadeira no C2.5.** O C2.5 não atribui B1 (`npm run check`), B2 (`lint`), B3 (os 7 arquivos sem
  banco) nem B5 (modo/EOL). A fábrica distribuiu assim:
  - B1/B2 foram para a C2, item 3, junto do B11/build.
  - B5 ficou na C1, como armadilha de terreno.
  - B3 fica coberto pelo B11 (`npm test`, C2), pelo T13 (C3) e pelo T2 sob M-D3a (C1).
  - O orquestrador pode redistribuir no mandato.
- **D-13 — A receita precisa de adaptação.**
  - O prefixo `pg16r-` aparece cravado em **dois** lugares: o `RUN_ID` (l.45) e a guarda do `rm -rf` (l.63). Trocar só um deixa a
    árvore temporária para trás.
  - `TESTS` lista só os dois `-db` do ciclo 1, e o resíduo conta só `s305%` (o arnês cria `o6r_b01_…`).
  - A receita não sobe Redis, e o `trap EXIT` não deixa mutar.
  - Os três corpos mandam copiar, adaptar, publicar diff e md5, e escrever condutor próprio para mutação e para o B8.
- **D-14 — Números lidos que divergem dos textos.**
  - **Fixtures:** o disco tem 34 arquivos em `tests/fixtures/san3-05-mutacoes/` (31 `.ts` e mais `.sql`, `.prisma` e `.tsx`). O T13
    afirma 31 `.ts` (l.167), e o plano diz "27 + as novas".
  - **Superfície:** 11 rotas FORCE (4 `FORCE-SEM-TENANT` e 7 `FORCE-POR-TENANT`) e 12 jobs (3 FORCE e 9 fora). Bate com o dev.
  - **`FROZEN_ALLOWLIST`:** traz só `san3-05-runtime-role-guard-db.test.ts` (l.138).
  - Tudo isso é hipótese; as cadeiras re-medem.
- **D-15 — O objeto ainda vai andar.** No momento da leitura, o head era `02544a79` e o dev continuava trabalhando. No relatório
  dele, B6–B8, B10 e B14 estão reservados à junta, e o build e o fechamento de B0/B12/B13 estão pendentes. O objeto da junta 2 será
  outro SHA. Os corpos não cravam SHA nenhum como objeto.
- **D-16 — Prefixo dos containers.** O pedido diz "prefixo do nome da cadeira". Usei os prefixos curtos do próprio C2.5 (l.1569),
  `j05c2-c1-`, `j05c2-c2-` e `j05c2-c3-`, e não o nome completo da identidade. Assim o nome do container fica curto e o plano fica
  respeitado.

## Checklist — B-SAN3-05 · junta 2 · fábrica

**Solicitado:** os corpos das três cadeiras da junta 2 (C2.5), com a competência e os três itens exatos, vermelho-controle e medição
por execução por item, terreno próprio, gravidade/escopo/classe, "não consigo medir" = REPROVADO, sem propor correção, P1/P2/P7, sem
`tail -f`, tudo com timeout. Também este relatório.

**Feito:**
- [x] C1 `jurado-san305-c2-credencial-e-papel` — escrito (no scratchpad; ver ANOMALIA)
- [x] C2 `jurado-san305-c2-arnes-e-escopo` — escrito (no scratchpad; ver ANOMALIA)
- [x] C3 `jurado-san305-c2-ratchet-e-superficie` — escrito (no scratchpad; ver ANOMALIA)
- [x] Relatório (este arquivo)
- [ ] Corpos em `.claude/agents/especialistas/`: a permissão da sessão negou. Cabe ao orquestrador copiar e versionar.

**Próximos passos (orquestrador):**
1. Copiar os três corpos para `.claude/agents/especialistas/` e conferir o md5.
2. Rodar `sync-agent-agents.mjs` e depois `--check`.
3. Fazer `git add -f` nos dois espelhos, commit e push, coordenando com o dev no worktree compartilhado.
4. Registrar D-3 (e D-4, se cabível) em `controle/` antes da junta.
5. Inspetor de terreno da junta 2.
6. Mandatos forma A com pré-voo, HC = H0, saídas em `votos/B-SAN3-05/ciclo2/`.
7. Disparo no máximo 2 por vez (P5), com `df` entre as cadeiras.
