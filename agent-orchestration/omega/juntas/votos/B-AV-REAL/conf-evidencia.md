# Conferência B-AV-REAL — evidência incremental

Verificador: `conf-avreal-sol` — Codex GPT-5.6 Sol, nível menor declarado, identidade nova. Não desenvolveu nem corrigiu o bloco. Autor do conserto: `fix-avreal-argon` — Gemini Argon.

## Item 0 — trava do objeto

- Comando: `gh pr view 477 --json headRefOid`
- Saída resumida: `1181537e1a5a0cae3f862abd36cb77a55d38a126`.
- Veredito parcial: **VERDE** — coincide com o objeto mandatado `1181537e`; conferência pode começar.

## Item 1 — mandato e insumos

- Comando: leitura integral de `B-AV-REAL-emenda-junta.md`, `triagem.md`, `c1-voto.json`, `c2-voto.json`, `c3-voto.json`, `rev-emenda-avreal.md` e `git show 1181537e:docs/revisoes/SAN3/B-AV-REAL-dev.md` (o relatório do autor será usado só como roteiro, nunca como prova).
- Saída resumida: mandato §4 identificado; alvos de conferência são L1–L11, D1–D7, uma mutação em E1–E10/E13, provas Docker reais, CI TAP, diff `src/` e integração dos três registros.
- Veredito parcial: **VERDE** — escopo da conferência delimitado, sem reabrir cadeiras nem ampliar código.

## Item 2 — terreno exclusivo e dependências

- Comando: `git ... worktree add --detach C:/Users/thiag/w-confav 1181537e...`; no worktree, `git rev-parse HEAD`, `git status --porcelain`, `stat node_modules` e `npm ci`.
- Saída resumida: worktree criado em detached HEAD `1181537e1a5a0cae3f862abd36cb77a55d38a126`; status inicial vazio; `node_modules` inicialmente ausente; `npm ci` próprio adicionou 326 pacotes em 23 s. Nenhuma junction/symlink foi usada.
- Veredito parcial: **VERDE** — terreno independente e objeto correto.

## Item 3 — baseline dirigido no head

- Comando: `DATABASE_URL=postgresql://x:x@127.0.0.1:1/x?schema=public npm run db:generate`; depois a bateria dirigida de 14 arquivos definida em E12.2.
- Saída resumida: Prisma Client 7.8.0 gerado sem conexão viva; `14 arquivo(s) · 266 teste(s) · pass 266 · fail 0 · skipped 0`.
- Veredito parcial: **VERDE** — head funcional no baseline dirigido antes das mutações.

## Item 4 — E1 / M-E1b

- Comando: remover `LocalSocket /tmp/clamd.sock` de `infra/clamav/clamd.limits-test.conf`; rodar `npm test -- tests/avreal-compose-topology.test.ts`; restaurar com `git checkout --`; repetir a suíte e `git status --porcelain`.
- Saída resumida: vermelho `not ok 11 - todo clamd.conf do bloco declara o LocalSocket...`, `20 tests / 19 pass / 1 fail`; após restauração, `20/20`, `fail 0`, status vazio.
- Veredito parcial: **VERDE** — guarda morde a regressão D1 e a árvore foi restaurada.

## Item 5 — E13 / M-E13

- Comando: remover `User clamav` de `infra/clamav/clamd.conf`; rodar topologia; restaurar; repetir verde e conferir status.
- Saída resumida: vermelho não-zero, `not ok 12 - ... rebaixa o clamd para o usuário clamav`, `19/20`; restaurado, `20/20`, status vazio.
- Veredito parcial: **VERDE** — a execução não-root tem guarda efetiva.

## Item 6 — E2 / M-E2g

- Comando: incluir `api` na rede `clamav_update`; rodar topologia; restaurar; repetir verde e status.
- Saída resumida: vermelho não-zero, `not ok 15 - clamav-freshclam é o único serviço na rede de saída`, `19/20`; restaurado, `20/20`, status vazio.
- Veredito parcial: **VERDE** — a rede com saída fica exclusiva do atualizador.

## Item 7 — E3 / M-E3-http (D2–D4)

- Comando: trocar a mensagem fixa do 422 da V1 por `error.detail`; rodar `o6r07b-mime-sniff-routes`; restaurar; rodar privacidade + rotas e conferir `src/` limpo.
- Saída resumida: vermelho não-zero, `not ok 37 - E3 [V1] reason ... fora do corpo do 422`, `40/41`; restaurado, `43/43`, `src/` limpo. O caso de processo real também permaneceu verde, cobrindo `spawn` assíncrono, tenant fixo e linha pino existente.
- Veredito parcial: **VERDE** — o canário não alcança o corpo HTTP e a mutação honesta morde.

## Item 8 — E4 / X-R10-default72

- Comando: alterar default de produção `72 → 0`; rodar `avreal-config`; restaurar; rodar config + gates de produção/SAN3-05.
- Saída resumida: vermelho `not ok 16`, `15/16`; restaurado, `100/100`, `fail 0`, `src/` limpo.
- Veredito parcial: **VERDE** — D7/E4 usam o `PROD_OK` completo e prendem o default 72 real.

## Item 9 — E5 / X-R12-bare

- Comando: inserir `import "clamscan";` nu no adaptador; rodar censo; restaurar; repetir.
- Saída resumida: vermelho `not ok 1 - adaptador importa somente node:* e caminhos relativos`, `6/7`; restaurado, `7/7`, `src/` limpo.
- Veredito parcial: **VERDE** — o censo cobre a forma que antes passava.

## Item 10 — E6 / X-R4-connect (D6)

- Comando: remover o timer de `connectTimeoutMs` em `scanInstream`; rodar failures; restaurar; rodar failures + signatures + protocol.
- Saída resumida: vermelho `not ok 10 - conexão muda respeita connectTimeoutMs`, `12/13`; restaurado, `37/37`. Os casos verdes incluem DNS/reset/FIN e a espera limitada de recursos (0–1,5 s), sem falso vermelho de D6.
- Veredito parcial: **VERDE** — prazo de conexão e liberação de recursos são observáveis e guardados.

## Item 11 — E7 / M-E7

- Comando: remover `scanReason` do log do gate; rodar privacidade; restaurar; rodar privacidade + upload-gate.
- Saída resumida: vermelho `not ok 2`, `1/2`; restaurado, `23/23`, `src/` limpo.
- Veredito parcial: **VERDE** — L7/A11/C2-A4 agora mede a linha pino real e seus valores.

## Item 12 — E8 / M-E8 (D5)

- Comando: recolocar a cadeia EICAR inteira no fonte TS; rodar censo; restaurar; repetir.
- Saída resumida: vermelho `not ok 6`, com `EICAR inteiro versionado em: tests/avreal-clamd.integration.ts`, `6/7`; restaurado, `7/7`.
- Veredito parcial: **VERDE** — o guard reconhece as duas barras no fonte e fecha D5.

## Item 13 — E9 / M-E9

- Comando: trocar o caso de saturação por `test.skip(`; rodar censo; restaurar; repetir.
- Saída resumida: vermelho `not ok 7`, `7 !== 8`, `6/7`; restaurado, `7/7`.
- Veredito parcial: **VERDE** — o trecho saudável foi delimitado corretamente e sumiço de caso não passa.

## Item 14 — E10 / M-E10c

- Comando: montar `/var/run/docker.sock` em `erp-clamav-limits`; rodar topologia; restaurar; repetir.
- Saída resumida: vermelho `not ok 19 - nenhum serviço clamd monta o socket Docker`, `19/20`; restaurado, `20/20`, status vazio.
- Veredito parcial: **VERDE** — o guard de superfície morde a exposição proibida.

## Item 15 — rechecagem C2: R8a + topologia

- Comandos: uma a uma, M-R8a-a (porta 3310 no overlay), M-R8a-b (DEV sem loopback), M-R8a-c (`clamav_private` não interna), `redeDefault`, `assinaturaTeste`, `socketDev` (já no item 14), `exposeApi` e M-E2g (item 6); após cada execução, `git checkout --` no arquivo tocado e topologia novamente.
- Saída resumida: todas ficaram vermelhas: `overlay não publica porta`; `dev publica somente em loopback`; `rede privada interna`; `clamd só em clamav_private`; `overlay não monta assinatura de teste`; `nenhum serviço monta docker.sock`; `api não publica 3310`; e `freshclam é o único na clamav_update`. Verde final `20/20`, status vazio.
- Veredito parcial: **VERDE** — as oito regressões de superfície exigidas pelo §4 mordem no overlay novo.

## Item 16 — L11/C3-A8: F11 M-R7

- Comando: `flutter pub get`; inserir deleção do blob também em `response.status == 'rejected'`; rodar `flutter test ...b108_evidence_storage_hardening_test.dart`; restaurar; repetir.
- Saída resumida: vermelho `B-108.3 rejected preserva evidencia local e falha segura [E]`, `+7 -1`; após restauração, `+8: All tests passed!`; status vazio.
- Veredito parcial: **VERDE** — a preservação do blob em rejeição é efetivamente guardada e F11 foi reexecutada.

## Item 17 — L11: registros C3-A3/A7/A9 e R12(b)

- Comandos: grep do run `41207885759` nos três registros; `gh run view 41207885759 --job 124556664769 --log`; grep das 7 pendências e do índice; grep do riscado SAN3/alerta amd64; `docker manifest inspect` e, após ele falhar na verificação do digest, `docker buildx imagetools inspect`; R12(b) por `git diff --quiet "$(git merge-base origin/main HEAD)" -- package.json package-lock.json`.
- Saída resumida: registros preservam e corrigem `8/8` para `7/8`; log antigo confirma `8 tests / 7 pass / 1 fail`; sete pendências aparecem no corpo e índice; SAN3 preserva texto superado riscado e 415×422; imagem tem somente `linux/amd64` mais atestação `unknown/unknown`; `LOCKFILE-INTACTO`; status vazio. O comando legado `docker manifest inspect` retornou `manifest verification failed`, mas a inspeção Buildx do mesmo digest resolveu o índice OCI e seus manifests.
- Veredito parcial: **VERDE** — L11 está factual; a falha do cliente legado não contradiz o manifesto medido pela ferramenta atual.

## Item 18 — D1/E1 real acelerado

- Comando positivo: após medir 17.312.328 KiB livres, `docker run --network none` com o conf do head e `CLAMD_STARTUP_TIMEOUT=25`; esperar 50 s; inspect/log/PING/socket; remover. Controle: após medir 15.345.900 KiB livres, repetir com `git show 2746eb60:infra/clamav/clamd.conf`; `docker wait`; remover conf/container.
- Saída resumida: positivo `running 0`, `SOCKET_FOUND=1`, `FAILED_START=0`, `PONG`, socket `/tmp/clamd.sock` de `clamav:clamav`; controle encerrou `WAIT_EXIT_CODE=1`, `FAILED_START=1`. Nenhuma porta publicada; ambos removidos; status vazio.
- Veredito parcial: **VERDE** — processo vive além do prazo acelerado no head e o objeto anterior reproduz a morte do `/init`.

## Item 19 — L1/L2/E2 real no overlay

- Comando: com 16.210.516 KiB livres e só `erp-postgres`/`erp-redis` ativos, `docker compose -p j-confav-l2 -f docker-compose.prod.yml -f docker-compose.clamav.yml up -d --wait --no-deps clamav clamav-freshclam`; ler config/logs/processos/redes; aguardar `VERSION > 28164` a cada 10 s, teto 240 s; testar egress; `down -v` e contar resíduos.
- Saída resumida: ambos `Healthy`; config mostra `clamav→clamav_private` interna e `freshclam→clamav_update`, sem portas; `SOCKET_FOUND=1`, `FAILED_START=0`, `clamav clamd`; base 28164→28171 em 94 s, `RESTART=0`, mesmo `StartedAt`, logs `Database modification detected`/`correctly reloaded`; clamd sem DNS/egress (`CLAMD_EGRESS_BLOCKED`), atualizador baixou `daily.cld updated`; RSS 945,4 MiB + 85,09 MiB. Limpeza: 0 containers/volumes/redes do projeto; Postgres/Redis seguiram healthy.
- Veredito parcial: **VERDE** — L1/L2 e as rechecagens C2/C3 estão comprovadas na forma real, inclusive reload sem restart dentro do teto.

## Item 20 — E12.5: forma local do job `antivirus`

- Comandos: medir memória antes de cada subida (14.665.088 e 14.658.656 KiB); subir `erp-clamav` e `erp-clamav-limits` no projeto `j-confav-ci`; esperar healthy; conferir logs/usuário; executar wrapper com `pipefail`; aplicar guard do CI; negativos sem limits, porta 1, M-E9 real e M-R9; restaurar; `down -v` e remover TAP.
- Saída resumida: ambos healthy em 11 s; `SOCKET_FOUND=1` e `clamav clamd` nos dois; integração `8 tests / 8 pass / 0 fail / 0 skipped`; guard `tests=8 skipped=0 fail=0`. Negativos: sem limits não-zero; porta 1 `2 pass/6 fail`; M-E9 `7 pass/1 skipped`, não-zero; M-R9 `6 pass/2 fail` (EICAR e HTTP 422), não-zero. Limpeza: 0 containers/volumes; status vazio; Postgres/Redis healthy.
- Veredito parcial: **VERDE** — a forma real local, os guards verdes-cegos e os controles negativos de E12.5 foram reexecutados.

## Item 21 — E12.1/E12.2 bateria final e `src/`

- Comandos: `npm run check`; `npm run lint`; `env -u DATABASE_URL npm test`; prova isolada com URL falsa; `npm run build`; `git diff --check`; guard de migração; `git diff 2746eb60..HEAD --stat -- src/`; status.
- Saída resumida: check/lint/build/diff-check verdes; suíte raiz `3608 tests / 3500 pass / 1 fail / 107 skipped`, única `not ok 116 ... core-saas-role-authority.test.ts`; isolada com URL falsa `12/12`; migrações `117/112/5`, 0 violações; diff `src/` entre marcadores vazio; status vazio.
- Veredito parcial: **VERDE COM RESSALVA PREEXISTENTE** — exatamente a falha ambiental nomeada pela emenda, fora do bloco e verde na CI com Postgres; nenhuma mudança em `src/` exige refazer C1.

## Item 22 — comandos próprios de L3 (A1/A2)

- Comandos: M-R8b-b com `pino` real logando a resposta bruta; X-R8b-jwt escrevendo `JWT_SECRET` no socket; para cada uma, `npm test -- tests/avreal-privacy.test.ts`, restauração e verde final.
- Saída resumida: pino → `not ok 2`, canário bruto no stdout, `1/2`; JWT → `not ok 1` e `not ok 2`, valor `AVREAL_JWT` no fio, `0/2`; restaurado, `2/2`, `src/` limpo.
- Veredito parcial: **VERDE** — os comandos dos achados A1/A2 reproduzem vermelho no teste novo, não apenas o caso HTTP.

## Item 23 — segundo prazo de L6 (X-R4-version)

- Comando: desativar o deadline de `queryVersion`; rodar signatures; restaurar; repetir.
- Saída resumida: vermelho `not ok 9 - VERSION mudo respeita o prazo` / `watchdog ... excedido`, `8/9`; restaurado, `9/9`.
- Veredito parcial: **VERDE** — ambos os prazos exigidos por A7 (connect e VERSION) mordem.

## Item 24 — reexecução direta D1–D7

- D1 — comando: ler `/init` da imagem no digest com container `--rm --network none` (16.835.004 KiB livres) e grepar sockets no conf do head. Saída: `/init` espera `/run/clamav/clamd.sock` ou `/tmp/clamd.sock`, falha após 1800; head declara `TCPSocket 3310` + `LocalSocket /tmp/clamd.sock`. **VERDE** (somado ao positivo/controle do item 18).
- D2/D3 — comando: sonda `e3.mjs` ajustada somente no caminho do worktree; `sync tenant-canary`, `async no`, `async tenant-canary`. Saída: sync levou 45.342 ms e caiu `scanner_unavailable/timeout`; async/tenant fixo levou 328–356 ms com pares exatos `infected/null`, `unavailable/protocol_error`, `infected/scan_limit_exceeded`, sem canário; tenant-canary vazou pelo campo intencional. **VERDE** — o teste corrigido usa `spawn` e tenant fixo.
- D4 — comando: `git grep` dos 422/`error.detail`, leitura do `exercise` de `avreal-routes` e harness `withUploadApi`. Saída: 422 usa texto fixo nas vias, `avreal-routes` chama só gate, harness HTTP existe em `o6r07b-mime-sniff-routes`; M-E3-http do item 7 mordeu. **VERDE**.
- D5 — comando: `d5-eicar.sh` ajustado só no caminho. Saída: metades `27/41`; uma barra não encontra (`exit 1`), duas barras encontram o literal no objeto antigo (`exit 0`); M-E8 do item 12 mordeu no head. **VERDE**.
- D6 — comando: sonda `e6.test.mts` ajustada só no caminho, `NODE_ENV=test node --test --import tsx`. Saída: `5/5`; recursos igualaram em 0–20 ms pela espera limitada. **VERDE**.
- D7 — comando: `env -u DATABASE_URL npm test -- tests/core-saas-role-authority.test.ts`; grep da emenda. Saída: exatamente `1 test / 0 pass / 1 fail`, causa `DATABASE_URL is required`; a emenda atual cita o caso 2 vezes; com URL falsa, item 21 mostrou `12/12`. **VERDE COM RESSALVA PREEXISTENTE**.

## Item 25 — CI do head `1181537e`

- Comandos: `gh run list --commit 1181537e...`; check-runs API; para cada job do run push exato `41388519853`, `gh run view 41388519853 --job <id> --log` (também conferido no run PR `41388525213`).
- Saída resumida: todos `completed/success`. TAP/forma do run push: `backend 4261 tests / 4259 pass / 0 fail / 2 skipped`; os dois skips são RBAC DB parity explicitamente desviados ao job Postgres, que fez `493/493`, `0 skip`; `antivirus 8/8`, `0 fail`, `0 skip`, guard `tests=8 skipped=0 fail=0`; `frontend 1556/1556`, `0 skip`; Flutter `+905 All tests passed`; authority/owner não têm TAP, mas `tsc --noEmit` + Vite build concluíram; Docker smoke `12/12 OK`, inclusive persistência após restart. O run PR apresentou os mesmos resumos.
- Veredito parcial: **VERDE** — CI inteiro do head lido por log, sem inferência pela cor e sem falha fora do bloco a classificar.

## Item 26 — preservação dos registros na integração

- Comandos: `git show -s --format=... 1181537e 1181537e^1 1181537e^2`; `git diff 1181537e^1..1181537e --` e `git diff 1181537e^2..1181537e --` nos três arquivos; depois, para cada pai, `git show <pai>:<arquivo>` contra `git show 1181537e:<arquivo>`, comparando chaves de seções/pendências como conjuntos.
- Saída resumida: pais confirmados `^1=4a5ceba3a291aa1a12c5a0e6cd38ff1649274198` e `^2=0fda595a9cb37d2d75abd45ef23eacc5dc56fea8`. Contra `^1`, ausentes no head: `0/176` seções do log, `0/675` IDs de pendências e `0/620` IDs do índice. Contra `^2`: `0/175`, `0/670` e `0/615`, respectivamente. O head contém 177 seções, 678 IDs no registro e 623 no índice. A primeira comparação textual de linhas do índice apontou oito falsos positivos porque número de linha/resumo mudou; a comparação corrigida, pela chave `P-*`, deu zero perda.
- Veredito parcial: **VERDE** — nenhuma entrada identificada de qualquer pai sumiu nos três arquivos; a integração somente reuniu os dois lados e atualizou metadados/posições.

## Item 27 — estado final antes do parecer

- Comando: `gh pr view 477 --json headRefOid`; `git rev-parse HEAD`; `git status --short`; `git diff 2746eb60..HEAD --stat -- src/`; inventário Docker por prefixo `j-confav`; estado de `erp-postgres`/`erp-redis`.
- Saída resumida: PR e worktree permanecem em `1181537e1a5a0cae3f862abd36cb77a55d38a126`; status e diff de `src/` vazios; zero containers, volumes e redes `j-confav`; `erp-postgres` e `erp-redis` seguem `healthy`.
- Veredito parcial: **VERDE** — objeto não mudou, todas as restaurações estão comprovadas e não restou recurso de teste.

## Item 28 — parecer emitido

- Comando: leitura final de `revisoes/conf-avreal-parecer.md` com `tail -n 1` e contagem de linhas.
- Saída resumida: 117 linhas; última linha exatamente `VEREDITO: APROVADO`.
- Veredito parcial: **VERDE** — parecer contém a matriz completa de achados, comandos, saídas, gravidades, CI, integração e estado final.

## Item 29 — limpeza final

- Comando: `git -C C:/Users/thiag/Documents/GitHub/ERP_Techsolutios worktree remove --force C:/Users/thiag/w-confav`; conferir registro e existência do caminho.
- Saída resumida: `WORKTREE_REMOVED`; caminho inexistente e sem registro em `git worktree list`.
- Veredito parcial: **VERDE** — worktree próprio e seus artefatos foram removidos como exigido.

