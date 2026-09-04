# SAN2-1R — Evidência da cadeira 02 (DIFF, PORTAGEM e APPEND-ONLY)

- **Jurado:** cadeira 02 — diff, portagem e append-only (identidade NOVA, poder de veto)
- **Data:** 2026-08-29 · **Ciclo:** 1 de 2
- **Worktree:** `.claude/worktrees/san2-1` · **HEAD verificado:** `4cd08677f69ae853723e99d6f360df58fe923ce5` (bate com o `4cd0867` do briefing) · **Base:** `a0a1075`

> Regra de ouro respeitada: cada item escrito ANTES de iniciar o seguinte.

---

## Item 1 — Diff de código de produto VAZIO

**Comando A (produto):**
```
git diff a0a1075..4cd0867 --stat -- src prisma tests scripts frontend mobile .github package-lock.json
```
**Saída:** VAZIA (zero linhas, zero arquivos). Nenhum toque em `src/`, `prisma/`, `tests/`, `scripts/`, `frontend/`, `mobile/`, `.github/`, `package-lock.json`.

**Comando B (`--name-status` completo):**
```
git diff a0a1075..4cd0867 --name-status
```
**Saída integral (24 arquivos):**
```
M	AGENTS.md
M	CLAUDE.md
M	Kpis/app.js
M	Kpis/kpis-history.json
M	Kpis/kpis-latest.json
M	agent-orchestration/controle/decisoes.md
A	agent-orchestration/controle/gerar-indice-pendencias.py
A	agent-orchestration/controle/pendencias-indice.md
M	agent-orchestration/controle/pendencias.md
A	agent-orchestration/omega/juntas/BRIEFING-SAN2-1.md
A	agent-orchestration/omega/juntas/BRIEFING-SAN2-1R.md
A	agent-orchestration/omega/juntas/votos/SAN2-1/00a-inspetor-terreno-passada2.md
A	agent-orchestration/omega/juntas/votos/SAN2-1/00b-perda-de-inspetor.md
A	agent-orchestration/omega/juntas/votos/SAN2-1/03-jurado-kpi-registro-ciclo2.json
A	agent-orchestration/omega/juntas/votos/SAN2-1/04-jurado-triagem-ciclo2.json
A	agent-orchestration/omega/juntas/votos/SAN2-1R/00-quedas.md
A	agent-orchestration/omega/juntas/votos/SAN2-1R/00a-inspetor-evidencia.md
A	agent-orchestration/omega/juntas/votos/SAN2-1R/00a-inspetor-parecer.md
M	agent-orchestration/omega/juntas/votos/SAN2-R/00-quedas.md
A	agent-orchestration/omega/juntas/votos/SAN2-R/00c-porteiro-evidencia.md
A	agent-orchestration/omega/juntas/votos/SAN2-R/00c-porteiro-pos-merge-361.md
A	agent-orchestration/omega/reprovacoes/DOSSIE-SAN2-1-parada.md
A	agent-orchestration/omega/reprovacoes/R-SAN2-1-ciclo1.md
M	docs/limpeza-de-disco.md
```

**Classificação:** todos os 24 caminhos cabem no conjunto permitido — `agent-orchestration/**` (19), `docs/**` (1: `docs/limpeza-de-disco.md`), `Kpis/*` (3), `CLAUDE.md` (1), `AGENTS.md` (1). Nenhum caminho fora do conjunto.

**Nota da cadeira (não bloqueia):** `agent-orchestration/controle/gerar-indice-pendencias.py` é um script novo, porém vive dentro de `agent-orchestration/**` (tooling de processo, não código de produto) — dentro da letra do mandato; `scripts/` do produto ficou intocado.

**Veredito do item 1: PASSA** — o quórum está sustentado (diff de produto vazio).

---

## Item 2 — Append-only e portagem

### (a) `decisoes.md` — prefixo

- `git show a0a1075:agent-orchestration/controle/decisoes.md` → 1820 linhas; head `4cd0867` → 1866 linhas.
- Comparação byte-a-byte (`head -c <bytes-da-base>` do arquivo novo × arquivo da base, `cmp`): **PREFIXO SIM** — a versão da main é prefixo exato da nova. Zero reescrita do histórico.
- As 46 linhas acrescentadas são **exatamente** as duas adições declaradas:
  1. `## D-GOLIVE-MAPS-ROTACAO-DISPENSADA` (decisão do dono 2026-08-13, registrada 2026-08-29) — a portada;
  2. `## D-SAN2-OPCAO-C` (decisão do dono 2026-08-29) — opção C com os 5 itens (merge do verificado · etiqueta verdadeira nas 79 · P-036 duplicata · tripwire fora do balde C · leitura das 79 adiada → `P-SAN2-LEITURA-DAS-79`).
- Nada além dessas duas entradas foi acrescentado; nada foi alterado antes delas.

### (b) `pendencias.md` — linhas removidas

**Comando:**
```
git diff a0a1075..4cd0867 --unified=0 -- agent-orchestration/controle/pendencias.md | grep '^-' | grep -v '^---'
```
**Resultado: apenas 2 linhas removidas** (diff total: +602 / −2):

1. `## P-GOLIVE-SECRET-ROTATE — Chave Google Maps exposta redigida do HEAD; ROTAÇÃO humana obrigatória (CRÍTICA, secops go-live junta 2026-07-19)` — **substituição DECLARADA**: cabeçalho reescrito com tachado (`~~…~~ — FECHADA (2026-08-29): rotação DISPENSADA pelo dono`), corpo original **preservado verbatim** logo abaixo sob "Texto original preservado abaixo (§A2 — registro histórico, não reescrito)", e fechamento ancorado em `D-GOLIVE-MAPS-ROTACAO-DISPENSADA` (que acabou de entrar em `decisoes.md`). É o fechamento da CRÍTICA falsa, item (1) da opção C.
2. `- status: ABERTA — pré-requisito de merge da PR-04b, não item de backlog.` — pertence à `## P-CHK-FLUTTER-KIND-COLAPSA` (cabeçalho: **RESOLVIDA na PR-04b 2026-08-11**). **Substituição DECLARADA**: contradição pré-existente (linha de 10/08 × cabeçalho de 11/08) resolvida por DATA, com o texto original preservado tachado na linha seguinte (`~~status: ABERTA — pré-requisito de merge da PR-04b~~ (texto de 10/08, obsoleto)`) + dois `<sub>` explicando escopo `pre-existente`.

**Nenhuma remoção de registro histórico sem declaração.** As duas remoções têm o texto original preservado no próprio arquivo (§A2).

**As 79 etiquetas:** relativas à main (base `a0a1075`, que nunca teve etiqueta), a troca materializa-se como **pura adição** — contei **exatamente 79** linhas `+` com a frase verdadeira "**adiada por triagem automática; NÃO verificada item a item**" (item 2 da opção C). Por isso as remoções são 2 e não 79+2: a troca era contra a branch parada, não contra a main.

**Substituições declaradas conferidas no head:**
- **P-036** (linha 425 do head): `status: FECHADA · severidade: era ALTA` como **DUPLICATA da P-CHK-TEMPLATE-PRISMA-V7** (achado A-C1), texto original preservado (§A2) — item (3) da opção C, materializado como adição.
- **Tripwire de tarifa**: retirado do balde C via `<sub>` explicando que é tripwire de bypass de TARIFA e que enterrá-lo em balde "sem consequência de dinheiro" anulava sua função — item (4) da opção C, materializado como adição.

**Observação da cadeira (gravidade `nota`, não bloqueia):** na reescrita do cabeçalho da `P-GOLIVE-SECRET-ROTATE`, a atribuição de origem do cabeçalho original — "(CRÍTICA, secops go-live junta 2026-07-19)" — não sobrevive verbatim na seção (a severidade sobrevive como "era CRÍTICA"; o corpo original está preservado integralmente). Perda de metadado de atribuição do cabeçalho, dentro de uma substituição declarada e rastreável por `D-GOLIVE-MAPS-ROTACAO-DISPENSADA`.

**Veredito do item 2: PASSA** — decisoes.md é append-only estrito (prefixo provado); pendencias.md remove só as 2 substituições declaradas, com §A2 preservado.

---

## Item 3 — Dívidas do porteiro do #361 + §C7

### (a) Entrada `pr: 361` no `Kpis/kpis-history.json`

Extraída por parse JSON real (python, não grep): entrada com `"version": "SAN2-R"`, `"snapshot_date": "2026-08-29"`, **`"pr": 361`**, **`"merge_commit": "a0a1075"`**, **`"approved_head": "48dc863"`** — exatamente os valores exigidos. Métricas carregadas: flutter 864/864 · backend 2595/2597 · smoke 1126/1126 · blocks 152. **OK.**

### (b) §C7 renumerado + item 7 espelhado

- **CLAUDE.md** (seção C7 na linha 323): itens lidos em ordem — `4.` (linha 335, TETO DE DOIS CICLOS) → `4-bis.` (356) → `5.` (370) → `6.` (375) → `7.` (386, `D-JUNTA-RESILIENTE`). **Ordem 4, 4-bis, 5, 6, 7 confirmada.**
- **AGENTS.md** (seção C7 na linha 351): mesma ordem — `4.` (+13) → `4-bis.` (+34) → `5.` (+48) → `6.` (+53) → `7.` (+64). **Confirmada.**
- **Item 7 idêntico:** bloco extraído dos dois arquivos (CLAUDE.md 386→fim-de-seção, AGENTS.md 414→fim-de-seção; 14 linhas cada) e comparado com `diff -u` → **ZERO diferença, byte a byte idêntico**.
- Nota lateral (permitida pela regra de espelhamento): o item 3 do C7 difere entre os contratos apenas no mecanismo (`agente-pesquisador-web` × "subagente pesquisador web") — diferença estritamente de ferramenta, fora do trecho exigido pelo mandato.

### (c) Artefatos pós-merge do SAN2-R

- `agent-orchestration/omega/juntas/votos/SAN2-R/00c-porteiro-pos-merge-361.md` — **PRESENTE** (5.475 bytes). Cabeçalho confirma: parecer do `porteiro-pos-merge` sobre o PR #361 (SAN2-R, merge `a0a1075`), com sucessão P3 declarada (porteiro anterior caiu no item 3; sucessor re-executou 1–2 e mediu o 3 do zero) e tabela de verificação.
- `agent-orchestration/omega/juntas/votos/SAN2-R/00-quedas.md` — **PRESENTE**, com as **quedas 1 e 2** na tabela P6: **#1** inspetor de terreno (1ª), morto escrevendo o parecer com 3/3 itens persistidos (P1), redo medido em 9 comandos/139 s [com a correção FOR-1 do "6" estimado]; **#2** porteiro pós-merge #361, morto no início do item 3 com itens 1–2 persistidos, conclusão sem comando descartada por P3.
- Acompanham na mesma pasta: `00c-porteiro-evidencia.md` (12.052 bytes, evidência comando a comando).

**Veredito do item 3: PASSA** — as três dívidas do porteiro do #361 estão quitadas no head.

---

## Conclusão da cadeira

Os 3 itens do mandato **PASSAM**. Diff de produto vazio (quórum sustentado); append-only provado por prefixo em `decisoes.md` e por remoção declarada-e-preservada em `pendencias.md` (2 linhas, ambas §A2); 79 etiquetas como pura adição com a frase verdadeira; dívidas do porteiro quitadas. Uma observação de gravidade `nota` (atribuição do cabeçalho original da P-GOLIVE), não bloqueante.
