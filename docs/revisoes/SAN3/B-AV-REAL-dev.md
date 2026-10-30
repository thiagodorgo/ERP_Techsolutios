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

