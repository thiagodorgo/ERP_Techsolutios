# R-505 — revisor sênior no lugar da junta, PR #505 (B-ASS-03, medição diária da franquia), 2026-11-06

- **Decisão pontual do dono:** este bloco **não teve junta** (exceção PONTUAL ao `D-JUNTA-FLUXO-RAPIDO`, só para o B-ASS-03). No lugar: revisor sênior → conserto → conferência → porteiro, cada um com identidade nova (§C7.4-bis). Registrado em `decisoes.md` (`D-B-ASS-03-SEM-JUNTA-0511`, `D-REVISOR-SENIOR-505-0611`).
- **Objeto julgado pelo revisor:** head `0ca8bd5ea875d21696d02227689bf7ee6fdc4c00` (PR #505 antes do conserto). Base `origin/main` = `43716227`.
- **Dev:** DeepSeek nas fatias F0–F4 (até ficar sem saldo às 02:29) e Claude Opus (`dev-ass03-opus`) nas F5–F7. PR #505, CI 16/16.

## Revisor sênior (`rev-ass03-senior-opus`, 06/11 ~05:15 SP): REPROVADO

- **Identidade:** `rev-ass03-senior-opus` · Claude Opus 5.5 · subagente · identidade nova · esforço alto. Não planejou, não desenvolveu e não consertou nada no bloco.
- **Veredito:** REPROVADO — 2 GRAVES, 5 MÉDIAS e 6 BAIXAS; o isolamento entre organizações foi aprovado.

| ID | gravidade | escopo | achado |
|---|---|---|---|
| G-1 | GRAVE | dentro-do-bloco | o laço do job não isola a falha por organização: um erro numa organização deixa as seguintes sem medição na janela, sem catch-up |
| G-2 | GRAVE | dentro-do-bloco | tabela estourada gravava a soma parcial de banco, e o rateio deste PR consumia esse número |
| M-1 | MÉDIA | pré-existente (classe; `charge.jobs.ts:12-16`) | re-enfileirar no `finally` multiplica as cadeias do job |
| M-2 | MÉDIA | dentro-do-bloco | a mutação "filtrar papel" do R-MED-1 sobrevive |
| M-3 | MÉDIA | dentro-do-bloco | o `GREATEST` do SQL de produção não tem teste |
| M-4 | MÉDIA | dentro-do-bloco | o "byte a byte" do R-MED-3 falha ±6 bytes depois de VACUUM de outra organização; causa não medida |
| M-5 | MÉDIA | dentro-do-bloco | o job do teste mede organizações das outras suítes e quebra o teardown |
| B-2 | BAIXA | dentro-do-bloco | o canário `LIMIT 1` só pega bypass por acaso |
| B-3 | BAIXA | dentro-do-bloco | o T-MED-14 testa `measureDaily`, sem chamador; o filtro `platform` real não tem teste |
| B-4 | BAIXA | dentro-do-bloco | o SQL real de veículos não tem `-db` (conforme o plano) |
| B-5 | BAIXA | dentro-do-bloco | sem medição, o banco é rateado pelas ações mas gravado como `storage_usage_weight` |
| B-6 | BAIXA | dentro-do-bloco | a fixture do censo perdeu a quebra de linha final |
| B-7 | BAIXA | pré-existente (classe) | `(PD) sweep` vermelho só no head, pela concorrência no catálogo de papéis |

## Conserto único (`dev-ass03-opus`, `f443f6d9`) — da seção CONSERTO ÚNICO do relatório do dev

- Quem achou não consertou; o conserto é do dev (`dev-ass03-opus`), no head `f443f6d9d11663139854f8f7fd79f15f9de7662a`.
- **Consertados:** G-1 (`measureTenantsSequentially`, falha isolada por organização com `{tenantId, code}`); G-2 (`dbBytes = null` quando `tablesTimedOut.length > 0` + `COALESCE`); M-1 (handler não relança e re-enfileira UMA vez); M-2 (técnico de campo real no T-MED-db-1); M-3 (T-MED-db-12 prova o `GREATEST`); M-5 (`runSubscriptionMeasureDaily(now, { tenantIds })`); B-3 (T-MED-19 testa o filtro `platform` real); B-6 (quebra de linha devolvida). 5 mutações mortas.
- **Bateria do conserto:** memória 14/14; `-db` 9/9; guards + `san3-05` + `san3-04a` + rateio + bootstrap 104/104; `check`/`lint`/`build` verdes.

## Conferência (`conf-505`, 06/11 ~07:45 SP): CONFERIDO COM RESSALVA

- **Identidade:** `conf-505` · braço escolhido pela fila · esforço médio · identidade nova. Não fez, não revisou e não consertou nada.
- **Objeto:** head `f443f6d9d11663139854f8f7fd79f15f9de7662a`; o conserto é o diff `0ca8bd5e..f443f6d9` (9 arquivos, +248/−21, só os do conserto).
- Cada achado consertado foi medido de novo no head (G-1 com trava real de 7 s; G-2 NULL; M-1 `DELAYED n=1`; M-2/M-3/M-5/B-3/B-6 pelas suítes e mutações); 18/18 em memória; `npm run check` verde.

## Porteiro (`porteiro-505`, DeepSeek Pro): LIBERADO COM RESSALVA

- Merge `3470db1eab44b54014f4c9559418bbec70615bb5` (squash do head `f443f6d9`), 06/11 ~07:28 SP.
- Promessa × diff: 40 arquivos, todos no PERMITIDO; M2 com transação explícita e guard verde (124 migrações / 12 novas / 0 violações).
- CI do merge: backend 4530 testes / 4528 pass / 0 fail / 2 skipped; backend-postgres 503 / 503 / 0 / 0; `grep -c "^not ok"` = 0.
- Ressalvas: (1) este registro precisa carregar os pareceres do B-ASS-03, fechar `P-ASS-MEDICAO-FRANQUIA` e registrar as pendências não graves com dono; (2) o dev deve limpar o worktree `w-ass03` e os containers `devass03-pg`/`devass03-redis`.

## Papéis (§C7.4-bis)

- `rev-ass03-senior-opus` (achou) ≠ `dev-ass03-opus` (fez/consertou) ≠ `conf-505` (conferiu) ≠ `porteiro-505` (validou pós-merge). Quem achou não consertou; quem conferiu não fez nem consertou.

## Pendências não graves nascidas (registradas em `pendencias.md`)

- `P-ASS03-RMED3-VACUUM-6B` (M-4) → `B-ASS-04`;
- `P-ASS03-CANARIO-LIMIT1` (B-2) → `B-SAN3-05`;
- `P-ASS03-VEICULOS-SEM-DB` (B-4) → `B-ASS-12`;
- `P-ASS03-METODO-RATEIO-FALLBACK` (B-5) → `B-ASS-09a`;
- `P-ASS03-PD-SWEEP-CATALOGO` (B-7) → `B-SAN3-05`;
- `P-JOBS-REENFILEIRA-MULTIPLICA` (M-1 em `charge.jobs.ts`) → módulo de diárias.

## Primeiro dado para a análise da troca da junta

- O revisor sênior sozinho achou **2 graves reais**; a análise da troca vai junto com o estado das 07:00 (fala do dono de 06/11 ~00:45).
