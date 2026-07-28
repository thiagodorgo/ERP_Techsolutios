# R-omega5p-pr16 — ciclo 1 (2026-07-28)

**Entrega:** Ω5P PR-16 — owner-portal BFF público ISOLADO + esqueleto PWA + consulta placa+Renavam. SUPERFÍCIE PÚBLICA ANÔNIMA (anti-enumeração/anti-abuso/LGPD) — tolerância ZERO a enumeração/vazamento/regressão.
**Junta (PESADA, superfície pública):** omega5p-avaliador (VETO) · agente-secops (VETO OBRIGATÓRIO) · critico-adversarial (OBRIGATÓRIO) · coordenador-de-acessos · agente-dba-guardiao (OBRIGATÓRIO).

## Verdicts do ciclo 1
- **agente-secops → APROVADO.** Isolamento total do ERP, gates de produção fail-closed (provou o boot THROW sem os secrets/CORS curinga), anti-enumeração byte-idêntica, §2.8 (allowlist 6 campos + log só-HMAC), RLS FORCE. **Flagou como não-bloqueante o MÉDIO do /challenge** (sem rate-limit + store sem eviction) e BAIXO do trust-proxy no deploy.
- **agente-dba-guardiao → APROVADO.** Migração `20260847000000` provada VIVA por tx-ROLLBACK sem DROP: CREATE TABLE + trigger append-only (UPDATE/DELETE bloqueados) + RLS ENABLE+FORCE+POLICY + CHECK (portal/action IN, process_id só em FOUND) + FK compostas tenant-first RESTRICT (I9) + índices tenant-first. `migrate status` up-to-date, `validate` verde. Drift só de NOME de índice (repo-wide, deliberado) → INFO.
- **coordenador-de-acessos → APROVADO.** Cadeia paralela isolada: `src/app.ts` intocado, sem attachAuthenticatedActor, sessão JWE (PORTAL_SESSION_SECRET) ≠ JWS do ERP (JWT_SECRET) nos DOIS sentidos (issuer/audience/segredo distintos), binding de tenant não-influenciável pela requisição, read-ports minimizados. LOW: sem guarda de runtime rejeitando PORTAL_SESSION_SECRET===JWT_SECRET em prod (defense-in-depth). INFO: `verifyOwnerSession` ainda não consumida (PR-17 deve autorizar só o process_id da sessão, nunca do corpo).
- **critico-adversarial → 1 CRÍTICO + 1 HIGH + notas.** Os 7 vetores de enumeração/timing/rate-limit/PoW/§2.8/cross-tenant resistiram, MENOS:

### CRÍTICO-1 (BLOQUEANTE) — bypass do 2º fator (Renavam) por normalização vazia
`owner-portal.service.ts:140-144` + `portal-shared/portal-crypto.ts:16` (`normalizeRenavamKey` = `renavam.replace(/\D/g,"")`) + `impound.service.ts:79` (`optionalString` no create não exige dígitos). Um processo criado com Renavam sem dígito (ex.: "N/A", "-", "SEM RENAVAM") normaliza `stored → ""`. No lookup, `constantTimeEqual(secret, ""|/*provided vazio*/"") → true` e `matched = process!==undefined && stored!==null && rawMatch` → **FOUND com placa só** (status + pátio + total devido + **sessão JWE válida**), sem saber o Renavam.
**PROVADO (PoC executado):** semeou `plate:"PWN1E11", vehicle_renavam:"N/A"` → `lookup({plate:"PWN1E11", renavam:"zzz", ...PoW válido})` → `kind=found` (deveria ser not_found), ~20ms. Transforma 2 fatores em 1 (placa, baixa entropia/observável) justamente na classe de registros sem Renavam.
**Conserto (defesa em profundidade):**
1. **Serviço (crítico, sem reintroduzir timing):** `matched = process !== undefined && stored !== null && provided.length > 0 && stored.length > 0 && rawMatch;` — AND booleano sobre valores JÁ computados (`rawMatch` continua rodando incondicionalmente → tempo-constante preservado). Renavam vazio nunca autentica; registro sem Renavam-dígito fica não-consultável (como o caso `null`, já seguro).
2. **Validador do portal (`owner-portal.validators.ts`):** rejeitar Renavam sem dígito no `parseLookupRequest` (mantendo o compare em tempo constante para os demais).
3. **Create do impound (`impound.service.ts:79`) — SE não quebrar testes/seed existentes:** validar Renavam como dígitos (9–11) antes de persistir, para que `""` jamais entre na base. Se romper fixtures existentes, DEFERIR ao backlog e confiar nos consertos 1+2 (que já fecham o furo independentemente do dado gravado).
4. **Teste de regressão:** cobrir o caso digitless (o PoC acima) → deve dar `not_found`.

### HIGH-1 (gate de go-live + hardening agora) — /challenge sem throttle + challenge-store sem eviction + access-log ilimitado
`owner-portal.service.ts:73-88` (challenge sem rate-limit/PoW) + `proof-of-work.ts:38-52` (`InMemoryChallengeStore` sem sweep/TTL/cap) + `service.ts:106-135` (append em TODO desfecho, inclusive PoW-inválida que não consome o balde). Flood anônimo de `/challenge` → Map cresce sem teto (OOM) + INSERT ilimitado. As leituras caras (impound/charge/yard) ESTÃO protegidas (PoW+balde antes do banco) — o furo é disponibilidade.
**Conserto:** rate-limit por IP (balde barato) no `/challenge`; TTL/sweeper OU cap de tamanho no challenge store (evict expirados, limitar tamanho); considerar não gravar 1 linha de log por emissão de challenge (ou throttlar). (Redis compartilhado = Ω6; o sweeper in-memory é necessário JÁ.)

### Notas menores (não bloqueiam, registrar/backlog)
- MÉDIO deploy: baldes/store in-process → multi-instância multiplica os limites; NÃO escalar out antes de store compartilhado (rail de deploy, Redis Ω6).
- LOW: normalização de placa no rate-key (strip separadores) × match no banco (`parsePlate` só uppercase) — consulta legítima "ABC-1D23" pode dar falso-negativo (correção/UX, não bypass).
- LOW: `routes.ts:35-37` engole o erro sem log server-side (cega o ops; adicionar log sem PII).

- **omega5p-avaliador → REPROVADO (CRÍTICO-2 + MÉDIA + BAIXA).**

### CRÍTICO-2 (BLOQUEANTE) — regressão de suíte em env.ts (CI vermelho) + KPI "zero regressão" falso
Os novos gates de produção do PR-16 em `env.ts` (`PORTAL_SESSION_SECRET`/`PORTAL_LOG_SECRET`/`PORTAL_TENANT_ID` obrigatórios + `PORTAL_CORS_ORIGIN` allowlist não-vazia em prod) invalidam fixtures de produção de testes EXISTENTES que afirmam parse com sucesso:
- `tests/cors-env.test.ts` (`PROD_BASE` L10-14) — "produção com allowlist explícita → schema ACEITA".
- `tests/env-geocoding.test.ts` (`PROD_BASE` L23-29) — "B1 GEOCODING_ENABLED=false" e "R11 provedor próprio → aceita".
Medido: `env.ts @ PR-16` → +3 NOVAS falhas (#361/#433/#435). São testes de schema PUROS → **falham igual no CI Linux → CI vermelho**. A nota de KPI "Zero regressão" é FALSA (o dev só re-rodou os módulos de produto, não as suítes de env-config). **Conserto (NÃO afrouxar os gates — estão corretos; NÃO skipar/deletar):** estender os DOIS `PROD_BASE` com `PORTAL_SESSION_SECRET`/`PORTAL_LOG_SECRET`/`PORTAL_TENANT_ID`/`PORTAL_CORS_ORIGIN` válidos; re-rodar os 3 arquivos verdes; reconciliar `Kpis/kpis-latest.json` (número real pós-conserto).
### MÉDIA-1 — os 4 gates fail-closed do portal foram adicionados SEM teste. Espelhar os testes de regressão de JWT/CORS: prod sem cada PORTAL_* secret → REJEITA; PORTAL_CORS_ORIGIN vazio/`*` → REJEITA. (Casa com o CRÍTICO-2.)

## Ação (ciclo 1 → dev omega5p-dev-portal)
Devolvido ao **omega5p-dev-portal** para: **CRÍTICO-1** (guarda `stored.length>0 && provided.length>0` no compare do serviço + rejeição de Renavam sem dígito no validador do portal + teste digitless; create-side só se não quebrar fixtures) + **CRÍTICO-2** (estender os 2 PROD_BASE + reconciliar KPI) + **MÉDIA-1** (testes dos 4 gates fail-closed do portal) + **HIGH-1** (rate-limit no /challenge + sweeper/cap no challenge store) + **LOW do coordenador** (superRefine rejeitando PORTAL_SESSION_SECRET===JWT_SECRET em prod). Backlog: multi-instância/Redis (Ω6), normalização de placa no match, log server-side no catch, trust-proxy no runbook de deploy. Re-verificação por **critico-adversarial** (re-roda o PoC digitless → not_found; confirma /challenge throttled) + **omega5p-avaliador** (suíte env verde + KPI reconciliado). secops/dba/coordenador já APROVARAM (não re-rodam salvo mudança no que revisaram). Superfície pública = tolerância ZERO.
