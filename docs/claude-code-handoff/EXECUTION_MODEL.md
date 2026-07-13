# EXECUTION_MODEL.md — Modelo de execução por blocos

> Detalhamento da **lógica de execução** que o Codex seguia e que o Claude Code deve manter.
> Referenciado por `CLAUDE.md` (Parte C). Molde pronto em `comando-template.md`.
>
> ⚠️ **KPI pós-avaliação humana REVOGADA (2026-07-13, D-KPI-PER-PR).** Onde este arquivo disser que KPI só
> publica após avaliação humana / em bloco `…K` (ex.: §4 e as menções a `B-NNNK` no §1), leia a política
> vigente **KPI-por-PR** em `/CLAUDE.md` §C3 (atualiza no próprio PR, contagem real, junta do PR valida). Aplica-se
> a TODO este arquivo, inclusive a tabela de tipos em §2.1 (`B-NNNK`) e a §4.

## 1. Por que blocos

O trabalho não avança em grandes lotes soltos. Avança em **blocos pequenos, verticais e
rastreáveis**, cada um com escopo cirúrgico, validação própria e um registro de merge/aprovação.
Isso mantém o histórico auditável, evita regressão e permite parar/retomar sem perder contexto.

**1 bloco = 1 comando = 1 branch = 1 PR = 1 avaliação humana = (depois) 1 bloco de KPI.**

## 2. Anatomia de um bloco

### 2.1 ID e tipo
- `B-NNN` — **feature** (código funcional; não toca KPI).
- `B-NNNK` — **KPI pós-avaliação humana** (publica métricas após merge + gate).
- `B-NNNF` — **correção/limpeza de KPI** e documentação.
- `B-NNNG` — **gate** (avaliação/aprovação formal de um bloco de feature).
- Blocos utilitários podem ter nome próprio (ex.: `KPI-DASHBOARD-001` criou a estrutura `Kpis/`).

### 2.2 Comando
Arquivo em `agent-orchestration/codex/comandos/B-NNN-<slug>.md` com as seções:
`Objetivo · Contratos/Endpoints · Regras · Integrações · Escopo permitido · Escopo proibido ·
Validações · Limites · KPI`. Use `comando-template.md`.

### 2.3 Contrato
Endpoints REST `/api/v1/...`, campos aceitos, permissões exigidas, MIME/limites, envelope de
resposta e **versão do contrato** (`<nome>@<data>.<bloco>`, ex.:
`mobile_evidence_file_upload@2026-06-18.b108`). Tenant sempre resolvido pelo **ator
autenticado**; `tenant_id` vindo do cliente/form é **ignorado**.

### 2.4 Escopo
Listas **explícitas** de caminhos permitidos e proibidos. Exemplos reais de proibido em feature:
`prisma/**`, `migrations/**`, `infra/**`, `.env`, lockfiles JS, `pubspec.yaml/lock`, Figma, e
**qualquer arquivo KPI**.

### 2.5 Validação
Bateria **exata** de comandos (ver `CLAUDE.md` §9). Inclui sempre os testes do próprio bloco
**mais as regressões** dos blocos anteriores relevantes e `git diff --check`.

### 2.6 KPI
Em feature: **"não altera KPI"** + KPIs **propostos** (blocos concluídos, MVP demo %, MVP
vendável %, totais de teste) só no relatório. Em `…K`/`…F`: publica com metadados reais.

## 3. Ciclo de vida

```
ler status/controle/log
   │
implementar (só escopo permitido)
   │
validar (bateria exata: format → analyze → testes do bloco → regressões → suíte
         → check/lint/test/build → contratos → git diff --check)
   │
limpar artefatos temporários
   │
abrir PR no GitHub (KPIs propostos só no corpo/relatório)
   │
avaliação humana → gate (B-NNNG)
   │
bloco de KPI (B-NNNK / B-NNNF) publica métricas com PR#, merge commit e approved head reais
   │
registrar decisão/estado em agent-orchestration/
```

## 4. Política de KPI pós-avaliação humana (permanente, 10 regras)

> ⚠️ **REVOGADA em 2026-07-13 (D-KPI-PER-PR).** A política vigente é **KPI por PR** — todo PR que altere
> código/teste/escopo atualiza os KPIs no próprio PR, com contagens de execução real; a junta do PR valida.
> Fonte de verdade: `/CLAUDE.md` §C3. O texto abaixo é histórico (pacote de handoff original).

1. PR de feature **não** altera arquivos KPI.
2. Feature reporta **KPIs propostos apenas no relatório final**.
3. KPI só atualiza **após avaliação humana** aprovar a entrega.
4. KPI só publica **após merge e gate** confirmando sucesso.
5. Publicação em **bloco separado** documental/KPI (`B-xxxK` ou `B-xxxF`).
6. Mexeu em **Flutter/mobile** → atualizar `mobile/flutter_app/Kpis/*` **e** refletir os
   percentuais em `Kpis/*`.
7. Mexeu **fora do mobile** → atualizar `Kpis/*`.
8. Mexeu nos **dois** → atualizar **ambos**.
9. Se existir `index.html` de KPI → atualizar o **HTML** também.
10. Bloco KPI preenche **PR, merge commit e approved head reais**; **campo `null` bloqueia o
    próximo bloco**.

### Dois conjuntos de KPI
- `Kpis/` — KPIs gerais/raiz do projeto (mesmo nível de `src/`).
- `mobile/flutter_app/Kpis/` — KPIs específicos do app Flutter.

## 5. Limpeza pós-validação (permanente)

Todo bloco que rodar testes, builds, Flutter, Node, Android, iOS ou gerar artefatos **limpa os
temporários ao final**, sem apagar arquivos **rastreados** e preservando untracked
**explicitamente permitidos** (ex.: os 3 PNGs de marca).

## 6. Segurança de payload e auditoria (allowlist)

Nunca expor em resposta pública nem em metadados de auditoria: `token`, `Authorization`,
`Bearer`, `path`, `local_path`, `bucket`, `storage key`, `base64`, `file_data`, conteúdo
binário, nem `tenant_id` externo. Eventos de auditoria usam nomes estáveis (ex.:
`evidence.upload.accepted|rejected|scan_failed|stored`) com metadata sanitizada.

## 7. Idempotência e sync

Ações mobile enfileiradas e reenviadas via `POST /api/v1/mobile/sync/*`. **Chave de
idempotência = tenant + usuário + `client_action_id`.** Conflitos (ex.: criação remota de OS)
com **resolução manual inicial**. Estados de evidência preservam o blob local exceto em
`stored`.

## 8. Rastreabilidade (campos obrigatórios do bloco KPI)

`bloco · título · PR · merge_commit · approved_head · gate · status`. Exemplos reais:
- B-107 → PR #102 · merge `db36fb3…` · gate B-107G · `published_after_human_approval`.
- B-108 → PR #104 · merge `468fcf1…` · gate B-108G.
- B-106 → PR #99 · merge `aac998e…` (publicado no B-152H).
- B-105 → PR #97 · merge `0a01b0b…` (corrigido no B-152F).

## 9. Métricas que o painel acompanha

Flutter tests · Backend tests · Mobile backend contracts · Mobile + Core SaaS contracts ·
Flutter modules · **MVP demo %** · **MVP vendável %** · **blocos concluídos**. Histórico
permanente em `Kpis/kpis-history.md` (e equivalente no mobile).
