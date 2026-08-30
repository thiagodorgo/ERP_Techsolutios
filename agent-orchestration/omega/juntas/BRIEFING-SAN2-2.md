# BRIEFING DA JUNTA — SAN2-2 (guard do espelho + lista de suítes do CI + contrato canônico)

> **Bloco:** SAN2-2 · **Branch:** `fix/san2-2-guard-espelho-ci` · **Base:** `main`
> **Plano:** `agent-orchestration/omega/planos/SAN2-2-plano.md` — este briefing **implementa o §8**
> (l.357–453). Onde o §8 for omisso, está dito no texto que é omisso; nada aqui reinventa o desenho.
> **Diários com a evidência:** `agent-orchestration/omega/juntas/votos/SAN2-2/`
> **Commits:** `a3afdb1` (trilha do gate) · `db2d291` (F1) · `02ced85` (F2) · `2e4985b` (F3) · `<FASE-4>` (F4)
> **`<FASE-4>` é marcador:** a Fase 4 está sendo commitada no momento da escrita deste briefing —
> **o orquestrador preenche o hash** antes de liberar a inspeção de terreno.

---

## 1. O que o bloco entrega, fase a fase (números medidos)

Todos os números abaixo vêm de **execução registrada nos diários** de
`agent-orchestration/omega/juntas/votos/SAN2-2/`, com comando e saída. Nenhum é herdado de ata anterior.
A junta trata cada um como **afirmação a re-verificar**, não como fato — é essa a regra que as cadeiras
do §3 aplicam.

### F1 — O guard do espelho parou de mentir (commit `db2d291`, diário `dev-fase1-log.md`)

O defeito de origem (`P-REG-S0-GUARD-FALSO-VERMELHO`, achado pelo inspetor do B-O6R-REG): sob
`core.autocrlf=true` e **sem `.gitattributes`**, o checkout materializa CRLF nas duas pontas, os blobs são
LF, e o `--check` do `scripts/sync-agent-agents.mjs` acusava **os 22 papéis** como divergentes. Como a fatia
S0 do §C7.1-bis é justamente esse `--check` num checkout fresco, o gate fail-closed de toda junta futura
reprovava sempre — e um vermelho que sempre acende não informa nada.

- **Conserto (§3.1a):** 1 hunk em `scripts/sync-agent-agents.mjs`, **7 inserções / 1 remoção**, dentro de
  `if (CHECK)` — normalização `
 → 
` **só do alvo da comparação**. Script na branch: sha1
  `afb94f1ed97c`; na `main`: blob `4b5d32c07c92`.
- **Teste permanente novo:** `tests/agents-mirror-guard.test.ts` — **12 casos** (o §3.1b pedia ≥6),
  `12 pass · 0 fail · 0 skipped`. Cada caso monta árvore sintética em `os.tmpdir()` e **copia o script REAL
  em runtime** (nunca snapshot embutido — é a defesa contra o risco (g) do §7); teardown escopado em
  `finally`. Blocos: B1 falso-vermelho morto (3 casos), B2 o guard ainda morde (5), B3 a normalização é eol e
  **só** eol (3), B4 `model: fable` preservada no espelho (`D-PLANEJADOR-MODELO-FABLE`).
- **Drill A (par antes/depois, worktree fresco, mesma máquina e mesmo `core.autocrlf=true`):**
  **22 DIVERGE → 0**, `exit 1 → exit 0`, `FALTA=0`, `SOBRA=0` nas duas pontas. A única variável entre as duas
  medições foi o script. Se houvesse um drift de conteúdo real escondido entre os 22, ele sobreviveria à
  normalização e apareceria no DEPOIS — apareceram **zero**.
- **Drill B (o guard ainda morde):** o mandato pedia 4 mutações; foram executadas **8 mutações, 8 vermelhas**,
  na **árvore real de 22 papéis** com o **script real** — V1 `DIVERGE` (1 byte no espelho) · V2 `FALTA`
  (arquivo removido) · V3 `SOBRA` (arquivo a mais, fora do KEEP) · V4a/V4b/V4c **não-eol** (espaço no fim de
  linha na fonte, caixa trocada, linha em branco a mais) · V5 `model:` arrancado. **Zero mutações verdes**;
  cada vermelho nomeia **um** arquivo e deixa os outros 21 em paz; os três rótulos seguem distintos; o
  `README.md` continua KEEP. A insensibilidade comprada é exatamente `
` vs `
`, nada mais.
- **Divergência de número registrada, não maquiada:** o §6 Fase 1 do plano esperava **23 agentes**
  (22 + inspetor); na Fase 1 isolada a árvore tem **22**, porque o inspetor só nasce no §3.3.3, que é da
  Fase 3. O esperado do plano vale para o **head do PR**; para a fatia isolada, 22 é o número honesto.

### F2 — Quatro suítes de banco entram na lista curada do CI (commit `02ced85`, diário `dev-fase2-log.md`)

Classe do defeito, **medida por execução e não citada de ata**: as 4 suítes rodavam fora da lista `SUITES` do
job `backend-postgres`; sem `DATABASE_URL` elas **não falham — pulam**, `exit 0`, e os **22 casos viram 4
pulos** com o job verde. Verde-cego puro: perda de sinal de teste = perda do dado de medição.

- **Elegibilidade pelo §3.2b — 3 execuções × 0 falha × 0 pulo**, em Postgres/Redis **descartáveis** próprios
  (`san2-2-pg` / `san2-2-redis`), com a env exata do job (`ci.yml` l.108–120). Denominador **constante nas
  três rodadas, caso a caso**: `impound-custody-history-db` 3/3 · `vehicle-identity-merge-db` 5/5 ·
  `work-order-checklists-freeze-links-db` 6/6 · `work-order-checklists-sticky-db` 8/8 = **22 casos**.
  Zero intermitência observada. A rodada 2 e a 3 correram **sobre o estado que a anterior deixou** — o
  cenário mais hostil para dependência de banco virgem.
- **Prova de que a escrita bateu no descartável:** `pg_stat_user_tables` do `san2-2-pg` mostra inserts
  cumulativos reais nas 4 tabelas de negócio e `count(*)` de volta a zero (teardown das suítes;
  `tenants=1` é o do seed). A não-reconciliação 1:1 de `inserts − deletes` com `count(*)` foi **registrada
  como divergência**, não escondida: o contador é cumulativo e aproximado.
- **Efeito no `ci.yml`:** lista **23 → 27** suítes, sem duplicata, +22 casos sob o guard de zero pulos
  (l.204–209, **intocado** — `git diff` de linhas com `skipped|pulad` sai vazio). YAML revalidado (7 jobs).
- **Âncora do plano estava errada e a correção do crítico se confirmou:** o §3.2 mandava inserir "após a
  l.202" (meio do bloco de auth); o bloco `SUITES=` termina na **l.207**, e foi lá que a inserção entrou.
- **Proveniência declarada:** o `dev-san2-2` caiu (`server_error`) **depois** de editar o `ci.yml` e antes de
  registrar; o diff é dele, e o registro das medições sobre o resultado é do orquestrador. Isso **não** é
  verificação de mérito — a cadeira **C2** reexecuta por conta própria.
- **Achado de terreno, virou pendência:** `P-SAN2-2-PORTA-55432-RESERVADA` (BAIXA, escopo `pre-existente`).
  A porta 55432 do plano cai na faixa 55353–55452 reservada pelo Windows/Hyper-V nesta máquina; o par subiu
  em **56432/56379**. Nada no produto nem no CI depende disso (o job usa 5432 em service containers).

---

## 2. Quórum: UNANIMIDADE de 4

EM APURAÇÃO

---

## 3. As 4 cadeiras — o que cada uma julga e o que reexecuta sozinha

EM APURAÇÃO

---

## 4. Inelegibilidades (§8.3, por nome)

EM APURAÇÃO

---

## 5. Bootstrap do inspetor de terreno (§8.4) e anti-circularidade

EM APURAÇÃO

---

## 6. O que atacar com mais força — armadilhas medidas neste bloco

EM APURAÇÃO

---

## 7. O que o bloco NÃO fechou (declarado)

EM APURAÇÃO

---

## 8. Protocolo de junta resiliente (P1–P6) — mandato para colar em cada cadeira

EM APURAÇÃO
