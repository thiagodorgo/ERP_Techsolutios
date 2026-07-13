# PROMPT — RODADA SANEAMENTO + Ω-INFRA (autônoma, governada por juntas)

Você está no repositório `thiagodorgo/ERP_Techsolutios` (branch base: `main`). Esta rodada tem
**7 PRs** em 4 trilhas: Ω-GATE (CI), Ω-GOV (governança: KPI por PR + autonomia por juntas),
Ω-DOCS (descontaminação Kryos) e Ω-INFRA (staging + produção + backup + secrets). Roda **em
paralelo ao Ω3** e não toca em feature de produto.

---

## POLÍTICA DE AUTONOMIA POR JUNTAS (norma desta rodada — e a gravar como permanente no PR 2)

1. A rodada executa de ponta a ponta **sem espera de aprovação humana entre PRs**.
2. Cada PR termina com uma **JUNTA de agentes** (composição definida por bloco, ≥3). **Sinal
   verde da junta = merge + início imediato do bloco seguinte.** Maioria simples nos blocos
   normais; **unânime com 5 agentes** nas decisões críticas: deploy de PRODUÇÃO, dependência
   nova, contratação/configuração de serviço externo (provedor de deploy, logs, uptime).
3. Votos + justificativas registrados em `agent-orchestration/omega/juntas/J-SAN-<n>-<tema>.md`,
   no mesmo molde dos J-xxx existentes. Junta sem registro = merge inválido.
4. O humano é **informado** (relatório final + history de KPI por PR), não **consultado** por PR.
5. Regra da dúvida mantida: qualquer dúvida → `agente-pesquisador-web` (≥3 fontes) → registro
   PD-xxx em `docs/omega-pd.md` ANTES da decisão. Dúvida sem pesquisa = veto.

## PROTOCOLO DE DIFICULDADE: CRIAR AGENTES ANTES DE PARAR

Reprovação ou bloqueio técnico **não gera parada direta**. Fluxo por ciclos, registrado em
`agent-orchestration/omega/reprovacoes/R-<entrega>-<ciclo>.md` (mesmo molde atual):

- **Ciclos 1–2:** o `agente-fabrica` **CRIA 1–2 agentes especialistas sob medida para o
  problema** (ex.: teste vermelho intermitente → `agente-ci-doutor`; deploy falhando →
  `agente-devops-provisionador`; restore quebrado → `agente-dba-guardiao`), no mesmo molde do
  Ω0. O agente novo entra na junta do ciclo seguinte e vota.
- **Ciclo 3:** `critico-adversarial` reabre a premissa + pesquisa web ≥5 fontes; a fábrica pode
  criar mais especialistas (teto 6 agentes ativos por entrega).
- **Ciclos 4–5:** junta ampliada replaneja a fatia (dividir o PR, mudar abordagem, reordenar).
- **PARADA + dossiê ao humano SOMENTE** após o ciclo 5 falho, **ou** nas paradas imediatas
  irredutíveis: migration destrutiva; exposição de segredo; ação irreversível em produção sem
  junta unânime prévia.
- **Pré-autorizações desta rodada** (registrar como decisão D-SAN-AUTONOMIA em
  `agent-orchestration/controle/decisoes.md`): contratar/configurar provedor de deploy, serviço
  de logs/uptime, GHCR e as dependências mínimas de infra correspondentes **não são parada
  estrutural** — exigem junta de 5 unânime + PD e seguem. Isto substitui, nesta rodada, a parada
  por "integração externa" do plano-mestre Ω (que travaria a trilha Ω-INFRA inteira).

## FÁBRICA DA RODADA (passo 0, dentro do PR 1)

Criar via `agente-fabrica`, no molde do Ω0, o elenco desta rodada e persistir junto aos agentes
existentes: `agente-ci-doutor` (triagem de testes/CI), `agente-devops-provisionador`
(provisionamento/CD), `agente-secops` (secrets/hardening), `agente-dba-guardiao`
(backup/restore/migrations) e `agente-finops` (custo de provedores). Registrar **J-SAN-0**
(plano da rodada aprovado, junta de ≥3 com `planejador-mestre`, `estrategista`,
`critico-adversarial`).

## Regras herdadas (valem para todos os PRs)

- Herda as regras A–F do `agent-orchestration/omega/plano-mestre.md`: 1 branch/PR por bloco,
  docs vivas no mesmo PR, PT-BR, migrations aditivas (nenhuma prevista), ciclo Git completo com
  push e PR no GitHub.
- **Proibido:** deletar/skipar teste para deixar CI verde; commitar segredo ou `.env`;
  dependência sem junta unânime; alterar comportamento de produto.
- Ordem: Ω-GATE → Ω-GOV → Ω-DOCS → Ω-INFRA-1 → 2 → 3 → 4. A partir do Ω-GOV, **todo PR já
  segue a nova política de KPI** (abaixo).

---

## PR 1 — Ω-GATE: CI roda a suíte inteira + main verde

**Problema (já verificado):**
- `package.json` → `"test": "node --test --import tsx tests/core-saas.test.ts"` — roda **1
  arquivo de 87**. O gate do CI é ilusório.
- `.github/workflows/ci.yml`, job `backend`: define `DATABASE_URL` mas **não tem service
  container de Postgres** — por isso a suíte completa nunca rodou no CI (testes `*-prisma`,
  `rls-tenant-isolation` etc. precisam de banco).
- P-003 (`agent-orchestration/controle/pendencias.md`): `tests/approval-frontend-contract.test.ts`
  e `tests/platform-routes.test.ts` estão **vermelhos na main**.

**Tarefas:**
0. Executar a **fábrica da rodada** e registrar J-SAN-0 (acima).
1. Rodar localmente a suíte completa (`node --test --import tsx tests/*.test.ts` com Postgres do
   `docker-compose.yml` + `prisma migrate deploy`) e listar TODOS os vermelhos — pode haver mais
   que os 2 conhecidos.
2. Corrigir os vermelhos pela **causa raiz** (contrato divergiu? rota mudou? fixture?). Dificuldade
   persistente = protocolo de dificuldade (fábrica cria `agente-ci-doutor` já no ciclo 1), não parada.
3. `package.json`: `"test"` passa a executar a suíte completa (glob `tests/*.test.ts`); criar
   `"test:unit"` para subconjunto sem banco se útil, mas o **`npm test` do gate = suíte inteira**.
4. `ci.yml` job `backend`: adicionar `services:` com `postgres:16` (healthcheck) e, se algum teste
   exigir, `redis:7`; passo `prisma migrate deploy` antes dos testes.
5. Playwright (`test:e2e`) fora do gate obrigatório neste PR; se couber, job separado
   `continue-on-error: true` + pendência para torná-lo bloqueante após o staging (Ω-INFRA-2).
6. Atualizar P-003 para `resolvido` com data e PR.

**Junta do bloco:** `agente-ci-doutor`, `inspetor-de-rotas`, `master-teste-telas-rotas`,
`critico-adversarial` — maioria. Voto condicionado a: CI verde com a suíte inteira; nenhum teste
skipado/deletado sem justificativa arquivo a arquivo; tempo de CI reportado.

---

## PR 2 — Ω-GOV: KPI em todo PR + autonomia por juntas gravada como permanente

**Decisões do dono do projeto (Thiago), a executar:**
(a) a política "KPI só após avaliação humana em bloco …K" está **revogada**;
(b) a **política de autonomia por juntas + protocolo de dificuldade** (seções acima) vira
**norma permanente e explícita da documentação**, não só desta rodada.

**Nova política de KPI (texto-fonte a aplicar):**
1. Todo PR que altere código, teste ou escopo atualiza `Kpis/kpis-latest.json`,
   `Kpis/kpis-history.*` (append) e `Kpis/index.html` **no mesmo PR**.
2. PR que toque Flutter/mobile atualiza também `mobile/flutter_app/Kpis/*` (política dupla mantida).
3. Contagens de teste vêm de **execução real no PR** — nunca copiadas do bloco anterior.
4. `mvp_demo` e `mvp_vendavel` só mudam quando o PR mover escopo, com 1 linha de justificativa
   no history.
5. Blocos `…K`/`…F` deixam de ser etapa obrigatória (podem virar resumo de marco). Campos `pr`,
   `merge_commit`, `approved_head` referem-se ao PR corrente; `status: "published_per_pr"`.
6. A validação dos números é da **junta do PR**; o humano audita a posteriori pelo history.

**Tarefas:**
1. Reescrever TODAS as ocorrências normativas da política antiga (localizações verificadas):
   `Kpis/README.md` (§"Política permanente de KPIs pós-avaliação humana"),
   `mobile/flutter_app/Kpis/README.md`, `CLAUDE.md` (§C3, tabela `B-NNN`/`B-NNNK`/`B-NNNF` e
   passos 5–6 do fluxo), `agent-orchestration/omega/plano-mestre.md` ("KPIs não publicados /
   marco …K"). Depois `grep -rn "avaliacao humana\|avaliação humana" --include="*.md"` para
   sobras — históricos (`kpis-history.md`, `agent-orchestration/codex/comandos/`) NÃO são
   reescritos: recebem cabeçalho "política vigente até 2026-07-13, revogada".
2. Gravar a **política de autonomia** como seção permanente: nova seção no `CLAUDE.md`
   ("Política de autonomia por juntas") + atualização do `plano-mestre.md` — o protocolo de
   reprovação escalonada passa a dizer explicitamente que **os ciclos 1–2 criam agentes via
   fábrica antes de qualquer parada**, e a lista de paradas imediatas encolhe para: migration
   destrutiva, exposição de segredo, ação irreversível em produção sem junta unânime.
3. Registrar em `agent-orchestration/controle/decisoes.md`: **D-KPI-PER-PR** e
   **D-SAN-AUTONOMIA** (com data, autor humano da decisão e escopo).
4. **Aplicar a nova política neste próprio PR:** atualizar KPIs com as contagens reais pós-Ω-GATE
   (o backend vira N/N da suíte inteira — os "15/15" morrem aqui).
5. Governança de estimativa: editar `agent-orchestration/omega/lista-execucao.md` adicionando ao
   Ω4 a nota "estimativas do Ω4 contam **×1,5**; Conciliação e Fechamento (trava retroativa) são
   candidatos a reprovação em junta — planejar buffer e fatiar em PRs menores".

**Junta do bloco:** `estrategista`, `planejador-mestre`, `critico-adversarial` + 2 pertinentes —
**unânime** (mudança de governança permanente). Voto condicionado a: zero ocorrência normativa da
política antiga; políticas novas legíveis por um agente que nunca viu esta rodada.

---

## PR 3 — Ω-DOCS: descontaminação Kryos

**Contexto:** conteúdo do projeto **Kryos** (outro SaaS do Thiago — supervisão de
refrigeração/SCADA, Carel/Modbus) vazou para este repositório. Contaminação já mapeada:

- `docs/research/estudo-doutoral-interfaces-10-saas.md` — arquivo INTEIRO é do Kryos (estudo de
  supervisórios de refrigeração: Carel boss, Danfoss Alsense, Copeland etc.). Entrou pelo commit
  `5bda50e` direto na main como "fonte canônica de UI".
- `docs/09-mapa-telas-frontend.md` linha ~10: "workspace tipo SCADA"; linha ~19:
  "**Padrão DeviceDetail/Kryos**".
- `docs/rbac.md`: falso positivo (só "supervisor") — não mexer.

**Tarefas:**
1. **Remover** `docs/research/estudo-doutoral-interfaces-10-saas.md` (o dono mantém cópia no
   projeto Kryos; não pertence ao ERP). Se `docs/research/` ficar vazia, remover a pasta.
2. `docs/09-mapa-telas-frontend.md`: reescrever as 2 linhas removendo a atribuição Kryos/SCADA e
   mantendo o que o ERP realmente usa — ex.: "workspace operacional denso (tabelas densas, cards
   operacionais, alertas claros)" e "Padrão Detalhe de Entidade: identificação, estado, timeline,
   ações, logs". O padrão de UI continua; a origem cruzada sai.
3. Auditoria de sobras — grep **case-sensitive e por palavra** (atenção: `pCO` case-insensitive
   casa com `zipCode`): `Kryos|kryos|SCADA|Carel|PlantVisor|Modbus|pRack|MPXPRO|refrigera|supervisóri|DeviceDetail`
   em `*.md`, `*.ts`, `*.tsx`, `*.dart`, `.claude/`, `agent-orchestration/`. Corrigir contaminação
   real; listar no PR o que foi verificado e descartado como falso positivo.
4. Se alguma junta/PD citou o estudo removido como fonte, adicionar nota de retificação no
   arquivo (não apagar histórico — retificar).
5. Registrar em `pendencias.md` (P-0xx, resolvida) e `decisoes.md` (**D-DOCS-KRYOS**): "conteúdo
   do projeto Kryos removido; fontes de UI do ERP Techsolutions são `DESIGN_SYSTEM.md`,
   `COMPONENT_LIBRARY.md` e docs próprias".

**Junta do bloco:** `cognicao-visual`, `inspetor-de-rotas`, `critico-adversarial` — maioria.
Voto condicionado a: grep de auditoria zerado (exceto o registro da própria limpeza); docs
coerentes; KPIs do PR atualizados (nova política).

---

## PRs 4–7 — Ω-INFRA: staging + produção + backup + secrets

Regra da trilha: **nada de segredo em arquivo versionado** (GitHub Environments + secrets do
provedor); `env.ts` já tem gates de produção — estender, nunca afrouxar; nenhum PR derruba main.
Dificuldade em qualquer bloco = protocolo de dificuldade (fábrica primeiro), não parada.

### PR 4 — Ω-INFRA-1: containerização + healthcheck + escolha do provedor
1. **PD-INFRA-1** em `docs/omega-pd.md` (pesquisa ≥3 fontes, conduzida com `agente-finops` +
   `agente-devops-provisionador`): comparar no mínimo Railway, Render, Fly.io, Hetzner+Coolify e
   AWS (Lightsail/ECS) para Node + Postgres gerenciado + Redis. Critérios: custo mensal do stack,
   **região São Paulo/Brasil** (latência + LGPD), Postgres gerenciado com backup/PITR nativo,
   CD via GitHub Actions, caminho de saída (lock-in). **Junta de 5 unânime** decide o provedor
   (pré-autorizado pela D-SAN-AUTONOMIA — não é parada).
2. `Dockerfile` multi-stage do backend (build TS → runtime `node:20-slim`, `prisma generate`,
   usuário não-root) e build do frontend (Vite) servido como estático (Node/express static ou
   nginx — decidir e justificar em 1 linha).
3. `GET /health` real: ping Postgres + Redis, versão/commit, sem dado sensível.
4. `docker-compose.prod.yml` para validação local-prod; CI passa a buildar a imagem e publicar no
   GHCR com tag do commit.
5. `docs/deployment.md`: reescrever "Staging futuro/Production futuro" com o plano real.

### PR 5 — Ω-INFRA-2: staging no ar
1. Provisionar staging no provedor decidido (config como código no repo: `render.yaml`/`fly.toml`/
   Terraform mínimo — o que o provedor suportar; registrar rollback do provisionamento).
2. Pipeline CD: merge na `main` → deploy automático no staging → `prisma migrate deploy` →
   `db:seed:demo` (apenas staging) → smoke HTTP pós-deploy (login demo + `GET /health` + 1 rota
   autenticada). Smoke falhou = job vermelho.
3. Secrets via GitHub Environment `staging`. URL do staging em `docs/deployment.md` e
   `docs/demo-credentials.md`.
4. Pendência registrada: promover Playwright e2e para rodar contra staging (bloqueante depois).

**Junta:** `agente-devops-provisionador`, `agente-secops`, `inspetor-de-rotas` — maioria, com
smoke verde como pré-condição do voto.

### PR 6 — Ω-INFRA-3: produção + secrets + rollback (autonomia com trava dupla)
1. Ambiente `production` separado (app e banco distintos). **Não usar gate humano de "required
   reviewers"**: a proteção é (a) **junta de 5 unânime registrada ANTES do deploy** (J-SAN-PROD),
   (b) smoke de staging verde no mesmo commit, (c) rollback ensaiado. Só com os três o CD promove
   para produção.
2. Domínio + TLS; CORS/URLs por ambiente via env; `NODE_ENV=production` com os gates existentes
   ativos (ex.: Nominatim bloqueado — já implementado, validar).
3. Rollback documentado e **ENSAIADO**: redeploy da imagem anterior por tag + política para
   migrations forward-only (P-007): quando o rollback de código exigir SQL manual, o runbook diz
   exatamente o quê.
4. **Sem seed demo em produção.** Runbook de provisionamento do primeiro tenant real em
   `docs/deployment.md` §produção.

### PR 7 — Ω-INFRA-4: backup + observabilidade mínima
1. Backup: PITR/backup nativo do Postgres gerenciado ATIVADO + `pg_dump` diário para bucket S3
   (reusar `@aws-sdk/client-s3` já presente), retenção 30d, via cron do provedor ou GitHub
   Actions schedule.
2. **Teste de restore executado e documentado** (restaurar dump em banco vazio, subir app
   apontando, login demo OK) — backup sem restore comprovado não conta e a junta veta.
3. Logs estruturados agregados (**PD-INFRA-2** curto: provedor nativo vs Better Stack vs Axiom —
   ≥3 fontes; junta de 5 unânime por ser serviço externo) + uptime check no `/health` de staging
   e prod + alerta (e-mail/Telegram) em downtime.
4. `docs/deployment.md` §operação: onde ver log, como restaurar, quem é alertado.

**Junta:** `agente-dba-guardiao`, `agente-secops`, `agente-devops-provisionador`,
`critico-adversarial` — maioria; restore comprovado é pré-condição do voto.

---

## Relatório final da rodada

Ao fim do PR 7, gerar `agent-orchestration/omega/relatorio-saneamento-infra.md` com: matriz
PR → junta → veredito → merge; testes antes→depois (suíte backend N/N no gate); **agentes criados
pela fábrica nesta rodada** e em que ciclo/problema; reprovações R-xxx e como foram destravadas;
URLs staging/prod; evidência do restore; custo mensal contratado; pendências abertas (e2e
bloqueante, provedor de geocoding de produção). O relatório é o canal de prestação de contas ao
humano — a rodada não espera por ele para concluir.
