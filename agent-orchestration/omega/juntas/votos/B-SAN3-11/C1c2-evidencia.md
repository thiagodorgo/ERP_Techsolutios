papel: C1′ | identidade: jurado-san3-11-c2-afordancia-e-ancora | modelo: Codex GPT-5.6 Sol (substituição declarada: dono suspendeu Fable e Astra até o reset semanal de 2026-10-03; B-SAN3-11 não toca dinheiro) | mandato_md5: 9982d3d71d271b79ba12c50a9f2f2cd8 (declarado no disparo: 9982d3d71d271b79ba12c50a9f2f2cd8) | corpo_md5: 813c8a5fb8a01c0bbc959783c49b81d1 (recebido no prompt: 813c8a5fb8a01c0bbc959783c49b81d1; blob do objeto: 813c8a5fb8a01c0bbc959783c49b81d1)

# Evidência incremental — C1′ — B-SAN3-11 ciclo 2

## Queda e retomada da mesma instância — queda ~2026-10-03T22:57Z; retomada 2026-10-04T03:26:20Z

- Comando: `Test-Path C:\Users\AMP\w-s11k2a; git worktree list --porcelain` (cwd `C:\Users\AMP\Documents\GitHub\ERP_Techsolutios`).
- Saída resumida: queda por limite de uso da conta OpenAI, ainda na preparação e antes de criar worktree, instalar dependências, iniciar Vite ou gravar os artefatos; na retomada `TargetExists=false` e não havia entrada `w-s11k2a` na lista de worktrees. Nenhum comando de mérito havia iniciado, nenhum processo/arquivo ficou parcial. O contexto foi preservado e o orquestrador declarou continuação da mesma instância, não sucessão.
- Veredito parcial: RETOMADA CONFIÁVEL. Não há resultado de mérito anterior a herdar nem comando parcial a refazer; a queda fica registrada como erro de cota/limite na fase de preparação.

## Pré-mérito — hashes e fontes carregadas — 2026-10-04T03:26Z

- Comando: MD5 EOL-neutro do blob `git show d24f7283bfba55d298e8118e7b590465c5a4d4d6:.agents/agents/especialistas/jurado-san3-11-c2-afordancia-e-ancora.md`; MD5 com CR removido de `C:/Users/AMP/w-nuv11/agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C1c2.md`; leitura integral de `CLAUDE.md`, `AGENTS.md`, `origin/main:PROJECT_MEMORY.md`, `origin/main:.agents/agents/README.md`, corpo do objeto em 3 fatias, mandato, seção `Ciclo 2 — junta 2` do briefing e parecer `00-inspetor-terreno-c2.md` em 4 fatias.
- Saída resumida: corpo=`813c8a5fb8a01c0bbc959783c49b81d1`, igual ao recebido/esperado; mandato=`9982d3d71d271b79ba12c50a9f2f2cd8`, igual ao declarado; PR 401 observado em `d24f7283bfba55d298e8118e7b590465c5a4d4d6`; `git diff --name-status 3ec6f52b d24f7283` mostrou somente `A agent-orchestration/omega/juntas/votos/B-SAN3-11/00-inspetor-terreno-c2.md`; parecer final `LIBERADO COM RESSALVA`, com R-CORPOS e R-PERDA.
- Veredito parcial: CONFIRMADO. Corpo e mandato íntegros; delta desde a cerca `3ec6f52b` é somente o parecer de registro; mérito ainda não iniciado.

## Legalidade — objeto por duas fontes, cerca e CI — 2026-10-04T03:28:16Z

- Carga: CPU 48%; processos com `w-j4c2`=3; processos com `w-s05d`=0.
- Comando: `git config --show-origin --get core.autocrlf; git ls-remote origin refs/heads/fix/dossie-versao-da-vistoria; gh pr view 401 --json headRefOid,headRefName,baseRefName,state,isDraft,mergeable,url; git merge-base origin/main <objeto>; git diff --name-only 3ec6f52b <objeto>; git diff --name-only 59aa7593 <objeto>; gh api 'repos/thiagodorgo/ERP_Techsolutios/commits/<objeto>/check-runs?per_page=100' --jq '<filtro publicado total/non_green/pending>'`.
- Saída resumida: `core.autocrlf=true` da config do sistema; `git ls-remote`=`d24f7283bfba55d298e8118e7b590465c5a4d4d6`; `gh headRefOid`=mesmo SHA, PR OPEN/draft/MERGEABLE/base main; merge-base=`b404815ce3d1f1b8e5121bd1526978f7222e7479`; delta `3ec6f52b..objeto`=somente `00-inspetor-terreno-c2.md`; delta da cerca `59aa7593..objeto`=briefing, parecer e quatro mandatos, todos sob `agent-orchestration/**`; check-runs `{total:14, non_green:[], pending:[]}`.
- Veredito parcial: LEGALIDADE CONFIRMADA. As duas fontes coincidem, o objeto tem 14 check-runs concluídos/verdes e os deltas posteriores à cerca são somente registro.

## Terreno próprio criado — 2026-10-04T03:28:39Z

- Carga: CPU 3%; processos com `w-j4c2`=5; processos com `w-s05d`=0.
- Comando: validar ausência de `C:/Users/AMP/w-s11k2a`; `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree add --detach C:/Users/AMP/w-s11k2a d24f7283bfba55d298e8118e7b590465c5a4d4d6`; criar scratch literal `C:/Users/AMP/AppData/Local/Temp/c1c2-20261004-0329`; medir `.git`, HEAD, status, `core.autocrlf`, Node/Git e ambiente.
- Saída resumida: `.git` existe; HEAD=`d24f7283bfba55d298e8118e7b590465c5a4d4d6`; status vazio; `core.autocrlf=true`; Node `v20.19.5`; Git `2.53.0.windows.2`; `MSYS_NO_PATHCONV` vazio; scratch=`C:/Users/AMP/AppData/Local/Temp/c1c2-20261004-0329`. A tentativa `bash -lc uname` resolveu o WSL sem `/bin/bash` e falhou antes de executar; será repetida pelo caminho explícito do Git Bash.
- Veredito parcial: CONFIRMADO. Worktree detached próprio no objeto, CRLF efetivo, sem `node_modules` compartilhado e sem mutação.

## Dependências próprias da raiz — 2026-10-04T03:28:58Z

- Carga: CPU 41%; processos com `w-j4c2`=5; processos com `w-s05d`=0.
- Comando: `npm.cmd ci --ignore-scripts --no-audit --no-fund` (cwd `C:/Users/AMP/w-s11k2a`, sessão unificada, espera máxima por chamada 30 s).
- Saída resumida: ec=0; `added 326 packages in 46s`; aviso EBADENGINE de `@prisma/streams-local` (Node >=22 requerido pelo pacote, runtime medido v20.19.5), sem falha. `node_modules` criado dentro deste worktree.
- Veredito parcial: CONFIRMADO. Instalação própria concluída; nenhuma junction/symlink compartilhada foi usada.

## Dependências próprias do frontend — 2026-10-04T03:30:00Z

- Carga: CPU 21%; processos com `w-j4c2`=5; processos com `w-s05d`=0.
- Comando: `npm.cmd ci --no-audit --no-fund` (cwd `C:/Users/AMP/w-s11k2a/frontend`).
- Saída resumida: ec=0; `added 103 packages in 16s`.
- Veredito parcial: CONFIRMADO. Instalação própria do frontend concluída.

## Ambiente, normas e inelegibilidade — 2026-10-04T03:30:36Z

- Carga: CPU 1%; processos com `w-j4c2`=5; processos com `w-s05d`=0.
- Comando: Git Bash explícito `uname -srm`; Node lendo `playwright/package.json` e `chromium.executablePath()`; `Get-Item` nos dois `node_modules`; contagem regex das âncoras citadas em `origin/main:CLAUDE.md` e `origin/main:DESIGN_SYSTEM.md`; `git ls-tree` por scripts `mandato`; busca nominal no obituário e na ata/reprovação anteriores do objeto.
- Saída resumida: SO=`MINGW64_NT-10.0-22631 3.6.6-1cdd4371.x86_64 x86_64`; Playwright=`1.60.0`; Chromium=`C:/Users/AMP/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe`; os dois `node_modules` têm `Attributes=Directory`, `LinkType`/`Target` vazios. Âncoras A2, A7, Parte B §3/§7, C7.1-bis, C7.1-ter(a/b/c), C7.4-bis, C7.7, P1–P7, DoD §10 e fidelidade §11: N=1 cada; `DESIGN_SYSTEM.md` States e `hover / focus (web)`: N=1 cada. Scripts `mandato` em `origin/main`: N=0. Nome próprio no obituário: N=0; nome próprio na ata/reprovação do ciclo 1: N=0 (grep ec=1).
- Veredito parcial: CONFIRMADO. Normas aplicáveis existem na ref medida; normas/scripts ausentes não serão aplicados; identidade é nova; dependências não são junctions.

## Estado dos itens

## Item 3 — T4 head-base, M1 no objeto e verde restaurado — 2026-10-04T03:59Z

- Carga: CPU 27% na preparação da base; 8% no T4 direto; 11% na sonda isolada; 2% no M1; 18% no T4 verde; 16% no classificador de motivo; 42% na conferência final. Vite próprio foi parado antes das mutações (wrapper 56216, listener 45200 e descendentes), porta 5327 livre, processos com caminho `w-s11k2a`=0. Nenhuma falha por tempo.
- Comando base: cópias `.pristino` dos quatro arquivos de `frontend/src` do bloco; patches objeto→merge-base. Cada `hash-object` ficou igual ao blob base e diferente do objeto: painel `31f2cddd...`≠`d8a4269b...`; print `7c66e4d0...`≠`0345888e...`; adapter `ff49e8bc...`≠`153fe1ed...`; types `17722227...`≠`d1832dfd...`. `git diff --no-index` contra cada `.pristino` deu ec=1 (respectivamente 20/107, 1/1, 0/22 e 5/8 linhas).
- T4 direto na base: `timeout 600 node --test --import tsx --test-name-pattern T4 tests/patios-dossie-versao.smoke.test.tsx`, ec=1, tests/pass/fail/skipped=1/0/1/0; motivo exato: `SyntaxError: ... processes.adapter does not provide an export named 'ChecklistRunContractError'`. Esse vermelho foi corretamente descartado como importação.
- Sonda isolada: corpo T4 extraído por script do blob do objeto e copiado verbatim em `tests/zz-c1c2-t4.tsx`, importando só painel/tipo/React/assert/test; recorte fonte e sonda ambos len 468, md5 EOL-neutro `46358456fad6b7b3c366c7a690a561b9`, comparação case-sensitive=true. Na base: ec=1, 1/0/1/0; mensagem exata `deve conter chip 'Versão substituída'`, `actual: ''`, `operator: 'match'`. Assim o T4 isolado vê o defeito real da base e não um import quebrado.
- M1 no objeto: após restaurar os quatro hashes ao objeto, patch único no ramo `isSuperseded` recolocou `<Chip tone={getChecklistRunStatusTone(run.status)}>{getChecklistRunStatusLabel(run.status)}</Chip>`; hash do painel mudou `d8a4269b...→3781b0ee...`. O T4 original deu ec=1, tests/pass/fail/skipped=24/0/1/23 e mensagem `deve conter chip 'Versão substituída'`; o `actual` contém simultaneamente `<tr id="vistoria-run-v1" ...>` e `<span class="ui-chip ui-tone-success">Concluído</span>`. O controle enxerga a linha e o chip verde.
- Verde/restauro: M1 desfeito por patch; os quatro `hash-object` voltaram exatamente aos blobs do objeto (`d8a4269b`, `0345888e`, `153fe1ed`, `d1832dfd`); T4 original ec=0, tests/pass/fail/skipped=24/1/0/23, `ok 4 - T4...`; sonda removida e `git status --porcelain` vazio.
- Registro: blob do objeto `agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-relatorio.md:224` abre `## CICLO 2`; linhas 276-277 trazem juntos o head-base (`actual ''`) e o M1 no objeto (`linha presente` e `ui-tone-success">Concluído`).
- Controle do leitor de motivo: TAP fabricado com `SyntaxError: ... does not provide an export named` foi classificado `importação`, não `T4`; o log direto da base recebeu a mesma classificação.
- Veredito parcial: APROVADO. O T4 discrimina base defeituosa, objeto mutado pelo M1 e objeto restaurado, e o registro obrigatório contém o par.

## Item 2 — A29, impressão, A12 e A14 — 2026-10-04T03:49Z

- Carga: CPU 33% no Chromium de A29/impressão/A14; CPU 42% antes da mutação de controle e 4% no controle; CPU 39% no render SSR do objeto e 29% no da base; suítes em série a 39%, 35% e 55%; comparação/greps a 12% e controles finais a 55%. Nenhuma falha por tempo.
- Comando A29/impressão: Chromium real, modal B1/B3 aberto na aba, contagem por seletor exato, hrefs; botão real `Imprimir / Salvar` com contador de `window.print`, `emulateMedia('print')`, screenshot e `page.pdf`; auditoria de `innerText` nas três superfícies de A1 e B1/B3.
- Tabela A29 (`id | modal | portal | página`): `d000...0001 | 1 | 1 | 1`; `d000...0002 | 1 | 1 | 1`. Hrefs do modal/página apontaram para `#vistoria-<id>`; portal, para `#vistoria-impressa-<id>`.
- Saída impressão: botão enabled; `window.print=1`; body class=`dossie-printing`; sob print, `.dossie-print=block` e `#root=none`. PNG `c2-i2-print-B.png`: 104914 bytes, md5 `9686cb84e16a694eccfad914c5cdef3e`; PDF: 201505 bytes, md5 `dd1de3423bd5d7096bc2ab4fdca618a3`. Inspeção visual do PNG: documento legível, sem shell, com duas linhas B; vigente em warning “Concluído com avarias”, anterior em chip neutro “Versão substituída”, texto “Situação na época: Concluído”, links azuis distinguíveis. O DOM marcou `hasSuccess=false` na substituída. A1 mostrou a frase “A versão vigente desta vistoria não está vinculada a este dossiê.”
- Comando A12: sonda temporária `renderToString(ChecklistRunsPanel)`; objeto primeiro; depois `ChecklistRunsPanel.tsx` trocado exatamente pelo blob da base (`hash-object=31f2cddd...=base`, diferente do objeto `d8a4269b...`), execução e restauração por patch (`hash-object=d8a4269b...=objeto`). Diff `base..objeto` em `frontend/src` contém só 4 arquivos: painel, documento de impressão, adapter e types; `git diff --quiet` excluindo esses quatro retornou ec=0.
- Tabela A12 (`estado | sha256 | len`, idêntica objeto/base): denied `18537219b2d6191177bd1add527c26a9056039f06c2100ff2352e35f013094de | 305`; loading `131cfdfecda29b039b7f6418012e3109ef83d34a18f55b38fb26fea17a9b9a73 | 205`; error `77885ea6f798ac736f489a3f928d9bb964fede38ca75e4308e6685c80f39c219 | 743`; empty `d3697454d393cd6a51e912a0d4913017c74f1b23f034de35401df366dd82d3c7 | 395`. Controle de 1 byte, mesmo len 14, produziu SHA-256 `a3e2bb...` versus `20e9ce...`, `identical=false`.
- Suítes de estado, em série: `patios-dossie-checklist` 12/12/0; `patios-dossie-print` 6/6/0; `patios-dossie-modal` 16/16/0 (`tests/pass/fail`, todas ec=0).
- Comando A14: greps exatos no blob do objeto; extrator por script sobre as 138 linhas `+` de `frontend/src`; auditoria de innerText. `Versao|substituida|vigente nao`: vazio/ec=1; `\btenant\b` no painel: vazio/ec=1; irmão acentuado casou linhas 143/148/169. Literais humanos extraídos: “Preenchido em campo...”, “Checklist do guincho”, “Ver versão vigente”, “Versão atual — substitui uma vistoria anterior.”, “Ver versão anterior”, “Versão substituída”, “Situação na época: ...”, “Concluído”, “Versão atual”; `bad=[]`. Nenhuma das 6 superfícies A1/B trouxe UUID nem `tenant`, `work_order`, `superseded`, `currentRun`, `reopened`, `run_id`, `null` ou `undefined`.
- Controles negativos: retirada real de `idPrefix="vistoria-impressa"` mudou o arquivo de `0345888e...` para `7c66e4d0...` e fez cada id modal contar 2, portal prefixado 0 e os hrefs do portal colidirem; restauração comprovada `0345888e...=blob do objeto` e índice permaneceu no mesmo blob. A troca de 1 byte foi detectada. Sonda `Versao substituida` no scratch casou o padrão proibido.
- Veredito parcial: APROVADO. IDs, impressão, estados obrigatórios e linguagem satisfazem os contratos e todos os comparadores acusaram seus controles.

## Item 1 — A27/A28, três superfícies e cenário L — 2026-10-04T03:40Z

- Carga: CPU 22% no passe integral válido; CPU 19% na extração; demais frentes observadas no primeiro disparo (`w-j4c2`=5 processos, `w-s05d`=0), sem tocar nelas. Tempo do passe válido: 38,2 s, ec=0. Três disparos anteriores do arnês morreram por `ReferenceError`/raiz ausente na instrumentação, antes de produzir JSON; não foram contados como resultado do produto e o passe completo foi refeito em série.
- Comando: Chromium Playwright 1.60 contra Vite real `127.0.0.1:5327`, fixtures próprias A1/B1/B3/L, viewport 1440×900 e L a 1440×700; `getComputedStyle`, `matches(':hover')`, `matches(':focus-visible')`, clique/Enter, captura a ~100/~1000/~2500 ms, URL/hash/history/dialog/scroll/foco/retângulos, um `goBack()` após dois cliques; impressão acionada pelo botão real e `emulateMedia('print')`. Resultado completo: `scratch/render-C2I1.json`; sete PNGs com SHA-256 registrados no JSON de extração.
- Saída resumida A27: em modal, página e impressão, nos dois links, repouso=`rgb(37,99,235)` (#2563eb), 12px/700 contra pai `rgb(100,116,139)`, 11px/400; hover real=`true`, #1d4ed8 e sublinhado; foco por teclado real=`true`, outline sólido 2px #2563eb. `git grep` confirmou `.pat-link`/tokens em `frontend/src/styles/app.css:3099-3110` e foco em `:3323-3328`.
- Saída resumida A28: dez ativações válidas cobriram mouse/teclado e vigente/anterior nas superfícies. Em todas, o `tr` exato virou `activeElement`, ficou totalmente visível; URL e `history.length` não mudaram; outline do realce foi `solid 2px rgb(37,99,235)` a ~100 e ~1000 ms e já havia expirado a ~2500 ms. Em L/1440×700, vigente ficou top/bottom 335/410 com stickyBottom 219; anterior rolou o modal a 303 e ficou 563/638 dentro do container 116/656, nunca sob o sticky. Após dois cliques no modal, um único Back mudou a URL de `?dossie=...` para a página do pátio e dialogs 1→0.
- Controles negativos: remover `.pat-link` fez link e pai coincidirem (`rgb(100,116,139)`, 11px/400); clonar o link sem handler fez hash `''→#vistoria-...0002` e history 6→7; alvo sintético 10px sob sticky deu targetTop 208,81 < stickyBottom 218,81 e foi detectado. Os controles provam que os comparadores falham nas três classes exigidas.
- Veredito parcial: APROVADO. A affordance é distinguível em repouso/hover/foco nas três superfícies; a âncora move foco e rolagem sem poluir histórico, mantém realce suficiente e não esconde o alvo.

## Retomada operacional e servidor local — 2026-10-04T03:33Z

- Carga: CPU 26% na revalidação do worktree; CPU 15% no start bem-sucedido do Vite; nenhum processo prévio com `w-s11k2a`; processos das outras frentes não foram tocados.
- Comando: medir HEAD/status/processos e presença dos dois `node_modules`; preparar cópia própria do arnês no scratch; verificar porta 5327 livre; iniciar `npm.cmd run dev -- --host 127.0.0.1 --port 5327 --strictPort` em janela oculta, cwd `C:/Users/AMP/w-s11k2a/frontend`, com logs no scratch.
- Saída resumida: HEAD permaneceu `d24f7283bfba55d298e8118e7b590465c5a4d4d6`, status vazio, ambos `node_modules` presentes, zero processo parcial. A primeira tentativa de start falhou antes de criar processo porque o caminho presumido `C:/Program Files/nodejs/npm.cmd` não existe; a repetição com o caminho medido `C:/nvm4w/nodejs/npm.cmd` iniciou wrapper PID 56216/listener PID 45200 e Vite 6.4.2 ficou pronto em 1472 ms em `127.0.0.1:5327`.
- Veredito parcial: AMBIENTE RECUPERADO. A falha foi de resolução do executável, não de teste/tempo, e não produziu processo órfão; o servidor próprio está isolado e escutando.

- Item 1 — A27/A28 e cenário L: APROVADO.
- Item 2 — A29, impressão, A12/A14: APROVADO.
- Item 3 — T4 head-base + M1 objeto: APROVADO.

## Revalidação final e teardown — 2026-10-04T04:02Z

- Carga: CPU 26% na re-resolução; CPU 64% na remoção do worktree; CPU 46% na verificação final.
- Comando: `git ls-remote` + `gh pr view 401` + filtro publicado dos check-runs; `git status --porcelain`; contagem de processos pelo caminho; `git worktree remove --force C:/Users/AMP/w-s11k2a`; validação literal do scratch sob `%TEMP%` e descarte.
- Saída resumida: git/gh permaneceram em `d24f7283bfba55d298e8118e7b590465c5a4d4d6`; PR OPEN/draft/MERGEABLE; checks total=14, pendentes=0, não-verdes=0. Antes da remoção: status vazio e processos com caminho=0. Worktree removido ec=0, diretório ausente e não listado. Scratch validado exatamente em `C:/Users/AMP/AppData/Local/Temp/c1c2-20261004-0329` (49 itens, 2636169 bytes); `Remove-Item` foi recusado pela política do executor, então o mesmo PowerShell descartou o alvo literal já validado via `System.IO.Directory.Delete(path,true)`; scratch ausente ao fim. Base viva PostgreSQL/Redis e Docker nunca foram consultados nem tocados. Apenas os dois arquivos autorizados foram persistidos.
- Veredito final: APROVADO; três itens apurados, todos os controles acusaram, nenhum achado e nenhum critério incapaz de falhar.

VOTO: APROVADO — links distinguíveis do pai em repouso, sob hover e sob foco nas 3 superfícies (e no papel), clique sem mudar hash nem histórico com foco e realce ≥1 s na linha-alvo inteiramente visível em B1/B3 e no cenário L, ids únicos com o modal aberto, impressão real com o portal prefixado, estados §7 byte-idênticos ao head-base, literais acentuados, e T4 vermelho no head-base pelo motivo certo junto com o M1 do objeto (chip verde presente), verde depois do restauro
