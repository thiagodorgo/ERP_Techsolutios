# Decisão D-ACESSO — Operator ganha `field_location:read` (operar o Mapa Operacional)

**Data:** 2026-07-11 · **Bloco:** Ω-ACESSO · **Registrada por:** correção de veto da junta (validador-mestre).

## Conflito (fato × fonte de verdade)
- **Diretriz do usuário (fonte #1, A1):** "tenant_admin/manager/**operator** operam o Mapa Operacional".
  Operar o mapa exige LER as posições dos operadores em campo → `field_location:read`.
- **RBAC_MATRIX.md (fonte #2), linha "Field operator location":** operator estava como `send-own`
  (apenas enviar a própria localização, sem ler as posições do tenant).

Havia, portanto, divergência entre a diretriz aprovada e a matriz. Por A1, a **decisão explícita do
usuário vence** a matriz; por A2, o conflito é **registrado aqui e a matriz reconciliada** (não escolhido
em silêncio).

## Decisão
Conceder `field_location:read` ao papel **operator** (`catalog.ts`), para que ele veja o Mapa Operacional e
despache. Escopo: **tenant-scoped** (RLS em `field_operator_locations`; o backend deriva `tenant_id` do ator
autenticado) — **sem vazamento cross-tenant**. Operator continua com `field_location:send` (auto-localização).

## Reconciliação aplicada
- `RBAC_MATRIX.md` linha "Field operator location": operator `send-own` → **`send-own/read-tenant`**.
- `docs/navigation-matrix.md`: Mapa, coluna operator `R` → **`E`** (opera).
- `catalog.ts`: operator + `field_location:read`.
- Validado por login real (9 papéis) — ver `docs/demo-credentials.md` e task-history `T-ACESSO`.

## Escopo NÃO alterado (mantido conforme matriz)
`field_technician` permanece `send-own` (não lê posições no web; vive no mobile). Auditor `full-read`
(vê o mapa, sem ações de despacho). finance/inventory/support seguem `none`/`support-view`.
