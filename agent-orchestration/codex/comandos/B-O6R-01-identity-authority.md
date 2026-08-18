# B-O6R-01 — identidade e autoridade (`Ω6R-SEC-001` + `Ω6R-TEN-001`)

> **Branch:** `feat/o6r-b01-identity-authority` · **1 bloco = 1 PR**
> **Plano vinculante:** [`agent-orchestration/omega/planos/B-O6R-01-plano-v6-aprovado.md`](../../omega/planos/B-O6R-01-plano-v6-aprovado.md) (407 linhas, v6)
> **Ata da aprovação:** [`omega/juntas/J-O6R-B01-plano-identity-authority.md`](../../omega/juntas/J-O6R-B01-plano-identity-authority.md) — **5×0 na 5ª rodada**, após 5 rodadas e 6 versões.
> **O plano é a especificação.** Este comando não a repete: ele fixa escopo, papéis, condição de PR e bateria.

## Por que este bloco é o próximo

Fecha os **dois piores achados** da auditoria Ω6R, e é pré-requisito dos blocos 02, 03, 04, 07 e 11:

- **`Ω6R-SEC-001`** — quem administra **uma** organização se promove a papel de plataforma e passa a ler,
  alterar e suspender **todas as outras**. O filtro que parecia proteger bloqueia as *permissões* de
  plataforma e deixa passar o *papel*, que é o vetor real.
- **`Ω6R-TEN-001`** — a troca de organização correlaciona contas **pelo e-mail** e emite acesso para uma linha
  de usuário diferente da autenticada. **Tomada de conta sem credencial.**

Fechá-los leva os críticos de **2 para 4 de 15**. **Não libera deploy** — o bloqueio da J-6R segue integral.

## SEPARAÇÃO DE PAPÉIS (`D-JUNTA-SEPARACAO-DE-PAPEIS`, decisão do dono de 2026-08-17)

Vale a partir deste bloco, e a ata de cada ciclo registra quem ocupou cada papel:

| Papel | Quem | Faz | **Não** faz |
|---|---|---|---|
| **Acha** | `critico-adversarial`, `agente-secops`, `agente-dba-guardiao` | reporta defeito + evidência **executada** + **motivo** | **não propõe correção, não escreve código** |
| **Planeja** | `planejador-mestre` (**Fable obrigatório** no replanejamento — `D-PLANEJADOR-MODELO-FABLE`) | plano da correção a partir do relatório do achador | não implementa |
| **Desenvolve** | agente de implementação dedicado | implementa o plano | não julga a validade do achado |

**A cada reprovação**, antes de recompor a junta, responder por escrito na ata do ciclo:
1. a **composição** cobre a competência que o achado exige?
2. **quem achou é quem consertou?** — se sim, o ciclo está contaminado e a correção volta para outro agente;
3. o **planejador está usando dado podre** (premissa não medida, versão errada de arquivo, afirmação herdada)?

## CONDIÇÃO PARA ABRIR O PR — a terceira armadilha (§4 da ata)

Achada pelo `critico-adversarial` **dentro do v6**, composta por duas decisões corretas isoladamente:

- a linha de vínculo **deixou de ter campo de proveniência** (a história passou a viver na trilha);
- a trilha é **só-de-inserção**, deliberadamente ilegível por organização, para não virar chave de junção.

Juntas: **o gancho da troca de senha decide com base num fato que só existe na trilha, e a trilha é ilegível
para a aplicação sob a conta real.** Na CI, superusuário lê e o teste passa; sob a conta de produção lê zero e
o gancho decide errado, **em silêncio**.

**Não é motivo de nova rodada de junta** — é escolha entre duas opções fechadas, ambas dentro dos artefatos
que este bloco cria. **Resolver e declarar a opção escolhida no corpo do PR é condição para abri-lo.**

## Escopo PERMITIDO

- `src/modules/auth/**`, `src/modules/core-saas/**` (no que o plano nomeia), `src/database/rls.ts`,
  `src/config/**` (só o que o plano nomeia), `src/routes`/`src/app.ts` se o plano exigir rota nova
- `prisma/schema.prisma` + **uma** migração aditiva `20260868000000_add_auth_identities` (§3.2 do plano)
- `tests/**` — as suítes novas do §7, e `-db` na lista `SUITES` sob o guard de zero pulos
- `frontend/**` e `mobile/flutter_app/**` **apenas** no mapeamento de `409`/`400`/`429` do login (§7, "Clientes")
- `Kpis/*` (obrigatório por §C3), `agent-orchestration/**`, `docs/revisoes/O6R/**`

## Escopo PROIBIDO

- **Migração destrutiva** — parada imediata irredutível (§C7.5). A migração é **aditiva**; `down` condicionado.
- `.env`, lockfiles, `infra/**`, `fly.*.toml`, workflows de deploy — **nada aqui ativa ambiente nenhum**
- Qualquer alteração que **afrouxe** os gates de produção do `env.ts` (B-O6R-05)
- Reabrir decisão fechada do plano: modelo de identidade global · religação neste bloco · login sem organização
- Reclassificar achado da auditoria · mexer em `mvp_demo`/`mvp_vendavel` (nenhum escopo se move aqui)

## Bateria de validação (§9 + §7 do plano)

```bash
npm run check && npm run lint
npm test                                   # baseline 2458/2467 — a meta é a execução real
node --test --import tsx tests/<suites-novas>.test.ts
DATABASE_URL=... node --test --import tsx tests/<suites>-db.test.ts   # role EFÊMERA NOSUPERUSER
npm --prefix frontend run check && npm --prefix frontend run build
node --check Kpis/app.js && node scripts/kpi-freeze.mjs --check
git diff --check
```

**Baseline da superfície tocada: 27 casos.** Meta do plano **≥ 54**; o plano entrega **~94**. A contagem final
é a da **execução real no PR** (§C3.3) — nunca copiada.

**Regras de teste que não se negociam** (§7): suítes `-db` auto-skip sem `DATABASE_URL` e **conectam como role
efêmera `NOSUPERUSER`** — é o único arranjo em que o RLS existe; asserções escopadas aos ids do próprio teste
(nunca contagem global); teardown de tabela append-only **na conexão privilegiada** com
`SET LOCAL session_replication_role='replica'`, **jamais** `ALTER TABLE … DISABLE TRIGGER`; autenticação por
**JWT real**, nunca header legado nem ator fabricado.

## DoD (§10)

- [ ] Escopo respeitado · migração **aditiva** aplicada e `down` provado
- [ ] Bateria verde · **a terceira armadilha resolvida e a opção declarada no PR**
- [ ] Permissão validada no **backend** conforme `RBAC_MATRIX.md`
- [ ] Sem termo técnico na UI (§3) · sem segredo/PII em payload ou auditoria (§2.8) — inclusive a **varredura
      por VALOR** dos uuids de identidade, nos corpos de sucesso **e de erro**
- [ ] KPIs atualizados no próprio PR, contagem real (§C3) · ata da junta registrada
- [ ] `achados.jsonl` e `REGISTRO_ACHADOS_O6R.md` com `SEC-001` e `TEN-001` **fechados, com rastro** —
      o guard `tests/kpi-achados-paridade.test.ts` **falha** se os três artefatos divergirem
- [ ] Limpeza §C5 · porteiro pós-merge antes do bloco seguinte
