# B-MOBILE-GATE-CHAVE — evidência do dev (F0 a F3)

- **Executor:** `dev-66-cl`, Claude Opus 5.5, identidade de dev declarada (§C7 11(6)). Sem cruzamento entre casas (§C7 11(2)), por ordem do dono de 13/11.
- **Base:** `origin/main` `d2737339` (14/11 00:46 SP, a mesma da abertura). Worktree `C:/Users/thiag/w-gate66`, ramo `fix/mobile-gate-chave`, `npm ci` próprio, sem junction.
- **Fora daqui:** a prova com perfil real (`perfil-real-{antes,depois}.md`) é da identidade `dev-66-perfil-cl`.
- **Diário completo, com cada comando:** `erp-pausa-2026-10-03/revisoes/b-mobile-gate-chave/dev-66-cl.md` (fora do repositório); logs de cada mutação em `dev-66-cl-ev/mut/`.

## F0 — vermelho-controle no código de hoje (commit `8d938525`)

| teste | resultado no código de hoje |
|---|---|
| T2 sem fixture | `# tests 4 # pass 3 # fail 1` — "fixture ausente"; gerada com `UPDATE_MOBILE_GATE_FIXTURE=1` e reproduzida 2× (4/4) |
| T4 | `# pass 2 # fail 3` — T4.2 lista as 8 chaves fora do catálogo (`checklist_run:execute` 1, `diagnostics:read` 2, `inventory:read` 5, `inventory:write` 1, `ocr:run_local` 2, `receipt:attach` 2, `sync_diagnostics:read` 2, `workflow:request` 6); T4.3 acusa as 5 de demo + `expense_report:read`; T4.1 "o servidor não exporta MOBILE_INVENTORY_READ_PERMISSIONS" |
| M8a–M8i | 9/9 vermelhas pelo canário ("sem o seu canário"), restauro byte a byte |
| T1 | `+30 -34`: as 26 células do §4.4 do v1 (G1 9, G1b 4, G2 7, G3 3, G4 3), mais G4_so_approvals, G4_so_work_orders, G5, o banner "nenhum dos dois" e os 4 bloqueios das telas de movimento |
| N | 10 arquivos da E8 = 211 casos, 17 deles tocam gate pelo nome; o bloco entrega T1 66 + T3 52 = 118 (≥ 2N_gate e ≥ o piso de 45) |

Matriz medida no servidor (a mesma da §3.1 do v1): G1 = 9; G1b = platform_admin, tenant_admin, operator, field_technician; G2 = 7 (sem finance e support); G3 = platform_admin, tenant_admin, inventory; G4 = platform_admin, tenant_admin, manager. Casos de módulo: G1, G1b, G2, G3 sem o módulo e G4 sem `approvals` nem `work_orders` → 403 `module_not_enabled`; G4 com só um dos dois → libera.

## F3 — as 39 mutações, rodadas como escritas (35 da abertura §5 + M19b, M19c, M20b, M20c da revisão)

Cada uma aplicada por troca literal (âncora com 1 ocorrência), o comando rodado, o arquivo restaurado e conferido byte a byte (`restaurado=true` nas 40 linhas). Coluna "testes": cada teste esperado e o estado em que ficou; "[deve ficar verde]" é o que a mutação NÃO pode derrubar.

| mutação | resultado | testes |
|---|---|---|
| M6 | VERMELHO | T4.3 — as listas de demo: VERMELHO (vermelhos: 1) |
| M7 | VERMELHO | T4.2 — todo literal: VERMELHO (vermelhos: 1) |
| M8a | VERMELHO | T4.2 · R3.1 — o canário: VERMELHO; T4.2 · R3.2 — anti-vacuidade: VERMELHO (vermelhos: 2) |
| M8b | VERMELHO | T4.2 · R3.1 — o canário: VERMELHO (vermelhos: 1) |
| M8c | VERMELHO | T4.2 · R3.1 — o canário: VERMELHO (vermelhos: 3) |
| M8d | VERMELHO | T4.2 · R3.1 — o canário: VERMELHO (vermelhos: 1) |
| M8e | VERMELHO | T4.2 · R3.1 — o canário: VERMELHO (vermelhos: 2) |
| M8f | VERMELHO | T4.2 · R3.1 — o canário: VERMELHO (vermelhos: 2) |
| M8g | VERMELHO | T4.2 · R3.1 — o canário: VERMELHO (vermelhos: 2) |
| M8h | VERMELHO | T4.2 · R3.1 — o canário: VERMELHO (vermelhos: 2) |
| M8i | VERMELHO | T4.2 · R3.1 — o canário: VERMELHO (vermelhos: 2) |
| M8j | VERMELHO | T4.2 — todo literal: VERMELHO (vermelhos: 1) |
| M10 | VERMELHO | T4.2 — todo literal: VERMELHO (vermelhos: 1) |
| M11b | VERMELHO | T4.1 — cada regra: VERMELHO (vermelhos: 1) |
| M21 | VERMELHO | T4.3 — as listas de demo: VERMELHO (vermelhos: 1) |
| M15 | VERMELHO | T2 · R1.4: VERMELHO (vermelhos: 2) |
| M16 | VERDE | T2 — a matriz: verde(!); T2 · R1.4: verde(!); T2 · RA1.5: verde(!); T2 · R2.1: verde(!); FIXTURE_INTACTA: ACHADO; ação em "rejected" com motivo: ausente (vermelhos: 0) |
| M17 | VERMELHO | T2 · RA1.5: VERMELHO; field_technician: G3: ACHADO (vermelhos: 2) |
| M19 | VERMELHO | T2 — a matriz: VERMELHO; T2 · RA1.5: VERMELHO; [deve ficar verde] T4.1 — cada regra: verde (vermelhos: 2) |
| M19b | VERMELHO | T4.1 — cada regra: VERMELHO; T2 · RA1.5: VERMELHO (vermelhos: 3) |
| M19c | VERMELHO | T4.1 — cada regra: VERMELHO; T2 — a matriz: VERMELHO (vermelhos: 2) |
| M1 | VERMELHO | T4.2 — todo literal: VERMELHO; T4.1 — cada regra: VERMELHO; veredito do servidor G1 · manager: VERMELHO; tela Checklists da OS G1 · manager: VERMELHO (vermelhos: 15) |
| M2 | VERMELHO | T4.1 — cada regra: VERMELHO; veredito do servidor G2 · manager: VERMELHO; veredito do servidor G2 · operator: VERMELHO; veredito do servidor G2 · field_technician: VERMELHO; veredito do servidor G2 · auditor: VERMELHO; tela Estoque G2 · field_technician: VERMELHO (vermelhos: 9) |
| M3 | VERMELHO | T4.1 — cada regra: VERMELHO; veredito do servidor G3 · field_technician: VERMELHO; veredito do servidor G3 · manager: VERMELHO; veredito do servidor G3 · operator: VERMELHO; veredito do servidor G3 · auditor: VERMELHO; Entrada e Saída G3 · field_technician: VERMELHO (vermelhos: 11) |
| M4 | VERMELHO | T4.1 — cada regra: VERMELHO; veredito do servidor G4 · operator: VERMELHO; veredito do servidor G4 · finance: VERMELHO; veredito do servidor G4 · field_technician: VERMELHO; veredito do servidor G4 · auditor: VERMELHO; tela Aprovações G4 · field_technician: VERMELHO (vermelhos: 10) |
| M5 | VERMELHO | módulo · G1_sem_modulo: VERMELHO; módulo · G1b_sem_modulo: VERMELHO; módulo · G2_sem_modulo: VERMELHO; módulo · G3_sem_modulo: VERMELHO; módulo · G4_nenhum: VERMELHO; (R2.1/R2.2) G1_sem_modulo: VERMELHO; (R2.1/R2.2) G4_nenhum: VERMELHO (vermelhos: 13) |
| M9 | VERMELHO | T2 — a matriz: VERMELHO; veredito do servidor G4 · manager: VERMELHO; tela Aprovações G4 · manager: VERMELHO (vermelhos: 3) |
| M11 | VERMELHO | T4.1 — cada regra: VERMELHO; veredito do servidor G1b · manager: VERMELHO; botão Iniciar/Continuar do card G1b · manager: VERMELHO (vermelhos: 3) |
| M12a | VERMELHO | modoDev: false → sem o ícone: VERMELHO (vermelhos: 2) |
| M12b | VERMELHO | modoDev: false → sem o ícone: VERMELHO (vermelhos: 2) |
| M12c | VERMELHO | sem o argumento: VERMELHO (vermelhos: 1) |
| M13 | VERMELHO | módulo · G4_so_approvals: VERMELHO; módulo · G4_so_work_orders: VERMELHO; (R2.1/R2.2) G4_so_approvals: VERMELHO; (R2.1/R2.2) G4_so_work_orders: VERMELHO (vermelhos: 6) |
| M13b | VERMELHO | T4.1 — cada regra: VERMELHO; módulo · G4_so_approvals: VERMELHO; módulo · G4_so_work_orders: VERMELHO (vermelhos: 7) |
| M14 | VERMELHO | T4.1 — cada regra: VERMELHO; módulo · G1b_sem_modulo: VERMELHO (vermelhos: 2) |
| M-R2-01 | VERMELHO | banner de Aprovações da tela inicial (E2.1) nenhum dos dois: VERMELHO (vermelhos: 1) |
| M18 | VERMELHO | T4.1 — cada regra: VERMELHO; veredito do servidor G3 · manager: VERMELHO; veredito do servidor G3 · operator: VERMELHO; veredito do servidor G3 · field_technician: VERMELHO; Entrada e Saída G3 · field_technician: VERMELHO (vermelhos: 13) |
| M20 | VERMELHO | /inventory/entry · field_technician vê o bloqueio: VERMELHO; /inventory/entry · inventory sem o módulo vê o bloqueio: VERMELHO (vermelhos: 2) |
| M20b | VERMELHO | /inventory/exit · field_technician vê o bloqueio: VERMELHO; /inventory/exit · inventory sem o módulo vê o bloqueio: VERMELHO (vermelhos: 2) |
| M20c | VERMELHO | /inventory/entry · inventory sem o módulo vê o bloqueio: VERMELHO; [deve ficar verde] /inventory/entry · field_technician vê o bloqueio: verde (vermelhos: 1) |

**Resultado: 38 de 39 vermelhas como escritas. A M16 ficou VERDE** — `item_answer` com `component_id` inexistente volta `accepted` no servidor em memória (o `handleAnswer` de `src/modules/mobile/mobile-checklist-sync.ts` não confere o componente contra o modelo), então não há "outro desfecho" e o T2 fica 4/4, fixture intacta. A M16 não foi trocada: trocar exige emenda (§C7 11(3)). **Sonda declarada, à parte (não conta entre as 39):** com `run_id` inexistente, a ação volta `rejected`/`checklist_run_not_found`, a medição cai inteira e a fixture fica intacta — o fail-closed da R1.3 funciona:

| sonda | resultado | testes |
|---|---|---|
| M16-sonda-run-inexistente | VERMELHO | T2 — a matriz: VERMELHO; T2 · R1.4: VERMELHO; T2 · RA1.5: VERMELHO; T2 · R2.1: VERMELHO; FIXTURE_INTACTA: ACHADO; com motivo: ACHADO (vermelhos: 4) |

A M19 (o uso de `:349` trocado pelo literal) deixa a T4.1 verde, como a REV66-01 previa; por isso a M19b (o VALOR da constante) entra e deixa vermelhas a T4.1 e a RA1.5 juntas.


## Bateria (§4.6 do v1), no head

- `dart format --output=none --set-exit-if-changed lib test`: nenhum arquivo do bloco muda; o formatador local (Dart 3.11.4) muda só `test/features/bsan313_minhas_os_escopo_test.dart`, que o bloco não toca (último commit nele: `d6399294`) — diferença de versão contra a CI (Flutter 3.47.5); a CI decide.
- `flutter analyze`: No issues found.
- `flutter test test/features/bmobile_gate_chave_test.dart`: +119, All tests passed (T1 66 com o T5, T3 52, mais a conferência da fixture).
- Regressões (os 10 da E8, b083 e b113, com o bloco): +365, All tests passed. Suíte Flutter inteira: +1360, All tests passed.
- `npm run check` e `npm run lint`: verdes. `npm run build`: exit 0.
- `node --test --import tsx tests/mobile-gate-chave-matriz.test.ts tests/mobile-gate-chave-catalogo.test.ts`: 9/9.
- `npm test` (memória, sem banco nem Redis): 4540 · pass 4357 · fail 12 · cancelled 1 · skipped 170. Triagem por execução isolada na base `d2737339` e no head: as mesmas 7 falhas nos dois (`core-saas-role-authority` sem `DATABASE_URL`; `domain-events` ×2, `job-queue` ×3 e `worker-heartbeat` ×1 com `ECONNREFUSED` do Redis); os 6 `16b-*` de `users-seg-desativado-sse` passam isolados nos dois (timeout por carga no run completo). Nenhuma toca código do bloco; o job `backend` da CI, que tem banco e Redis, é a prova.
- Fixture regenerada no head com `UPDATE_MOBILE_GATE_FIXTURE=1`: igual byte a byte à da F0.
- `git diff --check`: limpo. `Kpis/**`, `prisma/**`, `.github/**`, `catalog.ts`, `pubspec.*`: sem diff.

## Acréscimo de 14/11 (03:18 SP): a M16′ da Emenda 3

- **Fonte:** `erp-pausa-2026-10-03/planos/plano-B-MOBILE-GATE-CHAVE-emenda3.md` (orquestrador, 14/11 03:15 SP). **A M16 sai e entra a M16′**; a propriedade provada é a mesma (R1.3: um desfecho "outro motivo" derruba o T2 sem gravar a fixture), e **o total segue 39 mutações**. A linha da M16 acima fica como o registro do que se mediu antes da emenda; ela não conta mais.
- **Troca literal** em `tests/mobile-gate-chave-matriz.test.ts`: `payload: { run_id: alvo.runId, component_id: alvo.componentId,` → `payload: { run_id: randomUUID(), component_id: alvo.componentId,`.
- **Comando:** `r=0; UPDATE_MOBILE_GATE_FIXTURE=1 node --test --import tsx tests/mobile-gate-chave-matriz.test.ts || r=1; git diff --quiet -- mobile/flutter_app/test/fixtures/mobile_gate_matrix.json && echo FIXTURE_INTACTA || echo FIXTURE_MUDOU; exit $r`, com `CORE_SAAS_PERSISTENCE=memory`.
- **Rodada por `dev-66-cl`** no head `7b53b75d` (worktree `w-gate66`), aplicada com 1 ocorrência e restaurada byte a byte:

| mutação | resultado | testes |
|---|---|---|
| M16′ | VERMELHO | T2 — a matriz: VERMELHO; T2 · R1.4: VERMELHO; T2 · RA1.5: VERMELHO; T2 · R2.1: VERMELHO; FIXTURE_INTACTA: ACHADO; checklist_run_not_found: ACHADO (vermelhos: 4) |

Saída (recorte do TAP):

```
not ok 1 - T2 — a matriz papel × gate medida no servidor é a da fixture versionada
  error: 'platform_admin/G1b: ação em "rejected" com motivo "checklist_run_not_found" (…)'
not ok 2 - T2 · R1.4 — G1b: o gestor passa no HTTP e é recusado na ação; o técnico de campo responde
not ok 3 - T2 · RA1.5 — G3: gestor, operador e técnico passam na porta e são recusados na ação; o estoque reserva
not ok 4 - T2 · R2.1 — módulo: qualquer um de approvals/work_orders libera o G4; sem o módulo, 403 module_not_enabled
# tests 4
# pass 0
# fail 4
FIXTURE_INTACTA
```

- **Resultado final das 39, com a M16′ no lugar da M16: 39 de 39 vermelhas como escritas.**
- **Achado lateral** (Emenda 3 §3): o servidor aceita `item_answer` para componente que o modelo não tem. Vira a `P-CHECKLIST-RESPOSTA-COMPONENTE-INEXISTENTE` (MÉDIA, `pre-existente`), registrada no PR de registro `reg-1411-cl`, fora deste bloco.
