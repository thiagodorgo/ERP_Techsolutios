# DEMO-B — dev: status do técnico no Mapa Operacional (AC-18)

- Identidade: `dev-demo-b-opus` · executor: subagente genérico Claude, modelo Claude Opus 5.5, nível menor declarado (cobre o Codex sem limite até 19:20Z, decisão do dono "Codex primeiro, Claude cobre").
- Mandato: `C:/Users/AMP/erp-pausa-2026-10-03/prompts/demo-b-mapa-status.md`.
- Plano-fonte: `C:/Users/AMP/erp-pausa-2026-10-03/planos/DEMO-SOCIO-plano.md` (cenas 4 e 7, seção 6, AC-18 da 7.1, seções 8 e 9).
- Ramo: `feat/demo-mapa-status-tecnico`, a partir da `origin/main` @ `c9a2d036`.
- Worktree: `C:/Users/AMP/w-demo-b` (sem junction; `npm ci` próprio).

## Etapa 0 — terreno
- `df -h /c` → 11G livres (acima do piso de 7 GB).
- `git worktree add -b feat/demo-mapa-status-tecnico C:/Users/AMP/w-demo-b origin/main` → HEAD `c9a2d036`.
- `npm --prefix frontend ci --no-audit --no-fund` → exit 0 (103 pacotes, 7 min). `npm ci --no-audit --no-fund --ignore-scripts` na raiz → exit 0 (326 pacotes; `--ignore-scripts` porque a bateria é só de front e o `postinstall` da raiz não é insumo dela). Sem junction.
- Disco depois das duas instalações: 9,6 GB livres (acima do piso de 7 GB).

## Etapa 1 — onde o mapa monta o técnico e lê despachos (seção 8 do plano, conferido na `origin/main` @ `c9a2d036`)
- `operations-map.adapter.ts` `adaptFieldLocationItem` → `status: normalizeStatus(readString(input, ["status"]))`; o DTO do servidor não traz `status`, logo `unknown`.
- `map/mapMarkers.ts` `TECH_GROUP_BY_STATUS.unknown = "off"` → "Fora de serviço".
- `OperationsOperatorList.tsx` `disabled={isOff}` (Alocar) e `canDropOnTechnician(group)` (arrastar); `OperationsMapPage.tsx` `performAllocation` sai cedo com grupo `off`.
- Despachos: `operations-map.service.ts` `enrichOperationsMapWithDispatches` → `attachDispatchesToFieldLocations` grava `currentDispatch` por técnico (só com `field_dispatch:read`).
- "Localização antiga": `FIELD_LOCATION_STALE_THRESHOLD_MS = 15 min` → `isStale` em cada técnico (flag da API vence; senão derivado).
- Despacho ativo: `allocation.ts` `isActiveDispatchStatus` (draft, assigned, accepted, on_route, arrived, in_service) — reusado, nada duplicado.
- `getLatestFieldLocations` é lida também pelo Painel (`useDashboardData.ts`) e por Operadores de Campo (`useFieldOperators.ts`); o Mapa é o único consumidor de `useOperationsMap`. Por isso a derivação entra numa leitura só do Mapa.

## Etapa 2 — implementação (só front)
- `operations-map.adapter.ts`: `deriveFieldLocationStatus` (pura) e `applyDerivedFieldLocationStatuses`. Regra:
  1. status do servidor reconhecido (≠ `unknown`) vence;
  2. despacho ativo → `in_service` → "Em atendimento"; `arrived` → "No local"; `on_route`, `assigned`, `accepted`, `draft` → "Em deslocamento";
  3. sem despacho ativo e posição recente (`!isStale`) → "Disponível";
  4. sem despacho ativo e posição antiga → `unknown`, como hoje.
- `operations-map.service.ts`: `getOperationsMapData` = `getLatestFieldLocations` + a derivação. `useOperationsMap.ts` passa a ler por ela.
- Nenhuma cópia, componente ou layout alterado; nenhum componente novo.
- **Leitura do dev, declarada (§A6):** o mandato nomeia "em rota" e "em atendimento". Para despacho `assigned`/`accepted`/`draft` (alocado, ainda não saiu) escolhi o grupo "em rota" ("Em deslocamento"), porque o técnico já está comprometido com o chamado e não pode aparecer "disponível" (o mandato exige "nenhum despacho ativo" para isso); a alternativa, "Fora de serviço", apagaria o técnico logo depois do Alocar da cena 4. `arrived` → "No local" (grupo atendimento). Corrige-se numa linha em `DERIVED_STATUS_BY_DISPATCH`.
- **Leitura do dev, declarada:** "o servidor mandou um status" = um status que o mapa reconhece. Valor ausente ou fora do enum normaliza para `unknown` e é derivado.

## Etapa 3 — testes
- Novo `frontend/tests/operations-map-status-derivation.test.ts` (6 testes), incluído na lista do `test:smoke` do `frontend/package.json` (logo após `operations-map-technicians`):
  - tabela de 20 casos da função pura;
  - pureza (não muta, preserva o objeto que não muda);
  - grupo `disp` e `canDropOnTechnician` = true para o derivado; controle `off`/false sem derivação;
  - smoke da tela no molde de `operations-map-technicians.test.ts`: Alocar sem `disabled` com derivação, com `disabled` sem ela;
  - leitura do Mapa contra a API simulada (`fetch`): 6 técnicos → available / on_route / in_service / unknown / paused / available; e a leitura comum (`getLatestFieldLocations`) segue `unknown`;
  - o hook do Mapa lê por `getOperationsMapData`.
- `node --test --import tsx tests/operations-map-status-derivation.test.ts` → 6/6 pass, 0 fail.

## Etapa 4 — mutações (uma por critério; executadas e restauradas com `git hash-object` conferido)
Roteiro: `node <scratchpad>/demo-b/mutate.mjs` (âncora única por mutação, aplica, roda `node --test --import tsx tests/operations-map-status-derivation.test.ts`, restaura o texto original e confere o hash).

| Id | Critério | Resultado | Hash antes = depois |
|---|---|---|---|
| M1 | C1 o status do servidor vence (guarda removida) | VERMELHO, 3 fail | `7e3c0c6f` = `7e3c0c6f` |
| M2 | C2 disponível (recente sem despacho ativo devolve `unknown`) | VERMELHO, 5 fail (inclui o smoke do Alocar) | `7e3c0c6f` = `7e3c0c6f` |
| M3a | C3 `in_service` → `on_route` | VERMELHO, 2 fail | `7e3c0c6f` = `7e3c0c6f` |
| M3b | C3 `arrived` → `in_service` | VERMELHO, 1 fail | `7e3c0c6f` = `7e3c0c6f` |
| M3c | C3 só despacho ATIVO conta (terminal tratado como ativo) | VERMELHO, 2 fail | `7e3c0c6f` = `7e3c0c6f` |
| M3d | C3 despacho ativo vence a posição recente | VERMELHO, 2 fail | `7e3c0c6f` = `7e3c0c6f` |
| M3e | C3 `assigned` → `available` | VERMELHO, 1 fail | `7e3c0c6f` = `7e3c0c6f` |
| M4 | C4 antiga sem despacho continua como hoje | VERMELHO, 2 fail | `7e3c0c6f` = `7e3c0c6f` |
| M5a | C5 a leitura do Mapa aplica a derivação (`return data`) | VERMELHO, 1 fail | `2c74a21e` = `2c74a21e` |
| M5b | C5 o hook do Mapa usa a leitura derivada (volta a `getLatestFieldLocations`) | VERMELHO, 1 fail | `baeaf945` = `baeaf945` |
| M6 | C6 escopo: a leitura comum (Painel, Operadores de Campo) não deriva | VERMELHO, 1 fail | `2c74a21e` = `2c74a21e` |

Limite declarado: o M5b só é pego pela conferência de fonte do hook. O smoke por `renderToString` não roda `useEffect`, e o front não tem DOM de teste (jsdom/happy-dom) — dependência nova está fora do escopo.

## Etapa 5 — bateria
- `npm --prefix frontend run check` → exit 0.
- `npm --prefix frontend run build` → exit 0 (só o aviso de chunk > 500 kB que já existia).
- `git diff --check` → exit 0.
- `npm --prefix frontend run test:smoke`, 1ª execução: morta pelo meu `timeout 1500` (exit 124) com 709 `ok` e 0 `not ok` até ali. A máquina estava carregada (o `build` rodou junto, e há dois `npm ci` de outras sessões, PIDs 24500 e 2908, que não toquei). Relançada sozinha, com `timeout 5400`.
- `npm --prefix frontend run test:smoke`, 2ª execução (lista do `package.json` já com o teste novo): exit 0 — **tests 1374 · pass 1374 · fail 0 · cancelled 0 · skipped 0** (444 s). Os 6 testes `AC-18` estão entre eles.
- `git diff --cached --check` no commit do código → exit 0.

## Etapa 6 — entrega
- Commit do código: `3b375dbc` `feat(mapa): deriva o status do técnico quando o servidor não manda (AC-18)` — `frontend/package.json` (só a lista do `test:smoke`), `operations-map.adapter.ts`, `operations-map.service.ts`, `useOperationsMap.ts`, `tests/operations-map-status-derivation.test.ts`.
- Fora do escopo, intocados: `Kpis/**`, backend, `prisma/**`, lockfiles, cópia e layout das telas.
- Limpeza: `frontend/dist/` do build removido (ignorado pelo git). `node_modules` do worktree mantidos para o revisor; o worktree sai por `git worktree remove --force` depois do merge.
- Disco no fim: 8,9 GB livres.
- Para o revisor e para o ensaio (cena 4): depois do Alocar, o técnico passa a "Em deslocamento" (grupo em rota) pelo despacho `assigned`; continua alocável e arrastável, como todo técnico fora do grupo "Fora de serviço" já era antes.
- Push: `git push -u origin feat/demo-mapa-status-tecnico`. PR não aberto (mandato).
