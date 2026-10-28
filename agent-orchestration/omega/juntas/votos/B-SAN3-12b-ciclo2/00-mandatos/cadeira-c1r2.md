# Mandato — C1 refeita — B-SAN3-12b, junta de DINHEIRO, ciclo 2

## MEDIDO

Estado atual do PR 469 pela ferramenta de refs copiada sem alteração para a pasta deste redator: ramo, base, estado, objeto, merge-base, check-runs e ausência de ata final, medido por: `cd C:/Users/AMP/w-san312b && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san312b-c2/mandato-refs.sh 469`
```
# refs do PR #469 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-28T01:06Z · repo: thiagodorgo/ERP_Techsolutios

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

O corpo canônico desta cadeira existe no objeto e é IDÊNTICO entre os dois espelhos depois de retirar frontmatter e orientação Codex, em comparação EOL-neutra, medido por: `cd C:/Users/AMP/w-san312b && diff <(tr -d '\r' < C:/Users/AMP/w-san312b/.claude/agents/especialistas/jurado-san312b-c1-tela-e-fidelidade.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(tr -d '\r' < C:/Users/AMP/w-san312b/.agents/agents/especialistas/jurado-san312b-c1-tela-e-fidelidade.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo 'IDENTICO corpo c1-tela-e-fidelidade' || echo 'DIVERGE corpo c1-tela-e-fidelidade'; wc -l C:/Users/AMP/w-san312b/.claude/agents/especialistas/jurado-san312b-c1-tela-e-fidelidade.md C:/Users/AMP/w-san312b/.agents/agents/especialistas/jurado-san312b-c1-tela-e-fidelidade.md`
```
IDENTICO corpo c1-tela-e-fidelidade
  389 C:/Users/AMP/w-san312b/.claude/agents/especialistas/jurado-san312b-c1-tela-e-fidelidade.md
  395 C:/Users/AMP/w-san312b/.agents/agents/especialistas/jurado-san312b-c1-tela-e-fidelidade.md
  784 total
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

Os testes do objeto nomeiam R1, R2, R3, R10, R11, F11, F12, F16, F17 e F19; o código usa TablePager, chip removível e alinhamento flex sem alteração própria de app.css no diff do PR, medido por: `echo "casos R1/R2/R3/R10/F11/F12/F16: $(grep -c -i -E '^test\("(R1|R2|R3|R10|F11|F12|F16)' C:/Users/AMP/w-san312b/frontend/tests/finance-page-live.test.tsx)"; echo "marcadores F17/R11/F19: $(grep -c -i -E 'F17|R11|F19' C:/Users/AMP/w-san312b/frontend/tests/finance-contas-extrato.smoke.test.tsx)"; echo "marcadores TablePager/chip/flex: $(grep -c -i -E 'TablePager|Remover o filtro de conta|display: "flex"' C:/Users/AMP/w-san312b/frontend/src/modules/finance/pages/views/FinanceiroViewA.tsx)"; echo "app.css no PR: $(git -C C:/Users/AMP/w-san312b diff --name-only f076973921539165df8d406b8c061dbf4e4ee127 e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2 -- frontend/src/styles/app.css | wc -l)"`
```
casos R1/R2/R3/R10/F11/F12/F16: 15
marcadores F17/R11/F19: 9
marcadores TablePager/chip/flex: 10
app.css no PR: 0
```

A referência aprovada da aparência A, a tela-modelo e os estados obrigatórios existem no objeto, medido por: `tr -d '\r' < C:/Users/AMP/w-san312b/docs/claude-code-handoff/screen-refs/financeiro-baixa-conta-conciliacao-3opcoes.reference.html | grep -n -i -E 'Opção A|Conciliação por conta|Buscar documento|pat-pager' | head -12; test -f C:/Users/AMP/w-san312b/frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx && echo 'tela-modelo existe'; tr -d '\r' < C:/Users/AMP/w-san312b/frontend/src/modules/finance/pages/views/FinanceiroViewA.tsx | grep -n -i -E 'StatePanel|StaleDataBanner|aria-busy|forbidden' | head -16`
```
76:.pat-btn:focus-visible,.pat-link:focus-visible,.pat-select:focus-visible,.pat-os-tab:focus-visible,.pat-pager__btn:focus-visible{outline:2px solid #2563eb;outline-offset:2px}
226:.pat-pager{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px;flex-wrap:wrap;border-top:1px solid #f1f5f9}
227:.pat-pager__size{display:flex;align-items:center;gap:9px;font-size:12px;color:#64748b;font-weight:600}
228:.pat-pager__size select{padding:5px 9px;border:1px solid #e2e8f0;border-radius:7px;font-size:12px;font-weight:600;color:#334155;background:#fff;min-height:30px}
229:.pat-pager__nav{display:flex;align-items:center;gap:10px}
230:.pat-pager__range{font-size:12px;color:#64748b;font-variant-numeric:tabular-nums;font-weight:600}
231:.pat-pager__btn{display:flex;align-items:center;gap:6px;padding:6px 11px;background:#fff;border:1px solid #e2e8f0;border-radius:7px;font-size:12px;font-weight:700;color:#475569;cursor:pointer;min-height:32px}
232:.pat-pager__btn:hover:not(:disabled){border-color:#2563eb;color:#2563eb}
233:.pat-pager__btn:disabled{color:#cbd5e1;cursor:not-allowed}
510:    <div class="browser-banner__tag" id="banner-tag">Baixa, contas e conciliação · Opção A</div>
546:      <h2 id="rv-titulo">Opção A — Abas do Financeiro</h2>
1051:    '<label class="pat-os-search">'+ic('search', 14)+'<span class="sr">Buscar</span><input type="search" data-busca placeholder="Buscar documento, cliente ou descrição" value="'+esc(S[v].busca)+'"></label><span class="pat-os-count">'+contagem+'</span></div>';
tela-modelo existe
8:import { StaleDataBanner } from "../../../work-orders/components/StaleDataBanner";
9:import { StatePanel, StatePanelAction } from "../../../work-orders/components/StatePanel";
100:    <div aria-busy="true" aria-label="Carregando">
191:        <StatePanel
195:          actions={<StatePanelAction label="Tentar novamente" onClick={model.onRetry} />}
212:    <div className="pat-kpi-row" style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }} aria-busy={model.summaryLoading ? true : undefined}>
399:        <StatePanel
400:          tone="forbidden"
411:        <StatePanel
416:          actions={<StatePanelAction label="Tentar novamente" onClick={model.onRetry} />}
455:          <StatePanel
463:        body = <StatePanel tone="empty" embedded title="Nada para este filtro" detail="Remova o filtro para ver todos os títulos em aberto." actions={<StatePanelAction label="Remover o filtro" variant="secondary" onClick={() => go({ target: null })} />} />;
547:        <StatePanel
548:          tone="forbidden"
557:        <StatePanel
566:          actions={access.createAccount ? <StatePanelAction label="Cadastrar a primeira conta" onClick={model.onNewAccount} /> : undefined}
```

Recursos no instante da redação, sem invocar Docker nem banco: memória de commit livre e disco C; o redator para abaixo de 7,5 GB, medido por: `powershell.exe -NoProfile -Command '$o=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; [math]::Round(($o.CommitLimit-$o.CommittedBytes)/1GB,2)'; df -BG / | tail -1 | awk '{print "livre em C: " $4}'`
```
13,16
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

Você é `jurado-san312b-c1-r2-<executor>`, identidade nova e C1 REFEITA; executor obrigatório Claude, modelo Claude Opus, nível menor declarado, porque é julgamento de tela. Corpo canônico: `C:/Users/AMP/w-san312b/.claude/agents/especialistas/jurado-san312b-c1-tela-e-fidelidade.md`, carregado do blob do objeto. Onde corpo e mandato divergirem sobre objeto, itens, régua, diretório ou inelegíveis, vale este mandato. Primeira linha de `c1r2-evidencia.md`: executor, modelo, nível, objeto, mandato_md5 sem CR e corpo IDENTICO/DIVERGE EOL-neutro. Opus esgotado: PARE sem votar. Inelegíveis: `planejador-mestre`, `planejador-san312-e1-fable`, `planejador-san312b-c1rep-fable`, `crit-san312-pro`, `crit-san312-opus-r2`, `crit-san312-pro-r2`, `crit-san3-12-r2-pro`, `crit-san312a-e1-opus`, `crit-san312-argon`, `crit-san312-sol`, `dev-san312b-sol`, `dev-san312b-opus`, `dev-san312b-ciclo2-sol`, `dev-san312b-c2-f1-sol`, `dev-san312b-c2-f2-sol`, `dev-san312b-c2-f3-sol`, `dev-san312b-c2-f4-sol`, `dev-san312b-c2-f4b-sol`, `dev-san312b-c2-f4-opus`, `dev-san312b-c2-f59-opus`, `fab-red-san312b-opus`, `red-san312b-c2-sol`, `inspetor-san312b-opus`, `jurado-san312b-c1-opus`, `jurado-san312b-c2-opus`, `jurado-san312b-c3-opus` e o orquestrador; coincidiu, PARE, derruba com: `head -1 C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/c1r2-evidencia.md | grep -i -E 'executor|modelo|objeto|mandato|IDENTICO|DIVERGE'`

Legalidade antes do mérito: exija `inspetor-san312b-c2-parecer.md` LIBERADO ou LIBERADO COM RESSALVA para seu nome, executor e worktree; confirme novamente que o head do PR 469 é o objeto e que backend, backend-postgres e frontend estão completed/success. Régua: DINHEIRO, unanimidade de 3; ciclo 2, qualquer bloqueia dentro-do-bloco reprova; esta cadeira foi refeita pela regra (3). Não leia votos do ciclo 2 das outras cadeiras. Todo achado declara gravidade, classe, escopo, N e forma; pre-existente exige origem e pendência dona. Não proponha correção. Declare `arquivos_medidos`, usando `**` se rodar suíte total, check ou build, derruba com: `grep -i -E 'legalidade|unanimidade|ciclo 2|arquivos_medidos|gravidade|classe|escopo' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/c1r2-voto.json`

Terreno: worktree exclusivo detached no objeto, `C:/Users/AMP/j12b-c2-c1r2-wt`, dependências próprias e zero junction; sem base viva. Navegador e servidor só em 127.0.0.1 e porta alta livre, nunca 3000, 5173, 5432 ou 6379. Antes de instalar ou subir: memória de commit livre ≥ 4 GB e disco ≥ 7,5 GB; abaixo, PARE. Mutação só no worktree, uma por vez, âncora única, restauro provado contra o blob. Vermelho-controle usa `<objeto>~13` somente para os arquivos de produto necessários, restaurados antes do voto. Remova processos e worktree no fim, derruba com: `grep -i -E 'j12b-c2-c1r2-wt|127.0.0.1|junction|4 GB|7,5 GB|objeto.~13|restauro|teardown' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/c1r2-evidencia.md`

Item 1 de 3 — foco C1-01 e C1-02, R1 e R2, mais F11/F12: execute os casos nominais no `finance-page-live.test.tsx` e uma sonda no navegador. Prove chip Conta acima da lista, coexistência conta→alvo, remoção em um clique eliminando conta da URL e do pedido, e indicadores organizacionais zerando accountId. Em Conciliação por conta meça nome à esquerda, contagem à direita, distância mínima de 8 px, reticências e título inteiro. Refaça F11/F12: indicador clicável, filtro visível/removível, linha ≤44 px, sem botão, detalhe logo abaixo, um por vez, Enter/Espaço e foco. Reexecute R1-M1, R1-M2, R2-M1, F11 e F12; no vermelho-controle de `<objeto>~13`, os casos novos falham pela propriedade, nunca por import, derruba com: `grep -i -E 'Item 1|C1-01|C1-02|R1|R2|F11|F12|chip|accountId|8 px|44 px|mutação|vermelho' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/c1r2-evidencia.md`

Item 2 de 3 — foco C1-03, R3 e R10, com F16/F19: use fixture honesta de 130 títulos, resumo com contagens do servidor e dublê que honra offset. Prove aba A receber 130, primeira carga 100, contador honesto, TablePager 20/50, carregar mais 30, segunda URL com offset 100, 130 linhas após carga, próxima página 21–40, detalhe fechado ao paginar; Vencidos vem do resumo e blocos locais omitem número enquanto a carga é parcial. Meça falha de conta em aba ext sem financial_accounts:read como acesso não permitido, e todos os estados loading, empty, error, forbidden e stale sem dinheiro ou contagem fingidos. Reexecute R3-M1 a R3-M4, R10-M1, F16 e F19; vermelho-controle em `<objeto>~13` pela asserção, derruba com: `grep -i -E 'Item 2|C1-03|R3|R10|130|offset|TablePager|Carregar mais|F16|F19|forbidden|stale|mutação|vermelho' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/c1r2-evidencia.md`

Item 3 de 3 — F17 com R11 e fidelidade à opção A: execute a guarda textual e percorra o DOM renderizado de cada aba e detalhe procurando tenant, role, reconciled, scope, rotas, código de tela, TODO, WIP e acentuação incorreta; publique N. Compare objeto e referência aprovada em 1440×900 e 1280×720: indicadores, abas, cabeçalho, tabela, rodapé, densidade, estados e Conciliação por conta. Julgue as divergências DECLARADAS E2.2, não como silêncio: D-5 mantida; busca adiada à pendência; Carregar mais é extensão honesta; rótulos/minigráfico/ressalva ausentes; D-9 só aparência A; componentes locais mantidos. Confirme app.css intocado pelo PR e TablePager da biblioteca. Reexecute R11-M1, R11-M2 e F17 e faça controle positivo fora da varredura antiga, derruba com: `grep -i -E 'Item 3|F17|R11|termo técnico|acent|opção A|E2.2|D-5|busca|Carregar mais|D-9|app.css|TablePager|mutação|vermelho' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/c1r2-evidencia.md`

P1/P2/P3/P4/P7: após CADA item, apense comando, saída resumida e veredito parcial em `c1r2-evidencia.md`; `c1r2-voto.json` nasce esqueleto com três itens EM APURAÇÃO e `arquivos_medidos`, e fecha antes da mensagem final de uma linha; sucessor reexecuta tudo que estiver registrado; máximo três itens; PAUSA grava head, feito, falta, próximo comando e arquivos parciais e para. Únicos outputs no repositório ficam em `C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/c1r2-voto.json`

