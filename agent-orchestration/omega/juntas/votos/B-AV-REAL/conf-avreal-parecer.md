# CONFERÊNCIA — B-AV-REAL, PR #477

## Identificação e objeto

- Autor do conserto: `fix-avreal-argon` — Gemini Argon.
- Verificador: `conf-avreal-sol` — Codex GPT-5.6 Sol, nível menor declarado, identidade nova.
- Independência: o verificador não escreveu nem consertou código deste bloco.
- Objeto medido: head do PR #477 `1181537e1a5a0cae3f862abd36cb77a55d38a126`.
- Worktree próprio: `C:/Users/thiag/w-confav`, detached no objeto, com `npm ci` próprio e sem junction.
- Base de comparação de `src/`: `2746eb60`.

Comando de trava: `gh pr view 477 --json headRefOid --jq .headRefOid`; saída inicial e final: `1181537e1a5a0cae3f862abd36cb77a55d38a126`. O objeto não mudou durante a conferência.

## Conclusão executiva

Não encontrei achado novo no escopo conferido. Todos os achados L1–L11 mandados para conserto e os defeitos D1–D7 da revisão da emenda foram reexecutados. As mutações obrigatórias produziram vermelho, foram restauradas e voltaram a verde. A forma real subiu saudável, manteve o clamd sem saída para rede, atualizou a base sem reiniciar e conservou o processo vivo além do prazo acelerado. Nenhum resultado caracteriza gravidade: não houve perda de dado, vazamento entre organizações, quebra de permissão, erro de dinheiro nem arquivo aprovado sem varredura.

## Lista completa dos achados conferidos

As gravidades abaixo são as do problema original. “Não grave” significa que o fluxo fecha negando ou indisponibilizando a operação; não significa que um bloqueante funcional pudesse ser ignorado.

| Item | Comando/prova executada | Saída medida | Gravidade e situação |
|---|---|---|---|
| L1 — healthcheck IPv4 | overlay real com `docker compose ... up -d --wait`; `clamdcheck.sh`; M-R8a-a/M-R8a-b e guard de topologia | overlay saudável; mutações de porta/endereço avermelharam; restauração `20/20` | Alta/bloqueante, **não grave**; corrigido |
| L2 — atualização sem egress do clamd | overlay real; `wget` no clamd; leitura de `VERSION`, `RestartCount`, `StartedAt` e logs por até 240 s | clamd: `CLAMD_EGRESS_BLOCKED`; `VERSION 28164→28171` em 94 s; `RestartCount=0`; mesmo `StartedAt`; reload nos logs | Alta/bloqueante, **não grave**; corrigido |
| L3 — privacidade real | M-R8b-b com `pino` bruto e X-R8b-jwt; `npm test -- tests/avreal-privacy.test.ts`; restauração | pino: `1/2`, canário no stdout; JWT: `0/2`, canário no fio; restaurado: `2/2` | Média, **não grave**; corrigido |
| L4 — idade padrão 72 h | X-default72 (`72→0`); gates de config/produção | vermelho `not ok 16`, `15/16`; restaurado: `100/100` no conjunto | Média, **não grave**; corrigido |
| L5 — censo de imports | inserir `import "clamscan"`; executar censo; restaurar | vermelho `not ok 1`, `6/7`; restaurado `7/7` | Média, **não grave**; corrigido |
| L6 — prazos connect/VERSION | retirar timer de connect; depois desativar deadline de `queryVersion`; restaurar cada fatia | connect: `not ok 10`, `12/13`; VERSION: `not ok 9`, `8/9`; restaurados: `37/37` e `9/9` | Média, **não grave**; corrigido |
| L7 — `scanReason` no gate | retirar campo de log; privacy/gate; restaurar | vermelho `not ok 2`, `1/2`; restaurado `23/23` | Baixa, **não grave**; corrigido |
| L8 — EICAR em metades | reinserir literal completo; censo; restaurar | vermelho `not ok 6`, caminho EICAR, `6/7`; restaurado `7/7` | Média, **não grave**; corrigido |
| L9 — oito casos obrigatórios | converter o caso de saturação em `test.skip`; executar guard; restaurar | vermelho `7 !== 8`, `6/7`; restaurado `7/7`; CI real `8/8`, zero skip | Média, **não grave**; corrigido |
| L10 — topologia completa | M-R8a-a, M-R8a-b, M-R8a-c, rede default, HDB, socket dev, exposição API e M-E2g, uma por vez | todas avermelharam itens próprios; após cada restauração e ao final `20/20` | Alta/bloqueante, **não grave**; corrigido |
| L11 — registros/F11 | mutação M-R7 no teste Flutter B108; inspeção dos registros, manifest e histórico | M-R7: vermelho `+7/-1`; restaurado `8/8`; registros e ressalva amd64 presentes | Média, **não grave**; corrigido |
| D1 — clamd morrer após o prazo | ler `/init` da imagem; executar head com `--network none`, aguardar além do prazo acelerado; controle com config antiga | head: `SOCKET_FOUND=1`, `PONG`, processo vivo e usuário `clamav`; controle antigo: exit 1/`FAILED_START=1` | Alta/bloqueante, **não grave**; corrigido |
| D2 — `spawnSync` travava sonda | executar sonda E3 corrigida, ajustando somente o caminho externo obsoleto | sync tenant-canary expirou em ~45,3 s como controle; async concluiu em 328–356 ms | Média, defeito da prova, **não grave**; corrigido |
| D3 — tenant tornava asserção vermelha | sonda async com tenant fixo e tenant-canary | tenant fixo: pares kind/reason exatos, sem canário; tenant-canary vazou apenas no campo intencional | Média, defeito da prova, **não grave**; corrigido |
| D4 — rotas sem harness | `git grep` dos 422; leitura do exercise/harness; M-E3-http | mutação deu `not ok 37`, `40/41`; restaurado privacy+routes `43/43`; mensagem pública fixa | Média, defeito da prova, **não grave**; corrigido |
| D5 — guard EICAR não via literal | sonda D5 e M-E8 | metades `27/41`; uma barra não acha, duas acham o objeto antigo; mutação do head avermelha | Média, defeito da prova, **não grave**; corrigido |
| D6 — recursos ativos comparados cedo | sonda E6 com espera limitada | `5/5`; recursos estabilizaram em 0–20 ms | Baixa, defeito da prova, **não grave**; corrigido |
| D7 — bateria parava sem DB | `env -u DATABASE_URL npm test -- tests/core-saas-role-authority.test.ts`; repetição isolada com URL de teste | sem variável: exatamente `1/1` falha, `DATABASE_URL is required`; com URL: `12/12` | Baixa/preexistente, fora do bloco, **não grave**; explicitamente tratada pela emenda |

Achados novos desta conferência: **nenhum**. A falha local de D7 é ambiental e preexistente, está nomeada no plano, e a mesma área passou no job Postgres do head; não pede ajuste deste PR.

## Mutações por fatia exigidas no §4

Cada mutação foi aplicada isoladamente, executada em vermelho, restaurada e repetida em verde. Depois de todas, `git status --short` ficou vazio.

| Fatia | Mutação | Vermelho | Verde após restauração |
|---|---|---|---|
| E1 | M-E1b, remover `LocalSocket` | topologia `19/20`, `not ok 11` | `20/20` |
| E2 | M-E2g, ligar API à rede de update | `19/20`, `not ok 15` | `20/20` |
| E3 | M-E3-http, devolver `error.detail` em 422 | `40/41`, `not ok 37` | `43/43` no conjunto |
| E4 | default `72→0` | `15/16`, `not ok 16` | `100/100` no conjunto |
| E5 | import nu de `clamscan` | `6/7`, `not ok 1` | `7/7` |
| E6 | remover timer de connect | `12/13`, `not ok 10` | `37/37` no conjunto |
| E7 | remover `scanReason` | `1/2`, `not ok 2` | `23/23` no conjunto |
| E8 | literal EICAR completo | `6/7`, `not ok 6` | `7/7` |
| E9 | pular caso de saturação | `6/7`, `7 !== 8` | `7/7` |
| E10 | montar `docker.sock` | `19/20`, `not ok 19` | `20/20` |
| E13 | remover `User clamav` | `19/20`, `not ok 12` | `20/20` |

Controles adicionais exigidos também avermelharam: overlay com porta publicada, bind dev não-loopback, rede privada não-internal, serviço na rede default, banco na rede privada, socket dev ausente, API exposta à rede privada, Flutter apagando blob rejeitado, `pino` bruto e JWT no socket.

## Forma real

Antes de cada subida Docker, `FreeVirtualMemory` do Windows foi medido acima de 4 GB. Havia somente os dois serviços protegidos já existentes, que não foram tocados.

- Overlay: `docker compose -p j-confav-l2 -f docker-compose.prod.yml -f docker-compose.clamav.yml up -d --wait --no-deps clamav clamav-freshclam` terminou com ambos saudáveis.
- Rede: clamd somente na rede privada `internal`; freshclam somente na rede de atualização; nenhuma porta publicada.
- Socket/processo: `SOCKET_FOUND=1`; `ps` mostrou `clamav clamd` sob usuário `clamav`.
- Egress: tentativa no clamd resultou `CLAMD_EGRESS_BLOCKED`; updater não tinha acesso à porta do clamd.
- Atualização: `VERSION 28164→28171` em 94 s, dentro do teto; `RestartCount=0`; mesmo `StartedAt`; logs mostraram detecção e reload.
- Sobrevida E1 acelerada: processo permaneceu vivo e respondeu `PONG` além do prazo; a config antiga falhou no controle.
- E12.5 real local: dois perfis dev saudáveis em loopback; wrapper `8/8`; guard `tests=8 skipped=0 fail=0`; quatro controles negativos deram código não zero.

Ao final: zero containers, volumes e redes com prefixo `j-confav`; `erp-postgres` e `erp-redis` permaneceram `healthy`.

## Bateria local, escopo e CI

- `npm run check`, `npm run lint`, `npm run build`, `git diff --check` e guard de migrações: verdes.
- Testes dirigidos: `266/266`.
- Suíte sem `DATABASE_URL`: `3608 tests / 3500 pass / 1 fail / 107 skipped`; única falha `core-saas-role-authority.test.ts`, causa medida `DATABASE_URL is required`. Com URL de teste, o arquivo fez `12/12`.
- `git diff 2746eb60..HEAD --stat -- src/`: saída vazia. Pela regra do §4, não foi necessário reconvocar C1.
- Lockfile: intacto contra o merge-base.
- CI do head, run push exato `41388519853`, lido com `gh run view ... --job ... --log`:
  - backend: `4261 tests / 4259 pass / 0 fail / 2 skipped`; os dois casos de paridade com banco foram destinados ao job Postgres;
  - backend-postgres: `493/493`, zero skip;
  - antivirus: `8/8`, zero fail e zero skip; guard `tests=8 skipped=0 fail=0`;
  - frontend: `1556/1556`, zero skip;
  - Flutter: `+905 All tests passed`;
  - authority/owner: `tsc --noEmit` e Vite build concluídos;
  - Docker smoke: `12/12 OK`, incluindo restart/persistência.

O run de pull request `41388525213` apresentou os mesmos resumos. Não houve falha externa a classificar como “instabilidade”.

## Integração da main e registros

Pais medidos: `1181537e^1=4a5ceba3a291aa1a12c5a0e6cd38ff1649274198` e `1181537e^2=0fda595a9cb37d2d75abd45ef23eacc5dc56fea8`.

Foram lidos com `git show <pai>:<arquivo>` e comparados ao head os arquivos:

- `agent-orchestration/codex/log-execucao.md`;
- `agent-orchestration/controle/pendencias.md`;
- `agent-orchestration/controle/pendencias-indice.md`.

Ausências no head contra `^1`: `0/176` seções do log, `0/675` IDs de pendências e `0/620` IDs do índice. Contra `^2`: `0/175`, `0/670` e `0/615`. O head contém, respectivamente, 177 seções, 678 IDs e 623 IDs. Nenhuma entrada de qualquer pai sumiu.

## Pendências residuais já triadas

Continuam corretamente registradas para `B-AV-REAL-RESIDUAL`, sem bloquear este bloco: `P-AVREAL-TETO-IDADE`, `P-AVREAL-PRAZO-SOMA`, `P-AVREAL-VERSION-FUTURO`, `P-AVREAL-SEGUNDA-RESPOSTA`, `P-AVREAL-ROTAS-ROTULO`, `P-AVREAL-B108-PROVA` e `P-AVREAL-PANE-CI`. Nenhuma delas permite arquivo sem varredura; o comportamento atual fecha negando.

## Estado final

Head ainda exato, worktree limpo, diff de `src/` vazio, recursos de teste removidos e serviços protegidos saudáveis. A evidência incremental está em `juntas/J-B-AV-REAL/conf-evidencia.md`.

VEREDITO: APROVADO
