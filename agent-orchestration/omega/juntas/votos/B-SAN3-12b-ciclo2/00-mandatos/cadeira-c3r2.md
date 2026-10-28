# Mandato — C3 refeita — B-SAN3-12b, junta de DINHEIRO, ciclo 2

## MEDIDO

Estado atual do PR 469 pela ferramenta de refs copiada sem alteração para a pasta deste redator: ramo, base, estado, objeto, merge-base, check-runs e ausência de ata final, medido por: `cd C:/Users/AMP/w-san312b && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san312b-c2/mandato-refs.sh 469`
```
# refs do PR #469 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-28T01:10Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            feat/web-financeiro-baixa-e-contas
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2
merge-base:      f076973921539165df8d406b8c061dbf4e4ee127
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #469
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)

```

O ramo remoto e o worktree apontam para o objeto declarado pelo PR, medido por: `cd C:/Users/AMP/w-san312b && test "$(git rev-parse HEAD)" = e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2 && test "$(git ls-remote origin refs/heads/feat/web-financeiro-baixa-e-contas | cut -f1)" = e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2 && echo 'HEAD local = ramo remoto = head do PR'`
```
HEAD local = ramo remoto = head do PR
```

Os check-runs obrigatórios do objeto concluíram: backend, backend-postgres e frontend, sem pendente nem conclusão diferente de success; a lista completa também está concluída, medido por: `cd C:/Users/AMP/w-san312b && s=$(printf '\057'); ep=repos${s}thiagodorgo${s}ERP_Techsolutios${s}commits${s}e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2${s}check-runs; gh api "$ep" --jq '.check_runs[] | [.name,.status,.conclusion] | @tsv' | sort -u; echo obrigatorios; gh api "$ep" --jq '[.check_runs[] | select((.name=="backend" or .name=="backend-postgres" or .name=="frontend") and (.status!="completed" or .conclusion!="success"))] | length'`
```
authority-portal	completed	success
backend	completed	success
backend-postgres	completed	success
docker	completed	success
flutter	completed	success
frontend	completed	success
owner-portal	completed	success
obrigatorios
0
```

O worktree nomeado está no objeto e não tem modificação rastreada; o diretório não rastreado permitido é o de mandatos do ciclo 2, medido por: `cd C:/Users/AMP/w-san312b && test "$(git rev-parse HEAD)" = e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2 && echo 'HEAD = objeto'; echo "rastreados modificados: $(git status --porcelain --untracked-files=no | wc -l)"; git status --short | sed -E 's#^(..) (.*)#\1 C:/Users/AMP/w-san312b/\2#'`
```
HEAD = objeto
rastreados modificados: 0
?? C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/
```

Topologia medida: a merge-base atual é ancestral do objeto; o objeto é merge da main; o objeto do ciclo 1 é o décimo terceiro primeiro-pai anterior; o diff ciclo 1 até objeto cruza produto e arquivos trazidos pela main, portanto a C2 não pode carregar o voto, medido por: `cd C:/Users/AMP/w-san312b && git merge-base --is-ancestor f076973921539165df8d406b8c061dbf4e4ee127 e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2 && echo 'merge-base ancestral'; echo "primeiro-pai merge-base..objeto: $(git rev-list --first-parent --count f076973921539165df8d406b8c061dbf4e4ee127..e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2)"; echo "merges: $(git rev-list --merges --count f076973921539165df8d406b8c061dbf4e4ee127..e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2)"; echo "objeto do ciclo 1: $(git log -1 --format=%s e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2~13)"; echo "arquivos ciclo1..objeto: $(git diff --name-only e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2~13 e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2 | wc -l)"; echo "interseção com arquivos_medidos da C2: $(git diff --name-only e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2~13 e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2 -- frontend/src/modules/finance frontend/src/modules/appearance agent-orchestration/controle/pendencias.md docs/revisoes/SAN3/B-SAN3-12-plano.md docs/revisoes/SAN3/B-SAN3-12b-dev.md frontend/tests/finance-page-live.test.tsx frontend/tests/finance-baixa.smoke.test.tsx | wc -l)"`
```
merge-base ancestral
primeiro-pai merge-base..objeto: 20
merges: 3
objeto do ciclo 1: docs(junta): corpos das 3 cadeiras da junta de dinheiro do B-SAN3-12b
arquivos ciclo1..objeto: 143
interseção com arquivos_medidos da C2: 15
```

O diff efetivo do PR é merge-base atual até objeto; contagem por raiz e lista dos caminhos de produto financeiro, testes e registro, com zero mudança própria em prisma e migrations, medido por: `cd C:/Users/AMP/w-san312b && echo "PR caminhos: $(git diff --name-only f076973921539165df8d406b8c061dbf4e4ee127 e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2 | wc -l)"; for d in frontend/src/modules/finance frontend/tests src prisma .github Kpis docs/revisoes/SAN3 agent-orchestration/controle agent-orchestration/omega/reprovacoes; do echo "sob $d: $(git diff --name-only f076973921539165df8d406b8c061dbf4e4ee127 e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2 -- $d | wc -l)"; done; git diff --name-only f076973921539165df8d406b8c061dbf4e4ee127 e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2 -- frontend/src/modules/finance frontend/tests/finance-page-live.test.tsx frontend/tests/finance-baixa.smoke.test.tsx frontend/tests/finance-contas-extrato.smoke.test.tsx frontend/tests/finance-no-money-reduce.guard.test.ts docs/revisoes/SAN3/B-SAN3-12-plano.md docs/revisoes/SAN3/B-SAN3-12b-dev.md agent-orchestration/controle/pendencias.md agent-orchestration/controle/pendencias-indice.md | sed -e 's#^#C:/Users/AMP/w-san312b/#'`
```
PR caminhos: 70
sob frontend/src/modules/finance: 28
sob frontend/tests: 9
sob src: 0
sob prisma: 0
sob .github: 0
sob Kpis: 0
sob docs/revisoes/SAN3: 2
sob agent-orchestration/controle: 2
sob agent-orchestration/omega/reprovacoes: 1
C:/Users/AMP/w-san312b/agent-orchestration/controle/pendencias-indice.md
C:/Users/AMP/w-san312b/agent-orchestration/controle/pendencias.md
C:/Users/AMP/w-san312b/docs/revisoes/SAN3/B-SAN3-12-plano.md
C:/Users/AMP/w-san312b/docs/revisoes/SAN3/B-SAN3-12b-dev.md
C:/Users/AMP/w-san312b/frontend/src/modules/finance/accounts/components/AccountCard.tsx
C:/Users/AMP/w-san312b/frontend/src/modules/finance/accounts/components/NovaContaModal.tsx
C:/Users/AMP/w-san312b/frontend/src/modules/finance/accounts/financial-accounts.adapter.ts
C:/Users/AMP/w-san312b/frontend/src/modules/finance/accounts/financial-accounts.service.ts
C:/Users/AMP/w-san312b/frontend/src/modules/finance/accounts/financial-accounts.types.ts
C:/Users/AMP/w-san312b/frontend/src/modules/finance/accounts/useFinancialAccounts.ts
C:/Users/AMP/w-san312b/frontend/src/modules/finance/dashboard/financial-summary.adapter.ts
C:/Users/AMP/w-san312b/frontend/src/modules/finance/dashboard/financial-summary.types.ts
C:/Users/AMP/w-san312b/frontend/src/modules/finance/entries/components/BaixaForm.tsx
C:/Users/AMP/w-san312b/frontend/src/modules/finance/entries/components/ConciliarForm.tsx
C:/Users/AMP/w-san312b/frontend/src/modules/finance/entries/components/DesvincularChequeModal.tsx
C:/Users/AMP/w-san312b/frontend/src/modules/finance/entries/components/EntryDetail.tsx
C:/Users/AMP/w-san312b/frontend/src/modules/finance/entries/components/TitleDetail.tsx
C:/Users/AMP/w-san312b/frontend/src/modules/finance/entries/finance-errors.ts
C:/Users/AMP/w-san312b/frontend/src/modules/finance/entries/financial-entries.adapter.ts
C:/Users/AMP/w-san312b/frontend/src/modules/finance/entries/financial-entries.service.ts
C:/Users/AMP/w-san312b/frontend/src/modules/finance/entries/financial-entries.types.ts
C:/Users/AMP/w-san312b/frontend/src/modules/finance/entries/useEntriesAggregate.ts
C:/Users/AMP/w-san312b/frontend/src/modules/finance/entries/useFinanceActions.ts
C:/Users/AMP/w-san312b/frontend/src/modules/finance/entries/useFinancialEntries.ts
C:/Users/AMP/w-san312b/frontend/src/modules/finance/entries/useReconciliationPolicy.ts
C:/Users/AMP/w-san312b/frontend/src/modules/finance/pages/FinanceiroPage.tsx
C:/Users/AMP/w-san312b/frontend/src/modules/finance/pages/financeiro.state.ts
C:/Users/AMP/w-san312b/frontend/src/modules/finance/pages/views/FinanceiroViewA.tsx
C:/Users/AMP/w-san312b/frontend/src/modules/finance/titles/financial-titles.adapter.ts
C:/Users/AMP/w-san312b/frontend/src/modules/finance/titles/financial-titles.service.ts
C:/Users/AMP/w-san312b/frontend/src/modules/finance/titles/financial-titles.types.ts
C:/Users/AMP/w-san312b/frontend/src/modules/finance/titles/useFinancialTitles.ts
C:/Users/AMP/w-san312b/frontend/tests/finance-baixa.smoke.test.tsx
C:/Users/AMP/w-san312b/frontend/tests/finance-contas-extrato.smoke.test.tsx
C:/Users/AMP/w-san312b/frontend/tests/finance-no-money-reduce.guard.test.ts
C:/Users/AMP/w-san312b/frontend/tests/finance-page-live.test.tsx
```

O corpo canônico desta cadeira existe no objeto e é IDÊNTICO entre os dois espelhos depois de retirar frontmatter e orientação Codex, em comparação EOL-neutra, medido por: `cd C:/Users/AMP/w-san312b && diff <(tr -d '\r' < C:/Users/AMP/w-san312b/.claude/agents/especialistas/jurado-san312b-c3-dinheiro-e-contrato.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(tr -d '\r' < C:/Users/AMP/w-san312b/.agents/agents/especialistas/jurado-san312b-c3-dinheiro-e-contrato.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo 'IDENTICO corpo c3-dinheiro-e-contrato' || echo 'DIVERGE corpo c3-dinheiro-e-contrato'; wc -l C:/Users/AMP/w-san312b/.claude/agents/especialistas/jurado-san312b-c3-dinheiro-e-contrato.md C:/Users/AMP/w-san312b/.agents/agents/especialistas/jurado-san312b-c3-dinheiro-e-contrato.md`
```
IDENTICO corpo c3-dinheiro-e-contrato
  403 C:/Users/AMP/w-san312b/.claude/agents/especialistas/jurado-san312b-c3-dinheiro-e-contrato.md
  409 C:/Users/AMP/w-san312b/.agents/agents/especialistas/jurado-san312b-c3-dinheiro-e-contrato.md
  812 total
```

As duas ferramentas protegidas são byte a byte iguais às originais copiadas; só lib e geradores pertencem à adaptação do ciclo 2, medido por: `for f in mandato-preflight.sh mandato-refs.sh; do cmp -s C:/Users/AMP/erp-pausa-2026-10-03/redator-san312b/$f C:/Users/AMP/erp-pausa-2026-10-03/redator-san312b-c2/$f && echo "$f INTACTO" || echo "$f ALTERADO"; done`
```
mandato-preflight.sh INTACTO
mandato-refs.sh INTACTO
```

A régua do objeto exige junta de dinheiro unânime, ciclo 2 ainda bloqueado por achado dentro do bloco, e no ciclo seguinte só a cadeira vermelha é refeita enquanto a verde cruzada pelo diff é revalidada por identidade nova, medido por: `tr -d '\r' < C:/Users/AMP/w-san312b/CLAUDE.md | grep -n -i -E 'Junta proporcional ao risco|Teto de 2 ciclos|JUNTA: SÓ A CADEIRA VERMELHA|Se o conserto tocar o escopo dela|A cadeira vermelha é refeita' | head -12`
```
496:   > **Teto de 2 ciclos restabelecido (2026-10-04, `D-GOV-PROPORCIONAL`, §C7 item 8(2)):** a partir do ciclo 3, só defeito de produto grave bloqueia; o resto vira pendência e o bloco mergeia.
750:8. **GOVERNANÇA PROPORCIONAL — junta só onde o risco pede, teto de 2 ciclos, menos burocracia, Traccar depois de sanar
759:   - **(1) Junta proporcional ao risco.** Junta completa — inspetor de terreno, 3 cadeiras, **unanimidade** — só
763:   - **(2) Teto de 2 ciclos.** Nos ciclos 1 e 2 a junta funciona como hoje. **A partir do ciclo 3, só bloqueia
810:     (segurança/permissão), teto de 2 ciclos; `#401` (B-SAN3-11, rótulo do dossiê) passa à regra (1); `#393` fica
813:9. **JUNTA: SÓ A CADEIRA VERMELHA É REFEITA, COM TRAVA (decisão do dono, 2026-10-20 — `D-JUNTA-SO-CADEIRA-VERMELHA`).**
829:   - **(2) Se o conserto tocar o escopo dela,** uma identidade NOVA re-executa só os comandos registrados na evidência
832:   - **(3) A cadeira vermelha é refeita**, com identidade nova e a régua do ciclo corrente, focada no achado mais a
```

O parecer de reprovação define a composição do ciclo 2, a regra da C2 revalidada e a lista nominal de inelegíveis; os votos do ciclo 1 registram C1 e C3 reprovadas e C2 aprovada, medido por: `tr -d '\r' < C:/Users/AMP/w-san312b/agent-orchestration/omega/reprovacoes/R-B-SAN3-12b-ciclo1.md | grep -n -i -E '^## 4\.|C1.*refeita|C2.*revalidada|C3.*refeita|Inelegíveis para qualquer cadeira' | head -14; for f in c1 c2 c3; do printf "$f "; tr -d '\r' < C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b/$f-voto.json | grep -i -m1 -E '"voto"'; done`
```
42:> **Objetivo:** fechar os 6 `bloqueia` e o ajuste do ciclo 1 sem reintroduzir defeito, com o ramo trazido à `main` (`sha-omitido`), e entregar um objeto que a junta do ciclo 2 (C1 e C3 refeitas; C2 revalidada) possa aprovar. O ciclo 2 é o último em que achado não grave reprova (§C7 item 8(2)): cada requisito abaixo tem critério, mutação e vermelho-controle no objeto do ciclo 1.
189:## 4. Junta do ciclo 2 (`D-JUNTA-SO-CADEIRA-VERMELHA`, §C7 item 9)
195:| **C1** tela e fidelidade | **(3) refeita** (vermelha no ciclo 1) | `jurado-san312b-ciclo2-c1-opus` (nova) | Claude Opus, declarado (`D-DESIGN-SO-CLAUDE`) | 1. R1 + R2 no navegador (cenários C1-01 ×2; distância nome→contagem; chips) + regressão F11/F12; 2. R3 (fixture 130: contagens do servidor, pager, "Carregar mais") + R10 + regressão F16/F19; 3. F17 com R11 + fidelidade à opção A com as divergências DECLARADAS em E2.2 (D-5, busca → pendência, "Carregar mais") + padrão do sistema (`app.css` intocado; `TablePager` da biblioteca) |
196:| **C2** cadeia de acesso | **(2) revalidada** (verde no ciclo 1; o diff cruza o escopo dela) | `jurado-san312b-ciclo2-c2rev-<modelo>` (nova) | Claude Opus ou Codex Sol, declarado | re-executa, sobre o objeto novo, os 8 comandos de `o_que_executei` do `c2-voto.json` (matriz de `ROLE_PERMISSIONS`; backend em memória com 25 atores; os 7 arquivos de teste; sonda `zz-j12bc2-front` + comparador; mutações M1–M8; controle na base; `navback`/`navfront`; `front3`): saída igual mantém o verde; saída diferente gera voto novo com a régua do ciclo 2. **Onde a saída vai mudar por desenho** (e a C2 vota de novo nesse item): o gate novo `cheques:update` do "Cancelar o cheque" (R5; a mutação "gate por `unlink_title`" tem de cair) e os atores por permissão da R9; o texto "Confira em Cheques" (item 2 dela) muda pela R5(d) |
197:| **C3** dinheiro e contrato | **(3) refeita** (vermelha no ciclo 1) | `jurado-san312b-ciclo2-c3-opus` (nova) | Claude Opus, declarado (Codex só com a prova de Docker da ressalva 3 do inspetor) | 1. a baixa: F1–F5, F21, R6 (sonda "concorrência" com 422 `overpayment`), R5 inteiro (POST sem corpo; 32 razões incluindo as do `cancel`); 2. F8 (trava + R12), F9, F10, F14 com R4 (URL ×1; contagens por conta presentes), F20, F22, F18 (CI `backend` no head; `-db` no Postgres descartável dela se quiser); 3. escopo (E2.1 × diff `sha-omitido..objeto` descontado o que veio da `main`), D-1..D-9 + E2, registro (R7 índice = gerador; R13 ratificações e E2 versionadas; pendências de E2.4), merge da `main` (E2.5: dois lados, `test:smoke` união), bateria e `test:smoke` em Node 20 e 22 |
201:**Inelegíveis para qualquer cadeira, inspeção ou revalidação do ciclo 2 (por nome):** `planejador-mestre` (plano v1–v3), `planejador-san312-e1-fable`, `planejador-san312b-c1rep-fable` (eu); críticos `crit-san312-pro`, `crit-san312-opus-r2`, `crit-san312-pro-r2`, `crit-san3-12-r2-pro`, `crit-san312a-e1-opus`, `crit-san312-argon`, `crit-san312-sol`; devs `dev-san312b-sol`, `dev-san312b-opus` e o dev do ciclo 2 `dev-san312b-ciclo2-sol`; fábrica/redator `fab-red-san312b-opus`; inspetor `inspetor-san312b-opus`; jurados do ciclo 1 `jurado-san312b-c1-opus`, `jurado-san312b-c2-opus` (a revalidação da C2 é por identidade NOVA, item 9(2)), `jurado-san312b-c3-opus`; e o orquestrador da sessão. Quem achou (C1/C3 do ciclo 1) não planeja nem desenvolve; quem planejou (eu) não desenvolve nem vota; quem desenvolve não vota (§C7.4-bis).
212:- **Requisitos: 14** (R1–R14; 6 fecham os `bloqueia`, 1 o ajuste, 1 o merge, 6 fecham notas baratas e registro). **Fatias: 9.** **C2: regra (2), revalidada.** **Pendências novas com dono: 4** (E2.4). **Perguntas ao dono: 0** (o C3-05 é execução do plano e da decisão R2-04 do dono, não decisão nova; nenhum requisito muda regra de negócio, permissão ou alçada).
c1  "voto": "REPROVADO",
c2  "voto": "APROVADO",
c3  "voto": "REPROVADO",
```

A Emenda E2 está versionada e nomeia escopo, requisitos R1 a R14, pendências, merge da main, fatias e riscos, medido por: `echo "Emenda E2: $(grep -c -i '^## Emenda E2' C:/Users/AMP/w-san312b/docs/revisoes/SAN3/B-SAN3-12-plano.md)"; echo "seções E2.1 a E2.7: $(grep -c -i -E '^### E2\.[1-7]' C:/Users/AMP/w-san312b/docs/revisoes/SAN3/B-SAN3-12-plano.md)"; echo "requisitos R1 a R14: $(grep -c -i -E '^\*\*R([1-9]|1[0-4]) ' C:/Users/AMP/w-san312b/docs/revisoes/SAN3/B-SAN3-12-plano.md)"`
```
Emenda E2: 1
seções E2.1 a E2.7: 7
requisitos R1 a R14: 14
```

O relatório do desenvolvimento contém RETOMADA 1 a RETOMADA 9, 84 casos do bloco e a rodada final de 44 mutações restauradas; nesse arquivo do objeto não existe marcador nominal D-C2, e os desvios estão registrados como R1 a R14 e D-1 a D-9, medido por: `echo "RETOMADAS: $(grep -c -i -E '^## RETOMADA [1-9]$' C:/Users/AMP/w-san312b/docs/revisoes/SAN3/B-SAN3-12b-dev.md)"; echo "marcadores D-C2: $(grep -c -i 'D-C2-' C:/Users/AMP/w-san312b/docs/revisoes/SAN3/B-SAN3-12b-dev.md || true)"; echo "registro de 84 casos: $(grep -c -i '= \*\*84\*\*' C:/Users/AMP/w-san312b/docs/revisoes/SAN3/B-SAN3-12b-dev.md)"; echo "registro de 44 mutações: $(grep -c -i 'Resultado: 44 mutações' C:/Users/AMP/w-san312b/docs/revisoes/SAN3/B-SAN3-12b-dev.md)"; echo 'desvios do ciclo 2: R1 a R14 e D-1 a D-9'`
```
RETOMADAS: 9
marcadores D-C2: 0
registro de 84 casos: 1
registro de 44 mutações: 1
desvios do ciclo 2: R1 a R14 e D-1 a D-9
```

Os testes e o produto do objeto nomeiam R4, R5, R6, R12, F1 a F5, F8 a F10, F14, F18 e F20 a F22; o cancelamento usa POST sem corpo e cheques:update, medido por: `echo "casos R4/R5/R6/F1/F2/F3/F9/F10/F14/F20/F21/F22: $(grep -c -i -E '^test\("(R4|R5|R6|F1|F2|F3|F9|F10|F14|F20|F21|F22)' C:/Users/AMP/w-san312b/frontend/tests/finance-page-live.test.tsx)"; echo "marcadores R12/F8: $(grep -c -i -E 'R12|F8' C:/Users/AMP/w-san312b/frontend/tests/finance-no-money-reduce.guard.test.ts)"; echo "marcadores cancelCheque/cancel: $(grep -c -i -E 'cancelCheque|/cancel' C:/Users/AMP/w-san312b/frontend/src/modules/finance/entries/financial-entries.service.ts)"`
```
casos R4/R5/R6/F1/F2/F3/F9/F10/F14/F20/F21/F22: 19
marcadores R12/F8: 10
marcadores cancelCheque/cancel: 3
```

O registro do objeto contém duas ratificações, a E2, as quatro pendências novas e um índice versionado cujo hash permanece igual depois do gerador, medido por: `echo "ratificações: $(grep -c -i '^## Ratificação do orquestrador' C:/Users/AMP/w-san312b/docs/revisoes/SAN3/B-SAN3-12-plano.md)"; echo "Emenda E2: $(grep -c -i '^## Emenda E2' C:/Users/AMP/w-san312b/docs/revisoes/SAN3/B-SAN3-12-plano.md)"; for id in P-SAN3-12B-BUSCA-TABELA-TITULOS P-WEB-GUARDA-ROTA-TEXTO-SEM-ACENTO P-FINANCE-SUMMARY-ADAPTER-NUM-ZERO P-SAN3-12-CE4-BRACO1-NA-CI; do printf "$id: "; grep -c -i "^## $id" C:/Users/AMP/w-san312b/agent-orchestration/controle/pendencias.md; done; before=$(git -C C:/Users/AMP/w-san312b hash-object agent-orchestration/controle/pendencias-indice.md); cd C:/Users/AMP/w-san312b && python -I C:/Users/AMP/w-san312b/agent-orchestration/controle/gerar-indice-pendencias.py >/dev/null; after=$(git hash-object agent-orchestration/controle/pendencias-indice.md); test "$before" = "$after" && echo 'índice = gerador'`
```
ratificações: 2
Emenda E2: 1
P-SAN3-12B-BUSCA-TABELA-TITULOS: 1
P-WEB-GUARDA-ROTA-TEXTO-SEM-ACENTO: 1
P-FINANCE-SUMMARY-ADAPTER-NUM-ZERO: 1
P-SAN3-12-CE4-BRACO1-NA-CI: 1
índice = gerador
```

O merge da main está no objeto, o PR está mergeável e o delta próprio do 12b não altera backend, prisma ou scripts; o test:smoke contém os testes do bloco sem duplicação nominal, medido por: `cd C:/Users/AMP/w-san312b && git merge-base --is-ancestor f076973921539165df8d406b8c061dbf4e4ee127 e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2 && echo 'main ancestral'; gh pr view 469 --json mergeable,mergeStateStatus --jq '.mergeable + " " + .mergeStateStatus'; all=$(git diff --name-only e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2~13 e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2 -- src prisma scripts | wc -l); inherited=$(git diff --name-only e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2~13 e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2 -- src prisma scripts | grep -c -i '^src/modules/checklists/' || true); echo "backend prisma scripts no delta principal do 12b: $((all-inherited))"; node -e 'const p=require("./frontend/package.json"); const s=p.scripts["test:smoke"]; const a=s.match(/tests\/[A-Za-z0-9._-]+/g)||[]; console.log("tokens",a.length,"únicos",new Set(a).size)'`
```
main ancestral
MERGEABLE CLEAN
backend prisma scripts no delta principal do 12b: 0
tokens 169 únicos 169
```

Recursos no instante da redação, sem invocar Docker nem banco: memória de commit livre e disco C; o redator para abaixo de 7,5 GB, medido por: `powershell.exe -NoProfile -Command '$o=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; [math]::Round(($o.CommitLimit-$o.CommittedBytes)/1GB,2)'; df -BG / | tail -1 | awk '{print "livre em C: " $4}'`
```
13,14
livre em C: 225G
```

O protocolo resiliente P1, P2, P3, P4 e P7 está no contrato do objeto, medido por: `tr -d '\r' < C:/Users/AMP/w-san312b/CLAUDE.md | grep -n -i -A7 'Após CADA item: apense a <cadeira>-evidencia.md'`
```
733:   Após CADA item: apense a <cadeira>-evidencia.md → comando · saída resumida · veredito parcial.  [P1]
734-   Antes da mensagem final: escreva <cadeira>-voto.json. Mensagem final = 1 linha apontando o arquivo.  [P2]
735-   Máximo 3 itens; logs longos só no arquivo de evidência.  [P4]
736-   Se você substituir um caído: re-execute cada comando do <cadeira>-evidencia.md dele e compare, depois
737-   meça a cauda. Conclusão sem comando registrado NÃO é insumo.  [P3]
738-   Se receber PAUSA: termine o comando em curso, grave `## PAUSA <hora UTC>` em <cadeira>-evidencia.md
739-   (head · feito · falta · próximo comando · arquivos meio-escritos) e pare sozinho com 1 linha apontando
740-   o arquivo. Não inicie item novo.  [P7]
```

## HIPOTESE

Você é `jurado-san312b-c3-r2-<executor>`, identidade nova e C3 REFEITA; executor Claude Opus ou Codex GPT-5.6 Sol com capacidade para a medição requerida, nível menor declarado. Corpo canônico: `C:/Users/AMP/w-san312b/.claude/agents/especialistas/jurado-san312b-c3-dinheiro-e-contrato.md`, carregado do blob do objeto. Onde corpo e mandato divergirem sobre objeto, itens, régua, diretório ou inelegíveis, vale este mandato. Primeira linha de `c3r2-evidencia.md`: executor, modelo, nível, objeto, mandato_md5 sem CR e corpo IDENTICO/DIVERGE EOL-neutro. Inelegíveis: todos os nomes do R- §4, os executores das RETOMADAS 1 a 9, `red-san312b-c2-sol`, o inspetor, os três jurados do ciclo 1 e o orquestrador; coincidiu, PARE, derruba com: `head -1 C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/c3r2-evidencia.md | grep -i -E 'executor|modelo|objeto|mandato|IDENTICO|DIVERGE'`

Legalidade: exija parecer do inspetor do ciclo 2 LIBERADO ou LIBERADO COM RESSALVA; confirme head do PR e backend, backend-postgres e frontend completed/success. Régua: DINHEIRO, unanimidade de 3; ciclo 2, todo bloqueia dentro-do-bloco reprova. Esta C3 é refeita pela regra (3), com foco C3-05, C3-02, C3-07 e ajuste C3-01, mais regressão dos itens dela. Não leia votos do ciclo 2 das outras cadeiras, não proponha correção e não reabra decisão do plano. Todo achado declara gravidade, classe, escopo, N e forma; `arquivos_medidos` é `**` se rodar check, build ou suíte total, derruba com: `grep -i -E 'legalidade|unanimidade|ciclo 2|C3-05|C3-02|C3-07|C3-01|arquivos_medidos' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/c3r2-voto.json`

Terreno: worktree exclusivo `C:/Users/AMP/j12b-c2-c3r2-wt`, detached no objeto, dependências próprias, zero junction e nunca a base viva. O CI backend-postgres concluído é insumo do F18; Postgres descartável local só se o inspetor autorizar e houver recurso, com nome e porta próprios, nunca erp-postgres. Antes: memória de commit livre ≥4 GB e disco ≥7,5 GB; abaixo, PARE. Mutação uma por vez, âncora única, restauro por hash contra o blob. Vermelho-controle usa `<objeto>~13` ou mutação nominal, sempre restaurado. Teardown remove processos, artefatos, worktree e qualquer recurso descartável, derruba com: `grep -i -E 'j12b-c2-c3r2-wt|base viva|backend-postgres|4 GB|7,5 GB|objeto.~13|restauro|teardown' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/c3r2-evidencia.md`

Item 1 de 3 — a baixa, foco C3-05 e C3-01: reexecute F1 a F5, F21, R5 e R6. Prove as cinco chaves do pay, mesmo client_action_id após falha, releitura antes de mensagem, 32 razões como conjunto e meios sem cheque. Depois de desvincular cheque registered, prove aviso, gate exato `cheques:update`, confirmação em dois passos, POST `/cancel` sem corpo, 422 mantém botão, 200 remove e deposited não oferece; sem permissão, pedido honesto. Para R6, 422 overpayment com paidAmount maior mostra a razão e a mudança do título, nunca já registrada; rede ou 5xx com pagamento relido e 409 duplicate_payment seguem a régua. Reexecute R5-M1 a M3, R6-M1 e regressões F1 a F5 e F21; controle no ciclo 1 vermelho, derruba com: `grep -i -E 'Item 1|C3-05|C3-01|F1|F5|F21|R5|R6|cheques:update|sem corpo|overpayment|32|mutação|vermelho' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/c3r2-evidencia.md`

Item 2 de 3 — conciliação e números, foco C3-02: reexecute F8, F9, F10, F14, F18, F20, F22, R4 e R12. No F14 conte cada URL completa de aggregate: quatro situações e uma por conta, cada URL uma vez por carga; contas chegando depois não refazem situação e resposta antiga não apaga contagens. Prove números de dinheiro só do servidor, trava F8 ampliada para x=x+amount, expected_reconciled e carimbo lido, releitura em 409, frase e botões do F20, F22 e CE-4 conforme a forma autorizada. Reexecute R4-M1/M2, R12-M1, F8/F9/F10/F14/F20/F22 e use o CI backend-postgres do objeto como insumo; controle do ciclo 1 mostra quatro URLs duplicadas, derruba com: `grep -i -E 'Item 2|C3-02|R4|R12|F8|F9|F10|F14|F18|F20|F22|URL|aggregate|uma vez|mutação|vermelho' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/c3r2-evidencia.md`

Item 3 de 3 — escopo, contrato, registro e bateria, foco C3-07: gere diff do bloco e separe produto do que veio pelos merges da main; confronte E2.1, D-1 a D-9, E2 e proibidos, com zero edição própria em src, prisma, .github e Kpis. Reexecute o gerador do índice numa cópia e prove igualdade byte a byte EOL-neutra; confira duas ratificações, E2, quatro pendências com dono e a união sem repetição do test:smoke. Prove main ancestral e PR mergeável. Rode bateria do comando no cwd correto, test:smoke Node 20 e 22, check/build e diff --check; publique N. Reexecute R7-M1 e R13-M1, e as 44 mutações podem ser reexecutadas por amostra dirigida apenas se cada regressão dos itens 1 e 2 já tiver seu dono; qualquer redução deve ser declarada. Controle do ciclo 1 deixa índice divergente, derruba com: `grep -i -E 'Item 3|C3-07|E2.1|D-1|D-9|proibido|índice|gerador|ratificações|pendências|main ancestral|mergeável|Node 20|Node 22|R7-M1|R13-M1|vermelho' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/c3r2-evidencia.md`

P1/P2/P3/P4/P7: após CADA item, apense comando, saída resumida e veredito parcial em `c3r2-evidencia.md`; `c3r2-voto.json` nasce esqueleto com três itens EM APURAÇÃO e `arquivos_medidos`, e fecha antes da mensagem final de uma linha; sucessor reexecuta tudo registrado; máximo três itens; PAUSA grava head, feito, falta, próximo comando e arquivos parciais. Outputs somente no diretório do ciclo 2; nunca commit, derruba com: `test -f C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/c3r2-voto.json`

