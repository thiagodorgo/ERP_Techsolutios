# B-ASS-03-dev — relatório incremental do dev-ass03

- **Dev:** `dev-ass03` · nível menor declarado · identidade de dev. Esforço médio.
- **Plano:** `C:/Users/thiag/erp-pausa-2026-10-03/planos/B-ASSINATURA-plano.md` §4.3, §3, §12 e Emendas 2-4 ao §4.2.
- **Ref de partida:** `origin/main = 43716227a769e2f2661ca828ec68903e4b49167e` (B-ASS-02, #504).
- **Worktree:** `C:/Users/thiag/w-ass03` · ramo `feat/b-ass-03-medicao-franquia`.
- **Verificação desta rodada:** revisor sênior (outra identidade) no lugar da junta; porteiro revisor pós-merge.

---

## F0 — comando, hipóteses e terreno (25)

**FATOS medidos nesta fatia:**
- `npm ci` no worktree: `added 326 packages` (aviso EBADENGINE de `@prisma/streams-local`, não bloqueante).
- H-DMMF — FATO: `prisma/schema.prisma` tem 0 ocorrências de `relforcerowsecurity`/`relrowsecurity`/`ENABLE ROW LEVEL`; a RLS vive nas migrações (`ALTER TABLE ... ENABLE/FORCE ROW LEVEL SECURITY` + `CREATE POLICY`). Logo a lista censurada do medidor NÃO pode sair do DMMF ("toda tabela com tenant_id" é a mutação proibida de R-MED-9); a fonte correta é o catálogo do Postgres (`pg_class.relforcerowsecurity = true` ∩ coluna `tenant_id NOT NULL`), no cluster descartável.
- H-SIZE-NULL — FATO: `size_bytes Int?` (nulável) nas 4 tabelas de anexo — `ChecklistAttachment` (schema l.978), `WorkOrderAttachment` (l.1469), `Attachment` (l.1504), `DamageAttachment` (l.1532). Confirmado também: `status` + `deleted_at` existem só em `work_order_attachments` e `attachments`; `checklist_attachments` e `damage_attachments` não têm essas colunas (S2/E23 confirmados). `files_without_size` = linhas com `size_bytes IS NULL` é suportado.
- Comando do bloco criado em `agent-orchestration/codex/comandos/B-ASS-03-medicao-diaria.md` (29 linhas).

**PREMISSA FALSA (declarada; sigo sem ela):** o §4.3 PERMITIDO lista, para R-MED-8, apenas
`cloud-cost-allocation/{rules.ts, prisma.repository.ts, repository.ts}`. Mas a chave `db_bytes_estimated` precisa
existir no union `CloudUsageMetricKey` (definido em `src/modules/cloud-usage/cloud-usage.types.ts`), que é usado por
`UsageBasisRow.metricKey` (`cloud-cost-allocation.types.ts:127`) e por `basisMetricKeys` de `cloud-cost-allocation.rules.ts`.
Comando: `grep -rn "UsageBasisRow\|CloudUsageMetricKey" src/modules/cloud-cost-allocation/cloud-cost-allocation.types.ts src/modules/cloud-cost-allocation/cloud-cost-allocation.rules.ts` → `metricKey: CloudUsageMetricKey` e `basisMetricKeys: readonly CloudUsageMetricKey[]`. Sem adicionar a chave ao union, o TypeScript não compila a regra nova. Portanto o PERMITIDO ganha `src/modules/cloud-usage/cloud-usage.types.ts` (só a linha da chave nova) — registrado aqui e no PR. A mutação de R-MED-8 ("chave depois de audited_actions_count → vermelho") e o vermelho-controle ("em origin/main a chave não existe") permanecem válidos.

**Próxima fatia:** F1 (tipos + medidor com dublê em memória e SQL injetável).
