# Mandatos da junta J-B-AV-REAL, PR #477

**Objeto:** `2746eb6055abcdab863a2d1ce3c7cb2a8a5f6c77`, head do ramo `feat/evidence-clamav-scanner`, com todos os check-runs concluídos e verdes (medido em 31/10, 18:28 SP). Base: `origin/main`, 0 commits à frente do objeto. Plano: `docs/revisoes/SAN3/B-AV-REAL-plano.md` no objeto, §3 e §5. Fluxo: `D-JUNTA-FLUXO-RAPIDO`, §C7 item 10, uma votação só. Quórum: unanimidade de 3. Modelo: Claude Opus, nível menor, declarado no voto; o Codex está sem saldo até 04/11 e o dono mandou o Claude cobrir ("cubra").

**Papéis:** planejador, dev das fatias (`dev-avreal-sol`, `dev-avreal-docker-sol`), pré-revisor (`prerev-avreal-sol`), dev do conserto (`fix-avreal-opus`) e o orquestrador, que fez os 4 commits finais do job `antivirus`, não votam.

**Contexto declarado, a medir e não herdar:** a pré-revisão achou 5 simples, consertados. Depois, descobriu-se que o job `antivirus` ficava `success` com `not ok 8`. Os commits `bf24bb2b` e `2746eb60` o corrigiram; o orquestrador os escreveu, então trate-os como qualquer outro código. O CI mostrou `failure` em `bf24bb2b` e 8/8 em `2746eb60`.

## Modelo de mandato (vale para todas as cadeiras)
Após CADA item: apense a `<cadeira>-evidencia.md` → comando · saída resumida · veredito parcial. [P1]
Antes da mensagem final: escreva `<cadeira>-voto.json`. Mensagem final = 1 linha apontando o arquivo. [P2]
Máximo 3 itens; logs longos só no arquivo de evidência. [P4]
Se você substituir um caído: re-execute cada comando do `<cadeira>-evidencia.md` dele e compare, depois meça a cauda. Conclusão sem comando registrado NÃO é insumo. [P3]
Se receber PAUSA: termine o comando em curso, grave `## PAUSA <hora UTC>` em `<cadeira>-evidencia.md` (head · feito · falta · próximo comando · arquivos meio-escritos) e pare sozinho com 1 linha apontando o arquivo. Não inicie item novo. [P7]

**Arquivos da junta:** `C:/Users/AMP/erp-pausa-2026-10-03/juntas/J-B-AV-REAL/`.

**Voto (`<cadeira>-voto.json`):** `{ "cadeira", "identidade", "modelo", "objeto", "voto": "aprova" | "reprova", "arquivos_medidos": [...], "achados": [{ "id", "titulo", "gravidade": "bloqueia" | "ressalva", "escopo": "dentro-do-bloco" | "pre-existente", "evidencia_de_escopo", "comando", "saida" }] }`. Reprova só com `bloqueia` `dentro-do-bloco`. Escopo `pre-existente` sem evidência de data ou origem conta como `dentro-do-bloco`. **Lista completa de uma vez, cada achado com o comando que o reproduz.** Não proponha correção (§C7.4-bis). "Não consigo medir" = reprova. Vermelho-controle em cada item.

**Terreno de cada cadeira:** worktree próprio e detached no objeto, com `npm ci` próprio, sem junction de `node_modules`, removido ao fim por `git worktree remove --force`. `clamd` descartável em projeto compose `-p j-avreal-c<n>`, subido por nome de serviço com `--no-deps`, removido ao fim. Nunca `erp-postgres` nem `erp-redis`, nunca as portas 5432/6379/3000/5173/5050/8899, nada de `prune`. Se precisar de banco, Postgres próprio em porta alta. Commit de memória livre abaixo de 4 GB: pare e registre. Disco abaixo de 7,5 GB: pare. Sonda fica fora do worktree, nesta pasta.

## C1, segurança e protocolo (competência `agente-secops`)
Worktree `C:/Users/AMP/w-jav1`.
1. R1 + R12(a): config, factory, censo.
2. R2 + R3 + R8b: fio, parser, privacidade.
3. R4 + R5u + R10u + R13: tempo, limites, idade da base; inclui o conserto S5 (teto cobre a fase `VERSION`).

`arquivos_medidos`: `src/modules/evidence/clamav-scanner.ts`, `src/modules/evidence/evidence-scanner.factory.ts`, `src/config/env.ts`, `tests/avreal-scanner-protocol.test.ts`, `tests/avreal-scanner-failures.test.ts`, `tests/avreal-config.test.ts`, `tests/avreal-signatures.test.ts`, `tests/avreal-privacy.test.ts`, `tests/avreal-scanner-census.test.ts`, `tests/o6r07b-scanner-failclosed.test.ts`.

## C2, contratos, preservação e superfície
Worktree `C:/Users/AMP/w-jav2`.
1. R6: as 5 vias e as regressões.
2. R7: B-108, Flutter, blob preservado em toda recusa.
3. R8a + R12(b): topologia, nenhuma porta pública, lockfile; a mutação R12(b) corrigida em S3 tem de morder.

`arquivos_medidos`: `src/modules/evidence/upload-gate.ts`, `tests/avreal-routes.test.ts`, `tests/avreal-compose-topology.test.ts`, `docker-compose.yml`, `docker-compose.clamav.yml`, `package.json`, `package-lock.json`, `mobile/flutter_app/test/features/b108_evidence_storage_hardening_test.dart`.

## C3, operação e daemon real
Worktree `C:/Users/AMP/w-jav3`. Exige Docker.
1. R9: daemon real, limpo, EICAR, pane, recuperação, saturação, HTTP 201/422.
2. R5r + R10r: limites efetivos, `VERSION` real, config efetiva do digest; S4 (`eol=lf`, `clamd` sobe no Windows).
3. R11 + registro: script, job `antivirus` inteiro (`pipefail`, guard de falha, `db:generate`, e o `DATABASE_URL` de geração não vaza nem acende nada), digest igual nos dois arquivos, `PLANO_SAN3` l.191/270, pendências, `docs/deployment.md`, e a correção do relatório do dev.

`arquivos_medidos`: `infra/clamav/**`, `scripts/avreal-integration.mjs`, `tests/avreal-clamd-integration.test.ts`, `.github/workflows/ci.yml`, `docs/**`, `agent-orchestration/**`.
