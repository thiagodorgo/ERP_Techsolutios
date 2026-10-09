# B-OS-FILTRAR-EXPORTAR — relatório de desenvolvimento

> **Desenvolvedor:** `dev-b-os-filtrar-exportar` (não planejou; não revisa).
> **Papel:** `frontend-pixel-master`, subordinado ao plano e ao `CLAUDE.md` §11.
> **Modelo:** Codex GPT-5.6 Sol — substituição declarada por `D-FABLE-ASTRA-SO-DINHEIRO`; o bloco não toca dinheiro.
> **Worktree exclusivo:** `C:/Users/AMP/w-osfe` · ramo `feat/web-os-filtrar-exportar`.
> **Base de comparação do plano:** `c8af6458` · head inicial medido: `5d8d8f4d88127c16503f30ceca1eaf76458c8c13`.

## Evidência incremental (P1)

### Pré-voo de ref — CONCLUÍDO

- Comando: `git -C C:/Users/AMP/w-osfe rev-parse HEAD` e `git -C C:/Users/AMP/w-osfe ls-remote origin feat/web-os-filtrar-exportar`.
- Saída resumida: local = remoto = `5d8d8f4d88127c16503f30ceca1eaf76458c8c13` (N=2 refs, forma=SHA completo).
- Resultado: worktree e ramo remoto conferem com o prefixo esperado `5d8d8f4d`; desenvolvimento liberado.

### Preparação §8.0 — CONCLUÍDO

- Comando: `timeout 900 npm ci`; `timeout 900 npm --prefix frontend ci`; `DATABASE_URL=postgresql://gen:gen@127.0.0.1:5432/gen timeout 300 npm run db:generate` (variável restrita ao processo de geração).
- Saída resumida: raiz adicionou 326 pacotes (ec 0); frontend adicionou 103 pacotes (ec 0); Prisma Client 7.8.0 gerado em 3,00 s (ec 0). N=2 instalações próprias + 1 geração; nenhum banco/servidor iniciado.
- Resultado: dependências próprias do worktree prontas, sem junction, sem copiar `.env` e sem variável de banco persistida na sessão.

### Passo 1 — A4 + página consumidora — CONCLUÍDO

- Comando: `timeout 1200 npm --prefix frontend run test:smoke`.
- Saída resumida: TAP `# tests 1242`, `# pass 1242`, `# fail 0`, `# skipped 0`, ec 0; duração 154636 ms.
- Resultado: `WORK_ORDER_PRIORITY_LABEL` e `workOrderServiceLine` movidos para `work-orders-row.logic.ts`; a página consome as duas fontes únicas sem alteração visual/comportamental.

### Passo 2 — A5 + LT* + RL1 — CONCLUÍDO

- Comando: `cd frontend && timeout 600 node --test --import tsx tests/work-orders-list-tools.test.ts`; `timeout 600 npm --prefix frontend run check`.
- Saída resumida: arquivo puro `7/7`, 0 falha, 0 pulado (LT1–LT6 + RL1); TypeScript `tsc -b --noEmit` ec 0.
- Resultado: estado, atalhos, datas locais, limites ISO, contagem e intervalo invertido implementados; N=7 testes novos verdes.

### Passo 3 — A6 + EX* — CONCLUÍDO

- Comando: `cd frontend && timeout 600 node --test --import tsx tests/work-orders-list-tools.test.ts`; `timeout 600 npm --prefix frontend run check`.
- Saída resumida: arquivo puro `15/15`, 0 falha, 0 pulado (7 anteriores + EX1–EX8); TypeScript ec 0.
- Resultado: CSV em allowlist com 8 colunas, fórmula neutralizada, agenda absoluta, nome demonstrativo e matriz de disponibilidade implementados; N=8 testes novos do exportador verdes.

### Passo 4 — A3 + AD1 — CONCLUÍDO

- Comando: `cd frontend && timeout 600 node --test --import tsx tests/work-orders-list-tools.test.ts tests/work-orders.adapter.test.ts`.
- Saída resumida: TAP `24/24`, 0 falha, 0 pulado (15 ferramentas + 9 adaptador), ec 0.
- Resultado: filtro local usa `createdAt`, idêntico ao `created_at` filtrado pelo backend; AD1 prova agenda fora/abertura dentro e o inverso.

### Passo 5 — A2, guarda de ordem — CONCLUÍDO

- Comando: `cd frontend && timeout 600 node --test --import tsx tests/work-orders-page-live.test.tsx`.
- Saída resumida: página viva existente `13/13`, 0 falha, 0 pulado, ec 0.
- Resultado: cada busca recebe sequência crescente; resposta superada não toca estado nem flags. Os 13 casos anteriores permanecem verdes.

### Passo 6 — A7 + A8 — CONCLUÍDO

- Comando: `timeout 600 npm --prefix frontend run check`; `cd frontend && timeout 600 node --test --import tsx tests/pattern-css-guard.test.ts`.
- Saída resumida: TypeScript ec 0; guard CSS `3/3`, 0 falha, 0 pulado.
- Resultado: cartão acessível de 5 campos/ações criado só como apresentação; CSS acrescenta exclusivamente `.pat-btn--engaged` e `.pat-btn__count`, sem engolir regras pelo parser.

### Passo 7 — A1, integração da página — CONCLUÍDO

- Comando: `timeout 600 npm --prefix frontend run check`; `cd frontend && timeout 600 node --test --import tsx tests/work-orders-page-live.test.tsx`.
- Saída resumida: TypeScript ec 0; página viva anterior `13/13`, 0 falha, 0 pulado.
- Resultado: cabeçalho em ordem Filtrar · Exportar · Nova OS, estado memoizado por valor, cartão entre KPI e faixa, CSV das linhas filtradas e vazio honesto ligados à página; regressão viva anterior intacta.

### Passo 8 — A10 + A12 — CONCLUÍDO

- Comando parcial: `cd frontend && timeout 600 node --test --import tsx tests/work-orders-list-tools.test.ts tests/work-orders.adapter.test.ts tests/work-orders-page-live.test.tsx`.
- Saída resumida parcial: `47` testes, `46` passaram, `1` falhou; FE1–FE2 e FE4–FE10 verdes. FE3 falhou só porque `Blob.text()` no Node devolveu o cabeçalho sem o caractere BOM.
- Resultado parcial: **premissa falsa do plano registrada** — o Blob criado por `downloadCsv` contém BOM, mas `Blob.text()` o consome na decodificação UTF-8. A prova mede os bytes brutos `EF BB BF`; nenhum remédio no produto nem fora de A10.
- Comando final: o mesmo conjunto de três arquivos, após medir o BOM bruto.
- Saída resumida final: TAP `47/47`, 0 falha, 0 pulado, ec 0; FE1–FE10 verdes e os 13 casos vivos anteriores preservados.
- Resultado final: arnês registra URLs, eventos e downloads; `test:smoke` recebeu somente `tests/work-orders-list-tools.test.ts` ao fim da lista.

### Passo 9 — bateria, mutações, QA e limpeza — CONCLUÍDO COM DIVERGÊNCIAS DECLARADAS

- Comando: bateria §8.1 na ordem prescrita; 16 rodadas do protocolo §7.3; reexecução do bloco após restauração; inspeção e remoção dos artefatos gerados.
- Saída resumida: comandos 1–7 e 9–13 verdes; bloco restaurado `47/47`; mutações `16/16` vermelhas nos IDs previstos e `16/16` hashes restaurados; `npm test` raiz ec 1 em 7 casos fora do escopo; QA visual não executado.
- Resultado: implementação e provas específicas verdes. Foram removidos somente `C:/Users/AMP/w-osfe/frontend/dist` e `C:/Users/AMP/w-osfe/dist`, ambos resolvidos dentro do worktree. Nenhum servidor/browser/banco foi iniciado.

#### Bateria §8.1

| # | Comando | Resultado |
|---|---|---|
| 1 | `npm --prefix frontend run check` | ec 0 — `tsc -b --noEmit` |
| 2 | testes do bloco (3 arquivos) | `47/47`, 0 falha, 0 pulado, ec 0 |
| 3 | regressões frontend nomeadas | `191/191`, 0 falha, 0 pulado, ec 0 |
| 4 | `npm --prefix frontend run test:smoke` | `1268/1268`, 0 falha, 0 pulado, ec 0 |
| 5 | `npm --prefix frontend run build` | ec 0 — 2170 módulos, build Vite em 24,34 s |
| 6 | 3 contratos backend que leem frontend | `16/16`, 0 falha, 0 pulado, ec 0 |
| 7 | `npm run check` | ec 0 — `tsc -p tsconfig.json --noEmit` |
| 8 | `npm test` | **ec 1** — 287 arquivos; TAP `2705` testes, `2627` passaram, `7` falharam e `71` foram pulados. O runner também recusou o denominador porque `tests/core-saas-role-authority.test.ts` terminou sem teste/skip. Execução em `CORE_SAAS_PERSISTENCE=memory`, sem `DATABASE_URL`; divergência fora de A1–A13, sem remédio improvisado. |
| 9 | `npm run build` | ec 0 — `tsc -p tsconfig.json` |
| 10 | `node scripts/sync-agent-agents.mjs --check` | ec 0 — 33 agentes, espelho consistente |
| 11 | `git diff --check c8af6458...HEAD` | ec 0, sem saída (será repetido no head final) |
| 12 | escopo A1–A13 | Delta do desenvolvimento `5d8d8f4d...HEAD`: exatamente 13 caminhos A1–A13. A base prescrita `c8af6458...HEAD` também lista o plano e 2 arquivos de `agent-orchestration/controle/**`, já presentes no head inicial recebido; portanto essa premissa do plano é falsa para o ramo entregue. O dev não tocou esses 3 caminhos. |
| 13 | marcadores LT/EX/FE/AD/RL | `26` ocorrências, ec 0; piso ≥26 satisfeito |
| 14 | 16 mutações §7.3 | `16/16` suítes vermelhas nos IDs previstos; `16/16` hashes restaurados; bloco reexecutado depois em `47/47` |
| 15 | QA visual 1440×900 | **não feito** — esta sessão não dispõe de navegador/captura de página. Nenhum Vite foi iniciado; não há PID/porta a encerrar. Tokens, DOM e acessibilidade foram medidos pelos testes FE4/FE5/FE6 e guard CSS `3/3`. |

Diagnóstico nominal do item 8 (segunda execução, mesma contagem): `core-saas-role-authority.test.ts` (arquivo silencioso), dois jobs de evento de checklist, três casos de fila/worker Redis e um writer Redis (`not ok` 86, 639, 640, 1278–1280 e 2675). Nenhum caminho pertence a A1–A13; o item foi encerrado como premissa de baseline falsa, sem iniciar banco/Redis nem alterar o produto fora do plano.

O §8.1 sugere um segundo worktree em `C:/Users/AMP/w-osfe-base` para comparar a falha raiz. A ordem desta execução restringe toda atividade **somente** a `C:/Users/AMP/w-osfe`; por isso o dev não criou nem escreveu no segundo worktree. A investigação permitida ficou limitada à repetição nominal no mesmo worktree.

## Mutações §7.3

| Mutação | Testes esperados vermelhos | Hash inicial | Resultado | Hash restaurado |
|---|---|---|---|---|
| N-ISO-CRU | LT2, LT3, FE5 | `32388c0320cc06592baee7ce53725807f139b0bd` | ec 1; LT2, LT3 e FE5 vermelhos | sim, mesmo hash |
| N-FIM-DO-DIA | LT2, LT3, FE5 | `32388c0320cc06592baee7ce53725807f139b0bd` | ec 1; LT2, LT3 e FE5 vermelhos | sim, mesmo hash |
| N-DATA-AGENDA | AD1 | `3c3cebec14c1690392eb1a1a00f5c03125bfca44` | ec 1; AD1 vermelho | sim, mesmo hash |
| N-SEQ | FE7 | `6cb6d86449b2dadd0a79b8949d37dca100b7160f` | ec 1; FE7 vermelho | sim, mesmo hash |
| N-TICK | FE8 | `6cb6d86449b2dadd0a79b8949d37dca100b7160f` | ec 1; FE8 vermelho | sim, mesmo hash |
| N-STABLE | FE4, FE5, FE6, FE8 | `1a6cb6a12a4a0dfc0d7490f008a57caa69f9e832` | ec 1; FE4, FE5, FE6 e FE8 vermelhos | sim, mesmo hash |
| N-SELO | FE4 | `1a6cb6a12a4a0dfc0d7490f008a57caa69f9e832` | ec 1; FE4 vermelho | sim, mesmo hash |
| N-EXP-SEMPRE | FE2 | `1a6cb6a12a4a0dfc0d7490f008a57caa69f9e832` | ec 1; FE2 vermelho | sim, mesmo hash |
| N-403-MOSTRA | FE2, FE10 | `1a6cb6a12a4a0dfc0d7490f008a57caa69f9e832` | ec 1; FE2 e FE10 vermelhos | sim, mesmo hash |
| N-EXP-PAGINA | FE3 | `1a6cb6a12a4a0dfc0d7490f008a57caa69f9e832` | ec 1; FE3 vermelho | sim, mesmo hash |
| N-EXP-HOOK | FE9 | `1a6cb6a12a4a0dfc0d7490f008a57caa69f9e832` | ec 1; FE9 vermelho | sim, mesmo hash |
| N-VAZIO | FE6 | `1a6cb6a12a4a0dfc0d7490f008a57caa69f9e832` | ec 1; FE6 vermelho | sim, mesmo hash |
| N-FORMULA | EX4 | `1eef92c0aa8d38df6fc7d5f2067db9617659ba9c` | ec 1; EX4 vermelho | sim, mesmo hash |
| N-ID | EX1, EX3 | `1eef92c0aa8d38df6fc7d5f2067db9617659ba9c` | ec 1; EX1 e EX3 vermelhos | sim, mesmo hash |
| N-TEC | EX2, EX3 | `1eef92c0aa8d38df6fc7d5f2067db9617659ba9c` | ec 1; EX2 e EX3 vermelhos | sim, mesmo hash |
| N-HINT | EX6 | `1eef92c0aa8d38df6fc7d5f2067db9617659ba9c` | ec 1; EX6 vermelho | sim, mesmo hash |

## Checklist — B-OS-FILTRAR-EXPORTAR · desenvolvimento

**Solicitado:**

- [x] A1 — `WorkOrdersPage.tsx`: cabeçalho, filtros, vazio, exportação e comentários. Commit `19895df8`; FE1–FE10 no bloco `47/47`; mutações de página vermelhas e restauradas.
- [x] A2 — `useWorkOrders.ts`: guarda de ordem das respostas. Commit `8256d553`; FE7/FE8 verdes; N-SEQ/N-TICK vermelhas, hashes restaurados.
- [x] A3 — `work-orders.adapter.ts`: período por `createdAt`. Commit `8256d553`; AD1 verde em adaptador `9/9`; N-DATA-AGENDA vermelha, hash restaurado.
- [x] A4 — `work-orders-row.logic.ts`: rótulos de prioridade e linha do serviço. Commit `9e1c7837`; RL1 verde.
- [x] A5 — `work-orders-list-filters.ts`: estado e funções puras de filtro. Commit `6ea8c68f`; LT1–LT6 verdes; N-ISO-CRU/N-FIM-DO-DIA vermelhas, hashes restaurados.
- [x] A6 — `work-orders-export.ts`: CSV em allowlist e disponibilidade. Commit `bd408ee4`; EX1–EX8 verdes; N-FORMULA/N-ID/N-TEC/N-HINT vermelhas, hashes restaurados.
- [x] A7 — `WorkOrdersListFilterCard.tsx`: cartão de filtros acessível. Commit `19895df8`; FE4/FE5 verdes.
- [x] A8 — `app.css`: somente `.pat-btn--engaged` e `.pat-btn__count`. Commit `19895df8`; guard CSS `3/3`.
- [x] A9 — `work-orders-list-tools.test.ts`: LT*, RL1 e EX*. Commits `6ea8c68f` e `bd408ee4`; arquivo `15/15`, com 26 marcadores totais no bloco.
- [x] A10 — `work-orders-page-live.test.tsx`: FE1–FE10 e arnês mínimo. Commit `16c6a055`; página `23/23` (13 anteriores + 10 novos), bloco `47/47`.
- [x] A11 — `work-orders.adapter.test.ts`: AD1. Commit `8256d553`; adaptador `9/9`.
- [x] A12 — `frontend/package.json`: teste puro ao fim de `test:smoke`. Commit `16c6a055`; smoke `1268/1268`.
- [x] A13 — este relatório incremental e checklist final. Evidência presente em todos os seis commits de implementação e no commit de fechamento documental.

**Feito:** A1–A13 implementados. A bateria específica passou com bloco `47/47`, regressões `191/191`, smoke `1268/1268`, contratos backend-front `16/16`, builds/checks verdes e 16 mutações eficazes com restauração integral.

**Não feito / divergências:** QA visual não feito por ausência de navegador/captura na sessão. `npm test` raiz falhou em 7 casos fora de A1–A13 (eventos/Redis e arquivo silencioso), reproduzidos nominalmente; a comparação em segundo worktree prescrita no plano conflita com a ordem explícita de trabalhar somente em `C:/Users/AMP/w-osfe` e não foi feita. `Blob.text()` remove o BOM na decodificação, embora os bytes `EF BB BF` estejam no arquivo; FE3 mede os bytes. A base `c8af6458` inclui plano + dois `controle/**` já presentes no head inicial; o delta desta identidade desde `5d8d8f4d` é exatamente A1–A13.

**Validação:** §8.1: itens 1–7 e 9–13 passaram; item 8 ficou vermelho em `2705` testes (`2627` pass, `7` fail, `71` skipped), fora do escopo; item 14 teve `16/16` mutações vermelhas e restauradas; item 15 não foi executado. A suíte do bloco após as mutações voltou a `47/47`.

**Head empurrado:** será confirmado por `git ls-remote origin feat/web-os-filtrar-exportar` após o commit deste fechamento; o SHA completo consta na mensagem final, pois um commit não pode conter o próprio hash sem alterar esse hash.

**Próximos passos (análise):** o revisor deve olhar com mais atenção a semântica de data local/UTC nos limites do período, a corrida de respostas e do auto-refresh, a allowlist/neutralização do CSV, os gates no 403 e a ausência de nomes de técnico no DTO. Deve também decidir como tratar o baseline raiz vermelho antes de exigir CI totalmente verde e realizar o QA visual 1440×900 que esta sessão não conseguiu capturar.
