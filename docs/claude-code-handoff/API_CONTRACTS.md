# API_CONTRACTS.md — Contratos REST (`/api/v1`)

Contrato consumido pelos protótipos. **Legenda:** ● = já anotado no protótipo
(`data-endpoint`, prioridade de integração) · ○ = proposto. Convenções em `CLAUDE.md` §8.
Base: `https://api.techsolutions.com.br/api/v1` · JSON · datas ISO-8601 · moeda em centavos ·
header `Authorization: Bearer` + `X-Tenant-Id` · `Idempotency-Key` em POST.

---

## auth & sessão
| Método | Rota | Uso | Consumido por |
|---|---|---|---|
| POST | `/auth/login` | login e-mail/senha → JWT access+refresh | Login (web/mobile) |
| POST | `/auth/google` | OAuth Google | Login |
| POST | `/auth/refresh` | renova access token | interceptor |
| POST | `/auth/logout` | encerra sessão | perfil |
| POST | `/auth/active-tenant` | fixa organização ativa | Seleção de Organização |
| GET | `/me` · `/me/tenants` | usuário + organizações | perfil, seleção |
| GET | `/mobile/bootstrap` | usuário+orgs+papel+módulos+flags | Splash/Home mobile |

## work-orders (OS)
| Método | Rota | Uso |
|---|---|---|
| GET ● | `/work-orders` · `/work-orders?priority=high` · `?status=open` | listas web/mobile |
| GET ● | `/work-orders/:id` · `/work-orders/:id/timeline` | detalhe + histórico |
| POST | `/work-orders` | criar (drawer Nova OS) |
| PATCH ● | `/work-orders/:id/status` | mudança de status |
| POST ● | `/work-orders/:id/assign` | atribuir técnico |
| PATCH | `/work-orders/:id` | editar |

## operations / dispatch
| Método | Rota | Uso |
|---|---|---|
| GET ● | `/operations/dispatches` · `/operations/dispatches/:id` | Despachos |
| GET | `/operations/dispatches/queue` | Console Dispatcher (fila viva) |
| GET | `/operations/technicians/availability` | disponibilidade |
| GET ● | `/field-locations/latest` | pins de mapa (web+mobile) |
| POST | `/operations/dispatches` | novo despacho |
| PATCH | `/operations/dispatches/:id/status` · `/reassign` | despachar/reatribuir |
| POST | `/routes/recalculate` | otimizar rotas |
| WS | `/ws/dispatch` | fila em tempo real |

## checklists
| Método | Rota | Uso |
|---|---|---|
| GET ● | `/mobile/checklists/:id/render` | schema-driven render |
| GET | `/mobile/checklists/available` | checklists da OS |
| POST | `/mobile/checklist-runs` | inicia run (coleta/entrega) |
| PATCH | `/mobile/checklist-runs/:runId` | salva progresso |
| POST | `/mobile/checklist-runs/:runId/markers` | mapa de avarias |
| POST ● | `/mobile/checklist-runs/:runId/attachments` | fotos |
| POST | `/mobile/checklist-runs/:runId/complete` | conclui |
| GET | `/mobile/checklist-runs/:runId/comparison` | coleta × entrega |
| POST | `/mobile/checklist-runs/:runId/divergence` · `/acknowledgement` | divergência / ciência |
| GET/POST/PUT | `/checklists/templates` · `/:id` · `/:id/publish` | builder (admin web) |

## evidências
| Método | Rota | Uso |
|---|---|---|
| POST | `/mobile/evidence-uploads` | upload de foto/anexo |
| POST | `/mobile/sync/evidence-actions` | replay offline |

## localização (LGPD — manual)
| Método | Rota | Uso |
|---|---|---|
| POST | `/mobile/field-locations` | enviar localização agora |
| GET/POST/PUT | `/mobile/location-consent` | consentimento / status |

## sync (offline)
| Método | Rota | Uso |
|---|---|---|
| POST | `/mobile/sync/work-order-actions` | replay de ações de OS |
| POST | `/mobile/sync/checklist-actions` | replay de checklist |
| POST | `/mobile/sync/evidence-actions` | replay de evidências |
| POST | `/mobile/sync/batch` | (alternativa) lote único; `409` em conflito |

## inventory (estoque)
| Método | Rota | Uso |
|---|---|---|
| GET | `/inventory/items` · `/items/:id` · `/movements` · `/critical` | estoque web |
| POST | `/inventory/movements` · `/entries` · `/exits` · `/notes` · `/reservations` · `/adjustments` | movimentações |
| PATCH | `/inventory/items/:id` | editar produto |
| GET/POST | `/mobile/inventory/items` · `/mobile/work-orders/:id/materials` | materiais em campo |
| GET | `/mobile/technician/stock` | estoque do técnico (prestador) |

## approvals
| Método | Rota | Uso |
|---|---|---|
| GET | `/approvals` · `/approvals/:id` · `/mobile/approvals` | fila + detalhe |
| POST ● | `/approvals/:id/approve` · `/approvals/:id/reject` | decisão |
| POST | `/approvals/:id/request-revision` | solicitar revisão |

## finance / billing
| Método | Rota | Uso |
|---|---|---|
| GET | `/finance/summary` · `/cashflow` · `/titles` · `/invoices` · `/payments` | financeiro |
| GET | `/billing/charges` · `/billing/charges/:id` | cobranças |
| POST | `/billing/charges/:id/payment` · `/reminder` · `/dispute` · `/notes` | ações de cobrança |
| POST | `/finance/invoices` · `/finance/payments` | emitir NF-e / agendar |

## expenses / RDV (mobile)
| Método | Rota | Uso |
|---|---|---|
| GET | `/mobile/expense-reports` · `/:reportId` · `/expense-entries/:id` | relatórios/lançamentos |
| POST | `/mobile/expense-reports` · `/:reportId/entries` · `/:reportId/submit` | criar/lançar/enviar |
| POST | `/mobile/ocr/scan` | OCR de recibo |
| GET | `/mobile/commissions` | minhas comissões |

## notifications / chat
| Método | Rota | Uso |
|---|---|---|
| GET ● | `/notifications` · `?workOrderId=:id` | notificações web |
| GET | `/mobile/notifications` · `/mobile/chats` · `/mobile/chats/:id/messages` | mobile |
| POST | `/mobile/chats/:id/messages` | enviar mensagem |
| PATCH | `/notifications/:id/read` | marcar lida |
| WS | `/ws/notifications` · `/ws/chat/:id` | push/chat |

## platform (Admin Plataforma)
| Método | Rota | Uso |
|---|---|---|
| GET | `/platform/dashboard/summary` · `/mrr-trend` · `/activity` · `/tenants/health` | visão geral |
| GET | `/platform/tenants` · `/tenants/:id` · `/plans` · `/modules` · `/cloud-billing/*` · `/api-keys` · `/audit-events` · `/health` · `/incidents` · `/settings` | listas/detalhes |
| POST | `/platform/tenants` · `/plans` · `/modules` · `/api-keys` · `/*/export` | criar/exportar |
| PATCH/PUT | `/platform/tenants/:id` · `/:id/status` · `/:id/modules` · `/plans/:id` · `/settings` | editar |
| DELETE | `/platform/api-keys/:id` | revogar chave |

## admin / organização
| Método | Rota | Uso |
|---|---|---|
| GET | `/users` · `/organization/settings` · `/audit-events` · `/reports/catalog` · `/purchase-orders` | admin |
| POST | `/users` · `/reports/generate` · `/reports/schedule` · `/purchase-orders` · `/audit-events/export` | ações |
| PATCH/PUT | `/users/:id` · `/users/:id/role` · `/organization/settings` | editar |
