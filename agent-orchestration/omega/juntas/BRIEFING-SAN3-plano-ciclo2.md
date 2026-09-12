# BRIEFING — junta do PR #386, ciclo 2 (plano SAN3 v5 + registro + fechamento do B-O6R-06)

> Votos em `agent-orchestration/omega/juntas/votos/SAN3-plano-ciclo2/`. Ata: `J-SAN3-plano-ciclo2.md`. Ciclo 1:
> `J-SAN3-plano-ciclo1.md` (REPROVADO 0×3) e `agent-orchestration/omega/reprovacoes/R-SAN3-plano-ciclo1.md`.
> **Este é o último ciclo antes do teto** (`D-TETO-DOIS-CICLOS`): se reprovar, dossiê ao dono.

## 0. Terreno (declarado por escrito — §A7)

- **Conteúdo julgado:** `ecc32712` da branch `docs/san3-plano-saneamento` (PR #386). Base: `origin/main@15ef3fbe`.
  Objeto do ciclo 1: `a143d2c3`. O que mudou entre os dois: `git diff --stat a143d2c3 ecc32712`.
- **Meça na ref, nunca no disco da sessão:** `git -C <seu-worktree> show ecc32712:<caminho>` (git-bash:
  `export MSYS_NO_PATHCONV=1`). A norma é a do `CLAUDE.md` NA REF. Norma citada que não existe na ref não se aplica.
- **O PR não toca código:** `git diff --stat 15ef3fbe ecc32712 -- src tests prisma frontend mobile .github scripts` vazio.
  Nenhuma cadeira precisa de banco nem de container.
- **Isolamento:** worktree próprio detached em `ecc32712`, em `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/j-san3c2-<cadeira>`,
  criado com `git -c core.longpaths=true worktree add --detach`; `npm ci` próprio se for rodar `node --test`; removido por
  `git worktree remove --force`. Gerador do índice só em cópia fora do repo. Sem junction de `node_modules`; sem
  `git stash/checkout/reset/clean` alheio; base viva fora de alvo.
- **Quórum: unanimidade de 3** — o PR fecha por presença pendências de segurança, permissão e dinheiro (quórum da classe).
  Todo achado declara `gravidade` e `escopo` (com evidência de data/origem). "Não consigo medir" = REPROVADO. Nenhuma
  cadeira propõe correção.
- **P1/P2:** voto nasce como esqueleto (itens `EM APURAÇÃO`), cada medição apensada à evidência (comando → saída →
  veredito parcial), em `.../scratchpad/votos-SAN3-c2/<Cn>-<papel>-voto.json` e `-evidencia.md` (não no worktree do
  PR, que é o objeto julgado); mensagem final de 1 linha. **P5:** no máximo 2 cadeiras em paralelo. **P6:**
  `votos/SAN3-plano-ciclo2/00-quedas.md`.

## 1. Composição (identidades que não atuaram no ciclo 1)

| Cadeira | Titular | Suplente | Por que |
|---|---|---|---|
| C1 — cobertura de fluxo prometido, agenda e viabilidade | `jurado-san3c2-cobertura-de-fluxo` (criado pela `agente-fabrica` para este ciclo — §C7.4) | `jurado-san3c2-suplente-cobertura-de-fluxo` | a competência que faltou ao plano no ciclo 1 (C1-02) |
| C2 — gate de módulo, escopo por objeto e controles de segurança | `guardiao-fail-closed` | `agente-secops` | os bloqueantes C2-01/C2-02 são enumeração fail-closed (allowlist de módulo, censo de vias) |
| C3 — diff × regras, KPI, registro e números | `agente-ci-doutor` | `agente-dba-guardiao` | os bloqueantes C3-01/02/03 são registro, decisão e painel, conferidos por execução |

**Inelegíveis (conferir por nome):** `estrategista`, `coordenador-de-acessos`, `validador-mestre` (votaram no ciclo 1);
`critico-adversarial`; `porteiro-pos-merge`; `planejador-mestre`; `inspetor-de-terreno-da-junta`; o orquestrador
(planejou o plano e a correção); o aplicador da correção e os inventariantes (agentes `general-purpose`). As duas
identidades novas nasceram neste PR e são sepultadas e aposentadas **no mesmo PR** em que a junta fechar (§1.5 do
obituário; `D-APOSENTADORIA-ELENCO-EFEMERO`).

## 2. Mandato por cadeira (3 itens cada)

**C1 `jurado-san3c2-cobertura-de-fluxo`** — os 3 itens do corpo dele: (1) fluxo prometido × bloco; (2) passo citado em
teste de encerramento × existência no código ou em bloco anterior na agenda; (3) agenda do §6 e números do §9 da v5.

**C2 `guardiao-fail-closed`.** (1) O gate de módulo da v5 (item 16 e `B-SAN3-18`) é fail-closed: a contagem 38 confere, o
guard do bloco fica vermelho para entrada do registro sem módulo fora da lista de núcleo (prove por mutação no desenho do
teste), e a fronteira alcança o catálogo de módulos. (2) O censo de vias do `B-O6R-07c` (itens 11 e 51) tem regra de saída
fail-closed — via fora da fronteira vira pendência com dono e o SEC-002 só fecha com todas as vias com dono — e a
fronteira alcança as vias medidas (vistoria, evidência, checklist, km). (3) Os controles de segurança da v5 que dependem
de conferência no servidor (itens 52 e 53) têm teste que falha com o controle desligado.

**C3 `agente-ci-doutor`.** (1) Diff × regras e KPI por execução: nada em código; 3 guards de KPI, `kpi-freeze --check`,
`node --check Kpis/app.js`, `sync-agent-agents --check`; o painel (`roadmap`, `recent`, `trilha_bloqueada`) coerente com os
merges. (2) Registro e decisões: a correção C3-01 (`D-Ω4-C2` no `REGISTRO-SAN3-CONFLITOS` e no plano, fiel a
`decisoes.md`), a C3-03 (as duas pendências do painel em `ABERTA (PARCIAL …)` com o resíduo dono `B-SAN3-10`), as 3
pendências novas e as emendas do ciclo 1 presentes e bem-formadas; índice byte-idêntico ao gerador em cópia. (3)
Coerência de números entre o plano, `status-geral.md`, `log-execucao.md`, `Kpis/kpis-latest.json` e a descrição do PR.

## 3. A re-verificar (não é fato herdado)

- Que cada achado do ciclo 1 foi resolvido **no que ele promete**, não só na frase (§14 da v5).
- A agenda recalculada por script pelo aplicador e os números do §9.
- As reclassificações novas (itens 51–54) e as correções de critério (17, 18, 32).

## 4. Insumos

- Ciclo 1: `votos/SAN3-plano/` (os três votos com evidência, o parecer do inspetor, os dois do crítico), a ata e o
  registro da reprovação.
- Plano de correção: `agent-orchestration/omega/planos/SAN3-plano-ciclo2-correcao.md` e o relatório do aplicador
  (`votos/SAN3-plano-ciclo2/00-aplicador.md`).

## 5. Perda de jurado

Suplente nomeado re-executa o mandato inteiro; voto perdido não conta; menos de 3 votos de mérito não fecha; toda queda
em `00-quedas.md` (P6).

## 6. Terreno do ciclo 2 — o parecer do inspetor e o re-apontamento do objeto

- **Inspetor:** `LIBERADO COM RESSALVA` (R1–R9), Fable 5.1, com o corpo da ref aplicado. Parecer:
  `votos/SAN3-plano-ciclo2/00b-inspetor-terreno.md` (versionado junto com a ata).
- **Re-apontamento (R6).** O inspetor achou `C3 <A PREENCHER>` na trilha do `R-SAN3-plano-ciclo1.md`; ao corrigir, o
  orquestrador achou que as perguntas (a)/(b)/(c) do mesmo registro omitiam a C3. A correção entrou num commit só,
  depois da v5 (`f84bc634`). **O objeto julgado é `ecc32712`** = `f84bc634` + esse arquivo — medido por
  `git diff --stat f84bc634 ecc32712`, e re-verificado pelo inspetor antes da convocação.
- **Ressalvas que toda cadeira carrega.** R2 — Docker parado: nenhuma cadeira precisa de banco; quem precisar declara
  "não consigo medir". R3 — `guardiao-fail-closed`, `agente-ci-doutor` e `agente-dba-guardiao` foram suplentes nomeados
  no ciclo 1, nunca instanciados (0 votos, 0 achados): elegíveis, e a ata declara a participação prévia. R4 — não há
  cadeira de invariante financeiro: a C3 confere a C3-01 pelo texto de `decisoes.md:607-608` e pelo índice
  `financial_titles_wo_direction_active_key`, e a ata registra a lacuna. R5 — forma da bateria, para RE-EXECUTAR e nunca
  copiar: 3 guards de KPI = 3 arquivos / 28 testes; `kpi-freeze --check`; `node --check Kpis/app.js`;
  `sync-agent-agents --check` = 25 agentes; gerador = 366 cabeçalhos / 355 IDs / 103 FECHADA / 263 ABERTA / 14
  diferidas, byte-idêntico; `npm run check` exige `DATABASE_URL` fictício no ambiente e `npm run db:generate` antes
  (sem isso, 251 falsos `TS2305`). R7 — resíduo alheio inerte (`.claude/worktrees/san2-r` vazio; edições de outras
  sessões na árvore principal; 23 ` M` fantasma de CRLF no `san3`): não varrer, não ler como mutação. R8 — nenhum dos 6
  corpos fixa modelo: a ata registra o modelo que rodou em cada cadeira. R9 — worktree com `-c core.longpaths=true`;
  `git -C` sob `MSYS_NO_PATHCONV=1` exige `C:/...` (um `/c/...` fabrica "FALTA"); medir por `git show` na ref.
- **R1 (para o orquestrador).** O `porteiro-pos-merge` deste PR recebe o corpo da ref no prompt, e a ata registra
  papel · modelo · corpo aplicado.
