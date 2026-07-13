# T-OMEGA2E — Parâmetros / matar settings.mock (Ω2-e) — FECHA o Ω2

## META
Substituir a tela de Configurações 100% mock por parâmetros REAIS key-value. Modelo `TenantSetting`
(chave→valor por tenant), upsert por chave (não dense-list). Último cadastro do Ω2.

## Forma (diferente dos irmãos: key-value, não CRUD de lista)
- **Model** `TenantSetting`: key (≤80, regex `^[a-z][a-z0-9_.]{1,79}$`), value (@db.Text, ≤5000), category?,
  description?, updated_by, timestamps, **@@unique([tenant_id, key])**, RLS. Migration aditiva
  `20260729000000_add_tenant_settings` (up/down/re-up OK; RLS forced+policy).
- **Contrato:** `GET /tenant-settings` (+?category=), `GET /tenant-settings/:key` (404 se ausente),
  **`PUT /tenant-settings/:key` = upsert** (cria/atualiza, 200). Erros TenantSettingError; DTO não vaza id/tenant.
- **RBAC (distribuição própria, NÃO espelho):** `tenant_settings:read` → super_admin/tenant_admin/**manager**/
  **auditor**; `tenant_settings:update` → super_admin/tenant_admin **só** (manager NÃO edita — matriz:
  Configurações manager = R). Auditoria `tenant_setting.upserted` grava só key+category (sem value).
- **Seed:** 4 params default do tenant demo (organization.theme/currency/timezone/business_name).

## Frontend — matou o settings.mock
`settings.mock.ts` e `types.ts` **removidos** (git rm). Dados vêm 100% de `GET /tenant-settings`. O que era
decoração virou `tenant-settings.presentation.ts` (mapa category→{título,ícone,ordem} + rótulos PT-BR + opções
do select de tema — **apresentação pura**, sem valor hardcoded). `TenantSettingsPage` reescrita data-backed:
agrupa por category, edição inline por parâmetro com **Salvar** (PUT), gated por `tenant_settings:update`
(selo "Somente leitura" quando sem permissão). Rota `/administrator/settings` guard = união
`[tenant_settings:read, tenant.manage, tenant:manage]`. Estados completos + D-007.

## RESULTADO TESTÁVEL
- Backend: `check`/`lint`/`build` verde · core-saas **26/26** (catálogo 140 permissões) · **tenant-settings 17/17**
  (+ regressão tags/pois 31 → conjunto 48/48) · migration up/down/re-up OK · `git diff --check` limpo.
- **Live HTTP:** seed 4 params; upsert cria (200) e **mesma chave atualiza sem duplicar** (1 ocorrência);
  key inválida (maiúscula) **400 invalid_key**; value vazio **400**; **manager GET 200 / PUT 403**; operator **403**.
- Frontend: `check`/`build` verde · `test:smoke` **348/348** (+9; mock removido).

## Fecho do Ω2
Configurações completas: Fornecedores · Profissionais · Filiais · Tabela de Valores · Tarifas · Tags · POI ·
**Parâmetros**. Pendências declaradas: TagAssignment (join polimórfico, Ω2-d); alinhar item de menu de
Configurações ao `tenant_settings:read` (hoje `tenant.manage`, mantido p/ não quebrar testes de nav por papel).
