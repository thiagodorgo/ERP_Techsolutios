# PARECER DO INSPETOR DE TERRENO — B-O6R-07a CICLO 2 (junta da última tentativa)

- **Inspetor:** `inspetor-de-terreno-da-junta` (Fable; 2ª instância — a 1ª é a queda #4, nada herdado)
- **Data:** 2026-09-04 · **Head:** `9989c62` (== origin == PR #369, OPEN) · **CI:** 7/7 pass (re-conferido)
- **Evidência executada, item a item:** `votos/O6R-07a/00b-inspetor-c2-evidencia.md` (T1/T2/T3 gravados
  incrementalmente, cada um ANTES do seguinte — P1)

## VEREDITO: **LIBERADO COM RESSALVA**

T1 (árvore/vizinhos/resíduos): LIMPO — árvore em `9989c62` sem mutação além do declarado; `dev-c2b-red`
removido; `dev-c2-pg`/`dev-c2c-redis` derrubados; diff do bloco não alcança `financial-*` nem os testes do
c5; zero junction/symlink de `node_modules` nas 5 árvores.
T2 (insumos/inelegibilidade): LIMPO — 10 insumos como blob no head; nomes novos das cadeiras C1-v2/C2-v2
com ZERO ocorrência em ata/obituário/participantes (6 devs c1 + 3 devs c2 + planejador-mestre conferidos
por nome); C3 mantida é permitida pelo C2·8; aceites C2·6 × diário [C]: 6/6 declarados.
T3 (baseline/perda): `npm run check` ec=0 · `git diff --check` ec=0 · migrate deploy ec=0 no meu cluster
descartável (15731/15732, derrubado) · plano de perda por cadeira DECLARADO (§8 P1–P6 + unanimidade de 3
do C2·8) · suíte plena: ver R2.

## Ressalvas (para o briefing das cadeiras, em destaque)

**R1 — A queda #4 de `00-quedas.md` vive SÓ na árvore, não no head.** Append +14/-0 do orquestrador
(dono declarado; o head antecede a queda — impossível estar nele). A junta lê o arquivo DA ÁRVORE como
insumo de quedas; o commit desse append entra no registro do ciclo, não antes do voto.

**R2 — Suíte plena LOCAL diverge sob contenda MEDIDA do ciclo 5.** Minha rodada: ec=1,
`2648/2656 · fail 6 · skip 2` (diário declara 2654/0/2; denominador idêntico). Os 6 `not ok` são 6/6
timeout literal de transação Prisma, em 5 arquivos que NÃO são do bloco; focados no mesmo cluster sob a
mesma carga: 5/5 ec=0 (51/51); CI 7/7 verde neste head exato. Mesma assinatura das rodadas 2/3 do diário
(vítimas rotativas, interseção vazia). **Cadeira que re-executar a suíte plena: medir `docker ps` ANTES;
se houver bateria do c5 rodando, esperar a máquina liberar (monitor, não sleep cego) ou registrar a
contenda com vítimas+classe — não gastar a ÚLTIMA tentativa reprovando por vermelho ambiental, nem
aceitar vermelho sem nomear a classe.**

**R3 — A fotografia de portas do C2·6 está DEFASADA e a árvore principal tem mutação declarada do c5.**
Hoje o c5 ocupa 15501/15502 e 32779–32782 (não só 32769/32770): cada cadeira re-mede portas
(`docker ps` + `netsh excludedportrange`) antes do próprio cluster; nunca 55432; base viva 5432/6379 nem
leitura. E `.claude/agents/especialistas/` da árvore principal carrega 2 ` M` + 6 `??` do ciclo 5
(reposição verbatim declarada pela sessão `erp-techsolutios-dd`) — INTOCADA até a junta do c5 fechar;
nenhum jurado trabalha na árvore principal.

## Limpeza

Criei para medir: `insp-c2-pg`/`insp-c2-red` (cluster descartável 15731/15732) — **derrubados, 0
restantes**; logs no scratchpad da sessão (fora do repo). No repo: só a evidência e este parecer,
declarados. Não votei, não consertei, não commitei.
