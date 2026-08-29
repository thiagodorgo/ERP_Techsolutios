# Parecer do porteiro-pos-merge — PR #361 (SAN2-R, merge `a0a1075`)

> Porteiro: `porteiro-pos-merge` (Fable por contrato, D-PORTEIRO-POS-MERGE). Data: 2026-08-29.
> **Sucessão (P3 do protocolo que este próprio merge instala):** o porteiro anterior caiu no início do
> item 3 com os itens 0–2 persistidos em `00c-porteiro-evidencia.md`. Este sucessor **re-executou** o
> roteiro dos itens 1–2 (zero divergência, duas nuances de registro explicadas) e **mediu o item 3 do
> zero** — a conclusão sem comando do caído foi descartada como insumo. Evidência integral, comando a
> comando: `agent-orchestration/omega/juntas/votos/SAN2-R/00c-porteiro-evidencia.md`.

## 1. Tabela de verificação

| # | Verificação | Método (executado) | Resultado |
|---|---|---|---|
| 1 | Merge existe e íntegro | `git log origin/main -3` · `gh pr view 361` · `rev-parse HEAD` | **OK** — `a0a1075` na main remota, PR MERGED, worktree na main |
| 2 | Promessa × diff | diff de escopo de produto contra `74430cc` (VAZIO) · name-status (19 arquivos, todos declarados) · 3 artefatos prometidos existem · §C7.7 nos dois contratos · 2 decisões em `decisoes.md` · ata APROVADO 3×0 head `48dc863` · delta pós-voto = papelada | **OK** — toda promessa está no diff, nada fora do escopo |
| 3 | Números reexecutados | guard do painel **16/16 pass** (reexecutado 2×: caído e sucessor) · `kpi-freeze --check` em dia | **OK** — reproduzem |
| 4 | KPI fechado (§C3.5) | history `pr:360` = `74430cc`/`ee5ef03` (backfill que o #361 devia, FEITO; `ee5ef03` é ancestral do head `c65b497` e é o head julgado pela ata do REG) · `pr:361` = nulls na autoria (correto) | **OK** — dívida do próximo PR nomeada: backfill `a0a1075`/`48dc863` |
| 5 | Registro da junta (§C7.1) | `J-SAN2-R.md` na main: APROVADO 3×0, 0 voto perdido, papéis nomeados, §C7.4-bis respondido, notas A1/FOR-1..3 | **OK** |
| 6 | Pendências | 12 BLOQUEIA extraídas com status: 9 ABERTAS (todas de produto), 2 FECHADAS (B01, B05), 1 DECIDIDA · amostragem: `P-CHK-TEMPLATE-PRISMA-V7` RESOLVIDA confere com o corpo (`pendencias.md:1334`) e `P-036` segue aberta (`:342`) como a opção C pressupõe | **OK** |
| 7 | Limpeza (§C5) | branch remota apagada · sem rastreado apagado · sem branch local mergeada · disco **24 GB livres** (> piso de 10 GB, sem DEEP_CLEAN) · mutação viva = papelada do protocolo (registro da queda 2), não resíduo | **OK** |
| 8 | Próximo start | ver §3 abaixo | **LIVRE, com ressalva** |

## 2. Achados

1. **Nenhuma divergência** entre a re-execução do sucessor e o registro do caído (itens 1–2). Duas nuances
   de registro, sem efeito: o `PROTOCOLO-JUNTA-RESILIENTE.md` vive em `agent-orchestration/omega/juntas/`
   (o roteiro citava o nome sem caminho), e o `status: "published_per_pr"` do #361 vive em
   `Kpis/kpis-latest.json → release` (a entrada do history não tem campo `status` por esquema).
2. **Dívida obrigatória do próximo PR (§C3.5):** backfill do #361 nos KPIs — `merge_commit a0a1075`,
   `approved_head 48dc863` — mais a reconciliação de PR#/hash. Como o resgate do SAN2-1 rebaseia uma branch
   cujos KPIs antecedem o #361, o risco de esse backfill se perder no rebase é real; por isso ele viaja
   como ressalva nomeada, não como rodapé.
3. **Imperfeição cosmética confirmada:** numeração do §C7 fora de ordem (`…3, 4, 7, 4-bis, 5, 6`) em
   `CLAUDE.md:356` e `AGENTS.md:384`, espelhada por igual. Referências são por ID de decisão e só existe um
   item 7 — não bloqueia; renumerar no próximo PR que tocar os contratos (ou abrir pendência nomeada se a
   junta do resgate mantiver o escopo estrito em `pendencias.md`).
4. **Worktree `san2-r` em `main` é intencional** — hospeda o painel de KPI (`localhost:5050`, HTTP 200
   verificado). Não é lixo; congelará no estado de hoje até o checkout ser atualizado.
5. **Observação de rebase para o resgate:** `D-TETO-DOIS-CICLOS` existe na main (via #361,
   `decisoes.md:1748`) e na branch (`7fee7f8`) → conflito provável e trivial em `decisoes.md`.

## 3. O próximo bloco pode começar?

**Sim.** O alvo é o **resgate do SAN2-1 (opção C do dono)** — rebase de `chore/san2-1-triagem-pendencias`
sobre `a0a1075` para: texto honesto na etiqueta das 79 do balde C, `P-036` fechada como duplicata da
`P-CHK-TEMPLATE-PRISMA-V7`, tripwire de tarifa fora do balde C. Medido por execução:

- **(a)** as 9 pendências BLOQUEIA abertas travam exclusivamente trilhas de produto (financeiro, despesas,
  estoque, billing/CHECKLIST P1, OS/auth, jobs, dispatch/mapa, web, mobile) — **nenhuma alcança a trilha de
  registro** do resgate;
- **(b)** a branch existe, com 13 commits e head `f75193b` (parada + dossiê); o dossiê nomeia exatamente os
  3 alvos da opção C, e `P-036`/`P-CHK-TEMPLATE-PRISMA-V7` existem na main como o plano pressupõe;
- **(c)** terreno limpo: 5 worktrees contabilizados (nenhum órfão), 24 GB livres, limpeza §C5 do #361
  completa, mutação viva é papelada do protocolo.

## 4. Veredito

**LIBERADO COM RESSALVA: resgate do SAN2-1 (opção C do dono — rebase de `chore/san2-1-triagem-pendencias`
sobre `a0a1075`) | o PR do resgate DEVE (i) fazer o backfill do #361 nos KPIs — `merge_commit a0a1075`,
`approved_head 48dc863` — sem deixar o rebase engolir a entrada, e (ii) renumerar o §C7 nos dois contratos
ou, se a junta mantiver o escopo estrito, abrir pendência nomeada para a renumeração.**
