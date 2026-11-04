# C2 — isolamento e permissão

- Identidade: `jurado-j488-c2-sol`
- Modelo: Codex GPT-5.6 Sol — nível menor declarado
- Objeto: `ea6d4aef54181a0dc4030ec56e174e378aec5e12`
- Estado: CONCLUÍDO — REPROVADO

## Item 1 — isolamento (emenda §10, A8)

- **Comando:** `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55492/postgres node --test --import tsx tests/rec-01-domain-db.test.ts tests/rec-01-intent-service.test.ts`; depois, mutação literal em `impound-payment-prisma.repository.ts` de `where: { tenant_id: tenantId, process_id: processId }` para `where: { process_id: processId }` e reexecução de `tests/rec-01-domain-db.test.ts`; por fim, `grep -nE 'async (processExists|lockProcess|findById|listByProcess|findLiveByProcess)|assertRowsBelongToTenant' src/modules/impound-payments/{impound-payment-prisma.repository,impound-payment.service}.ts`.
- **Saída resumida:** base `18/18`, `fail 0`, `skipped 0`; T-ISO-db-1 afirmou conexão superusuária e retornou 404 para processo de B. Sob a mutação, `6/7`, `not ok 7 - T-ISO-db-1`, com `listByProcess trouxe a cobrança de B para A`; restauração deixou o diff do arquivo vazio. O catálogo do T-DOM-db-2 confirmou `relrowsecurity=true`, `relforcerowsecurity=true` e uma policy para `impound_payment_intents`. A inspeção do objeto mostra filtro `tenant_id` nas cinco leituras, mas `assertRowsBelongToTenant` só em `service.ts:101,163`; `findById` e `findLiveByProcess` devolvem linha sem passar pelo canário, e `processExists`/`lockProcess` também consomem linhas sem ele.
- **Veredito parcial:** **REPROVADO**. O filtro explícito, o 404, a RLS FORCE da tabela tenant-scoped e o vermelho-controle estão provados; porém a exigência desta cadeira de que toda leitura do repositório passe pelo canário não é satisfeita por todos os métodos expostos. Achado C2-1, não grave isoladamente porque os caminhos HTTP atuais usam `list()` e têm o canário, mas dentro do bloco.

## Item 2 — conta

- **Comando:** `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55492/postgres node --test --import tsx tests/rec-01-validators.test.ts tests/rec-01-domain-db.test.ts`; mutação literal em `assertIntentAccount` para aceitar `record.scope === "platform"`, seguida de `[SB] tests/rec-01-validators.test.ts`; e prova executável com `InMemoryImpoundPaymentRepository`/`ImpoundPaymentService`, ator A, portão aberto e porta resolvendo um UUID arbitrário apresentado como conexão de B.
- **Saída resumida:** base `14/14`, `fail 0`, `skipped 0`; T-DOM-27 recusou plataforma e T-DOM-db-7 confirmou 23514 para zero/duas conexões e aceitou exatamente uma, tanto na intenção quanto na referência. Sob a mutação de plataforma: `6/7`, `not ok 7 - T-DOM-27`, `expected account_not_allowed, got created pending`. Porém a prova de propriedade imprimiu `accepted:true,status:"pending"`: o serviço aceitou e armazenou qualquer UUID devolvido pela porta. As M-REC-1/2 têm apenas XOR/par de grupo; não há FK ou dado de proprietário da conexão neste objeto (a M-REC-14 foi adiada ao REC-04).
- **Veredito parcial:** **REPROVADO**. Plataforma e “exatamente uma conexão” estão protegidos e têm vermelho-controle, mas o objeto não consegue provar nem impor que a conexão pertence à organização do ator. Achado C2-2 **GRAVE · dentro-do-bloco**: com o canal aberto/injetado, a intenção pode nascer apontando para conta arbitrária, o que cruza organização e pode direcionar dinheiro à conta errada; o portão padrão fechado apenas torna o defeito dormente neste recorte.

## Item 3 — permissão, catálogo, DTO e ordem do portão

- **Comando:** `[SB] node --test --import tsx tests/rec-01-routes-permissions.test.ts tests/core-saas.test.ts tests/permission-catalog-migration-parity.test.ts`; `[UF] tests/core-saas-role-authority.test.ts`; `npm run db:seed` + `[DBP] tests/permission-catalog-db-parity.test.ts`; mutação literal adicionando `charging:online_payment` ao array do `operator`; e requisição HTTP real ao `app` com canal padrão desligado e corpo JSON malformado (`body: "{"`).
- **Saída resumida:** base `[SB] 35/35`, `[UF] 12/12`, `[DBP] 2/2`, todos `fail 0/skipped 0`. O `operator` recebeu 403, a distribuição coincidiu com `charging:settle`, snapshot/RBAC/migração/banco ficaram em paridade e T-DOM-16 provou documento mascarado e ausência de `tenant_id`/`externalChargeId`. Sob a mutação do operador: `29/32`, falhando o snapshot, T-DOM-13 e T-DOM-14. Já a requisição com canal desligado e JSON malformado devolveu `{"status":400}` e stack do `body-parser`; não chegou ao 422 `channel_disabled`, pois `src/app.ts:107` monta `express.json()` antes da rota em `src/app.ts:179`.
- **Veredito parcial:** **REPROVADO**. RBAC, 403, catálogos, banco, DTO e vermelho-controle estão corretos, mas a rota não responde 422 antes de ler o corpo na forma HTTP real. Achado C2-3 **MÉDIO · dentro-do-bloco**: T-DOM-17 cobre apenas JSON válido e não mede a ordem declarada; corpo malformado (e, pela mesma ordem, corpo acima do limite) é consumido pelo parser antes do portão.

## Fechamento e restauração

- **Comando:** confirmação de `HEAD`, `git status --porcelain`, `npm run check`, `[SB]` dos cinco arquivos REC-01, `[DB] tests/rec-01-domain-db.test.ts` e `git diff --check ceb62a07..HEAD`.
- **Saída resumida:** objeto `ea6d4aef54181a0dc4030ec56e174e378aec5e12`; worktree sem mutação; `check` exit 0; `[SB] 28/28`; `[DB] 7/7`; `diff --check` vazio.
- **Veredito final da cadeira:** **REPROVADO** — 3 achados dentro do bloco, sendo 1 GRAVE (C2-2) e 2 não graves (C2-1, C2-3).
