# Mandato — inspetor de terreno — B-SAN3-12b, junta de DINHEIRO, ciclo 2

## MEDIDO

Estado atual do PR 469 pela ferramenta de refs copiada sem alteração para a pasta deste redator: ramo, base, estado, objeto, merge-base, check-runs e ausência de ata final, medido por: `cd C:/Users/AMP/w-san312b && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san312b-c2/mandato-refs.sh 469`
```
# refs do PR #469 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-28T01:11Z · repo: thiagodorgo/ERP_Techsolutios

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

O corpo canônico do inspetor existe no objeto nos dois espelhos; a comparação EOL-neutra desconta frontmatter e orientação Codex, medido por: `cd C:/Users/AMP/w-san312b && test -f .claude/agents/inspetor-de-terreno-da-junta.md && test -f .agents/agents/inspetor-de-terreno-da-junta.md && echo 'dois corpos existem'; wc -l .claude/agents/inspetor-de-terreno-da-junta.md .agents/agents/inspetor-de-terreno-da-junta.md; diff <(tr -d '\r' < .claude/agents/inspetor-de-terreno-da-junta.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(tr -d '\r' < .agents/agents/inspetor-de-terreno-da-junta.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo 'IDENTICO corpo do inspetor' || echo 'DIVERGE corpo do inspetor'`
```
dois corpos existem
  169 .claude/agents/inspetor-de-terreno-da-junta.md
  175 .agents/agents/inspetor-de-terreno-da-junta.md
  344 total
IDENTICO corpo do inspetor
```

Os três mandatos de cadeira existem, têm três itens no máximo e nomeiam a composição correta: C1 e C3 refeitas, C2 revalidada, medido por: `for f in cadeira-c1r2.md cadeira-c2rev.md cadeira-c3r2.md; do echo "$f itens: $(grep -c -i 'Item [123] de 3' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/00-mandatos/$f)"; grep -i -m1 -E 'REFEITA|REVALIDADA' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/00-mandatos/$f; done`
```
cadeira-c1r2.md itens: 3
# Mandato — C1 refeita — B-SAN3-12b, junta de DINHEIRO, ciclo 2
cadeira-c2rev.md itens: 3
# Mandato — C2 revalidada — B-SAN3-12b, junta de DINHEIRO, ciclo 2
cadeira-c3r2.md itens: 3
# Mandato — C3 refeita — B-SAN3-12b, junta de DINHEIRO, ciclo 2
```

A lista de inelegíveis do parecer e o elenco real de executores das nove retomadas estão no objeto; o redator e o orquestrador também são inelegíveis, medido por: `tr -d '\r' < C:/Users/AMP/w-san312b/agent-orchestration/omega/reprovacoes/R-B-SAN3-12b-ciclo1.md | grep -n -i -A2 'Inelegíveis para qualquer cadeira' | head -8; tr -d '\r' < C:/Users/AMP/w-san312b/docs/revisoes/SAN3/B-SAN3-12b-dev.md | grep -i -E '^[-] \*\*Executor e modelo:' | awk -F'`' '{print $2}' | sort -u; echo 'adicionais: red-san312b-c2-sol e orquestrador'`
```
201:**Inelegíveis para qualquer cadeira, inspeção ou revalidação do ciclo 2 (por nome):** `planejador-mestre` (plano v1–v3), `planejador-san312-e1-fable`, `planejador-san312b-c1rep-fable` (eu); críticos `crit-san312-pro`, `crit-san312-opus-r2`, `crit-san312-pro-r2`, `crit-san3-12-r2-pro`, `crit-san312a-e1-opus`, `crit-san312-argon`, `crit-san312-sol`; devs `dev-san312b-sol`, `dev-san312b-opus` e o dev do ciclo 2 `dev-san312b-ciclo2-sol`; fábrica/redator `fab-red-san312b-opus`; inspetor `inspetor-san312b-opus`; jurados do ciclo 1 `jurado-san312b-c1-opus`, `jurado-san312b-c2-opus` (a revalidação da C2 é por identidade NOVA, item 9(2)), `jurado-san312b-c3-opus`; e o orquestrador da sessão. Quem achou (C1/C3 do ciclo 1) não planeja nem desenvolve; quem planejou (eu) não desenvolve nem vota; quem desenvolve não vota (§C7.4-bis).
202-
203-**Ata do ciclo 2 registra:** por cadeira, se o voto foi refeito/revalidado e o comando que provou; quem ocupou cada papel; monocultura se as 3 rodarem em Opus; as quedas (P6); e a resposta às perguntas (a)(b)(c) para o ciclo 2.
dev-san312b-c2-f1-sol
dev-san312b-c2-f2-sol
dev-san312b-c2-f3-sol
dev-san312b-c2-f4-opus
dev-san312b-c2-f59-opus
adicionais: red-san312b-c2-sol e orquestrador
```

A S0 do objeto tem sincronizador disponível e os corpos especializados julgados existem na ref; a execução da S0 cabe ao inspetor em worktree descartável próprio, medido por: `cd C:/Users/AMP/w-san312b && test -f scripts/sync-agent-agents.mjs && echo 'sincronizador existe'; for f in jurado-san312b-c1-tela-e-fidelidade jurado-san312b-c2-cadeia-de-acesso jurado-san312b-c3-dinheiro-e-contrato; do test -f .claude/agents/especialistas/$f.md && test -f .agents/agents/especialistas/$f.md && echo "$f nos dois espelhos"; done`
```
sincronizador existe
jurado-san312b-c1-tela-e-fidelidade nos dois espelhos
jurado-san312b-c2-cadeia-de-acesso nos dois espelhos
jurado-san312b-c3-dinheiro-e-contrato nos dois espelhos
```

Recursos no instante da redação, sem invocar Docker nem banco: memória de commit livre e disco C; o redator para abaixo de 7,5 GB, medido por: `powershell.exe -NoProfile -Command '$o=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; [math]::Round(($o.CommitLimit-$o.CommittedBytes)/1GB,2)'; df -BG / | tail -1 | awk '{print "livre em C: " $4}'`
```
12,93
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

Você é `inspetor-san312b-c2-<executor>`, identidade nova, inspetor de terreno do ciclo 2; executor Claude Opus ou Codex GPT-5.6 Sol, nível menor declarado. Você NÃO vota mérito. Corpo canônico: `C:/Users/AMP/w-san312b/.claude/agents/inspetor-de-terreno-da-junta.md`, carregado do blob do objeto. Onde corpo e mandato divergirem sobre objeto, composição, inelegíveis, itens ou diretório, vale este mandato. Primeira linha de `inspetor-san312b-c2-evidencia.md`: executor, modelo, nível, objeto, mandato_md5 sem CR e corpo IDENTICO/DIVERGE EOL-neutro. Inelegíveis: todos os nomes do R- §4, todos os executores das RETOMADAS 1 a 9, `red-san312b-c2-sol`, os jurados do ciclo 1 e o orquestrador; coincidiu, PARE, derruba com: `head -1 C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/inspetor-san312b-c2-evidencia.md | grep -i -E 'executor|modelo|objeto|mandato|IDENTICO|DIVERGE'`

Item 1 de 3 — objeto, CI e árvore: confirme por gh pr view e ls-remote que o objeto continua o head do PR 469; backend, backend-postgres e frontend têm ao menos um check-run e todos os runs desses nomes estão completed/success; PR OPEN e mergeável; origin/main na merge-base e ancestral do objeto; worktree principal no objeto, sem mutação rastreada e sem merge em curso. Meça disco ≥7,5 GB e memória de commit ≥4 GB. Faça S0 em worktree descartável no objeto com `node scripts/sync-agent-agents.mjs --check`, comparação EOL-neutra e remova-o; qualquer falha BLOQUEIA. Não use Docker nem base viva, derruba com: `grep -i -E 'Item 1|gh pr view|ls-remote|backend-postgres|completed|success|mergeável|origin/main|status|7,5 GB|4 GB|S0|sync-agent-agents|remov' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/inspetor-san312b-c2-evidencia.md`

Item 2 de 3 — briefing, composição e identidade: confira no objeto o R- §4, a E2, RETOMADAS 1 a 9, votos e evidências C1/C2/C3 do ciclo 1, e os quatro mandatos PRE-VOO OK. Registre que não existem marcadores D-C2 no relatório e que os requisitos são R1 a R14 e D-1 a D-9; não fabrique norma. C1 e C3 são refeitas pela regra (3); C2 é revalidada pela regra (2), provada por `git diff --name-only <objeto>~13..<objeto>` cruzado com arquivos_medidos. Confira por nome que nenhum executor coincide com planejadores, críticos, devs, fábrica/redator, inspetor ou jurados do ciclo 1; C1 obrigatoriamente Claude. Compare corpo carregado e corpo julgado EOL-neutro, derruba com: `grep -i -E 'Item 2|R- §4|Emenda E2|RETOMADA 9|PRE-VOO OK|D-C2|R1|D-1|refeita|revalidada|objeto.~13|inelegível|C1.*Claude|EOL' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/inspetor-san312b-c2-evidencia.md`

Item 3 de 3 — isolamento e plano de perda: nomeie worktrees exclusivos `j12b-c2-c1r2-wt`, `j12b-c2-c2rev-wt` e `j12b-c2-c3r2-wt`, dependências próprias e zero junction; uma cadeira por vez; portas altas próprias; nenhuma base viva. C1 sem banco; C2 backend em memória; C3 usa CI como insumo e só cria recurso descartável se o mandato e recursos permitirem. Confirme que os diretórios de saída estão vazios fora dos mandatos e que cada cadeira nasce com evidência e voto-esqueleto, P1/P2/P3/P4/P7, queda em 00-quedas.md e sucessor de identidade nova. Declare ordem de disparo e limiares de disco: abaixo de 7,5 GB PARE. Parecer final `LIBERADO`, `LIBERADO COM RESSALVA` ou `BLOQUEADO`, com ressalvas numeradas; sem liberação nenhuma cadeira começa, derruba com: `grep -i -E 'Item 3|j12b-c2-c1r2-wt|j12b-c2-c2rev-wt|j12b-c2-c3r2-wt|junction|uma cadeira|porta|base viva|voto-esqueleto|P1|P7|00-quedas|7,5 GB|LIBERADO|BLOQUEADO' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/inspetor-san312b-c2-evidencia.md`

P1/P2/P3/P4/P7: após CADA item, apense comando, saída resumida e veredito parcial em `inspetor-san312b-c2-evidencia.md`; `inspetor-san312b-c2-parecer.md` nasce esqueleto com três itens EM APURAÇÃO e fecha antes da mensagem final de uma linha; sucessor reexecuta tudo registrado; máximo três itens; PAUSA grava head, feito, falta, próximo comando e arquivos parciais. Outputs somente no diretório do ciclo 2; nunca commit, derruba com: `test -f C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/inspetor-san312b-c2-parecer.md`

