# J-OMEGA3F-2 — Ata: bloco Ω3F-2a (Origem/destino + campos dinâmicos por tipo)

Fluxo: fid-analista (dossiê) → implementação (schema+migration drillado + wiring do módulo) → junta.
Diff revisado: `git diff main...HEAD` (commits `0447819` schema/migration + `558abf5` wiring + `075286a` fix da junta).

## Veredictos (3/3 favorável — 2 APROVADO + 1 APROVADO_CONDICIONADO; furo bloqueante CORRIGIDO antes do merge)
| Agente | Veredito | Núcleo |
|---|---|---|
| fid-avaliador (veto) | **APROVADO** | Fidelidade #24 (origem+destino, 422 create+update), #23 (service_details por tipo), C4 (discriminador). Tipo imutável em 2 níveis. §2.8 access_code provado fora do metadata. Migration aditiva. 12 testes ≥ meta. |
| validador-mestre (veto) | **APROVADO** | Rodou DRILL transacional up/down/re-up REAL contra Postgres (revertido, DB intacto); tipos numeric(10,7)/timestamptz(6)/jsonb/boolean-not-null; isolamento tenant; §2.8; suíte 803/0-fail; tsc verde; escopo cirúrgico, sem dep nova; #4 corretamente deixado p/ Ω3F-3. |
| critico-adversarial | **APROVADO_CONDICIONADO** | Núcleo sólido; achou **furo #2 BLOQUEANTE** (reproduzido) + #2b (decisão) + obs. Falha-fechada (super-bloqueia, não vaza). |

## Furo bloqueante do critico — CORRIGIDO (commit `075286a`)
- **Furo #2:** o 422-no-update lia o destino do corpo isolado e ignorava o destino persistido não
  mencionado → apagar só o endereço de uma OS de reboque com destino por **PIN** dava 422 indevido.
  **Fix:** a regra só se aplica quando o corpo TOCA destino, com **merge por-campo** (tocado=corpo,
  não-tocado=persistido) → o pin persistido sobrevive.
- **Furo #2b:** OS legada/sem-destino em catálogo que passou a exigir destino ficava congelada (422 em
  qualquer edição). **Fix:** update que não toca destino não dispara a regra (D-Ω3F-2-DESTINATION-UPDATE).
- **Obs 1/2:** `hasDestination` = endereço OU coordenada válida (não-sentinela 0/0, predicado do mapa);
  cidade/estado/CEP soltos ("destino lixo") não bastam.
- +3 testes (furo #2 pin, furo #2b legada, obs 1). Bloco 8→11; suíte 803→**806** (800 pass, 6 skip pré-existentes).

## Entregas
- Schema aditivo + migration `20260802000000` (ADD COLUMN nullable + requires_destination DEFAULT false;
  drill up/down/re-up comprovado 2× — por mim e pelo validador). `ServiceCatalog += service_type +
  requires_destination`; `WorkOrder += destination_* + service_details`; origem segue em `service_*` (sem rename).
- work-orders: `assertDestinationForType` (422 destination_required), create+PATCH aceitam destino+service_details,
  tipo imutável no update (lê o persistido), parseServiceDetails (objeto plano, 422 inválido, teto anti-DoS),
  §2.8 access_code nunca em metadata. service-catalog: expõe o discriminador (create/update/DTO, boolean estrito).

## Observações não-bloqueantes (registradas)
- fid-avaliador: teste cross-tenant de catálogo → Ω3F-3; geocode do 2º ponto → Ω3F-8 (colunas já entram aditivas).
- Convenção 400 (sub-referência no corpo) × 404 (OS por id) mantida (pré-existente do app, não alterada).
- Contagem 12 testes na superfície (baseline 5, meta ≥10) atingida; front (WorkOrderForm) = Ω3F-2b.

**APROVADO — merge do Ω3F-2a.** KPIs = relatório final (Ω3F §0.1). Aba "Origem/Destino" no form = Ω3F-2b.
