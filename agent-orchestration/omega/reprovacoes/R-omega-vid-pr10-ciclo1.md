# R-Ω-VID-PR10 — Ciclo 1 — REPROVADO → rework → re-verificação (ciclo 2)

**Entrega:** Ω-VID PR-10 — Imprimir/Salvar o dossiê (`window.print()` + `DossiePrintDocument` + `@media print`).
**Data:** 2026-08-02. **Junta ciclo 1:** `cognicao-visual` + `critico-adversarial` (workflow adversarial).

## Veredito ciclo 1: **REPROVADO 2/2** (mesma CRÍTICA nos dois)

### CRÍTICA (ambos) — regra `@media print` GLOBAL quebra todos os fluxos de impressão do app
A regra introduzida em `frontend/src/styles/app.css` era **global e incondicional**:
`@media print { body > *:not(.dossie-print){ display:none !important } }`. Como o `<body>` tem um único filho
persistente (`#root`, que hospeda TODO o app), a regra vale em **toda** impressão do sistema — mesmo sem o dossiê
aberto. Consequências reais (não pegas pelos smoke SSR — sem CSS/print):
1. **Página em branco app-wide**: os 7 fluxos de impressão existentes (`PrintWorkOrderModal`, `PrintFineModal`,
   `PrintMaintenanceOrderModal`, `PrintDamageModal`, `PrintRemuneracoesModal`, `ComprovanteLiberacao`,
   `ComprovanteLeilao` — incluindo recibos legais art. 24/art. 328) usam `visibility:hidden/visible` com o print-root
   DENTRO do `#root`. Um ancestral `display:none` não é revertido por `visibility:visible` do descendente → imprimem
   BRANCO quando `.dossie-print` não existe no DOM.
2. **Sequestro**: `ComprovanteLiberacao` é acionado de DENTRO da aba "Liberação" do próprio dossiê. Com o modal
   aberto, `.dossie-print` existe → imprimir o comprovante imprimiria o **dossiê inteiro** no lugar.

### MÉDIA (cognicao) — documento sem data de emissão nem organização emissora
Um dossiê salvo/impresso é temporal (status e diárias mudam); sem "Emitido em" e sem a organização, o PDF fica
ambíguo.

### MÉDIA (critico) — botão não espera os dados; `loading=false` fixo → "carregando" vira "vazio"
Se o usuário imprime antes de `useStatement`/`useProcessChecklistRuns`/`useCustodyHistory` concluírem, o documento
imprime seções vazias que na verdade estão carregando.

### BAIXAs
- (critico) portal `aria-hidden` enquanto é o conteúdo impresso.
- (cognicao) `break-inside:avoid` no card inteiro pode empurrar cards altos, deixando faixa em branco.
- (cognicao) detalhes de desfecho (liberação/leilão) não entram no documento — MVP-aceitável (comprovantes são os
  documentos canônicos).

## Rework aplicado (ciclo 1 → sem parada; protocolo D-SAN-AUTONOMIA §4)
1. **CRÍTICA fechada** — a supressão do app foi **escopada** a `body.dossie-printing`: a classe é ligada SÓ no
   `handlePrint` do dossiê e removida no `afterprint` (`VehicleDossieModal.tsx`); o `useEffect([issuedAt])` dispara
   `window.print()` depois do carimbo fresco entrar no DOM. Fora do print do dossiê, os `@media print` rules **não
   casam** → os 7 fluxos existentes imprimem normalmente; o comprovante de dentro do dossiê não é mais sequestrado.
2. **MÉDIA (data/org) fechada** — header do `DossiePrintDocument` com `orgName` (`tenantName`, §allowlist) + "Emitido
   em {data} · documento de acompanhamento (não substitui os comprovantes…)".
3. **MÉDIA (dados) fechada** — botão gated por `printReady` (núcleo + `loaded` dos painéis); "Preparando…" desabilitado.
4. **BAIXAs** — `aria-hidden` removido; `break-inside:avoid` movido para `tr`/`.ui-state` (granularidade fina). O
   detalhe-de-desfecho fica como follow-up (MVP-aceitável, reconhecido pelo revisor).
5. **+2 smoke** cobrindo o carimbo/org e o estado "Preparando…". Bateria: check/test:smoke (997)/build verdes.

**Ciclo 2:** re-verificação pela mesma junta (registrada na ata `docs/juntas/J-OMEGA-VID.md`, PR-10).

## Ciclo 2 (re-verificação) — 2026-08-02

- **`cognicao-visual` → APROVADO.** Os 3 achados do ciclo 1 confirmados FECHADOS: a `@media print` só afeta a
  impressão do dossiê (seletores exigem `body.dossie-printing`, ligada só no `handlePrint`, removida no `afterprint`);
  os 7 fluxos irmãos e o comprovante de dentro do dossiê não são mais afetados/sequestrados; header com "Emitido
  em…" + `orgName`; break-inside fino; `aria-hidden` removido. 2 BAIXA (uma = assimetria do `printReady`, não
  alcançável hoje; outra = conflito teórico não alcançável via UI).
- **`critico-adversarial` → APROVADO_CONDICIONADO.** CRÍTICA fechada. **2 MÉDIA (exigidas antes do merge):**
  (A) `body.dossie-printing` sem cleanup redundante → se o `afterprint` não disparar e o modal fechar, a classe fica
  presa e reintroduz a impressão-global-em-branco (gatilho mais estreito). (B) `printReady` exige `statementLoaded`
  sem guarda de permissão → ator com `impound:read` sem `charging:read` travaria em "Preparando…".

### Rework ciclo 2 (fechado)
- **MÉDIA A** → `useEffect` ganhou **cleanup return** (remove a classe + listener no unmount) **+ remoção defensiva**
  no início do effect (limpa resíduo de um ciclo cujo `afterprint` não disparou). A classe nunca fica presa.
- **MÉDIA B** → `printReady` agora guarda o statement pela permissão: `(!canReadCharging || statementLoaded)` —
  espelha a guarda do checklist. +2 smoke (carimbo/org + "Preparando…").

**Resultado:** ambos os revisores aprovam a substância; CRÍTICA fechada e re-verificada; 2 MÉDIA do ciclo 2 fechadas
no rework. Bateria: check/test:smoke (997)/build verdes. **APROVADO para merge.**
