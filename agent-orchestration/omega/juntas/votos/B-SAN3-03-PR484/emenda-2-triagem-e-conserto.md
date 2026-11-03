# B-SAN3-03 — Emenda 2: conserto da pré-revisão do PR #484

- **Autor:** orquestrador, Claude Opus 5.5, no papel de topo. O Fable está suspenso; a troca está declarada conforme §C7.6-bis.
- **Verificador previsto:** Codex GPT-5.6 Sol (crítica por execução, item 11(1) e 11(4)).
- **Insumo:** `revisoes/prerev-san303-parecer.md`, `prerev-san303-sol` (Codex), objeto `49ddd0f8`.
- **Vale acima de:** `B-SAN3-03-plano.md` e `B-SAN3-03-emenda-1.md`, só no que está escrito aqui.
- **Quem acha não conserta (§C7.4-bis):** quem achou foi `prerev-san303-sol`, e o dev desta emenda é uma identidade nova. Quem planeja é o orquestrador, que não achou nada.

## 1. Triagem (§C7 item 10(3))

| Achado | Gravidade | Escopo | Destino |
|---|---|---|---|
| A1 — o resumo com uma só ponta do período responde por outro mês | GRAVE (erra dinheiro) | dentro do PR | conserto agora (C1) |
| A2 — a M28 não morde | não grave | dentro do PR | emenda: a M28 é **equivalente** (§3) e sai da lista, com prova (C3) |
| A3 — 2 arquivos fora do PERMITIDO literal | não grave | dentro do PR | a emenda os declara permitidos (§4); não muda código |
| A4 — linha em branco no fim do arquivo | não grave, simples | dentro do PR | conserto na mesma leva (C4) |
| A5 — tag pelo nome manda custo para outra organização | GRAVE (erra dinheiro entre organizações) | pré-existente (`6f27faae`, 08/06) | **conserto agora (C2)**, leitura declarada abaixo |
| A6 — a barreira do T-K11h não é determinística | não grave | pré-existente (#456) | pendência `P-TK11H-BARREIRA-FASE`, dona a trilha financeira (B-SAN3-12x); não segura o bloco |

**Leitura do orquestrador sobre o A5, declarada (§A6).** O §C7.1-ter(a) não reprova o que é pré-existente. Mesmo assim, o item 10(3) manda consertar agora o que é grave. Além disso, o motor de rateio é o objeto do próprio bloco ("rateio exato") e já está no PERMITIDO dele (M32 engine). Mergear um "rateio exato" que pode cobrar uma organização pelo custo de outra contraria o próprio bloco. Por isso o conserto entra neste PR.

## 2. Decisões de desenho

### D-E2-1 (A1): uma ponta só no resumo é recusada

`getAllocationSummary` (no serviço, para valer em memória e no Postgres) recusa quando vem **exatamente uma** das pontas `periodStart`/`periodEnd`:

- erro: `CloudCostAllocationError(400, "CLOUD_COST_ALLOCATION_INVALID_PERIOD", "summary_period_incomplete", ...)`;
- a rota devolve **400** com esse `code`;
- sem nenhuma ponta, o comportamento segue como hoje; com as duas, também (R12 da emenda 1).

A recusa fica fora do `parseRunFilters`: a listagem de runs continua aceitando uma ponta só, porque lá é filtro e não afirmação de período. O front (`cloud-billing.adapter.ts:18`) sempre manda as duas pontas, então o front não muda.

### D-E2-2 (A5): tag ambígua não aloca, e falha fechada

No motor (`cloud-cost-allocation.engine.ts`):

- O índice passa a ser **chave → conjunto de ids de organização**. As chaves são o id, o nome e o slug, todos em minúsculas, como hoje, para não quebrar a M22.
- Uma chave que aponta para **mais de uma** organização é **ambígua**. Isso inclui colisão entre campos: o nome de A igual ao slug ou ao id de B.
- Linha cuja tag é ambígua:
  - vai para `unallocated` com o motivo **`ambiguous_tenant_tag`**, nas **duas** estratégias;
  - o teste de ambiguidade vem **antes** do teste da plataforma;
  - não cai na regra nem no rateio por uso, porque espalhar entre todos cobraria quem não usou.
- A soma continua fechando (`assertConservation`): o custo vai para o não alocado, visível no resumo por motivo.
- Tag por id ou por slug único continua indo direto para a organização certa, mesmo que os nomes colidam.
- Sem migração: `Tenant.slug` já é `@unique` e `Tenant.name` não é. `prisma/**` continua PROIBIDO.

## 3. A M28 é equivalente (A2)

Mutante: `roundCost(fromMicro(value))` → `fromMicro(value)` em `service.ts:255`. `value` é um `bigint` de micros, e `fromMicro(n) = Number(n) / 1_000_000`.

Para `|n| < 2^53`:
- a divisão IEEE devolve o double mais próximo de n/10⁶;
- `toFixed(6)` desse double reproduz o decimal n/10⁶;
- `Number()` devolve o mesmo double.

Logo, `roundCost(fromMicro(n)) === fromMicro(n)`, e nenhum teste pode distinguir os dois. A M28 sai da lista de mutações obrigatórias **por esta emenda**, com prova executada (C3). O `roundCost` fica no código, porque tirá-lo não é conserto.

## 4. Escopo do conserto

**PERMITIDO:**
- `src/modules/cloud-cost-allocation/cloud-cost-allocation.{engine,service,routes,types}.ts`;
- `tests/san3-03-summary.test.ts`, `tests/cloud-cost-allocation-routes.test.ts`, `tests/san3-03-system-org-db.test.ts`;
- o novo `tests/san3-03-tenant-tag.test.ts`;
- `API_CONTRACTS.md`, só a seção de alocação de custo de nuvem;
- `agent-orchestration/codex/comandos/B-SAN3-03-cloud-billing-exato.md`, só a linha em branco final;
- `agent-orchestration/controle/pendencias.md` e `pendencias-indice.md`, regenerado pelo `gerar-indice-pendencias.py`;
- `docs/revisoes/SAN3/B-SAN3-03-dev.md`.

Isto também resolve o A3: os dois arquivos ficam declarados.

**PROIBIDO:** `prisma/**`, `migrations/**`, `frontend/**`, `Kpis/**`, lockfiles, `.github/**`, `src/modules/cloud-charges/**`, dependência nova, qualquer outro arquivo.

## 5. Fatias, em ordem, uma por vez, cada uma com commit, push e `## RETOMADA n` no relatório

### C1, A1: período incompleto

- **Testes:**
  - novo T-SUM-7 em `san3-03-summary.test.ts`: só `periodStart` → erro `summary_period_incomplete`; só `periodEnd` → o mesmo erro; com as duas pontas ou sem nenhuma, o resultado é o de hoje. Os dados são os do parecer §4.1: run de novembro, valor 999, e o pedido é só `periodStart=2026-10-01`;
  - em `cloud-cost-allocation-routes.test.ts`: `GET /summary?periodStart=2026-10-01` → **400** com `code=CLOUD_COST_ALLOCATION_INVALID_PERIOD`.
- **Vermelho-controle:** os dois testes falham no `49ddd0f8` antes do conserto. Registre a saída.
- **Mutações (todas vermelhas):**
  - **M47:** apagar a recusa → T-SUM-7 e o teste da rota;
  - **M47-b:** recusar só quando falta o `periodEnd` → o caso "só `periodEnd`";
  - **M47-c:** mover a recusa para o `parseRunFilters` → um caso novo T-RUN-1 em `cloud-cost-allocation-routes.test.ts` (listar runs com uma ponta só segue 200), que tem de existir e ficar vermelho.

### C2, A5: tag ambígua

- **Testes (novo `tests/san3-03-tenant-tag.test.ts`, motor e serviço em memória):**
  - T-TAG-1: duas organizações com nome `Duplicada` e tag `duplicada`, nas ordens `[A,B]` e `[B,A]` → 0 alocação para A e para B; `unallocated` com `ambiguous_tenant_tag` no valor da linha; conservação fecha;
  - T-TAG-2: o nome de A igual ao slug de B → ambígua;
  - T-TAG-3: tag pelo slug único de A, com nomes colidindo → direto para A;
  - T-TAG-4: tag pelo id de A → direto para A;
  - T-TAG-5: colisão em que uma das organizações é a plataforma → `unallocated` ambígua, `platformCost` 0;
  - T-TAG-6: o resumo mostra `ambiguous_tenant_tag` em `unallocatedByReason`, e a soma por motivo bate com `totalUnallocatedCost`;
  - T-TAG-7: a estratégia só por uso com tag ambígua → a mesma recusa;
  - **-db:** um caso em `san3-03-system-org-db.test.ts`, no Postgres descartável, com duas organizações de mesmo nome → nenhuma `TenantCloudCostAllocation` para elas, e o motivo persistido no run.
- **Vermelho-controle:** T-TAG-1, T-TAG-2, T-TAG-5, T-TAG-7 e o caso -db falham no `49ddd0f8`.
- **Mutações (todas vermelhas):**
  - **M48:** voltar ao `Map` em que a última organização vence → T-TAG-1;
  - **M49:** ambiguidade medida só dentro do campo nome → T-TAG-2;
  - **M50:** a tag ambígua cai na regra ou no uso → T-TAG-1 e T-TAG-6;
  - **M51:** o teste da plataforma antes do da ambiguidade → T-TAG-5;
  - **M52:** a ambiguidade só na estratégia padrão → T-TAG-7.
- A M22 (`casa só por slug`) e a M17-b continuam vermelhas: rode as duas de novo.

### C3, A2: prova da equivalência da M28

- Script fora do repositório, em `C:/Users/thiag/erp-pausa-2026-10-03/revisoes/san303-m28-equivalencia.mjs`. Ele confere `Number((Number(n)/1e6).toFixed(6)) === Number(n)/1e6` para:
  - todo `n` em [−10⁶, 10⁶];
  - 10⁶ valores pseudoaleatórios até 10¹⁵;
  - as bordas 2^53 − 1 e −(2^53 − 1).
- Grave o comando, a contagem e "0 divergência" no relatório. Divergência ≠ 0 → `## PAUSA` e devolve.
- Não muda código.

### C4, A3, A4 e A6: registro

- Tirar a linha em branco final do comando do bloco: `git diff --check origin/main...HEAD` fica vazio.
- Abrir em `pendencias.md`:
  - `P-TK11H-BARREIRA-FASE` (A6, com a frequência 1/30 e a origem #456);
  - uma nota em `B-SAN3-03` com A5 e A1 fechados por esta emenda.
- Regenerar o índice com o gerador.
- Atualizar `API_CONTRACTS.md`: o 400 do resumo e o motivo `ambiguous_tenant_tag`.

## 6. Bateria de fechamento

- `npm run check`, `npm run lint`, `npm run build`;
- a bateria dirigida do §4.3 da emenda 1 mais os arquivos acima;
- o `-db` do bloco no Postgres descartável próprio;
- as mutações da emenda 1 sem a M28, mais M47 a M52, pelo driver `revisoes/prerev-san303-mutations.mjs` estendido. Cada mutação roda sozinha, com restauração por hash e `git status` vazio;
- `node scripts/sync-agent-agents.mjs --check`;
- `git diff --check origin/main...HEAD`;
- no CI do head novo: os 16 check-runs concluídos e verdes, lidos pelo resumo TAP e não pela cor (item 11(3)).

Depois do CI: conferência por um verificador **Claude** (item 11(1)); em seguida, junta completa (bloco de dinheiro), uma vez só (item 10(3)).

## 7. Correção da crítica (`crit-san303-e2-sol`, Codex, `revisoes/crit-san303-e2-parecer.md`, REPROVADO)

Quem corrige é o autor (Claude Opus, topo declarado), e quem verifica de novo é o Codex (item 11). Os três achados procedem. As seções §2 e §5 valem com os acréscimos abaixo; onde divergirem, vale esta seção.

### E2-A1 (GRAVE): tag com espaço contorna a ambiguidade

- **D-E2-2 passa a normalizar.** Toda chave do índice e toda tag consultada passam pela mesma função, no motor:
  ```ts
  function normalizeTenantTag(value: string): string {
    return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
  }
  ```
- **O índice tem esta forma literal**, para as mutações serem literais:
  ```ts
  for (const tenant of input.tenants) {
    addTenantTag(tenantIdsByTag, tenant.id, tenant.id);
    addTenantTag(tenantIdsByTag, tenant.name, tenant.id);
    if (tenant.slug) addTenantTag(tenantIdsByTag, tenant.slug, tenant.id);
  }
  ```
  `addTenantTag` normaliza a chave e acrescenta o id a um `Set`. Tag vazia depois de normalizada equivale a sem tag.
- **Tag que não casa com nenhuma organização** segue o comportamento de hoje (regra ou rateio por uso). Isto é declarado, não mudado: alterar o destino do custo com tag desconhecida é decisão de produto e vira a pendência `P-SAN303-TAG-DESCONHECIDA`, a perguntar ao dono. O que este bloco garante é que **nenhuma grafia** de uma chave ambígua (caixa, espaço nas pontas, espaço repetido ou NBSP, largura total) escapa da recusa.
- **Testes novos:**
  - T-TAG-8: com as organizações do parecer §1.2 (A nome `Duplicada`, B slug `duplicada`), as tags `" Duplicada "`, `"Duplicada\t"`, `"DUPLICADA\u00A0"` e `"ＤＵＰＬＩＣＡＤＡ"` (largura total) dão `ambiguous_tenant_tag` com o valor inteiro: nenhuma alocação para A nem para B, e plataforma 0. O mesmo vale na estratégia só por uso;
  - T-TAG-9: a tag `"  alpha "` (slug único de A, com espaços) vai direto para A.
- **Mutações:**
  - **M53:** `normalizeTenantTag` sem o `.trim().replace(/\s+/g, " ")` → T-TAG-8;
  - **M53-b:** sem o `.normalize("NFKC")` → o caso de largura total do T-TAG-8;
  - **M53-c:** a consulta da linha usa `line.tenantTag.toLowerCase()` em vez de `normalizeTenantTag(line.tenantTag)` → T-TAG-8.

### E2-A2 (GRAVE): ponta vazia ou inválida reabre o A1 na rota

- **D-E2-1 passa a valer também no parser do resumo.** A rota `/summary` usa um parser próprio, `parseSummaryFilters`. Uma chave `periodStart` ou `periodEnd` **presente** na query que não seja uma data válida e única é recusada com 400, `CLOUD_COST_ALLOCATION_INVALID_PERIOD`, motivo `summary_period_invalid`. Isso inclui valor vazio, texto inválido e valor repetido (array).
- Ausente é ausente. A recusa de uma ponta só (`summary_period_incomplete`) continua no serviço.
- A listagem de runs (`parseRunFilters`) não muda; o T-RUN-1 a protege. Data inválida na listagem continua ignorada; isso é declarado e não é dinheiro afirmado.
- **Testes novos** em `cloud-cost-allocation-routes.test.ts`, com a run do parecer §1.3 (junho, total 15):
  - T-SUM-8: cada um destes pedidos dá 400 `summary_period_invalid`, nunca 200 com 15:
    - `periodStart=`;
    - `periodStart=nao-e-data`;
    - `periodStart=2026-06-01&periodEnd=`;
    - `periodStart=2026-06-01&periodStart=2026-07-01&periodEnd=2026-06-30`.
  - Sem query, o resultado é o de hoje; com as duas pontas válidas, também.
- **Mutações:**
  - **M54:** `/summary` volta a usar `parseRunFilters` → T-SUM-8;
  - **M54-b:** a recusa só para valor não vazio → o caso `periodStart=` do T-SUM-8;
  - **M54-c:** array aceito pelo primeiro elemento → o caso repetido do T-SUM-8.

### E2-A3 (não grave): a M22 não é literal

- Com o índice literal acima, a **M22′** apaga as duas linhas
  `addTenantTag(tenantIdsByTag, tenant.id, tenant.id);` e
  `addTenantTag(tenantIdsByTag, tenant.name, tenant.id);`
  e T-SYS-2 fica vermelho. A **M49′** (ambiguidade só dentro do nome) é escrita contra o mesmo índice e deixa T-TAG-2 vermelho.
- Toda mutação da emenda 1 cuja âncora o conserto mudar ganha a forma `′` literal no relatório do dev, com âncora contada (=1). Âncora 0 é `## PAUSA`, nunca "equivalente presumido".

### Escopo

Igual ao §4. Os achados cabem em `engine.ts`, `routes.ts` e nos testes já permitidos.

## 8. Correção da 2ª crítica (`crit-san303-e2b-sol`, Codex, `revisoes/crit-san303-e2b-parecer.md`, REPROVADO)

Quem corrige é o autor (Claude Opus, topo declarado). O crítico teve as duas rodadas que o contrato permite; daqui o conserto segue para o dev, e quem verifica é a conferência Claude e a junta completa. As seções §2, §5 e §7 valem com o que segue; onde divergirem, vale esta seção.

### E2B-A1 (GRAVE): tag desconhecida cobra outras organizações

- **Decisão do autor, declarada (§A6):** isto revoga o "comportamento de hoje" do §7. A base é o item 10(3), que manda consertar agora o que é grave. A mesma direção estava na recomendação dada ao dono no estado de 02/11, às 22:20. O dono pode reverter, e a `P-SAN303-TAG-DESCONHECIDA` vira registro dessa leitura.
- **Regra.** Na estratégia `direct_tag_then_usage_weighted_v1`, uma linha cuja tag **não é vazia** depois de `normalizeTenantTag` e **não casa** com organização nenhuma vai para `unallocated` com o motivo **`unknown_tenant_tag`**, com o valor inteiro. Ela não cai na regra nem no rateio por uso.
- **Não muda:**
  - linha sem tag, ou com tag vazia depois de normalizada: segue para regra ou uso, como hoje;
  - a estratégia só por uso: ela ignora tag por definição, inclusive tag válida, então ignorar a desconhecida é coerente. A tag ambígua continua recusada nas duas estratégias (§7).
- **Ordem no motor:** ambígua → desconhecida → plataforma → direta → regra/uso.
- **Testes:**
  - T-TAG-10: `tenantTag="nao-existe"`, custo 10, organizações e bases do parecer §6 → `unallocated` 10 com `unknown_tenant_tag`; A, B e plataforma recebem 0; a conservação fecha;
  - T-TAG-11: a mesma linha na estratégia só por uso → rateio como hoje;
  - T-TAG-12: tag `"   "` (só espaço) → tratada como sem tag;
  - T-TAG-13: o resumo lista `unknown_tenant_tag` em `unallocatedByReason`.
- **Mutações:**
  - **M55:** apagar o ramo `unknown_tenant_tag` → T-TAG-10;
  - **M55-b:** aplicar a recusa também na estratégia só por uso → T-TAG-11;
  - **M55-c:** tratar tag só de espaço como desconhecida → T-TAG-12.
- O `API_CONTRACTS.md` ganha o motivo `unknown_tenant_tag`.

### E2B-A2 (GRAVE): data impossível normalizada

- **"Data válida" passa a ser estrita.** `parseSummaryFilters` aceita só `AAAA-MM-DD`, ou um ISO completo que comece por ele, e só se a data **sobrevive à ida e volta**: `new Date(\`${AAAA-MM-DD}T00:00:00.000Z\`).toISOString().slice(0, 10) === AAAA-MM-DD`. Assim, 31/02, 30/02 e 32/01 dão 400 `summary_period_invalid`.
- **T-SUM-8** ganha os casos `periodStart=2026-02-31&periodEnd=2026-03-31` (a sonda do parecer: run de março, total 77, nunca 200), `2026-13-01` e `2026-00-10`. Um ano bissexto válido (`2028-02-29`) passa.
- **Mutação M56:** voltar a `new Date(raw)` sem a ida e volta → o caso 31/02 do T-SUM-8.

### E2B-A3 (não grave): a prova da M28 tinha premissa falsa

O §3 fica com a prova correta, em dois regimes. Seja `x = fromMicro(n)`, o double mais próximo de n/10⁶, com `|n| < 2^53`.

- **Quando o espaçamento dos doubles perto de x é menor que 10⁻⁶:** |x − n/10⁶| ≤ ulp/2 < 0,5·10⁻⁶. Então `toFixed(6)` dá exatamente o decimal n/10⁶, e `Number()` volta ao double mais próximo dele, que é x.
- **Quando o espaçamento é maior ou igual a 10⁻⁶** (|x| ≳ 2^33): `toFixed(6)` dá um decimal s com |s − x| ≤ 0,5·10⁻⁶ ≤ ulp/2, e o double mais próximo de s volta a ser x. Na borda 2^53 − 1, s é `.740992`, não `.740991`, mas `Number(s) === x`.

Em resumo: o que se prova é `Number(x.toFixed(6)) === x`, não que o texto reproduz n/10⁶. As 8.000.003 entradas sem divergência ficam como evidência, e a M28 continua fora por equivalência.

## 9. Escopo das mutações temporárias (PAUSA do dev, 2026-11-03 01:47 UTC)

- O dev parou certo. As mutações obrigatórias da emenda 1 (M1, M6–M11, M17-b, M46 e outras) alteram arquivos fora do PERMITIDO do §4, como `cloud-cost-allocation.repository.ts` e `src/modules/cloud-charges/cloud-charge-prisma.repository.ts`.
- **Conciliação do autor:** o PERMITIDO e o PROIBIDO do §4 valem para o **diff commitado** do bloco. Uma mutação **temporária** pode alterar, só durante a sua fatia, o arquivo exato que o driver `revisoes/prerev-san303-mutations.mjs` nomeia, desde que cumpra três condições:
  1. seja aplicada por âncora única;
  2. seja executada só na fatia dela;
  3. seja restaurada por hash (`git checkout <head> -- <arquivos>`), com `git status --porcelain` vazio publicado logo depois.
- **Proibido continua proibido para commit:** nenhuma linha fora do §4 entra em commit. Mutação que não restaura limpo é `## PAUSA`.

## 10. Triagem da junta e plano do conserto único (§C7 item 10(3)–(5))

- **Autor:** orquestrador, Claude Opus, no papel de topo (o Fable está suspenso). O item 10(5) pede auditoria do topo quando há defeito grave.
- **Junta:** objeto `5b628b88`.
  - **C1** (`jurado-j484-c1b-opus`): REPROVADO. Um grave (C1b-A1) e um não grave (C1b-A2).
  - **C2** (`jurado-j484-c2-opus`): APROVADO, com três não graves (N1, N2, N3).
  - **C3** (`jurado-j484-c3-opus`): APROVADO, com um não grave (C3-01).
  - Votos e evidência em `revisoes/j484/`.
- **Auditoria do topo, declarada.** O C1b-A1 é **defeito real do produto**, não artefato do processo. Ele aparece com 12 caracteres invisíveis, em memória e no Postgres, e a alocação vira cobrança (`cloud-charge-prisma.repository.ts:197`). A competência da C1 cobria o tema, e a inelegibilidade foi conferida pelo inspetor. A causa é que a §7 normalizou espaço e largura, mas não os caracteres invisíveis.
- **Quem faz o quê.** O dev do conserto é uma identidade NOVA do Codex. O conferente é um Claude que não consertou (item 11).

### Triagem
| Achado | Gravidade · escopo | Destino |
|---|---|---|
| C1b-A1 | GRAVE · dentro | conserto agora (K1) |
| C2-N1 | não grave · dentro, simples | mesma leva (K2) |
| C2-N2 | não grave · pré-existente, simples | mesma leva (K3) |
| C2-N3 | não grave · dentro | mesma leva (K4) |
| C3-01 | não grave · dentro | mesma leva (K5) |
| C1b-A2 (cirílico) | não grave · pré-existente, grande | pendência `P-SAN303-HOMOGLIFO-NOME`, dona a trilha da plataforma (validação do nome da organização) |

### K1: invisíveis não escapam da ambiguidade (C1b-A1)
- `normalizeTenantTag` passa a **remover os caracteres invisíveis antes** do resto: `value.replace(/[\p{Default_Ignorable_Code_Point}\p{Cf}]/gu, "")`, depois `.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase()`.
- Isso vale para **as chaves do índice** (id, nome e slug) e **para a tag**, porque as duas passam pela mesma função.
- Se, depois de normalizada, a tag ficar vazia, ela é tratada como sem tag (T-TAG-12).
- **Testes:**
  - T-TAG-14: para cada um dos 12 caracteres do parecer da C1 (U+00AD, 200B, 200C, 200D, 2060, FEFF, 034F, FE0F, 200E, 202E, 180E e 2062), as organizações A, com o caractere no MEIO do nome "Duplicada", e B, com "Duplicada", recebem uma tag "Duplicada". Resultado esperado: `ambiguous_tenant_tag` com o valor inteiro, 0 para A e B, nas duas estratégias.
  - T-TAG-db-2: o mesmo no Postgres, com U+00AD, U+200B, U+2060 e U+FEFF. Nenhuma `TenantCloudCostAllocation` para A ou B.
  - Os dois falham no objeto `5b628b88` (vermelho-controle).
- **Mutação M57:** apagar a remoção dos invisíveis faz o T-TAG-14 ficar vermelho.

### K2: a data do resumo é só `AAAA-MM-DD` (C2-N1, e a M-C2-a da C2-N3)
- `parseSummaryFilters` aceita **somente** `^\d{4}-\d{2}-\d{2}$` que sobrevive à ida e volta (§8). Hora, fuso, `24:00` ou espaço depois da data dão 400 `summary_period_invalid`. A data é interpretada como `AAAA-MM-DDT00:00:00.000Z`, então o resultado não depende do TZ do processo.
- O front já manda `AAAA-MM-DD` (`cloud-billing.service.ts:28`).
- **Teste T-SUM-9:** os valores da sonda da C2 (`2026-06-02T00:00:00+23:59`, `…+0500`, `2026-05-31T24:00:00Z`, `2026-05-31T22:00`, `2026-06-01 ` com espaço, `2026-06-01 GMT+1400`) dão 400. O mesmo resultado precisa sair com `TZ=UTC` e com `TZ=America/Sao_Paulo`.
- **Mutação M58:** a regex sem a âncora `$` deixa o T-SUM-9 vermelho. Ela substitui a M-C2-a.

### K3: chave desconhecida no resumo é recusada (C2-N2)
- `/summary` aceita só as chaves `periodStart` e `periodEnd`. Qualquer outra chave na query, inclusive `PeriodStart` e `periodStart[]`, dá 400 `summary_query_invalid`.
- A listagem de runs não muda.
- **Teste T-SUM-10** e **mutação M59:** sem a allowlist, o T-SUM-10 fica vermelho.

### K4: a M47-c′ substitui a M47-c (C2-N3)
- A M47-c literal não prova o T-RUN-1 sozinha. A **M47-c′**, que recusa uma ponta só também na listagem, prova: o T-RUN-1 fica vermelho.
- O relatório registra a troca.

### K5: contagem reproduzível (C3-01)
- A bateria dirigida do §6 é publicada com a **lista literal de arquivos** e o **log** (TAP `# tests`/`# fail` por arquivo), para que o denominador possa ser reexecutado.

### Escopo
- O mesmo §4, mais `API_CONTRACTS.md` (os motivos `summary_query_invalid` e o texto do formato de data).
- O §9 continua valendo para as mutações temporárias.

### Depois do conserto
1. **Conferência** por um Claude que não consertou: roda o comando de cada achado (C1b-A1, C2-N1, N2 e N3, C3-01), confere o vermelho de cada teste novo no `5b628b88` e lê o CI inteiro pelo TAP.
2. Merge.
3. Porteiro.

Nenhuma cadeira é refeita (item 10(4)), salvo se a conferência mostrar o grave ainda lá.

## 11. Emenda: a regressão do K2 em teste de outro bloco e o conflito do PR com a `main` (RETOMADA 22 do dev)

Autor: orquestrador, Claude Opus, topo declarado. A decisão vem antes do código (`D-EMENDA-ANTES-DO-CODIGO`).

**Fato medido.**
- `tests/san3-05-leituras-de-plataforma-db.test.ts:351` chama `GET /platform/cloud-cost-allocations/summary` com `MES_INICIO`/`MES_FIM` em ISO completo.
- O K2 recusa isso com 400 `summary_period_invalid`. É a regra nova, e está certa.
- O único consumidor de produção, o front (`cloud-billing.adapter.ts:51` com `cloud-billing.service.ts:28`), manda `AAAA-MM-DD`. Nenhuma outra chamada à rota manda ISO: `git grep` em `src`, `tests`, `frontend/src` e `scripts`.
- O serviço casa a run por `sameUtcDay`, então mandar só a data dá o mesmo resultado que o teste esperava.

**Decisão.** A regra do K2 fica. O teste passa a mandar a data no formato do contrato.
- **PERMITIDO** ganha `tests/san3-05-leituras-de-plataforma-db.test.ts`, **só a chamada da linha ~351**: `periodStart=${MES_INICIO.slice(0, 10)}&periodEnd=${MES_FIM.slice(0, 10)}`, ou o equivalente que produza `AAAA-MM-DD`. Nenhuma outra linha desse arquivo muda.
- **Prova:**
  - o arquivo volta a 13/13 no Postgres descartável;
  - com o `routes.ts` do head e a chamada antiga, o teste fica vermelho (é o vermelho-controle);
  - a bateria do K5 vai a 307.

**Conflito do PR com a `main`.** O PR #484 está CONFLICTING, porque a `main` recebeu o #485 e o #486.
- Resolva com `git merge origin/main` no ramo, **sem rebase e sem push --force**.
- Em `pendencias.md` e no índice, mantenha os dois lados e regenere o índice pelo gerador.
- Qualquer conflito em código de produto: pare e registre.
- Depois do merge, os 16 check-runs nascem no head novo. Leia o TAP de `backend` e `backend-postgres`.
