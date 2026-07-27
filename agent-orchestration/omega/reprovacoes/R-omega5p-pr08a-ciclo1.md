# R-omega5p-pr08a — ciclo 1 (2026-07-27)

**Entrega:** Ω5P PR-08a — UI de operação do pátio (ocupação REAL + Processos + Dossiê + movimentação de vaga).
**Junta:** omega5p-avaliador (VETO) · cognicao-visual (VETO fidelidade/anti-tela-morta) · coordenador-de-acessos (VETO cadeia de acesso).

## Verdicts do ciclo 1
- **omega5p-avaliador → APROVADO_CONDICIONADO** (2 achados sanados ANTES deste ciclo de cognição):
  - **A1 (MÉDIA):** regressão da edição/bloqueio de vaga (`yard:update`, FREE⇄BLOCKED) — o `OccupancyMap` substituiu a lista do PR-04 e removeu o botão "Editar" por vaga; cópia enganosa em `PatioDetailPage.tsx:297`. **SANADO:** prop `canEdit`/`onEdit` no `OccupancyMap` (botão "Editar" gated por `yard:update`, aria-label), religado em `PatioDetailPage`; cópia corrigida; smoke de gate adicionado. smoke 874→875.
  - **A2 (BAIXA):** chave `"pr"` duplicada em `KPI_PR-08a.json`. **SANADO:** linha 2 → `"id":"PR-08a"`, mantido `"pr":null` na autoria (§C3).
- **coordenador-de-acessos → APROVADO** — cadeia papel→permissão→provisionamento→menu→rota→gate→backend íntegra; governed `patios.processes` (`impound:read`, sem `requiredModules`) correto; matriz `navigation-provisioning` derivada de `ROLE_PERMISSIONS` (finance/inventory sem `impound:read` → não veem; assert explícito); gates de ação com a permissão certa (create→`impound:create`, allocate/move/vacate→`impound:allocate`, editar-vaga→`yard:update`); 72/72 nav. **Achado não-bloqueante:** falta linha `/patios/processos` em `docs/navigation-matrix.md` (doc descritivo, não a matriz executável; há precedente de lag — telemetria Ω4C). Recomenda adicionar por rastreabilidade.
- **cognicao-visual → REPROVADO (bloqueante).** Achado único, isolado e com evidência renderizada:

### Achado bloqueante (C-VIS-1)
`frontend/src/modules/patios/processes/processes.adapter.ts:165` — `describeEventPayload` traduz as **chaves** do payload para PT-BR mas imprime os **valores** verbatim (`String(raw)`/`JSON.stringify`), e `ProcessTimeline.tsx:46-53` os desenha. Com os payloads REAIS do backend (não os fixtures amigáveis do smoke), a timeline — componente vivo central do dossiê — exibe:
- enum interno em inglês: `to: "IN_REMOVAL"`, `from/to: "RECEPTION"` (`impound.service.ts:110`, `impound-prisma.repository.ts:132`) — deveria ser "Em remoção"/"Recepção";
- código-motivo interno: `reason: "process_opened"` / `"removal_reconciled"`;
- UUID cru de vaga: `spotId: <uuid>` (SPOT_ASSIGNED, `:476`), `from/to: <uuid>` (SPOT_MOVED/YARD_TRANSFER, `:492/:508`).

STATUS_CHANGE e SPOT_ASSIGNED são os PRIMEIROS eventos de todo processo → aparece em praticamente toda timeline (não é edge case). Fere §11.3 (PT-BR, sem enum cru), §2.8/allowlist (sem UUID cru no DOM) e o critério #1 do plano ("timeline com payload DESCRITO"). Agravante: o smoke `patios-dossie.smoke.test.tsx:18,42` usa `spotId:"vaga-12"` e `reason:"Vistoria concluída"` (fixtures amigáveis) e nunca assere ausência de enum/UUID cru → guard desdentado (14 passam apesar do vazamento).

**Mínimo p/ corrigir (só em `describeEventPayload` + endurecer o smoke):**
1. `from`/`to` que sejam `ImpoundStatus` → `getStatusLabel` (PT-BR).
2. Valores em formato UUID (`spotId`/`fromSpotId`/`toSpotId`/`attachmentId`/`inspectionId`, e `from`/`to` de eventos de vaga) → suprimir/mascarar (o `typeLabel` já carrega o sentido; a timeline não resolve UUID→código sem join).
3. Códigos-motivo internos (`process_opened`, `removal_reconciled`) → PT-BR ou omitir; **preservar** `reason` de texto livre (JUDICIAL_HOLD).
4. Endurecer `patios-dossie.smoke.test.tsx` com payloads REAIS (spotId UUID, from/to enum, reason `process_opened`) + `assert.doesNotMatch` contra UUID e enum em inglês.

O que a cognição APROVOU (não refazer): mapa de ocupação (grade colorida + link+placa por join), selo de integridade (verde/vermelho `brokenAt`, headHash truncado), galeria de vistoria por conjunto, chips semânticos (cores certas contra tokens.css), page-headings §11, estados §7, PT-BR/white-label, hash truncado como prova.

## Ação (ciclo 1 → dev, sem criar especialista)
Achado crítico porém cirúrgico e plenamente acionável (padrão da rodada, cf. PR-03 2-ciclos): devolvido ao **omega5p-dev-frontend** para sanar C-VIS-1 + a linha de `navigation-matrix.md` (achado doc do coordenador). Re-review por **cognicao-visual** no diff corrigido. Se reprovar de novo na MESMA dimensão (ciclo 2) → agente-fabrica cria especialista (D-SAN-AUTONOMIA §C7.4).
