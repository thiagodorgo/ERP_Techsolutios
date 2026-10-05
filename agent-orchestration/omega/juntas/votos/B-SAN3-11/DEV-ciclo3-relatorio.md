# DEV ciclo 3 — B-SAN3-11 (PR #401)

- **identidade:** `dev-ciclo3-b-san3-11`
- **modelo:** Codex GPT-5.6 Sol
- **papel:** desenvolvimento; não achou, não planejou e não revisa
- **ramo de destino:** `fix/dossie-versao-da-vistoria`
- **head inicial medido:** `31e7ebc4b1f1785b31a21234dd4974856d0882b0`
- **worktree CRLF:** `C:/Users/AMP/w-d11c3` (`core.autocrlf=true`, configuração por worktree)
- **worktree LF:** `C:/Users/AMP/w-d11c3-lf` (`core.autocrlf=false`, configuração por worktree)

## 2026-10-04T19:34:39Z — preparação e contrato

- Comando: `git fetch origin --prune`; resolução das refs local/remota e `git worktree list --porcelain`.
- Saída resumida: ramo local e remoto em `31e7ebc4`; ramo ocupado por `C:/Users/AMP/w-nuv11`, por isso ambos os terrenos próprios nasceram detached; árvore inicial limpa nos dois.
- Veredito parcial: terreno compatível com o mandato; publicação será somente `git push origin HEAD:fix/dossie-versao-da-vistoria`, sem force.
- Comando: leitura integral de `CLAUDE.md`, `AGENTS.md`, `PROJECT_MEMORY.md`, skill de auditoria e referências; leitura da seção 17, comando do bloco, ata e reprovação do ciclo 2.
- Saída resumida: C2c2-F1 e C2c2-F2 são os dois remédios prescritos; a decisão `D-GOV-PROPORCIONAL` já mergeada em `main` congela `Kpis/*` e substitui a junta completa deste PR por um revisor independente + CI verde.
- Veredito parcial: implementar sem julgar; não alterar `Kpis/*`; testes T23–T26 devem nascer antes do código e cada propriedade precisa de vermelho-controlado.

## Itens em apuração

- [x] integrar `origin/main` por merge e registrar o delta
- [x] instalar dependências próprias nos dois terrenos
- [x] baseline e falsificação da seção 17
- [x] testes T23/T24 antes do código + vermelho F1
- [ ] testes T25/T26 antes do código + vermelho F2
- [x] implementação F1
- [ ] implementação F2
- [ ] quatro mutações pós-verde, CRLF e LF
- [ ] bateria integral da seção 17, N e forma por TAP nos dois terrenos
- [ ] commits, push fast-forward e limpeza dos worktrees/processos

## 2026-10-04T19:36:33Z — integração da `main`

- Comando: `git merge --no-ff --no-commit origin/main`; resolução manual dos conflitos de registro; `git diff --cached --check`; `git commit -m "chore(san3): merge main governance into cycle 3"`.
- Saída resumida: merge `f1329cda72e8d4890043fb5800d4d86ddfd7cbff` integra `357a98e9663b972ddcbe73c0422e948cc347e44a`; conflitos somente em `agent-orchestration/codex/log-execucao.md` e `agent-orchestration/docs/status-geral.md`, resolvidos preservando as duas histórias. A `main` trouxe seu backfill já mergeado de `Kpis/kpis-history.md`; nenhum `Kpis/*` foi editado pelo ciclo 3.
- Veredito parcial: código, testes e contrato do B-SAN3-11 permaneceram intactos; `D-GOV-PROPORCIONAL` está no head integrado.

## 2026-10-04T19:37:30Z — dependências próprias

- Comando: `npm ci --no-audit --no-fund` na raiz e `npm --prefix frontend ci --no-audit --no-fund` em cada worktree.
- Saída resumida: em cada terreno, raiz `326` pacotes e frontend `103` pacotes; `node_modules` próprios, sem junction/symlink. Aviso não bloqueante já existente: `@prisma/streams-local` declara Node `>=22`, enquanto a máquina usa Node `20.19.5`.
- Veredito parcial: os dois terrenos estão prontos e isolados; base viva PostgreSQL/Redis não foi acessada.

## 2026-10-04T19:39:49Z — baseline e falsificação da seção 17

- Comando em CRLF e LF: `timeout 600 npm --prefix frontend run check`; `timeout 1200 node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx`; `TS_ROOT=./frontend timeout 300 node scripts/san3-11-dossie-vistoria-censo.mjs .`.
- Saída resumida CRLF: `check ec=0`; TAP `1..24`, `pass 24`, `fail 0`, `cancelled 0`, `duration_ms 67253.1534`; censo `ec=0`, `L0/L1/L2=12/12/12`, `L3=2`, `L4=3`, `pontos sem consulta=0`, `receptor desconhecido=0`, `3233 ms`.
- Saída resumida LF: `check ec=0`; TAP `1..24`, `pass 24`, `fail 0`, `cancelled 0`, `duration_ms 61280.7196`; censo `ec=0`, `L0/L1/L2=12/12/12`, `L3=2`, `L4=3`, `pontos sem consulta=0`, `receptor desconhecido=0`, `4031 ms`.
- Veredito parcial: a medição não falsificou a seção 17; baseline nominal reproduzido nos dois EOLs. Árvores limpas fora do relatório novo.

## QUEDA 2026-10-04T19:39Z — limite de uso OpenAI

- Estado no corte: o comando de baseline havia terminado verde nos dois terrenos, mas a seção acima ainda não tinha sido persistida no relatório.
- Custo do redo: somente re-medição do estado; nenhum comando de escrita, mutação ou teste T23–T26 tinha começado.
- Próximo comando exato: inspecionar `frontend/tests/patios-dossie-versao.smoke.test.tsx`, `scripts/san3-11-dossie-vistoria-censo.mjs` e `frontend/src/modules/patios/processes/useProcessChecklistRuns.ts` no head `f1329cda` antes de escrever T23/T24.
- Arquivos meio-escritos: nenhum; somente este relatório novo estava untracked.

## 2026-10-04T23:34:49Z — retomada da mesma instância

- Comando: resolução de `origin/main`, refs local/remota do ramo, heads/status/config EOL dos dois worktrees, presença dos dois `node_modules`, commit local, relatório e processos com caminho dos worktrees.
- Saída resumida: ramo local/remoto continua em `31e7ebc4`; CRLF e LF continuam detached em `f1329cda`; CRLF tem apenas este relatório novo e LF está limpa; dependências próprias presentes; nenhum processo Node/npm/Vite dos terrenos ficou vivo (o único match era o `pwsh` da própria medição).
- Veredito parcial: estado preservado e compatível com continuação; nenhuma evidência anterior foi promovida sem re-medição.

## 2026-10-04T23:41:02Z — testes T23/T24 antes do código (vermelho F1)

- Comando: adicionar T23/T24 somente em `frontend/tests/patios-dossie-versao.smoke.test.tsx`; `timeout 1200 node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx`.
- Saída resumida: TAP `1..26`, `pass 24`, `fail 2`, `cancelled 0`, `duration_ms 90714.8039`, `ec=1`. T23 vermelho porque a saída omitiu `run["status"]` e publicou somente os 2 pontos antigos; T24 vermelho porque, com L3/L4 esvaziados, a saída publicou `L3 pontos=0`, `L4 consumidores=0`, mas nenhum diagnóstico explícito e `VEREDITO ... pontos sem consulta=0`.
- Comando de precisão após ajustar a mutação T24 para preservar compilação por aliases/desestruturação: `timeout 300 node --test --import tsx --test-name-pattern="T24:" tests/patios-dossie-versao.smoke.test.tsx`.
- Saída resumida: T24 único executado `fail 1`, `skipped 25`, `ec=1`; o censo mediu efetivamente `L3 pontos=0` e `L4 consumidores=0`, mas continuou sem `L3 VAZIO: SIM`/`L4 VAZIO: SIM` e sem exit vermelho próprio.
- Veredito parcial: os dois critérios novos estão vermelhos pelos motivos nominais antes de qualquer mudança no gerador; a seção 17 segue reproduzida, não falsificada.

## 2026-10-04T23:43:16Z — implementação F1 e verde dirigido

- Comando: alteração exclusiva de `scripts/san3-11-dossie-vistoria-censo.mjs`; execução de T12/T23/T24, censo nominal e `npm --prefix frontend run check`, todos sob timeout externo.
- Saída resumida: TAP dirigido `tests 26`, `pass 3`, `fail 0`, `skipped 23`, `duration_ms 23516.3509`; censo nominal `ec=0`, `L0/L1/L2=12/12/12`, `L3=2`, `L4=3`, desconhecidos/L3 vazio/L4 vazio todos `0`, `3354 ms`; TypeScript `ec=0`.
- Veredito parcial: classificador único reconhece `run.status` e `run["status"]` pelo checker por baixo de casts; candidato desconhecido e conjuntos L3/L4 vazios agora entram separadamente no total vermelho; baseline 2/3 preservado, sem allowlist de nomes de variável.

## 2026-10-04T23:56Z — CONTINUAÇÃO NO CLAUDE CODE (instância nova; a do Codex caiu às 23:47Z por cota semanal)

- **identidade:** `dev-ciclo3-b-san3-11` (mesma identidade de papel, instância nova) · **modelo:** Claude **Opus 5.5** (decisão do dono: Claude em Opus; Fable e Astra suspensos até o reset semanal) · não achou, não planejou, não revisa.
- **Regra em vigor:** `D-GOV-PROPORCIONAL` (CLAUDE.md §C7 item 8, presente no head integrado `f1329cda`, l.611–652): o #401 passa à regra (1) — um revisor independente + CI verde, sem nova junta; (5) KPI congelado, PR nenhum atualiza `Kpis/*`. Isso **supera** o §17.4.7 (KPI recontado) e a parte KPI do §17.4.3/§17.4.6 do plano; o resto da §17 (F1/F2, testes antes do código, mutações, bateria nos dois terrenos) continua sendo o mandato.

### O que conferi da instância anterior (P3: medido, não herdado)

- Comando: `git status --short`; `git log --oneline -5`; `git rev-parse HEAD`; `git fetch origin fix/dossie-versao-da-vistoria main`; `git worktree list`.
- Saída: `w-d11c3` detached em `eec4a24a` (sobre `f1329cda`, sobre `31e7ebc4` + `357a98e9`); remoto do ramo `31e7ebc4`, `origin/main` `357a98e9`; `w-d11c3-lf` detached em `f1329cda`; único arquivo modificado não commitado: `frontend/tests/patios-dossie-versao.smoke.test.tsx`.
- Comando: `git diff | cmp - /c/Users/AMP/erp-pausa-2026-10-03/w-d11c3-nao-commitado-2347.diff`. Saída: **IDENTICAL** (204 linhas) — o não commitado é exatamente a cópia de segurança.
- Comando: `git diff --stat 357a98e9 f1329cda` e `git diff 31e7ebc4 f1329cda -- agent-orchestration/codex/log-execucao.md`. Saída: o merge integra a main sem tocar produto do bloco; as duas histórias preservadas em `status-geral.md`/`log-execucao.md`, **com um defeito cosmético**: a resolução apagou a linha em branco antes de `---` em `log-execucao.md` (l.~4785), o que em Markdown transforma o parágrafo anterior num título setext. Corrijo no commit de registro.
- Comando: `git diff --stat 357a98e9 eec4a24a -- Kpis`. Saída: o ramo carrega `Kpis/app.js` (1 linha), `kpis-history.json` (+15), `kpis-history.md` (+30), `kpis-latest.json` (36) dos ciclos 1–2. Pela ordem (KPI congelado), devolvo `Kpis/*` ao conteúdo da `origin/main` num commit próprio.
- **Achado sobre o T25/T26 não commitado (rascunho do Codex, nunca executado — não há entrada de execução dele no relatório):** os dois casos importam `@playwright/test` e lançam Chromium dentro de um smoke do frontend. `@playwright/test` existe **só** no `package.json` da raiz (l.52), não no `frontend/package.json`; o job `frontend` do CI (`.github/workflows/ci.yml` l.280–303) roda **apenas** `npm --prefix frontend ci` e `test:smoke` (que inclui este arquivo) — logo, no CI o import falharia e o job ficaria vermelho; localmente "passaria" por resolução ao `node_modules` da raiz. É também dependência nova de fato para o frontend (decisão crítica, §C7.1) e contraria o precedente do repo (`frontend/tests/work-orders-page-live.test.tsx`, contrato (a): "ZERO dependência nova — o DOM mínimo é escrito aqui mesmo"). **Não é falsificação da §17** (que pede "fluxo real service/hook/painel", sem prescrever navegador): reescrevo T25/T26 com DOM mínimo + `react-dom/client` + `React.act`, sem dependência nova.

## 2026-10-05T00:05Z — F1 conferido no `eec4a24a` e achado: o remédio literal ainda é fail-open por outras grafias da MESMA propriedade

- Comando: `TS_ROOT=./frontend timeout 300 node scripts/san3-11-dossie-vistoria-censo.mjs .` no `eec4a24a`. Saída: `ec=0`; L0/L1/L2 `12/12/12`; L3 `2` (`ChecklistRunsPanel.tsx:171`, `:174`); L4 `3`; desconhecidos/L3 vazio/L4 vazio `0`. Reproduz o que a instância anterior registrou às 23:43Z.
- Leitura do `eec4a24a`: o classificador reconhece `x.status` e `x["status"]` (literal), mas (i) a chave por índice só por **literal sintático** (`run[chave]` com `const chave = "status" as const` escapa); (ii) a identidade do ponto é a **linha**, com o primeiro nó visitado vencendo — um ponto sem decisão na mesma linha de um guardado fica mascarado (no head, a l.174 já tem dois pontos, tom e rótulo, contados como um); (iii) o helper é reconhecido pelo **texto** do chamado — um alias de import (`as rotulo`) escapa; (iv) `status` **desestruturado** (`({ status }) =>`, `{ status: situacao }`) não é reconhecido; (v) `const s = run.status` fora do JSX e `{s}` dentro escapa. O próprio T24 do Codex usou (iii)+(iv) para esvaziar L3 — ou seja, esvaziar UM só dos dois pontos assim daria L3=1 e verde.
- **Não é falsificação da §17**: a P-F1a do plano é "toda apresentação … inclusive … argumento dos helpers e qualquer candidato que o checker não consiga classificar — nasce negada", e o remédio é "classificador único dirigido pelo checker". O que o `eec4a24a` fez é a forma mínima do remédio; completo-o pelo checker (sem lista de nomes de variável).
- **Teste antes do código (T23 ampliado, mesma propriedade, mesmo caso):** variantes V1 (a do plano, `run["status"]`) + V2 chave const de tipo literal + V3 mesma linha de um guardado + V4 helper por alias + desestruturação + V5 desestruturação renomeada + V6 const local fora do JSX; cada uma em cópia própria, inserida num fragmento ao lado do painel em `DossiePrintDocument` (o T23 do Codex inseria `{…}` como irmão dentro de `( … )`, o que não é JSX válido — a §17 pede "apresentação compilável").
- Comando: `timeout 600 node --test --import tsx --test-name-pattern="T23:" tests/patios-dossie-versao.smoke.test.tsx` contra o gerador do `eec4a24a`. Saída: `tests 28 · pass 0 · fail 1 · skipped 27`, `ec=1`, 67 s; mensagem nominal: `escaparam: V2 … (exit 0; linha nominal NÃO AUSENTE) · V3 … · V4 … · V5 … · V6 …` — V1 já pega; **V2–V6 saem com exit 0** (fail-open).
- Veredito parcial: vermelho pelo motivo nominal antes do código.

## 2026-10-05T00:13Z — F1 completado pelo checker; verde dirigido; compilação das mutações provada

- Mudança (só `scripts/san3-11-dossie-vistoria-censo.mjs`): `statusReceiver` (sintático) → `statusOrigin` (pelo checker): `x.status`/`x?.status`, `x["status"]`, `x[k]` com `k` de **tipo literal** `"status"`, `status` **desestruturado** (inclusive renomeado e em parâmetro; o nome que declara não é uso), **const local** cujo inicializador é uma dessas (profundidade ≤5); helper reconhecido pelo **símbolo** (alias de import e const que o reapelida resolvidos via `getAliasedSymbol`), mantido o reconhecimento pelo texto; invólucros (`as`/`!`/parênteses) não contam como nó próprio (o de dentro é visitado). O ponto continua sendo a **linha**, mas com mais de um candidato na mesma linha vale o **pior** (desconhecido / sem decisão), nunca o primeiro visitado. Nenhuma lista de nomes de variável.
- Comando: censo no head. Saída: `ec=0`, `12/12/12`, L3 `2` (171, 174), L4 `3`, desconhecido/L3 vazio/L4 vazio `0` — **head inalterado (2/3)**, como a §17.2 exige.
- Comando: `node --test … --test-name-pattern="^T(12|2[0-4]):"`. Saída: `tests 28 · pass 5 · fail 1`: T12, T20, T21, T22, **T23 verdes**; **T24 (mutação do Codex) vermelho** com `L3 vazio deve ter diagnóstico próprio` — prova de que alias + desestruturação deixaram de esvaziar L3. T24 reescrito: L3 vazio de verdade = as apresentações saem (texto fixo compilável `"—"`/`"default"`); L4 vazio inalterado (alias do painel nos 3 consumidores). Comando `--test-name-pattern="^T24:"` → `pass 1 · fail 0`, `ec=0`.
- Compilação (a §17 pede mutação compilável): `node compile-mut.mjs apply` aplica **in place** T23 V1–V6 (em `DossiePrintDocument`) + T24-L3 (em `ChecklistRunsPanel`), com prova de aplicação; `timeout 600 npm --prefix frontend run check` → **`ec=0`**; censo → `pontos sem consulta=1` (as 6 variantes na mesma linha física = 1 ponto, o pior), `ec=1`; restauração por cópia e `git hash-object` = blob do head nos dois arquivos (`DossiePrintDocument 0345888e…`, `ChecklistRunsPanel d8a4269b…`).
- O rascunho T25/T26 do Codex (Playwright) foi retirado do arquivo antes deste commit (cópia em `erp-pausa-2026-10-03/w-d11c3-nao-commitado-2347.diff`); T25/T26 entram reescritos no commit do F2.
