# R-Ω1b-2 — ciclo 1 (reprovação da junta de gate)

Junta 5 agentes: inspetor **APROVADO**, pixel-master **APROVADO**; **REPROVADO** por validador-mestre,
master-teste, cognicao-visual. Ciclo 1 do protocolo (blockers claros e localizados → correção direta,
sem escalar mão de obra). Blockers e correções:

| # | Origem | Blocker | Correção |
|---|---|---|---|
| B1 | validador (VETO) | `z.coerce.boolean()` coage a STRING `"false"` → **true** (não-vazio é truthy). `.env.example` entrega `GEOCODING_ENABLED=false` → em DEV liga o Nominatim REAL; em PROD o gate R11 derruba o boot. Falsifica a invariante do bloco. | Helper `booleanFlag` estrito (`true`/`1`/`yes`/`on` → true; resto → false) para `GEOCODING_ENABLED`. Schema exportado para teste. |
| B8 | cognicao-visual (VETO) | Botão "Localizar no mapa" é **promessa falsa** quando geocoding está OFF: chama o endpoint, NoopGeocoder devolve null → UI mostra "Endereço não localizado" (mentira; está desligado). | `Geocoder.isEnabled()` (Nominatim=true, Noop=false); `geocodeById` curto-circuita quando desabilitado com razão honesta "Geocodificação está desabilitada neste ambiente." |
| B2/B3/B4 | master-teste | Teste do endpoint chama `service.geocodeById` direto — não exercita rota/controller/RBAC (403), parsing de `force`, shape da resposta. | Novo teste de ROTA via router Express: 403 sem permissão, 200 sucesso, 404, 409, 422, 502, `?force=true`. |
| B5 | master-teste | R10 (`updateGeocode` RETURNING vazio → 404) inalcançável no InMemory (findById guarda antes). | Teste com repo stub: findById devolve OS, updateGeocode devolve undefined → 404. |
| B6 | master-teste | R4 (create não invoca geocoder) e R11 (gate de prod) sem teste. | Teste: create com geocoder que lança → OS criada (R4). Teste do schema: prod+enabled+URL pública → erro; `=false` → ok (R11 + B1). |
| B7 | validador/master-teste | T-003 diz "geocoding 11/11"; real = 10. | Corrige para 10/10. |
| B3-nota | validador | `withTimeout` deixa a Promise subjacente pendurada no caso patológico (leak). | Não-bloqueante; nota registrada. |

**Estado:** correções aplicadas; junta re-executada no ciclo 2.
