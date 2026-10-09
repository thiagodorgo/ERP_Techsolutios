# FABRICA — corpos das três cadeiras da junta 3 do B-SAN3-05 (ciclo 3)

- **Papel:** `agente-fabrica` · **modelo:** Claude Opus 5.5 (`claude-opus-5-5`) — **substituição declarada (§C7.6-bis):** o B-SAN3-05
  não toca dinheiro e o Fable está reservado a bloco de dinheiro (`D-FABLE-ASTRA-SO-DINHEIRO`, decisão do dono de 2026-10-08,
  `agent-orchestration/controle/decisoes.md` l.2982 no disco). O frontmatter dos três corpos continua `model: fable`: o fallback é de
  quem lança.
- **Quando e onde li:** 2026-10-09, à tarde (UTC), no disco de `C:/Users/AMP/w-o05`; ref local e de rastreio de
  `fix/runtime-role-sem-bypass` = `91d794956309f6e63511bdfd76cbfddd8bf45c40` (lidas nos arquivos de ref; reflog: "docs(plano): ciclo 3
  do B-SAN3-05 — A2 (grave) e A3, …"). **O dev do ciclo 3 (Codex) editava a árvore durante a leitura** (os subtestes do arquivo de
  guarda andaram ~138 linhas entre duas leituras; o cabeçalho do script já estava novo e a SQL da trava ainda era a do ciclo 2). Por
  isso os corpos citam código por **nome** e linha só do **plano**. Não executei nada (a fábrica não tem `Bash`).
- **Escrevi só quatro arquivos** (nenhum outro tocado; LF):
  - `.claude/agents/especialistas/jurado-san305-c3-trava-de-views.md` (C1)
  - `.claude/agents/especialistas/jurado-san305-c3-regressao-e-escopo.md` (C2)
  - `.claude/agents/especialistas/jurado-san305-c3-superficie-e-suite.md` (C3)
  - este relatório.
  **Espelho Codex não escrito:** `.agents/agents/especialistas/` é do orquestrador (`node scripts/sync-agent-agents.mjs`, depois
  `git add -f` nos **dois** espelhos e commit no ramo julgado **antes** do inspetor — C3.5, l.2058-2059; o ignore global cobre `.claude/`
  e `.agents/`).

## De onde veio cada item (plano `docs/revisoes/SAN3/B-SAN3-05-plano.md`, seção "## Ciclo 3")

| cadeira | identidade | itens (C3.5) | linhas de apoio usadas no corpo |
|---|---|---|---|
| C1 | `jurado-san305-c3-trava-de-views` | l.2043 — (1) A2 por execução (S, B, K, I, C antes do script, sem SELECT direto em W) + forma própria; (2) as 10 mutações M-D2a…e × (t)/(s) no T8e/T14d pela asserção do caso; (3) A3 — T14d antes do script, âncora, M-D2c no `DO`, T8f 1 + 2 | propriedade C3.2(1) l.1797-1803; J-A/J-B l.1805-1808; T8e/T14d/T8f l.1860-1884; AC1–AC4 l.1897-1900; mutações l.1912-1922; o que bloqueia l.2010-2013; R1 l.2082-2086; medições do planejador l.1732-1788 (roteiro) |
| C2 | `jurado-san305-c3-regressao-e-escopo` | l.2044 — (1) B1: B7 reduzida, 2 configurações × sucesso + MODO 6 do caso S, sentinela 0, leitor ≥ 1, SCRAM sob md5 (T14a/b); (2) B2: lote `guard-db` + `leituras` N=3 (12 e 13), 0 `XX000/23505/40P01`, resíduo 0, T8e/T14d só por `catalog()`/`runRoleScript`; (3) escopo: diff do ciclo ⊆ PERMITIDO do C3.3, `Kpis/`, guarda de catálogo só na entrada e 5/5, `100755`/`eol=lf`, `diff --check` | PERMITIDO/PROIBIDO/staging l.1937-1965; ponto de partida l.1929-1935; D0/D3/D6/D8/D9 l.1990-1999; o que bloqueia l.2014-2019 |
| C3 | `jurado-san305-c3-superficie-e-suite` | l.2045 — (1) T13: gerador inalterado, inventário = congelado (`stderr` vazio; 35/35); (2) B4 e D3/D4: `leituras` 13/13, `bootstrap` 12/12, T15 com e sem a variável e o limpo, log sem host/porta/senha/banco (T9/T15); (3) `npm test` (fail 0, skipped ≤ 2, N executado) + `npm run build` + pendências com dono (ausência = nota) | D4/D7 l.1994, l.1997; C3.6 l.2094-2115; erratas 1–3 (a 2 na l.1687, a 3 na l.1697); Fecho l.2149-2151 |

Comum aos três: regra da junta (l.2026-2035: unanimidade de 3 com veto, ciclo 3 só grave, objeto = head empurrado com check-runs, HC = H0,
P1–P7, ≤ 3 itens, **uma cadeira por vez no Claude**, prefixos `j05c3-c1-/c2-/c3-`, Opus declarado ou GPT-6 Astra); inelegíveis por
nome (l.2048-2059); **reprovação por construção copiada verbatim** (l.2061-2080) em blockquote nos três corpos; terreno pedido pelo
orquestrador (worktree `C:/Users/AMP/w-j05c3cN`, imagem `erp-junta-node20-pg16:local`, receita `C:/Users/AMP/erp-terreno/receita-pg16.sh`,
base viva e 5432/6379/55432 nunca, `docker rm -f -v` só dos seus); saídas em `votos/B-SAN3-05/ciclo3/C{N}-evidencia.md` e
`C{N}-voto.json`; P1/P2/P7; sem `tail -f`; tudo sob `timeout`; classificação gravidade × escopo × classe.

## Divergências notadas (registradas, não resolvidas — §A2)

1. **T8f × T14c (risco de parada do dev ou de mudança proibida).** O C3.2(2)(d) (l.1880-1881) especifica que o T8f lê o script por
   `readFileSync(ROLE_SCRIPT)`; o T14c (PROIBIDO no ciclo, l.1955-1956) reprova por contagem de texto, e no disco lido
   `\bROLE_SCRIPT\b` aparecia **5** vezes, com a asserção `=== 5`. Uma ocorrência a mais deixa o T14c vermelho. A regressão da
   candidata do planejador (`reg.sh`, l.1922-1925) trocou só a trava, o script e o `from` do T8c — **não** incluiu T8e/T14d/T8f no
   arquivo — então essa interação não foi medida. Posto como ponto de leitura no item 2(b) da C2 (T14c igual e verde) e no item 3 (bloco
   fora da restrição).
2. **Régua da mutação cega.** O C3.4 (l.2010-2013) põe "mutação que não deixa o T8e/T14d vermelho pelo comportamento" sob **A2 aberto**
   (bloqueia); o C3.5, reprovação por construção item 2, lista **"forma de teste"** como não grave; o §C7 item 8(2) do `CLAUDE.md` diz
   que do ciclo 3 em diante só **defeito de produto grave** bloqueia; e o A3 (prova cega) foi não grave na ata do ciclo 2. O corpo da C1
   (itens 2 e 3) manda declarar a leitura aplicada, com as três letras, e lembra a precedência do contrato sobre o plano (§A1) — **sem
   decidir pelo jurado**. O orquestrador pode querer fixar isto antes do disparo.
3. **"Não consigo medir" = REPROVADO no ciclo 3.** Veio do pedido do orquestrador e dos corpos do ciclo 2. Os corpos o enquadram como
   "grave não excluído" (o achado leva a classe grave que o item vigia). **Exceção** escrita na C3: a conferência das pendências
   (item 3(b)) nunca bloqueia, porque o C3.5 (l.2045) diz "ausência = nota, nunca bloqueio".
4. **Redis na suíte inteira.** O D7 do dev (l.1997) não nomeia Redis; o corpo da C3 manda subir `redis:7` próprio (`j05c3-c3-redis`), como
   o corpo da C2 do ciclo 2 fazia (o dev do ciclo 2 relatou falhas sem Redis — hipótese).
5. **Acréscimo dentro do item 2 da C3 (o orquestrador pode cortar):** além do T15 (que recusa um **superusuário**, via `atributo`), o
   corpo pede **um boot de produção recusado pela via `view`** — a via que o ciclo mudou, cujo `rolname` agora pode ser papel comum ou
   `BYPASSRLS` não superusuário — com a guarda D4 do próprio objeto aplicada ao log. Leitura da fábrica: é o "log da trava sem
   host/porta/senha/banco" do C3.5 aplicado ao caminho alterado; não é item novo.
6. **Direções de forma própria que a fábrica não executou (C1, item 1(c)).** Inclui o caso **M** do C3.1 (matview de dono `postgres` no
   meio, l.1744), que **não** está entre os cinco casos do T8e/T14d, e uma **hipótese** sobre **privilégio de coluna**
   (`GRANT SELECT (<coluna>) ON <raiz>` talvez não apareça em `has_table_privilege`, que responde pelo privilégio de tabela). É
   candidata, **não achado**; se a C1 a confirmar dentro do alcance, é o sinal R1 (l.2082-2086) com "informação nova".
7. **Nome do GUC.** O corpo da C1 do ciclo 2 (escrito por esta fábrica) usava `app.tenant_id` na tabela D2; o plano do ciclo 3 mede
   `app.current_tenant_id`, e é o que aparece nas migrações (no disco: 240 linhas em 66 arquivos com `app.current_tenant_id`, 0 com
   `app.tenant_id`; o plano diz "208 ocorrências" — contagem de outra forma, número de texto, não critério). O corpo novo usa
   `app.current_tenant_id` e manda confirmar.
8. **Opus esgotado.** O C3.5 (l.2035) diz "PAUSA (P7), não degrau"; o §C7.6-bis diz "PARA" (família §C7.5). Os corpos dizem "pare e
   registre onde está, como numa PAUSA — nunca desça um degrau", compatível com os dois.
9. **Head do disparo.** O C3.3 (l.1932) diz "hoje `b37b9af0`, mais o commit deste plano"; o reflog local dá `91d79495` como esse commit.
   Os corpos tratam `91d79495` como hipótese e mandam confirmar no mandato e no `DEV-ciclo3-relatorio.md` (ainda inexistente no disco
   lido).
10. **Escopo × corpos commitados.** Como no ciclo 2: `.claude/**`, `.agents/**` e o resto de `agent-orchestration/omega/**` são
    PROIBIDOS ao dev (l.1957-1959), mas os corpos da junta 3 têm de estar commitados no ramo (l.2058-2059). A C2 separa esses arquivos
    como **registro do orquestrador**, com commit e mensagem.
11. **Timeout do arquivo de guarda.** No disco, o teste externo tinha `timeout: 180_000`; o ciclo acrescenta três subtestes e cinco
    execuções do script. Não medido; posto como ponto de leitura no item 2(c) da C2 (`cancelled` conta como vermelho).
12. **Votos independentes com cadeiras sequenciais.** "Uma cadeira por vez no Claude" (l.2032-2033) faz o arquivo da cadeira anterior já
    existir no disco; os corpos proíbem abri-lo antes do próprio voto.

## Próximo passo (do orquestrador, não da fábrica)

Medir o md5 EOL-neutro dos três corpos; `node scripts/sync-agent-agents.mjs`; `git add -f` nos dois espelhos; commit e push no ramo
**depois** do head do dev; mandatos forma A com pré-voo (HC = H0); inspetor de terreno da junta 3 (instância nova) antes da primeira
cadeira; decidir, se quiser, as divergências 2 e 5 antes do disparo.
