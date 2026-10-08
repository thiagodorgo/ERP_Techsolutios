# Relatório do desenvolvimento — B-SAN3-09 · ciclo 2

Identidade: `dev-ciclo2-b-san3-09`  
Modelo: GPT-5.6 Sol — substituição declarada (§C7.6-bis): o bloco não toca dinheiro; Fable/Astra somente em bloco de dinheiro (decisão do dono, 2026-10-08).  
Objeto inicial: `53b2d8171162b0ad7565e7a3c3a4034fc6f1660e` (HEAD local = ramo remoto, medição do orquestrador).

## Evidência incremental

- 15.1.1 — argumento desconhecido fail-closed, fonte única e testes T1.2b/T1.5c/T2.4b: **CONCLUÍDO E VERDE**. Comandos: T1 preliminar `node --test --import tsx tests/san3-09-bootstrap-platform-admin.test.ts` → 26/26 (a forma final será reexecutada sob timeout); T2 em container Linux: `timeout 900 node --test --import tsx tests/san3-09-bootstrap-platform-admin-db.test.ts` → 12/12. Saída resumida: tabela final tem **98** variantes; T1.5c recusou antes do ambiente; T2.4b saiu 2 `UNKNOWN_ARGUMENT` e manteve 0/0/0/0/0. Resultado: fail-closed no processo e no banco.
- 15.1.2 — guard AST, diferencial e fecho de runtime: **CONCLUÍDO NA IMPLEMENTAÇÃO E VERDE**. Comando: T1 acima. Saída resumida: T1.7 guard AST verde; 6 especificadores no script real, diferencial do compilador contido e fecho de runtime sem `src/config/env.ts`. Resultado: propriedade por AST, sem regex.
- 15.1.3 — mutações do guard sem oráculo duplicado: **CONCLUÍDO NA IMPLEMENTAÇÃO E VERDE**. Comando final sob limite: `timeout 300 node --test --import tsx tests/san3-09-bootstrap-platform-admin.test.ts`. Saída resumida: T1.7-mutação injetou **12** formas separadas no texto real (efeito colateral, multilinha, aspas simples, `export *`, `export {}`, imports dinâmicos literal/não literal/template, import-equals, require, função e comentário) e o mesmo coletor detectou todas. Resultado: 26/26, sem segundo oráculo por regex.
- 15.1.4 — dry-run read-only em cinco estados e concorrência 3 rodadas: **CONCLUÍDO E VERDE**. Comando: T2 Linux acima, em `dev09c2-node` contra `dev09c2-pg`, sem porta publicada. Saída resumida: T2.4 passou em cinco clones (limpo, só organização, organização+usuário, convergido, reset), com sessão `default_transaction_read_only=on`, impressão digital das cinco tabelas+hash idêntica, controle de aplicar vermelho por read-only e processo Runbook exit 0/"nada foi escrito"/0/0/0/0/0; T2.10 passou **3/3 rodadas**, duas promises resolvidas e 1/1/1/1/1. Resultado: 12/12 T2, ec=0.
- 15.1.5 — `P-SAN-PROD-BOOTSTRAP` fecha somente no ato do dono: **CONCLUÍDO NA EDIÇÃO; VALIDAÇÃO FINAL PENDENTE**. Comando: edição restrita de `pendencias.md`, `status-geral.md` e apenso de `log-execucao.md`. Saída resumida: opt-in corrigido para `NODE_ENV=production ALLOW_PROD_BOOTSTRAP=1`; status/agendamento dizem que só o ato do dono fecha; D2/D3 nomeadas. Resultado: propriedade registrada, pendente `git grep` final.
- 15.2 M-1 — guarda de segredo baseada no hash real: **CONCLUÍDO E VERDE**. Comando: T2 Linux acima. Saída resumida: T2.9 leu o `password_hash` real, proibiu hash inteiro e segmentos de 16+ caracteres, além de `/postgres(ql)?:\/\//`; caso passou dentro dos 12/12.
- 15.2 M-2 — `ALLOW_PROD_SEED` não abre o bootstrap: **CONCLUÍDO E VERDE**. Comando: T1 acima. Saída resumida: processo filho com `NODE_ENV=production ALLOW_PROD_SEED=1` saiu 2 com `PRODUCTION_OPT_IN_MISSING`; caso integrado aos 26/26.
- 15.2 3a-1 — domínio + TLS no Runbook B: **CONCLUÍDO E VERDE**. Comando: T1 acima. Saída resumida: T1.8 encontrou `TLS` no Runbook B; 26/26.
- 15.2 C3-A1 — códigos 0/2/1 e `UNKNOWN_ARGUMENT` no Runbook B: **CONCLUÍDO E VERDE**. Comando: T1 acima. Saída resumida: T1.8 encontrou `exit 1`, `FALHOU` e `UNKNOWN_ARGUMENT`; 26/26.
- 15.2 3b-2 / 15.5 — pendências e donos: **CONCLUÍDO NA EDIÇÃO; VALIDAÇÃO FINAL PENDENTE**. Comando: atualização do bloco de pendências. Saída resumida: donos `B-SAN3-06b`, `B-ARNES-2`, `B-SAN3-10`; abertas `P-SAN3-09-ROTEIRO-DE-OPERACAO`, `P-SAN3-09-DB-TEST-SO-LINUX` e `P-SAN3-09-FALHOU-SEM-CAUSA`; descrição da organização corrigida para "como se fosse cliente".
- D-C2-1 — devolver `Kpis/*` à versão da `origin/main`: **CONCLUÍDO**. Comando: `git restore --source origin/main -- Kpis/app.js Kpis/kpis-history.json Kpis/kpis-history.md Kpis/kpis-latest.json`. Saída resumida: comando ec=0. Resultado: os quatro arquivos carregados pelo ciclo 1 voltaram à versão da main, conforme decisão do orquestrador; comparação final ainda será publicada.
- Bateria 15.3 e mutações: **CONCLUÍDA, COM MUTAÇÕES NÃO EXECUTADAS DECLARADAS ABAIXO**. `npm ci --no-audit --no-fund` → 326 pacotes, ec=0, sem junction; `npx prisma generate` → Prisma 7.8.0, ec=0; `npm run check` e `npm run lint` → ec=0; A19 `npx tsc ... scripts/bootstrap-platform-admin.ts` → ec=0; T1 sob `timeout 300` → **26/26**; regressões sem banco sob `timeout 300` → **80 total, 78 pass, 0 fail, 2 skip DB**; T2 Linux sob `timeout 900` → **12/12**; regressões DB sob `timeout 900` → **50/50**, 0 skip; `git diff --check` → limpo; ratchet de catálogo → 0 ocorrências. A suíte inteira fica para os 14 check-runs da CI, conforme 15.3(10).

### Evidência incremental — mutações MA1–MA6

- **MA1:** comando no container descartável: trocar a 1ª ocorrência de `if (dryRun)` por ramo impossível e rodar T2 sob `timeout 900`. Saída: arquivo T2 vermelho, 0/1 no nível do arquivo. Resultado: mutação detectada.
- **MA2:** mesmo comando na 2ª ocorrência. Saída: arquivo T2 vermelho, 0/1 no nível do arquivo. Resultado: mutação detectada.
- **MA3:** remover `!dryRun` do vínculo e rodar T2 sob `timeout 900`. Saída: T2.4 vermelho; total 12, pass 10, fail 2 (subteste + pai). Resultado: mutação detectada.
- **MA4:** trocar `if (!dryRun)` da credencial por `if (true)` e rodar T2 sob `timeout 900`. Saída: T2.4 vermelho; 10/12, 2 falhas. Resultado: mutação detectada.
- **MA5:** remover o guard de dry-run da auditoria e rodar T2 sob `timeout 900`. Saída: T2.4 vermelho; 10/12, 2 falhas. Resultado: mutação detectada.
- **MA6:** remover `pg_advisory_xact_lock` e rodar T2 sob `timeout 900`. Saída: T2.10 vermelho; 10/12, 2 falhas. Resultado: mutação detectada.
- **Restauro:** após cada rodada a cópia do script foi substituída pelo arquivo do worktree. Comando final: MD5 host × container. Saída: `19c50cf7a034efd9f7c6941c33242a01` nos dois, `equal=True`. Resultado: nenhum mutante permaneceu.

### Evidência incremental — mutações MF3

- **MF3-a:** comando no container: substituir o ramo `UNKNOWN_ARGUMENT` por `continue`, rodar T1 sob `timeout 300` e restaurar pelo arquivo do worktree. Saída: T1.2b e T1.5c vermelhos; **24/26**, 2 falhas, ec=1. Resultado: o comportamento fail-open do objeto é detectado.
- **MF3-b:** `Object.hasOwn` → operador `in`; T1 sob `timeout 300` → T1.2b/T1.5c vermelhos, **24/26**, ec=1. Restauro: MD5 host/container `19c50cf7a034efd9f7c6941c33242a01`, igual.
- **MF3-c:** mensagem passa a interpolar o token; T1 sob `timeout 300` → T1.2b vermelho, **25/26**, ec=1. Uma tentativa inicial não encontrou a âncora por interpolação do shell e deu 26/26; foi descartada e repetida com OLD/NEW via ambiente. Restauro MD5 igual.
- **MF3-d:** comparação/lookup por `argument.toLowerCase()`; T1 sob `timeout 300` → T1.2b vermelho, **25/26**, ec=1. Restauro MD5 igual.
- **MF3-e:** `parseArgv` movido depois da leitura de `DATABASE_URL`; T1 sob `timeout 300` → T1.5c e T1.6 vermelhos, **24/26**, ec=1. Restauro MD5 igual.
- **MF3-f:** campo `novaFlag` acrescentado a `BootstrapFlags` sem entrada na fonte; A19 sob `timeout 300` → TS2322 (`true` não atribuível a `never`) e TS2741 (campo ausente), ec=2. Restauro MD5 igual.

### Evidência incremental — mutações MF1 no script real

- **MF1-a (aspas simples):** injetado `node:crypto`; T1 sob `timeout 300` → T1.7 guard e mutação vermelhos, **24/26**, ec=1; script restaurado do worktree.

### Divergência registrada — relatório do estado reset no dry-run

- Comando/leitura: `Select-String` e inspeção do corpo byte-idêntico de `bootstrapPlatformAdmin`. Saída resumida: o campo existente é `passwordReset` (não `credentialReset`) e só recebe `true` dentro de `if (!dryRun)`; logo, no estado convergido com `resetPassword: true` e execução dry-run, o relatório necessariamente traz `passwordReset=false`.
- Resultado: o T2.4 passa a assertar explicitamente os cinco campos em todos os cinco estados, inclusive `passwordReset=false` em reset. Não alterei o corpo porque §15.3 o exige byte-idêntico e autoriza no script somente flags/parse/tipo. Se o plano pretendia `true`, esse ponto é impossível dentro do próprio escopo e deve ser julgado como divergência, não corrigido por improviso.

## Checklist — B-SAN3-09 · ciclo 2 · desenvolvimento

**Solicitado:**

- §15.1.1 — recusar argumento desconhecido por conjunto fechado, sem eco, com T1.2b/T1.5c/T2.4b.
- §15.1.2 — substituir regex de imports por AST, diferencial do compilador e fecho de runtime.
- §15.1.3 — usar o mesmo verificador nas formas mutantes, sem teste tautológico.
- §15.1.4 — provar dry-run read-only em cinco estados e concorrência em três rodadas.
- §15.1.5 — impedir fechamento antecipado de `P-SAN-PROD-BOOTSTRAP`.
- §15.2 — M-1, M-2, 3a-1, 3b-2 e C3-A1.
- §15.5 — abrir/corrigir pendências e donos.
- D-C2-1 — devolver `Kpis/*` à main.
- §15.3 — bateria e mutações sob terreno descartável próprio.

**Feito:**

- [x] §15.1.1 — código + T1 26/26 (98 variantes) + T2 12/12; commit a preencher no fechamento Git.
- [x] §15.1.2/15.1.3 — AST, 6 imports reais, diferencial, fecho sem `env.ts` e 12 formas internas; T1 26/26.
- [x] §15.1.4 — 5 estados read-only + processo Runbook e concorrência 3/3; T2 12/12. MA1–MA6 ficaram vermelhos.
- [x] §15.1.5 — registro diz que somente o ato do dono em produção fecha; `git grep` conferido.
- [x] M-1/M-2/3a-1/3b-2/C3-A1 — T1/T2 e registros verdes.
- [x] §15.5 — donos e novas pendências registrados; nota do piso 12×8 acrescentada.
- [x] D-C2-1 — quatro arquivos `Kpis/*` byte-idênticos à `origin/main` (`git diff --exit-code origin/main -- Kpis/...` ec=0).
- [x] terreno — somente `dev09c2-*`, sem portas publicadas; três containers e rede removidos ao fim.

**Não feito / divergências:**

- `passwordReset` no dry-run com reset é `false` pelo corpo byte-idêntico; o §15.3 proíbe mudar esse corpo. A divergência está demonstrada acima.
- MF3-b…f e as mutações externas MF1/MF2 não foram executadas como cópias destrutivas separadas pelo dev; as 12 formas MF1 e os ramos do coletor têm cobertura executada no próprio T1, e MF3-a/MA1–MA6 foram executadas. A junta 2 deve cumprir a matriz integral como manda o plano.
- A suíte inteira não foi rodada localmente: §15.3(10) atribui isso aos 14 check-runs da CI no head.

**Validação:**

- `npm ci --no-audit --no-fund` → 326 pacotes, 0 erro.
- `npx prisma generate` → Prisma 7.8.0, 0 erro.
- `npm run check` / `npm run lint` / A19 → passaram.
- T1 com timeout → 26/26 passaram.
- Regressões sem banco com timeout → 78 passaram de 80; 2 pulos DB esperados; 0 falha.
- T2 Linux com timeout → 12/12 passaram.
- Regressões PostgreSQL com timeout → 50/50 passaram, 0 pulo.
- Mutações MA1–MA6 e MF3-a → todas ficaram vermelhas; restauro MD5 comprovado.
- `git diff --check` e ratchet de catálogo → limpos.

**Head empurrado:** será preenchido na mensagem final por `git ls-remote`, pois o SHA nasce ao commitar este relatório.

**Próximos passos (análise):** a junta 2 deve olhar com atenção a matriz MF1/MF2/MF3 ainda não reexecutada externamente, a interpretação de `passwordReset=false` no dry-run, o conjunto fechado de flags e o teardown dos clones; pendências operacionais continuam com `B-SAN3-10`, `B-ARNES-2`, `B-SAN3-06b` e o ato de produção com o dono.

## QUEDA 14:57Z (2026-10-08) — limite de uso do Codex (registro do orquestrador)

- Depois do commit `1c520f1e` (já empurrado, com o checklist acima), o dev seguiu executando mutações a mais e caiu por
  limite de uso às 14:57:53Z. O que ficou no disco sem commit são as linhas de evidência **MF3-b…MF3-f** e **MF1-a** da
  seção "Evidência incremental" — versionadas aqui sem edição.
- Reconciliação com o checklist: o item "Não feito" que diz que MF3-b…f e MF1/MF2 não foram executadas fica **superado
  em parte** — MF3-b…f e MF1-a foram executadas (todas vermelhas, restauro por MD5); o resto de MF1 e todo MF2 continuam
  não executados pelo dev e ficam para a junta 2, como o próprio checklist já indicava.
- Terreno: o container `dev09c2-mut` (imagem `erp-junta-node20-pg16:local`, `sleep infinity`) ficou vivo e foi removido
  pelo orquestrador; nenhum outro `dev09c2-*` existia. O script de produto no worktree estava restaurado
  (`git status` só com este relatório).
