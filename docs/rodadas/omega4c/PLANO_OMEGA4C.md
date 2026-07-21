# PLANO Ω4C — Rodada de Alinhamento "Controle & Frota" (referência AutEM)

> **Base:** `ANALISE_VIDEOS_AUTOEM.md` (9 vídeos, menu Controle do AutEM v2.2.1).
> **Princípio (herdado do Ω3F):** fidelidade **comportamental** — replicar funções, popups, fluxos, regras e arquitetura de informação; adaptar o visual ao design system do ERP Techsolutions (React/Tailwind/shadcn) e ao Figma vigente.
> **Pré-condição:** rodada só inicia após a Fase 0 (reconhecimento do repo) confirmar o que já existe — este plano assume a arquitetura conhecida (monólito Node/TS + Express + Prisma, ~33 módulos, 64 models, 191 endpoints, 48 páginas, Flutter mobile, multi-tenant).

---

## 1. Gap analysis (estimado — Fase 0 confirma)

| Capacidade AutEM | Situação estimada no ERP | Ação Ω4C |
|---|---|---|
| Anexos por entidade (aba Arquivos) | Existe p/ OS (Ω3F P1: comentários/anexos) | **Estender** para módulo genérico polimórfico (entityType/entityId) |
| Contas a pagar | Módulo financeiro existe | **Estender** com integração origem→título (sourceType/sourceId, lançar/retirar, badge) |
| Extrato do profissional (descontos/créditos em folha) | Parcial/possivelmente inexistente como razão financeira | **Criar** ProfessionalStatement (lançamentos parcelados, trava de integridade) |
| Motor de notificações agendadas c/ visibilidade | Inexistente como motor único | **Criar** (model + scheduler + sino + central) |
| Abastecimento | Inexistente | **Criar** |
| Manutenção de frota | Inexistente | **Criar** |
| Multas (CTB, condutor responsável) | Inexistente | **Criar** |
| Seguros de viatura | Inexistente | **Criar** |
| Danos c/ desconto parcelado e termo de ciência | Inexistente | **Criar** |
| Estoque com custódia BASE/PROFISSIONAL/VIATURA + movimentos | Estoque básico previsto no Ω3F P2 (venda estoque→OS) | **Estender** (movimentos, vínculo, resumo, combustível, inativar) |
| Remunerações (liquidação por serviço, regras, Excel) | Regras de comissão podem existir no cadastro do profissional | **Criar** tela/fluxo de conferência+liquidação (reaproveita colunas configuráveis + export Excel do Ω3F P2) |
| Telemetria mobile (acessos, km, rastreamento, recusas, dispositivos) | App Flutter existe; km tracking do Ω3F P1 é por OS | **Criar** ingestão de heartbeat/eventos + 5 telas web |
| Auditoria global + Sessões c/ revogação | Audit log por OS existe (Ω3F P1) | **Estender** p/ telas globais (Acessos/Logs/Sessões) + revogação de sessão |

## 2. Decisões de padrão a ratificar pela junta (viram D-records)

1. **D-Ω4C-ANEXOS** — Anexo polimórfico único (`Attachment{entityType, entityId}`) vs tabelas por módulo. Recomendação: polimórfico + S3, reutilizando o padrão de anexos de OS.
2. **D-Ω4C-FIN-ORIGEM** — Títulos do contas a pagar ganham `sourceType/sourceId` + endpoints `POST/DELETE :module/:id/payable`. Badge "lançado" derivado da existência do título.
3. **D-Ω4C-EXTRATO** — `ProfessionalStatementEntry` como razão única (DANO, MULTA, REMUNERAÇÃO, AJUSTE), com parcelas e regra de bloqueio (espelha o alerta amarelo do AutEM).
4. **D-Ω4C-NOTIF** — Motor único: `notifyAt + remindBefore` gera disparo; visibilidade PRIVATE/PUBLIC/CUSTOM; consumidores registram `sourceType/sourceId`. Scheduler: node-cron interno no monólito (sem serviço externo — respeita D-SAN-AUTONOMIA; se a junta quiser fila externa, precisa de aprovação unânime).
5. **D-Ω4C-MODAL-PESQUISA** — Replicar o comportamento "modal de pesquisa abre ao entrar" apenas em Remunerações (onde é essencial ao fluxo); nas demais listagens, manter o padrão de filtros do ERP. (Fidelidade de comportamento ≠ copiar fricção.)
6. **D-Ω4C-TELEMETRIA** — Ingestão via endpoints batch autenticados do app (`/mobile/telemetry`), agregação diária de km por job; distância por haversine com filtro de precisão.

## 3. Fases e PRs (ordem de execução; 1 PR = 1 KPI conforme D-KPI-PER-PR)

**Fase 0 — Governança e reconhecimento (PR-00)**
Criação da junta J-Ω4C + agentes efêmeros; varredura do repo (models, módulos financeiro/estoque/anexos/auditoria existentes, convenções de nomes, middleware de tenant); ata com o gap real; ajuste fino deste plano; D-records iniciais.

**Fase 1 — Fundações transversais + Frota financeira (PR-01 a PR-09)**
- PR-01 Anexos genéricos (backend+frontend do componente aba Arquivos)
- PR-02 Integração Contas a Pagar por origem (service + endpoints + badge)
- PR-03 Extrato do Profissional (model, parcelas, trava, endpoints, tela básica de extrato)
- PR-04 Motor de Notificações (model, scheduler, endpoints, sino, popup de criação reutilizável)
- PR-05 Abastecimento — backend (model, regras interno/externo, baixa de combustível, KM/L)
- PR-06 Abastecimento — frontend (listagem c/ KM/L, modal, checkboxes, edição)
- PR-07 Manutenção — backend (cabeçalho+itens, totais, sugestão de hodômetro, notificação por tempo/km)
- PR-08 Manutenção — frontend (fluxo criar→itens, sub-modal item, popup de próxima manutenção, impressão)
- PR-09 Multas + Seguros — backend+frontend (regra condutor responsável; notificação de vencimento; impressão da multa)

**Fase 2 — Estoque avançado, Danos e Remunerações (PR-10 a PR-15)**
- PR-10 Estoque: movimentos e custódia — backend (ENTRY/LINK/UNLINK/EXIT, saldos por custódia, inativar, integração baixa automática em OS)
- PR-11 Estoque — frontend (modal Item com abas Editar/Resumo/Movimentação, sub-modais laranja)
- PR-12 Danos — backend (parcelas→extrato, trava de exclusão, vínculo assistência/viatura)
- PR-13 Danos — frontend (4 seções, edição c/ alerta amarelo, impressão com/sem parágrafo de ciência)
- PR-14 Remunerações — backend (cálculo por regra do profissional, overrides por serviço, liquidação em lote)
- PR-15 Remunerações — frontend (filtro inicial, grid c/ bolinhas, seletor de colunas, engrenagem em massa, totalizadores, liquidar, impressão, export Excel)

**Fase 3 — Telemetria mobile + Auditoria (PR-16 a PR-20)**
- PR-16 Telemetria — backend (acessos, heartbeat, agregado diário de km, recusas, registro de dispositivo/sessão do app)
- PR-17 Flutter — serviço de telemetria (login/logout events, GPS foreground, bateria, tipo de rede, versão/modelo/SDK, envio em lote c/ fila offline via Drift, disclaimers de permissão)
- PR-18 Telas web AutEM Mobile (Acessos, Quilometragem c/ agregados, Rastreamento c/ mapa via Junta de Mapas, Recusas c/ badges, Usuários/dispositivos)
- PR-19 Usuários: Acessos + Logs globais + Sessões com revogação (invalidation de refresh token)
- PR-20 Central de Notificações (tela) + varredura final de integrações cruzadas + polimento

## 4. Mobile (Flutter) — escopo do PR-17
Permissões de localização em primeiro plano; captura a cada N s/`distanceFilter`; buffer local (Drift) com flush em lote; payload: `{capturedAt, lat, lng, accuracyM, speedKmh, batteryPct, signalType, appVersion, deviceModel, sdkInt}`; eventos `APP_CONNECT/APP_DISCONNECT`; recusa de serviço já existente no fluxo de OS passa a emitir evento `SERVICE_REFUSAL`. Sem rastreamento em background nesta rodada (paridade com o AutEM, que exige app em 1º plano).

## 5. Riscos e mitigação
- **Sobreposição com Ω3F P2 (estoque, colunas/Excel):** Fase 0 marca o que reaproveita; proibido duplicar.
- **Volume de telemetria:** índice `(tenantId, professionalId, capturedAt)`, retenção configurável, agregado diário materializado.
- **Financeiro sensível (extrato/folha):** testes de integridade obrigatórios (trava de parcelas) antes de expor UI.
- **Scheduler no monólito:** idempotência por `notificationId+firedAt`; sem serviço externo sem junta (D-SAN-AUTONOMIA).

## 6. KPIs da rodada (além do KPI por PR)
Cobertura da matriz de paridade AutEM-Controle (35 comportamentos mapeados na análise), nº de RNs implementadas/total, tempo médio de ingestão de heartbeat, e zero regressão nos testes de OS/financeiro existentes.
