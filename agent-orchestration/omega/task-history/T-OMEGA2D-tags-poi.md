# T-OMEGA2D — Tags + POI (Ω2-d)

## META
Dois cadastros greenfield do lote Ω2, espelhando price-tables/suppliers: **Tags** (etiquetas name+color) e
**POI** (pontos de interesse geo, lat/lng). Telas `/cadastros/tags` e `/cadastros/pontos-interesse`.

## TOCADO
- **DB:** models `Tag` (name natural key, color hex, description, is_active) e `Poi` (name, category,
  latitude/longitude **Decimal(10,7) NOT NULL**, address, is_active) + back-relations Tenant. Migrations
  aditivas `20260727000000_add_tags` e `20260728000000_add_pois` (RLS ENABLE+FORCE + policy; uniques;
  Poi lat/long NUMERIC(10,7)). **up/down/re-up verificados** em ambas.
- **Backend:** `src/modules/tags/` e `src/modules/pois/` (9 arquivos cada). Tag: 409 duplicate_name, color hex
  `/^#[0-9a-fA-F]{6}$/` (senão 400 invalid_color). POI: latitude/longitude obrigatórios (400 required),
  **predicado de coordenada reusado do mapa Ω1** (`hasValidCoordinate`: finito, faixa, rejeita 0/0 → 400
  invalid_coordinate), emitidos como número. Ambos: cross-tenant 404, soft-delete is_active.
- **RBAC:** `tags:*` e `pois:*` espelho de service_catalog + seed + core-saas.test.ts (26/26).
- **Frontend:** `registry/tags/` (TagsPage, swatch de cor; Ativa/Inativa) e `registry/pois/`
  (PontosInteressePage, coordenada mono `-23.55052, -46.63331`; Ativo/Inativo). Validação client de coord
  (faixa + ilha nula). Rotas + menu GESTÃO; cadastros-nav 9→11. Fonte: estudo doutoral §5 (tela Configuração),
  §4.1 (estado sem-dado), §4.3/§6.3 (densidade semântica — swatch + coordenada mono).

## RESULTADO TESTÁVEL
- Backend: `check`/`lint`/`build` verde · core-saas **26/26** · **tags 13/13 + pois 16/16** (+ regressão
  operator-profiles 17 → conjunto 46/46) · migrations up/down/re-up OK · `git diff --check` limpo.
- **Live HTTP** (gestor.demo): tag 201/dup 409/cor inválida 400; POI 201 (lat número float), sem-coord 400,
  fora-de-faixa 400, **ilha nula 0/0 → 400**, dup 409; finance **403** em ambos.
- Frontend: `check`/`build` verde · `test:smoke` **339/339** (+16; nav 9→11).

## Pendência declarada
**TagAssignment** (join polimórfico tag↔recurso) FICA FORA deste bloco — precisa das entidades-alvo estáveis.
Model futuro `[tenant_id, tag_id, entity_type, entity_id]` + FK composta a tags(tenant_id,id) + RLS/permissões.
Sem ele, Tags é cadastro isolado (CRUD puro), ainda não vinculável.
