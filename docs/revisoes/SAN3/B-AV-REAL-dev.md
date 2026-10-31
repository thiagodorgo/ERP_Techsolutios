# B-AV-REAL — relatório incremental do DEV

- Executor: `dev-avreal-sol` — Codex GPT-5.6 Sol, nível menor declarado; não planejou nem revisou.
- Worktree: `C:/Users/AMP/w-avreal`.
- Ramo: `feat/evidence-clamav-scanner`.
- Base: `origin/main@264c3760ad971dc3b40aec4416ecde3bb9d3e727`.
- Plano: `docs/revisoes/SAN3/B-AV-REAL-plano.md` (v2).
- Parecer prevalente: `C:/Users/AMP/erp-pausa-2026-10-03/revisoes/rev-plano-avreal-v2-parecer.md`.
- Restrições desta execução: sem Docker, sem base viva, sem `Kpis/**`, lockfiles ou dependência npm nova.

## RETOMADA 1

- UTC: `2026-10-30T12:48:30Z`.
- Executor/modelo: `dev-avreal-sol`, Codex GPT-5.6 Sol, nível menor declarado.
- Worktree/ramo: `C:/Users/AMP/w-avreal` · `feat/evidence-clamav-scanner`.
- Base/head anterior: `264c3760ad971dc3b40aec4416ecde3bb9d3e727`.
- Disco antes da fatia: `26.266.596 KiB` livres; depois do `npm ci`: `25.687.404 KiB`, acima do piso de 7,5 GB.
- Vermelho-controle antes da edição: `test -f` nos três artefatos obrigatórios de F1 → exit `1`, pois ainda não existiam.
- Dependências: `npm ci` próprio → exit `0`, 326 pacotes; aviso transitivo de engine, sem erro. `package-lock.json` permaneceu intocado.
- Geração local: `DATABASE_URL=postgresql://unused:unused@127.0.0.1:1/unused npm run db:generate` → exit `0`; não abriu conexão nem tocou base viva.
- Baseline inicial, antes da geração Prisma: 153 executados · 103 pass · 50 fail · 0 skip; todos os 50 falharam pela mesma causa ambiental, `@prisma/client` sem export `Prisma`.
- Baseline válido após gerar o cliente: 10 arquivos · 153 testes · 153 pass · 0 fail · 0 skip.
- Comando do baseline válido: `npm test -- tests/o6r07b-scanner-failclosed.test.ts tests/o6r07b-upload-gate.test.ts tests/o6r07b-upload-gate-census.test.ts tests/o6r07b-content-sniff.test.ts tests/o6r07b-mime-sniff-routes.test.ts tests/o6r07b-download-hardened.test.ts tests/attachments-crud.test.ts tests/checklist-attachments.test.ts tests/work-order-attachments.test.ts tests/work-order-attachments-routes.test.ts`.
- PR #475: `MERGED`, merge commit `264c3760ad971dc3b40aec4416ecde3bb9d3e727`; as decisões `D-ANTIVIRUS-CLAMAV` e `D-JUNTA-FLUXO-RAPIDO` já estão na base medida.
- Mutações da fatia: nenhuma; F1 é documental/baseline.
- Feito: plano v2 copiado, relatório iniciado, comando do bloco criado e reconciliação de quórum registrada.
- Falta: commit/push de F1; depois F2.
- Próximo comando exato: `git diff --check && git status --short`.
- Arquivos incompletos: nenhum. Jobs/containers/processos vivos: nenhum.

## RETOMADA 2

- UTC: `2026-10-30T12:52:48Z`.
- Executor/modelo: `dev-avreal-sol`, Codex GPT-5.6 Sol, nível menor declarado.
- Worktree/ramo: `C:/Users/AMP/w-avreal` · `feat/evidence-clamav-scanner`.
- Base/head anterior: `1279454ee6fa6c5c1c0560f8a9c9be9f6fb7519b` (F1 já no remoto).
- Vermelho-controle antes do código: suíte nova sem o adaptador → exit `1`, zero testes registrados e `ERR_MODULE_NOT_FOUND` para `clamav-scanner.js`.
- Implementado: `ClamAvEvidenceScanner` com uma conexão por scan, `zINSTREAM\0`, frames `uint32` big-endian de até 64 KiB, terminador zero, escrita serial com callback de backpressure e parser estrito terminado em NUL.
- Testes: 14 casos; buffers 0 B, 1 B, 64 KiB, 64 KiB+1 e 1 MiB reconstruídos byte a byte; `FOUND`, `ERROR`, respostas parecidas com OK, EOF parcial/vazio, resposta prematura e resposta múltipla.
- Mutações: M-R2a, M-R2b, M-R3a, M-R3b e M-R3c ficaram vermelhas, foram restauradas e o conteúdo canônico voltou ao SHA-256 `6d45b7d3c29c180ba26b08a66196de4d19e76f7fe7118e0953f98e4a7f30a7d6` (`git show :arquivo | sha256sum`; forma EOL-neutra).
- Verde-controle final: `npm test -- tests/avreal-scanner-protocol.test.ts` → 14 pass · 0 fail · 0 skip; `npm run check` → exit `0`; `git diff --check` → exit `0`.
- Falta: commit/push de F2; depois F3.
- Próximo comando exato: `git add docs/revisoes/SAN3/B-AV-REAL-dev.md && git commit -m "feat(evidence): cliente INSTREAM do clamd — framing e parser estritos (B-AV-REAL F2)"`.
- Arquivos incompletos: nenhum. Jobs/containers/processos vivos: nenhum.

## RETOMADA 3

- UTC: `2026-10-30T12:56:24Z`.
- Executor/modelo: `dev-avreal-sol`, Codex GPT-5.6 Sol, nível menor declarado.
- Worktree/ramo: `C:/Users/AMP/w-avreal` · `feat/evidence-clamav-scanner`.
- Base/head anterior: `6073e3c3277b6eed906b129ca80de8bbe2b02c62` (F2 já no remoto).
- Vermelho-controle antes do código: o caso novo `buffer acima do teto falha sem abrir socket` contra o cliente de F2 → exit `1`. A tentativa inicial de rodar o arquivo inteiro foi interrompida porque o cliente ainda não tinha prazo e o caso de servidor mudo, por definição, não terminava; o controle válido foi repetido com filtro e terminou vermelho.
- Implementado: prazo absoluto, destruição/limpeza em todo desfecho, semáforo sem fila, pré-checagem de `sizeBytes`/tamanho, teto de resposta de 4096 bytes e razões internas estáveis.
- Classificação: `Heuristics.Limits.Exceeded* FOUND` → `infected/scan_limit_exceeded`; `INSTREAM size limit exceeded. ERROR` → `failed/stream_limit_misconfigured`.
- Testes novos: 9; conjunto F2+F3: 23 executados · 23 pass · 0 fail · 0 skip. Cobrem servidor mudo, recusa, erro/reset, saturação, devolução da vaga, tamanho, resposta gigante e limites.
- Recursos: os testes conferem o `Socket.destroyed` do cliente no timeout, zero conexão para recusa local por tamanho e exatamente uma conexão sob saturação; nenhum processo ficou vivo.
- Mutações: M-R4a/b/c, M-R5u e M-R13a/b ficaram vermelhas e foram restauradas ao SHA-256 canônico `c853846a38269fc934d00a134a42cd70129128f95498a6b842dc6bf2e5b270c9`.
- Verde-controle final: `npm test -- tests/avreal-scanner-failures.test.ts tests/avreal-scanner-protocol.test.ts` → 23/23; `npm run check` e `git diff --check` → exit `0`.
- Falta: commit/push de F3; depois F4.
- Próximo comando exato: `git add docs/revisoes/SAN3/B-AV-REAL-dev.md && git commit -m "feat(evidence): prazo absoluto, limites e liberação de recursos no cliente clamd (B-AV-REAL F3)"`.
- Arquivos incompletos: nenhum. Jobs/containers/processos vivos: nenhum.

## RETOMADA 4

- UTC: `2026-10-30T12:58:31Z`.
- Executor/modelo: `dev-avreal-sol`, Codex GPT-5.6 Sol, nível menor declarado.
- Worktree/ramo: `C:/Users/AMP/w-avreal` · `feat/evidence-clamav-scanner`.
- Base/head anterior: `8f07e52c98fe96adea029f736d1fa44cff571655` (F3 já no remoto).
- Vermelho-controle antes do código: `tests/avreal-config.test.ts` → 15 executados · 0 pass · 15 fail; enum, host, faixas, relação de timeouts, idade e factory ainda não existiam.
- Implementado: `EVIDENCE_SCANNER=clamav`; sete `CLAMAV_*` com defaults/faixas; host obrigatório; timeout total maior que conexão; idade zero proibida em produção com ClamAV; default de idade 72 h em produção e 0 fora dela.
- Factory: processo isolado resolve `ClamAvEvidenceScanner` e injeta host, porta, prazos, concorrência e tamanho; `noop` em produção e default `unavailable` foram preservados.
- Regressão SAN3-05: o bloco `DATABASE_RUNTIME_ROLE_GUARD` não foi alterado; suas suítes permaneceram verdes.
- Testes: bateria F4 com 5 arquivos → 121 pass · 0 fail · 0 skip; `npm run check` e `git diff --check` → exit `0`.
- Mutações: M-R1a/b/c ficaram vermelhas e foram restauradas aos SHA-256 canônicos `6bd5980d…` (factory) e `55f2bcad…` (env).
- Falta: commit/push de F4; depois F5.
- Próximo comando exato: `git add docs/revisoes/SAN3/B-AV-REAL-dev.md && git commit -m "feat(config): EVIDENCE_SCANNER=clamav e variáveis CLAMAV_* com fail-closed por ambiente (B-AV-REAL F4)"`.
- Arquivos incompletos: nenhum. Jobs/containers/processos vivos: nenhum.

## Mutações

| Fatia | Mutação | Head | Comando | Vermelho | Restauração por hash | Verde-controle |
|---|---|---|---|---|---|---|
| F2 | M-R2a (`uint32 LE`) | `1279454e` | suíte de protocolo | 12/14 falharam; framing não foi reconstruído e watchdog encerrou | SHA-256 canônico `6d45b7d…` | 14/14 |
| F2 | M-R2b (sem terminador) | `1279454e` | suíte de protocolo | 13/14 falharam; servidor nunca recebeu terminador | SHA-256 canônico `6d45b7d…` | 14/14 |
| F2 | M-R3a (`includes("OK")`) | `1279454e` | suíte de protocolo | 3 respostas parecidas com OK foram aprovadas | SHA-256 canônico `6d45b7d…` | 14/14 |
| F2 | M-R3b (EOF vira clean) | `1279454e` | suíte de protocolo | 2 casos de EOF falharam | SHA-256 canônico `6d45b7d…` | 14/14 |
| F2 | M-R3c (aceita resposta prematura) | `1279454e` | suíte de protocolo | caso de resposta antes do terminador falhou | SHA-256 canônico `6d45b7d…` | 14/14 |
| F3 | M-R4a (sem prazo absoluto) | `6073e3c3` | caso `servidor mudo` | watchdog do teste excedido | SHA-256 canônico `c853846…` | 23/23 |
| F3 | M-R4b (não destrói no timeout) | `6073e3c3` | caso `servidor mudo` | socket cliente permaneceu não destruído | SHA-256 canônico `c853846…` | 23/23 |
| F3 | M-R4c (não devolve vaga no erro) | `6073e3c3` | caso `vaga do semáforo` | segunda varredura não ficou clean | SHA-256 canônico `c853846…` | 23/23 |
| F3 | M-R5u (limite interno vira clean) | `6073e3c3` | caso `Heuristics.Limits.Exceeded` | resultado divergiu de infected | SHA-256 canônico `c853846…` | 23/23 |
| F3 | M-R13a (sem pré-checagem de tamanho) | `6073e3c3` | caso `buffer acima do teto` | socket foi criado e razão divergiu | SHA-256 canônico `c853846…` | 23/23 |
| F3 | M-R13b (sem teto de resposta) | `6073e3c3` | caso `resposta maior` | razão divergiu de `response_too_large` | SHA-256 canônico `c853846…` | 23/23 |
| F4 | M-R1a (factory devolve unavailable para clamav) | `8f07e52c` | caso `factory resolve` | construtor foi `UnavailableEvidenceScanner` | SHA-256 canônico `6bd5980…` | 121/121 |
| F4 | M-R1b (remove recusa noop×produção) | `8f07e52c` | caso M-B7.2 | produção aceitou `noop` | SHA-256 canônico `55f2bca…` | 121/121 |
| F4 | M-R1c (host opcional) | `8f07e52c` | caso `clamav sem host` | schema aceitou ausência de host | SHA-256 canônico `55f2bca…` | 121/121 |
| F5 | M-R10a (comparação de idade invertida) | `406c6741` | `npm test -- tests/avreal-signatures.test.ts` | 3/5 falharam; VERSION fresco foi recusado e velho aprovado | SHA-256 canônico `9b381e689b350d3f65603f00840b675ef572a9c3b6bf557d743ccfc8027ba6f9` | 5/5 |
| F5 | M-R10b (erro de VERSION reaproveita aprovação) | `406c6741` | `npm test -- tests/avreal-signatures.test.ts` | 2/5 falharam; erro inicial e renovação foram aprovados | SHA-256 canônico `9b381e689b350d3f65603f00840b675ef572a9c3b6bf557d743ccfc8027ba6f9` | 5/5 |
| F5 | M-R8b-a (`tenantId` escrito no socket) | `406c6741` | `npm test -- tests/avreal-privacy.test.ts` | 1/2 falhou; canário de identidade apareceu no fio | SHA-256 canônico `9b381e689b350d3f65603f00840b675ef572a9c3b6bf557d743ccfc8027ba6f9` | 2/2 |
| F5 | M-R8b-b (resposta bruta no log) | `406c6741` | `npm test -- tests/avreal-privacy.test.ts` | 1/2 falhou; canário da resposta apareceu no log capturado | SHA-256 canônico `9b381e689b350d3f65603f00840b675ef572a9c3b6bf557d743ccfc8027ba6f9` | 2/2 |
| F5 | M-R8b-c (resposta bruta em `reason`) | `406c6741` | `npm test -- tests/avreal-privacy.test.ts` | 1/2 falhou; canário apareceu no resultado público | SHA-256 canônico `9b381e689b350d3f65603f00840b675ef572a9c3b6bf557d743ccfc8027ba6f9` | 2/2 |
| F5 | M-R12a (import npm `clamscan`) | `406c6741` | `npm test -- tests/avreal-scanner-census.test.ts` | 1/2 falhou; censo encontrou o specifier `clamscan` | SHA-256 canônico `9b381e689b350d3f65603f00840b675ef572a9c3b6bf557d743ccfc8027ba6f9` | 2/2 |

## RETOMADA 5

- UTC: `2026-10-31T13:16:38Z`.
- Executor/modelo: `dev-avreal-sol`, Codex GPT-5.6 Sol, nível menor declarado.
- Worktree/ramo: `C:/Users/AMP/w-avreal` · `feat/evidence-clamav-scanner`.
- Base/head anterior: `406c67415d72c2151dd6912f7f61a3183d6710f8` (F4 já no remoto).
- Disco na retomada: `24 GB` livres, acima do piso de 7,5 GB.
- Parcial encontrado no índice: 7 arquivos de F5; medição antes de seguir → 38/38 testes verdes, `npm run check` e `git diff --check` verdes.
- Vermelho-controle refeito contra o código de F4, preservando o índice: 38 executados · 33 pass · 5 fail · 0 skip; os cinco casos de VERSION provaram a ausência da implementação. Restauração ao parcial confirmada pelos SHA-256 canônicos.
- Implementado/medido: consulta `zVERSION`, parser de data, limite de idade, cache de 60 s que falha fechado na renovação; `scanReason` estruturado; fio sem identidade/segredo; resposta bruta ausente de resultado/log; censo de imports e instanciação.
- Mutações: M-R10a, M-R10b, M-R8b-a, M-R8b-b, M-R8b-c e M-R12a ficaram vermelhas e foram restauradas ao SHA-256 canônico `9b381e689b350d3f65603f00840b675ef572a9c3b6bf557d743ccfc8027ba6f9` do adaptador.
- Verde-controle da fatia: conjunto F5 com 5 arquivos → 38 pass · 0 fail · 0 skip; `npm run check` e `git diff --check` → exit `0`.
- Falta: commit/push de F5; depois F6.
- Próximo comando exato: `git add docs/revisoes/SAN3/B-AV-REAL-dev.md && git commit -m "feat(evidence): idade da base, privacidade no fio e no log, censo do adaptador (B-AV-REAL F5)"`.
- Arquivos incompletos: nenhum. Jobs/containers/processos vivos: nenhum.

## RETOMADA 6

- UTC: `2026-10-31T13:30:58Z`.
- Executor/modelo: `dev-avreal-sol`, Codex GPT-5.6 Sol, nível menor declarado.
- Worktree/ramo: `C:/Users/AMP/w-avreal` · `feat/evidence-clamav-scanner`.
- Base/head anterior: `2bf0c374` (F5 já no remoto).
- Vermelho-controle antes do código: `test -f tests/avreal-routes.test.ts` → `AUSENTE_RED`/exit `1`.
- Implementado: matriz comum de 16 casos — V1–V5 × `clean`/`infected`/`failed`, com scanner e gravação contados, mais `scan_limit_exceeded`; a bateria inclui os tradutores HTTP reais já existentes das cinco vias.
- Verde-controle: teste dono 16/16; regressão HTTP pesada `o6r07b-mime-sniff-routes` 36/36; demais 6 arquivos 72/72. Total da bateria F6: 108 pass · 0 fail · 0 skip. `npm run check` e `git diff --check` verdes.
- Mutações: M-R6a removeu a recusa de `failed` e derrubou 5/16 casos (viraram 201/store=1); M-R6b passou bytes diferentes na V5 e derrubou 1/16. Restauradas pelos hashes `44492e00972723f651274a61039de82a09569836b377d78f272f2f921121c51b` (`upload-gate.ts`) e `48e88f1c8dd988a0dc592b680e36a33cb5b7d75fa8568f6d568927c7245d9979` (`damage.service.ts`).
- Observação do arnês: a primeira execução conjunta excedeu o yield da sessão e deixou árvores filhas do runner; somente os PIDs próprios, identificados por horário/árvore, foram encerrados. A prova foi refeita em dois grupos com resumo TAP completo (36 + 72), sem processo próprio vivo ao final.
- Falta: commit/push de F6; depois F7.
- Próximo comando exato: `git add tests/avreal-routes.test.ts docs/revisoes/SAN3/B-AV-REAL-dev.md && git commit -m "test(evidence): matriz 5 vias × 3 desfechos com scanner e storage contados (B-AV-REAL F6)"`.
- Arquivos incompletos: nenhum. Jobs/containers/processos vivos: nenhum.

| F6 | M-R6a (falha do scanner cai como limpa) | `2bf0c374` | `npm test -- tests/avreal-routes.test.ts` | 5/16 falharam; `failed` virou 201/store=1 em V1–V5 | SHA-256 canônico `44492e00972723f651274a61039de82a09569836b377d78f272f2f921121c51b` | 16/16 |
| F6 | M-R6b (V5 grava bytes diferentes da marca) | `2bf0c374` | `npm test -- tests/avreal-routes.test.ts` | 1/16 falhou no caso clean da V5 | SHA-256 canônico `48e88f1c8dd988a0dc592b680e36a33cb5b7d75fa8568f6d568927c7245d9979` | 16/16 |

## RETOMADA 7

- UTC: `2026-10-31T13:33:42Z`.
- Executor/modelo: `dev-avreal-sol`, Codex GPT-5.6 Sol, nível menor declarado.
- Worktree/ramo: `C:/Users/AMP/w-avreal` · `feat/evidence-clamav-scanner`.
- Base/head anterior: `10064a12` (F6 já no remoto).
- Disco: `24 GB` livres, acima do piso de 7,5 GB.
- Vermelho-controle antes do código: ausência de `erp-clamav`, overlay, `infra/clamav/` e teste dono → `F7_AUSENTE_RED`/exit `1`.
- Digest medido antes da escrita: Docker Hub tag `clamav/clamav:1.4.6`, media type OCI index, digest multi-arquitetura `sha256:982e28f90061d0e66eb03276419f589a47c9fa601e985e472fc2f6c64b497ca0`; imagem linux/amd64 `sha256:6ba4e78b…b0e6a3`.
- Implementado: perfis dev `av`/`av-limits` em loopback; overlay local-prod sem portas, rede `clamav_private` interna e API configurada para `clamav`; configs regular, freshclam e limites; imagem tag+digest idêntica nos três serviços.
- Prova sem daemon: `npm test -- tests/avreal-compose-topology.test.ts` executou `docker compose config --format json` para dev e local-prod → 8 pass · 0 fail · 0 skip; `npm run check` e `git diff --check` verdes. Nenhum container foi iniciado.
- Mutações: M-R8a-a publicou 3310 no overlay e derrubou 1/8; M-R8a-b retirou o bind de loopback e derrubou 1/8; M-R8a-c tornou a rede não interna e derrubou 1/8. Restauração confirmada pelos blobs canônicos do índice: `fabf38c45fd5b5cc2f38a802d796553dcf9dc852ab11e4acab1468c2961bd136` (`docker-compose.yml`) e `d5129da55f1dea0d25e0e4064f1e3dc2fbf03181dcc2916c92a99d35479c53bf` (`docker-compose.clamav.yml`); `git diff -- <arquivos>` vazio.
- Falta/bloqueio: F8 e F9 exigem daemon/clamd real; F10 depende delas. F11 também para aqui porque o parecer prevalente exige consolidar as mutações reais de F8/F9 antes dela. F12 fica para depois.
- Próximo comando exato após o dono ligar o Docker: `docker compose --profile av up -d erp-clamav` (F8).
- Arquivos incompletos: nenhum. Jobs/containers/processos próprios vivos: nenhum.

| F7 | M-R8a-a (porta publicada no overlay) | `10064a12` | `npm test -- tests/avreal-compose-topology.test.ts` | 1/8 falhou: overlay publicou uma porta | SHA-256 canônico do blob `d5129da55f1dea0d25e0e4064f1e3dc2fbf03181dcc2916c92a99d35479c53bf` | 8/8 |
| F7 | M-R8a-b (dev sem bind loopback) | `10064a12` | `npm test -- tests/avreal-compose-topology.test.ts` | 1/8 falhou: `host_ip` deixou de ser `127.0.0.1` | SHA-256 canônico do blob `fabf38c45fd5b5cc2f38a802d796553dcf9dc852ab11e4acab1468c2961bd136` | 8/8 |
| F7 | M-R8a-c (`clamav_private` não interna) | `10064a12` | `npm test -- tests/avreal-compose-topology.test.ts` | 1/8 falhou: `internal` deixou de ser `true` | SHA-256 canônico do blob `d5129da55f1dea0d25e0e4064f1e3dc2fbf03181dcc2916c92a99d35479c53bf` | 8/8 |

AGUARDANDO DOCKER (F8, F9)

## RETOMADA 8

- UTC: `2026-10-31T13:49:40Z`.
- Executor/modelo: `dev-avreal-docker-sol`, Codex GPT-5.6 Sol, nível menor declarado; não planejou nem revisou.
- Worktree/ramo: `C:/Users/AMP/w-avreal` · `feat/evidence-clamav-scanner`.
- Base/head anterior: `ae12ddab` (F7 já no remoto); árvore limpa, 24 GB livres e commit livre do Windows 14,86 GB antes de subir Docker.
- Vermelho-controle antes do código: os dois artefatos de F8 estavam ausentes (`test -f` → exit `1`). Vermelho operacional adicional: o healthcheck original da imagem retornou exit `1` em ambos os containers porque `nc localhost` resolveu fora do listener IPv4, embora o TCP em `127.0.0.1` respondesse.
- Docker: `erp-clamav` e `erp-clamav-limits` subidos em sequência, por nome de serviço, com `--no-deps`. RSS após ambos: 950,7 MiB e 753,8 MiB na inicialização; commit livre 12,14 GB. Depois estabilizaram em 947,3 MiB e 945,3 MiB; commit livre 11,73 GB. `erp-postgres` e `erp-redis` não foram alvo de nenhum comando.
- Implementado: suíte real auto-pulável sem endpoint; PING/PONG, VERSION com data parseável, limpo, EICAR gerado em memória, saturação N+1, pane em menos do prazo e recuperação; runner obrigatório TAP que recusa endpoint ausente, zero teste e qualquer pulo. Healthcheck dos dois serviços corrigido para PING em `127.0.0.1`; ambos chegaram a `healthy`.
- Verde real: execução saudável 5/5; pane 1/1; recuperação 5/5; suíte comum sem endpoint 1 skip declarado; topologia 8/8; `npm run check` e `git diff --check` verdes.
- Mutações/negativos reproduzíveis: M-R9 trocou a factory de `clamav` por `NoopEvidenceScanner` via patch e ficou 4/5 (EICAR virou `clean`); restauração ao SHA-256 `cd4c80b…`. M-R11a sem `AVREAL_CLAMAV_HOST` saiu 2; M-R11b na porta 1 saiu 1 com 5/5 falhas; como são mutações de execução, os artefatos permaneceram nos hashes `c856dddf…` (runner) e `4c4d94f9…` (suíte).
- Falta: commit/push de F8; depois F9 usando o container de limites já saudável. Containers próprios ficam vivos somente até concluir F9; volumes de assinaturas serão preservados.
- Próximo comando exato: `git add docker-compose.yml scripts/avreal-integration.mjs tests/avreal-clamd-integration.test.ts docs/revisoes/SAN3/B-AV-REAL-dev.md && git commit -m "test(evidence): integração contra clamd real — limpo, EICAR, pane, recuperação, saturação (B-AV-REAL F8)"`.
- Arquivos incompletos: nenhum. Containers próprios vivos: `w-avreal-erp-clamav-1`, `w-avreal-erp-clamav-limits-1`.

| F8 | M-R9 (factory ClamAV vira Noop) | `ae12ddab` | `AVREAL_CLAMAV_HOST=127.0.0.1 node scripts/avreal-integration.mjs` | 1/5 falhou: EICAR retornou `clean` | SHA-256 canônico `cd4c80b206f270fabc18d7a2f6d36089cb63f5903ed21e24b9a0462a91a778f5` | 5/5 |
| F8 | M-R11a (host ausente) | `ae12ddab` | `env -u AVREAL_CLAMAV_HOST node scripts/avreal-integration.mjs` | exit 2: endpoint obrigatório | SHA-256 do runner `c856dddfe057e7c4be217c8ccdb5d8db1a279ed5905daf87d7d69756ffdf5ea7` | 5/5 |
| F8 | M-R11b (porta fechada) | `ae12ddab` | `AVREAL_CLAMAV_HOST=127.0.0.1 AVREAL_CLAMAV_PORT=1 node scripts/avreal-integration.mjs` | exit 1, 5/5 falhas reais, 0 skips | SHA-256 do runner `c856dddfe057e7c4be217c8ccdb5d8db1a279ed5905daf87d7d69756ffdf5ea7` | 5/5 |

## RETOMADA 9

- UTC: `2026-10-31T13:55:02Z`.
- Executor/modelo: `dev-avreal-docker-sol`, Codex GPT-5.6 Sol, nível menor declarado; não planejou nem revisou.
- Worktree/ramo: `C:/Users/AMP/w-avreal` · `feat/evidence-clamav-scanner`.
- Base/head anterior: `3a9b026f` (F8 já no remoto).
- Vermelho-controle antes do código: os casos nominais de `MaxFileSize`/`StreamMaxLength` e HTTP mobile real não existiam (`grep` duplo → exit `1`). A primeira execução depois de escrevê-los também foi vermelha por comportamento real: o limite INSTREAM responde sem prefixo `stream:` e o caminho A (EICAR anexado ao PNG) ficou `clean` no digest fixado.
- Implementado: parser fail-closed aceita a resposta real exata `INSTREAM size limit exceeded. ERROR` mesmo antes do terminador; regressão unitária fixa essa forma. Como o caminho A não detectou, foi usado o caminho B previsto: assinatura HDB de teste, montada somente nos serviços dev/CI e copiada pelo entrypoint para a base gravável; fixture PNG determinística de 63 bytes provada diretamente no mesmo daemon antes do HTTP. A via V1 real respondeu 201 para PNG limpo e 422 `evidence_rejected` para a fixture detectável.
- Limites reais: 1,5 MiB contra `MaxFileSize 1M` → `infected/scan_limit_exceeded`; 4 MiB contra `StreamMaxLength 3M` → `failed/stream_limit_misconfigured`. Execução completa: 8/8, 0 skip. Protocolo+topologia sem daemon: 23/23; `npm run check` e `git diff --check` verdes.
- M-R5r reproduzível: patch `AlertExceedsMax yes → no`, recriação somente de `erp-clamav-limits` com `--no-deps`, execução real 7/8 (caso MaxFileSize retornou `clean`); patch reverso e SHA-256 restaurado `34b08bb9…`; daemon recriado e verde 8/8.
- Docker ao fim: RSS 947,4 MiB (`erp-clamav`) e 945,5 MiB (`erp-clamav-limits`), commit livre 12,43 GB. Os dois containers foram parados/removidos por nome de serviço; volumes `w-avreal_erp_clamav_db` e `w-avreal_erp_clamav_limits_db` preservados. `erp-postgres`/`erp-redis` permaneceram healthy e intocados. Disco 25 GB livres.
- Falta: commit/push de F9; depois F10 (job CI). F11 não é executada por ordem explícita desta retomada.
- Próximo comando exato: `git add docker-compose.yml scripts/avreal-integration.mjs src/modules/evidence/clamav-scanner.ts tests/avreal-clamd-integration.test.ts tests/avreal-scanner-protocol.test.ts infra/clamav/test-signatures/erp-test.hdb docs/revisoes/SAN3/B-AV-REAL-dev.md && git commit -m "test(evidence): limites efetivos do clamd e 422 real pela via mobile (B-AV-REAL F9)"`.
- Arquivos incompletos: nenhum. Jobs/processos/containers próprios vivos: nenhum.

| F9 | M-R5r (`AlertExceedsMax no`) | `3a9b026f` | recriar só `erp-clamav-limits` + `AVREAL_CLAMAV_HOST=127.0.0.1 AVREAL_CLAMAV_LIMITS_PORT=3311 node scripts/avreal-integration.mjs` | 1/8 falhou: acima de MaxFileSize retornou `clean` | SHA-256 canônico `34b08bb9d3f7bbf39a877165b8f8c412f1034cdf6cc911557b4e4ef5ee685e5e` | 8/8 |

## RETOMADA 10

- UTC: `2026-10-31T13:57:12Z`.
- Executor/modelo: `dev-avreal-docker-sol`, Codex GPT-5.6 Sol, nível menor declarado; não planejou nem revisou.
- Worktree/ramo: `C:/Users/AMP/w-avreal` · `feat/evidence-clamav-scanner`.
- Base/head anterior: `13222ade` (F9 já no remoto).
- Vermelho-controle antes do código: job `antivirus` ausente (`grep '^  antivirus:'` → exit `1`).
- Implementado: job Ubuntu/Node 20 isolado, `npm ci`, subida sequencial dos dois serviços por nome com `--no-deps`, espera healthy até 8 min, integração real TAP 8/8 esperada, guard de zero teste/zero pulo, diagnósticos e remoção somente dos dois containers por nome; timeout total 20 min.
- Mutação CI reproduzível: patch removeu `AVREAL_CLAMAV_HOST`; o controle estrutural falhou exit `1` com `host obrigatório ausente`; patch reverso restaurou o SHA-256 `506c9f8d…` do workflow. O check-run real ainda será medido após o push deste checkpoint.
- Falta: commit/push, localizar o run do head e aguardar o job `antivirus` `completed/success`; depois registrar a confirmação da F10 antes de iniciar F12.
- Próximo comando exato: `git add .github/workflows/ci.yml docs/revisoes/SAN3/B-AV-REAL-dev.md && git commit -m "ci(antivirus): job que sobe o clamd do compose e exige a integração sem pulo (B-AV-REAL F10)" && git push origin feat/evidence-clamav-scanner`.
- Arquivos incompletos: nenhum. Jobs/containers/processos locais próprios vivos: nenhum.

| F10 | M-R11-CI (host obrigatório removido do job) | `13222ade` | controle estrutural do job | exit 1: `host obrigatório ausente` | SHA-256 canônico `506c9f8d8524a4dfef6c053c20f570f180b70838a658fa3d1eb163a288dc4237` | controle verde |

## RETOMADA 11

- UTC: `2026-10-31T18:08:40Z`.
- Executor/modelo: `dev-avreal-docker-sol`, Codex GPT-5.6 Sol, nível menor declarado; não planejou nem revisou.
- Worktree/ramo: `C:/Users/AMP/w-avreal` · `feat/evidence-clamav-scanner`.
- Base/head anterior: `023b565a0029a07f8a14f17d44d10ecc33d9484d` (F10 já no remoto); parcial de F12 medido antes de seguir: 8 arquivos permitidos, 64 inserções/3 remoções, `git diff --check` verde, 24 GB livres e nenhum container próprio vivo.
- Confirmação F10: run `41207885759`, job `antivirus` `completed/success` em 57 s, 8/8 sem pulo no head `023b565a`. O job global `backend` ficou vermelho por um único caso de protocolo prematuro; o caso foi reexecutado nas baterias focadas e ficou verde.
- Vermelho-controle F12: os quatro marcadores documentais não existiam no `HEAD` (`RED_HEAD_MISSING_API/DEPLOY/PEND/STATUS`). O parcial os introduziu em `API_CONTRACTS.md`, deployment/AWS/PD, `PLANO_SAN3`, pendências, status e log, sem tocar `Kpis/**`.
- M-F12: os quatro marcadores foram adulterados um a um (`B-AV-REA_`/`P-AVREA_`) e o guard ficou vermelho nos quatro; restauração confirmou os SHA-256 `0990ccf9…` (API), `738a2be1…` (deployment), `0225d907…` (pendências) e `eb2df00d…` (status), seguida do guard verde.
- Baterias focadas: suítes novas 72/72; regressões focadas 154/154; `npm run check`, `npm run lint`, `npm run build`, guard de migração (117/112/5, zero violação), `git diff --check`, lockfiles intactos e `frontend/`/`portals/`/`mobile/flutter_app/lib/` intactos.
- Suíte raiz local sem banco: 3.469 pass · 1 fail · 108 skip; causa isolada preexistente: `tests/core-saas-role-authority.test.ts` importa Prisma sem `DATABASE_URL` e não declara skip. Em execução isolada, esse arquivo reproduziu a falha; a suíte de protocolo passou 15/15. O job `backend` da CI usa PostgreSQL descartável e decide o head empurrado.
- Docker: F8/F9 já removeram `erp-clamav` e `erp-clamav-limits` por nome; volumes de assinaturas preservados. `erp-postgres`/`erp-redis` não foram alvo de leitura nem escrita.
- Falta: junta/revisão pelo orquestrador; este DEV não abre PR.
- Próximo comando exato: `git status --short && git rev-parse HEAD && gh run list --branch feat/evidence-clamav-scanner --limit 1`.
- Arquivos incompletos: nenhum. Jobs/processos/containers próprios vivos: nenhum.

| F12 | M-F12-API/DEPLOY/PEND/STATUS (marcadores adulterados) | `023b565a` | guard de presença dos quatro marcadores | quatro vermelhos nomeados | SHA-256 `0990ccf9…` · `738a2be1…` · `0225d907…` · `eb2df00d…` | quatro verdes + `git diff --check` |

PRONTO PARA JUNTA
