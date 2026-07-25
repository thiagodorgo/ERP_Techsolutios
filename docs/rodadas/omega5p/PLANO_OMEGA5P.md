# PLANO Ω5P — Rodada "Pátios de Recolhimento" (SIGPRV)

> **Base:** `ESTUDO_SIGPRV_PATIOS.md` (fonte de verdade normativa e de domínio).
> **Escopo do MVP (definido pelo owner):** núcleo de custódia (entrada, vagas, diárias, liberação) + portal do proprietário + leilões. **Fora do MVP:** pagamento online (PIX/cartão), NFS-e, integração real Sivec/SNE (adapter-ready apenas), guarda monitorada, IA.
> **Alvo comercial:** pátios credenciados a órgãos **e** pátios privados desde o início ⇒ motor tarifário de dupla natureza e perfis normativos.
> **Princípio:** o registro é prova — integridade, atribuição e retenção vêm antes de conveniência.

## 1. Gap analysis (estimado — Fase 0 confirma)

| Capacidade SIGPRV | Situação no ERP | Ação Ω5P |
|---|---|---|
| OS de remoção (aceite, GPS, check-in, fotos, checklist, assinatura) | Existe (Ω3F P1) | **Reusar**; criar gatilho OS→abertura de processo de custódia |
| Bases/pátios (domínio físico) | Previsto Ω3F P2 (básico) | **Estender**: hierarquia de áreas + vagas + ocupação |
| Anexos, notificações internas, auditoria, sessões, contas a pagar/extrato | Existe (Ω4C) | **Reusar/estender** |
| Processo de custódia + eventos hash-encadeados + máquina de estados | Inexistente | **Criar** (núcleo) |
| Vistoria eletrônica de recepção (art. 9º, I + art. 14 Res. 1025) | Checklist genérico existe | **Especializar** (conjuntos obrigatórios, objetos, equipamentos ausentes, estado lataria/pintura/pneus) |
| Motor de diárias (rolling 24h, teto intertemporal, tabelas com vigência) | Inexistente | **Criar** |
| Trilha de notificações legais (10d/30d/edital ≥10d/15 d.u.) | Inexistente | **Criar** (registro probatório; envio SNE fora do MVP) |
| Liberação (autorização, quitação, comprovante, saída) | Inexistente | **Criar** |
| Leilão (elegibilidade, preparação, lotes, certame externo, liquidação § 6º, saldo 5 anos) | Inexistente | **Criar** |
| Portal público do proprietário | Inexistente | **Criar** (BFF isolado) |
| Perfis normativos por UF/órgão + tarifas duplas | Inexistente | **Criar** |
| Painel gerencial (ocupação, aging, receita, funil) | Padrões de KPI existem | **Compor** |

## 2. Decisões a ratificar pela junta (D-records)
D-Ω5P-01 hash chain nos eventos de custódia · D-Ω5P-02 diária rolling-24h federal + modo calendário por perfil · D-Ω5P-03 teto intertemporal por data de entrada (30 diárias legado / 6 meses / contratual) · D-Ω5P-04 autenticação do portal por placa+Renavam(+doc parcial), plugável p/ GOV.BR · D-Ω5P-05 Sivec via adapter/outbox versionado (sem chamada externa até especificação) · D-Ω5P-06 leilão prepara/documenta/liquida; lances em plataforma externa homologada · D-Ω5P-07 quitação registrada manualmente no MVP; PSP futuro só por junta-de-5 (D-SAN-AUTONOMIA) · D-Ω5P-08 retenção 5 anos + anonimização pós-prazo · D-Ω5P-09 veículo não identificado é 1ª classe (placa/chassi opcionais com flag e justificativa).

## 3. Fases e PRs (1 PR = 1 KPI, D-KPI-PER-PR)

**Fase 0 — PR-00**: junta J-Ω5P + 5 agentes efêmeros; reconhecimento do repo (OS/checklist/fotos, bases Ω3F P2, financeiro, anexos, notificações, auditoria, RLS/tenant); tabela existe/estende/cria; ratificação dos D-records; validação dos pontos abertos do ESTUDO §11.

**Fase 1 — Fundações físicas e normativas (PR-01 a PR-04)**
- PR-01 `yard`: pátios, áreas hierárquicas (quadra→corredor→fileira→vaga), tipos (coberta/moto/pesado), capacidade, ocupação — estendendo o domínio de bases do Ω3F P2.
- PR-02 `jurisdiction`: perfis normativos (prazos, modelo/teto de diária, exigências de liberação, canais de notificação) com defaults federais.
- PR-03 `tariffs`: tabelas com vigência × categoria × serviço, escopo PÚBLICO-CREDENCIADO | PRIVADO-CONTRATUAL.
- PR-04 UI de administração (pátios/mapa de áreas, perfis, tarifas).

**Fase 2 — Custódia (PR-05 a PR-09)**
- PR-05 `impound`: ImpoundProcess + CustodyEvent (append-only, hash) + máquina de estados + invariantes I1-I3.
- PR-06 Recepção/vistoria: Termo de Recolhimento + conjuntos fotográficos obrigatórios (reuso do checklist Ω3F, especializado), objetos internos, equipamentos ausentes, estado geral; gatilho OS de remoção → processo; alocação de vaga.
- PR-07 `charging`: motor de diárias (job idempotente, rolling 24h, teto intertemporal, congelamento) + encargos de remoção/adicionais + guia de débitos (PDF via motor de impressão Ω3F).
- PR-08 UI operação do pátio: mapa de ocupação, entrada guiada, dossiê do processo (timeline de eventos, fotos, débitos), movimentação de vaga, transferência entre pátios.
- PR-09 Trilha de notificações legais: registro probatório (tipo, canal, datas, comprovante anexado), relógios de prazo (D+10/D+30/D+60) alimentando o motor de notificações internas Ω4C.

**Fase 3 — Liberação (PR-10 a PR-11)**
- PR-10 `release`: solicitação, checklist documental por perfil, autorização do órgão, quitação (registro manual), identificação de quem retira, liberação p/ reparo (prazo ≤ 60d), comprovante com entrada/saída, saída de vaga, congelamento de diárias (I5).
- PR-11 UI liberação + fila de solicitações (internas e vindas do portal) + agendamento de retirada (slots por pátio).

**Fase 4 — Leilão (PR-12 a PR-15)**
- PR-12 Elegibilidade (D+60 sem regularização+retirada) + preparação: classificação conservado/sucata/inservível, avaliação sigilosa (acesso restrito), loteamento; reclassificação automática 2-strikes (I8).
- PR-13 Eventos de leilão: edital (≥15 d.u.), vínculo com plataforma/leiloeiro externos, registro de arrematação, prazo de pagamento 3 dias, inadimplência → reintegração do lote.
- PR-14 Liquidação: cascata do art. 328 § 6º (I7), nota de leilão (registro + anexo), retirada ≤ 60 dias, saldo remanescente (conta, notificação ≤ 30d, prazo 5 anos, destinação Funset como estado final).
- PR-15 UI leilão: funil (elegíveis → preparados → loteados → arrematados → liquidados), dossiê probatório exportável.

**Fase 5 — Portal do Proprietário (PR-16 a PR-18)**
- PR-16 BFF público isolado: consulta placa+Renavam(+doc parcial), rate-limit, CAPTCHA, respostas indistinguíveis, `PortalAccessLog` (I10).
- PR-17 Portal UI: status, pátio, débitos atualizados, pendências/documentos exigidos, fotos minimizadas com marca-d'água, solicitação de liberação com upload, agendamento.
- PR-18 Hardening + LGPD: minimização revisada, retenção/anonimização (I9), pentest interno de enumeração.

**Fase 6 — Gestão e encerramento (PR-19 a PR-20)**
- PR-19 Painel gerencial (ocupação por pátio/área, permanência média, aging 30/60/90+, receita de diárias, funil liberação/leilão) + exportações.
- PR-20 Interop Sivec-ready (outbox + contratos versionados dos eventos), varredura de invariantes, ata final, deleção dos agentes efêmeros.

## 4. Riscos e mitigações
Regulamentações delegadas da Res. 1025 ainda não publicadas (Sivec, classificação, vistoria eletrônica) → adapter/outbox e parâmetros, nunca hardcode; volume fotográfico → S3 + lifecycle, thumbs no portal; correção retroativa de tarifas → ajustes como novos lançamentos (I2); pátio público × privado no mesmo tenant → perfil por convênio/contrato, testes com 3 tenants e 2 perfis; exposição pública do portal → BFF separado do app autenticado, sem reuso de sessão.

## 5. KPIs da rodada
Invariantes I1-I10 com teste automatizado (10/10); cobertura das RNs do PROMPT; tempo de entrada guiada ≤ 5 min com fotos; precisão do motor de diárias (property-based tests com DST); funil de leilão sem lacuna probatória em amostra sintética; zero regressão nas suítes Ω3F/Ω4C.
