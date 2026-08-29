# Inspetor de terreno — junta `B-O6R-REG`, 1ª passada (2026-08-29) — LIBERADO COM RESSALVA

> Texto verbatim do agente `inspetor-de-terreno-da-junta`, persistido pelo orquestrador.

**Objeto:** junta de 3 cadeiras (maioria simples) sobre o head `8c00fab` de `chore/o6r-reg-sync-359`
(conteúdo em `757485c`; `8c00fab` acrescenta só o briefing — **medido**: `git show 8c00fab --name-status` = 1
arquivo), base `origin/main` = `f081b5d` (#359). **Veredito: `LIBERADO COM RESSALVA`**

## 1. Isolamento

- **Head e árvore:** head = `8c00fab`, branch `chore/o6r-reg-sync-359`, `origin/main` = `f081b5d`.
  `git status --porcelain` = **vazio**, re-medido **após** eu rodar o baseline nele.
- **Árvore principal:** os 3 tracked `M` são **artefato de eol/stat, não mutação** — provado por
  `git hash-object` (com filtro) = blob do índice nos três.
- **Junction:** `dir /AL` = zero reparse points; `fsutil reparsepoint query node_modules` = não é ponto de nova
  análise; `npm ci` próprio de 28/08 23:52. **§3(c) da `D-JUNTA-ESCOPO-E-CALIBRACAO` respeitado.**
- **Resíduos:** `docker ps -a` = só `erp-postgres`/`erp-redis`; zero `jur-*`/`crit-*`; zero sondas. Worktrees:
  `arnes-dev` removido; `agent-af6ea607…` e `plan-c5` limpos; `gov-descuido` com mutação **real** não commitada
  (workstream paralelo, **não** de jurado) → R6.
- **Banco:** **concordo com o orquestrador** — o diff não toca nada executável de produto; a verificação é
  git/arquivo/JSON. **Nenhum cluster descartável é necessário**, e a base viva **não é alvo de ninguém** (R3).

## 2. O item central: o diff real (e o quórum que ele sustenta)

- `git diff f081b5d..757485c --stat -- src prisma tests scripts frontend mobile .github <lockfiles>` =
  **saída vazia, ec=0**. Idem contra `8c00fab`. **A alegação "diff de código VAZIO" é verdadeira.**
- `--name-status` completo: **40 arquivos**, todos em `Kpis/*`, `agent-orchestration/**`,
  `docs/CRONOGRAMA.md`, `PROJECT_MEMORY.md`, `.gitignore`. Nenhum de `omega/planos/povoamento/`.
- **`Kpis/app.js`:** diff de **1 linha** (só a `var FROZEN` regerada). Nada de lógica.
- **`.gitignore`:** `git ls-files | grep -E '^\.claude/worktrees/|^\.tmp-demo/'` = **zero** — nenhum rastreado
  passa a ser ignorado, logo **sem vetor de perda de dado**.
- **Quórum "maioria de 3" SUSTENTA-SE** contra o diff real: nenhuma linha toca dinheiro, segurança, permissão
  ou perda de dado. Sem `critico-adversarial`: correto, não é bloco de invariante (§C7.1-ter(b)).

## 3. S0 — a medição que exigiu segunda forma

`node scripts/sync-agent-agents.mjs --check` no `reg-359` → **exit 1, "DIVERGE" em 22 agentes**. **Investiguei
antes de classificar:** o script normaliza CRLF na fonte (l.39) mas lê o **alvo cru** (l.80); num checkout
fresco sob `core.autocrlf=true` todo alvo materializa CRLF → **falso-vermelho universal**. É a classe que a
`D-JUNTA-ESCOPO-E-CALIBRACAO` §3(c) proíbe usar como régua.

**Medição correta** (blobs commitados via `git show`, transform replicado, eol-neutro): **22 fontes, 0
divergências REAIS**. **O espelho commitado do head é consistente.** Árvore principal: **ec=0, "OK — 40
agentes"**. Terreno de execução dos jurados: verde.

## 4. Insumos e papéis

- Ata, os 3 votos e o parecer do porteiro do #359 estão na árvore. O briefing trata cada item como "confiram
  por execução", com duas exceções pontuais (R4, R5).
- **Divergência de processo DECLARADA, não escondida:** `P-REG-DIVERGENCIA-SEM-PLANEJADOR-MESTRE` no
  `pendencias.md` **e** no §4 do briefing, com "se acharem que é `bloqueia`, reprovem".
- **Ciclo 1** → §2.2 (crítico + PD ≥5 fontes) não se aplica.
- **Cadeiras exigidas:** (1) diff/escopo; (2) KPI/números; (3) trilha/append-only.
- **Inelegíveis, por nome:** o **orquestrador** (escreveu o diff **e** achou o item 6 — não vota);
  `porteiro-pos-merge` (achador de A–F); `jurado-arnes-*` e suplentes (julgar o registro do próprio voto é
  conflito); `jurado-c4-*`/`jurado-c5-*`.

## 5. Baseline e quórum de perda

- **Baseline honesto, medido agora, no head, árvore limpa:** `npm run check` → **ec=0**. Worktree limpo depois.
- **Plano de perda de jurado: AUSENTE do briefing** → R2.

## Ressalvas

- **R1** — o guard do S0 dá falso-vermelho em checkout fresco (0/22 reais). Não tratar como achado **nem
  consertar o script**. Nomeio para o orquestrador abrir pendência com dono.
- **R2** — sem plano de perda de jurado.
- **R3** — plano de isolamento não escrito no briefing (read-only; sem banco; base viva jamais alvo; junction
  proibida; `git show` em vez de `archive`+`tar`).
- **R4** — o item 6 (troca B-04/B-05) foi achado **E** consertado pela mesma mão — classe do §C7.4-bis. A
  cadeira de trilha deve verificá-lo **por execução da contraprova**, com desconfiança máxima.
- **R5** — achados B e D constam como "fechados" em afirmação de fato; spot-check, não herdar.
- **R6** — resíduos fora do terreno (`gov-descuido` com mutação viva; `.tmp-demo/` inerte).
- **N1** — o briefing nomeia `757485c`; o head julgado é `8c00fab`. A ata consigna os dois.

**Limpeza:** criei só 3 arquivos no scratchpad/tmp, os três removidos; nenhum container, worktree, junction,
commit ou arquivo no repositório criado por esta inspeção; `reg-359` re-medido limpo ao final.

**Veredito: `LIBERADO COM RESSALVA`** — a fábrica pode criar as 3 cadeiras, com R1–R6 em destaque nos corpos
e as inelegibilidades do §4 respeitadas.
