# Validador-mestre — critérios de veto por PR (Rodada F)

> O agente **validador-mestre** (poder de veto) roda ao FIM de cada PR, **após os gates mecânicos e ANTES
> do push/merge**. Reexecuta testes/migrations, audita o diff contra o plano e as regras, e anexa um
> **VEREDITO: APROVADO | REPROVADO (com itens)**. Nenhuma PR mergeia sem APROVADO. 3ª reprovação na mesma
> PR = **condição de parada**. Este doc é o contrato de validação compartilhado (versionado).

## Checklist de veto (todos obrigatórios → APROVADO; qualquer falha → REPROVADO)

### 1. Escopo e espelho
- [ ] Diff == plano da PR (nenhum arquivo fora do escopo declarado; `git add` por-arquivo).
- [ ] Arquivos novos nasceram do espelho correto (módulo→`customers/`; página→registry list+modal;
      máquina de estados→`field-dispatch.validators`). Nenhuma convenção inventada.

### 2. Multi-tenant / segurança (saas-multi-tenant)
- [ ] `tenant_id` da claim, nunca do body; `where { id, tenant_id }` → **404** cross-tenant (não 403).
- [ ] RLS inline na migration (`ENABLE`+`FORCE` + policy `app.current_tenant_id`); `@@unique`/`@@index`
      lideram por `tenant_id`.
- [ ] Os 5 testes de isolamento (molde P6) presentes; unicidade composta 409 (mesmo tenant) / 201 (outro).
- [ ] Sem PII/segredo/`tenant_id` externo em payload ou auditoria.

### 3. Domínio (pd-controle)
- [ ] Dinheiro = `Decimal(20,6)` (nunca float); datas `timestamptz`; enums no schema.
- [ ] Máquina de estados explícita no backend; transição inválida = **422** (mensagem clara).
- [ ] Regras específicas do bloco verdes: odômetro monotônico=422 (F1); concluir exige custo+data (F2);
      viatura em manutenção indisponível (F2, leitura); `vencida` derivada (F4); saldo derivado em tx +
      insuficiente=409 (F7); ABC/ponto-de-pedido corretos (F7); `read_own` — operator só o próprio (F8).
- [ ] **Job idempotente**: rodar 2× = 1 aviso (teste presente e verde).
- [ ] Toda mutação → AuditLog; todo indicador filtra tenant.

### 4. UI / cards vivos (ui-ux-pro-max + screen-element-map)
- [ ] **Zero mock** no sistema após o bloco (mapa incluso em F6). Nada novo em `frontend/src/mocks/`.
- [ ] Todo elemento clicável está no `screen-element-map.md` com destino navegável (0 cards mortos).
- [ ] 4 estados por lista (skeleton/vazio-com-ação/erro-com-retry/populado); filtros na URL; foco no 1º
      inválido; PT-BR sem dado técnico cru (sem UUID/enum na UI); checklist ui-ux-pro-max anexo à PR.
- [ ] frontend-pixel-master revisou e as correções foram aplicadas.

### 5. Gates mecânicos (reexecutados pelo validador)
- [ ] `npm run check` · `npm test` · `npm run build` · testes do bloco · **regressões dos módulos tocados
      inalteradas** · `npm --prefix frontend run check`/`test:smoke`/`build` · migrate up **e** down no
      `erp-postgres` · `dart format`/`analyze`/`flutter test` (se tocar mobile) · `git diff --check` ·
      `git status --short` limpo (in-scope).
- [ ] Cota **200% cumprida e registrada** (N/M na PR); o validador reconta.

### 6. Documentação viva + KPIs
- [ ] 5 arquivos de `agent-orchestration/` atualizados (status-geral, requisitos, regras-de-negocio,
      decisoes, cronograma) + pendências. Screen-element-map atualizado se houve elemento novo.
- [ ] `Kpis/kpis-latest.json` + `index.html` com dados REAIS (evolução + burnup recalculado). **Marco `…K`
      NÃO publicado** (permanece humano).

## Formato do veredito (anexar à PR)
```
VEREDITO: APROVADO
- Escopo: OK (N arquivos, == plano)
- Isolamento: 5/5 · RBAC negado: OK · Domínio: OK (regras X,Y,Z)
- Gates reexecutados: backend N/N, front N/N, migrate up/down OK, regressão INALTERADA
- Cota: N=.. / M=.. (≥2N) OK · Cards vivos: 0 mortos · Mock: 0
- KPIs: atualizados (não publicado marco)
```
Reprovação lista os itens exatos + o que corrigir. 3ª reprovação → PARADA com estado + opções.
