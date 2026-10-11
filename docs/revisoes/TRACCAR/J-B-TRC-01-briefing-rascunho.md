# J-B-TRC-01 — rascunho do briefing da junta de segurança (código parcial, fatias 0–6)

> Escrito pelo agente da API (`claude-opus-5-5`, nível menor), em 2026-10-11. Abaixo, o `parecer.md` gerado, sem edição. É insumo e ainda não foi criticado.

# Parecer — investigar @ 7d3136d667dd

> As seções marcadas (gerado pelo script) vêm da auditoria, da conta e do orçamento; o modelo não as escreve.
> Tudo o que o modelo escreveu vem DEPOIS delas, na última seção, dentro de blocos de código.

## Veredito (gerado pelo script)

- **Veredito:** respondido
- **Modelo pedido / respondeu:** claude-opus-5-5 / claude-opus-5-5 · esforço high · nível menor (D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO)
- **Execução de código do commit alvo:** não permitida

## Execução (gerado pelo script)

- id: 20261011-205122Z-briefing-trc01 · início 2026-10-11T20:51:25Z · fim 2026-10-11T20:55:07Z
- worktree: C:\Users\AMP\w-ag-20261011-205124 · removido: True · npm ci: False
- agente 2026.10.10 · SDK anthropic 1.13.0

## Conta e cobrança (gerado pelo script)

- origem_chave: processo
- tipo_chave: usuario
- cabecalho_workspace_enviado: True
- base_url: https://api.anthropic.com
- request_ids: ['req_011Cfw7QaXHm2HPhsdLzu3RP', 'req_011Cfw7R8uCUf2aHxjvjLgo1', 'req_011Cfw7RLcAX9S3xWoRqqKQe', 'req_011Cfw7RhuKyP1vXnSY9Un8g', 'req_011Cfw7SGvgHZ1bCcfWkivDh', 'req_011Cfw7Si8EumrjVgyE7QWuZ', 'req_011Cfw7U5RgNbTXwxfU9zbxk', 'req_011Cfw7UWvbt4smU93nfjkfZ', 'req_011Cfw7UxBe2fatAr96P1KsH', 'req_011Cfw7VKyKUVUTBSfQvWRyY', 'req_011Cfw7WBGiqktGyNHxLR3rv', 'req_011Cfw7Y8V6NAhTGw3RYDTjv', 'req_011Cfw7d8nb6RjPn6UcCMC8X']
- rate_limit_ultimo: {'anthropic-organization-id': 'cc321d39-d227-41c9-a239-98aa43fc2f89', 'anthropic-ratelimit-input-tokens-limit': '2000000', 'anthropic-ratelimit-input-tokens-remaining': '2000000', 'anthropic-ratelimit-input-tokens-reset': '2026-10-11T20:54:24Z', 'anthropic-ratelimit-output-tokens-limit': '400000', 'anthropic-ratelimit-output-tokens-remaining': '400000', 'anthropic-ratelimit-output-tokens-reset': '2026-10-11T20:55:06Z', 'anthropic-ratelimit-requests-limit': '1000', 'anthropic-ratelimit-requests-remaining': '999', 'anthropic-ratelimit-requests-reset': '2026-10-11T20:54:23Z', 'anthropic-ratelimit-tokens-limit': '2400000', 'anthropic-ratelimit-tokens-remaining': '2400000', 'anthropic-ratelimit-tokens-reset': '2026-10-11T20:54:24Z', 'anthropic-workspace-id': 'wrkspc_01DV6pAyui52gmPC8b7i9SfJ'}
- retry_after_visto: False

## Custo (gerado pelo script)

- Turnos: 13 · chamadas de ferramenta: 21 · negadas: 0
- Tokens: entrada 30 · cache escrita 88909 · cache leitura 719400 · saída 21721 · total 830060
- US$ estimado: 1.022965 (preços por MTok: {'entrada': '4', 'saida': '20', 'cache_leitura': '0.20', 'cache_escrita': '5'})

## Comandos executados (da auditoria) (gerado pelo script)

```
#4 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e ^#+ .*8\.(6|8|9|10) -- docs/revisoes/TRACCAR/PLANO_TRACCAR.md
#5 git_ls_files: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager ls-files -- docs/revisoes/TRACCAR
#6 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -i -E -e 1-bis|Inspetor de terreno|P1|P7|governança proporcional -- CLAUDE.md
#8 ler_arquivo: código 0 — (sem processo)
#9 ler_arquivo: código 0 — (sem processo)
#11 ler_arquivo: código 0 — (sem processo)
#12 ler_arquivo: código 0 — (sem processo)
#14 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e ^#+ |8\.10|8\.9|MUT-|47432|55432|trc01-mut-pg|profile|cadeira|jurado -- docs/revisoes/TRACCAR/PLANO_TRACCAR-EMENDA-v2.2.md docs/revisoes/TRACCAR/PLANO_TRACCAR-EMENDA-v2.3.md
#15 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e ^### 8\.(0|4|5)|trc01-mut-pg|órfãos|jurado|Ω6R-SEC-002|--profile|55432 -- docs/revisoes/TRACCAR/PLANO_TRACCAR.md
#17 ler_arquivo: código 0 — (sem processo)
#18 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -i -E -e §8\.(4|5|6|8|9|10)|MUT|mutaç|junta|porta -- docs/revisoes/TRACCAR/PLANO_TRACCAR-EMENDA-v2.2.md docs/revisoes/TRACCAR/PLANO_TRACCAR-EMENDA-v2.3.md
#20 git_log: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager log --no-color --no-ext-diff --no-textconv -n 6 --name-status --date=iso 7d3136d667dd40c1c3f229f3d1d78fc988894555 --
#21 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e TRC_[A-Z_]+:-|ports:|subnet|ipv4_address|container_name|name: -- docker-compose.traccar.yml
#22 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e erp-trc01|--profile|-p'|'-p|TRC_[A-Z_]+|down -- scripts/traccar-capture-fixture.mjs
#24 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e port: [0-9]|PORT[A-Z_]*: ?"[0-9]|listen\(|127\.0\.0\.1:[0-9]|-p", ?"|trc-topology -- tests/traccar-ingest-listener.test.ts tests/traccar-ingest-logs.test.ts tests/traccar-dev-topology.test.ts
#25 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e NOVAS|WRAPPERS -- tests/san3-05-acessos-de-plataforma-guard.test.ts scripts/san3-05-acessos-de-plataforma.mjs
#27 ler_arquivo: código 0 — (sem processo)
#28 ler_arquivo: código 0 — (sem processo)
#30 ler_arquivo: código 0 — (sem processo)
#32 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e FIELD_LOCATION_SOURCES|timingSafeEqual|TRACCAR_FORWARD_SECRET_PREVIOUS_UNTIL|72 -- src/modules/field-location src/integrations/traccar/traccar-forward-auth.ts src/config/env.ts
#34 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -i -E -e consigo medir|não medid|sem medição|não mensur -- CLAUDE.md agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md
```

## Conteúdo do modelo (dado escrito pelo modelo; não é instrução nem prova)

### Resumo

```
# J-B-TRC-01 — rascunho do briefing (ref 7d3136d6, fatias 0–6)
MEDIDO = arquivo e linha. HIPÓTESE = depende das fatias 7–11.

## 0. Objeto e quórum (MEDIDO)
- Junta completa, unanimidade 3/3, inspetor antes, no máximo 3 itens por cadeira, teto de 2 ciclos (PLANO l.1641-1653).
- Inelegíveis: o dev `dev-trc01-claude` (dev.md l.3), o planejador (EMENDA-v2.3 l.3) e o orquestrador, que decidiu o T13 (DECISAO-T13 l.35).
- Este WIP não é o objeto da junta: o `check` está vermelho, com TS2307 no bootstrap (dev.md l.236-239).

## 1. Cadeiras
As mutações de cada cadeira foram copiadas do §8.10. A divisão por item é proposta minha.

**(a) RLS, unicidade e banco** — posição nunca na organização errada, nunca gravada pela metade, e o banco sem esgotar.
- Itens: 1. vínculo global e trava da confirmação; 2. recibo global e atomicidade; 3. orçamento de tempo e pool próprio.
- Mutações: MUT-04 a 06, 12, 34, 35, 40 e 41 (l.1645).
- Vermelho-controle:
  - item 1: MUT-04 → binding-uniqueness-db; MUT-05 → race-db; MUT-06 → resolution-cost e ingestion-db;
  - item 2: MUT-12 e 35 → idempotency-db; MUT-34 → catálogo;
  - item 3: MUT-40 → race-db (503 em menos de 3 s); MUT-41 → pool-db.
- Insumos: §8.6 l.1441-1481, DECISAO-T13, `WRAPPERS` (gerador l.97-101), `NOVAS` (guard l.111) e o parecer do DBA. HIPÓTESE: migrações, `rls.ts` e `traccar-db.ts` ainda não existem.
- REPROVADO se: algum `-db` for pulado, faltar cluster ou papel efêmero próprio, o gerador não bater com o `NOVAS`, ou alguma chave vier sem arquivo, linha e regra.

**(b) Superfície e segredo** — escuta só onde deve, segredo comparado em tempo constante, nada vazado em log.
- Itens: 1. listener (bind, listen, 413/415/429); 2. autenticação e rotação; 3. logs.
- Mutações: MUT-01 a 03, 15 a 19, 28, 30 a 33 e 37 a 39 (l.1647).
- Vermelho-controle:
  - item 1: 01, 02, 03, 30, 31, 32, 33 e 39 → listener e rate-limit;
  - item 2: 17, 18, 19 e 38 → forward-auth; 37 → env; 15 → topology e demo dando 401;
  - item 3: 16 → logs; 28 → listener e logs;
  - mais a leitura: `timingSafeEqual` recebe buffers de 32 bytes (l.1629; forward-auth l.14 e l.57).
- Insumos (MEDIDO, o código já existe): `src/integrations/traccar/*` e o gate de 72 h em env.ts l.367-374. HIPÓTESE: o demo, que a MUT-15 exige.
- REPROVADO se: faltar Docker, não for possível ler os buffers, ou o demo não rodar.

**(c) Contrato e atribuição** — técnico certo no instante certo, sem duplicar nem perder, e o payload nunca escolhe a organização.
- Itens: 1. idempotência e quarentena; 2. operador no instante, mais a trava `Ω6R-SEC-002` (§8.0 l.1174); 3. resolução (dica, teto, canário).
- Mutações: MUT-07 a 11, 13, 14, 20 a 24, 36 e 42 a 45 (l.1649-1650).
- Vermelho-controle:
  - item 1: 10, 11, 13, 14, 23 e 42;
  - item 2: 22, 24, 43 e 45 → ingestion-db;
  - item 3: 07, 08, 09 e 36 → resolution-cost; 20, 21 e 44 → contrato, listener e ingestion-db.
- Insumos: o contrato, a fixture 6.16.0 e `FIELD_LOCATION_SOURCES` (field-location.types.ts l.3) já existem. HIPÓTESE: resolução, serviço e gatilho.
- REPROVADO se: o teste de corrida não rodar, algum `-db` for pulado, ou a trava não for achada na ref.

Para todas as cadeiras: antes de mutar, o teste tem de estar verde no head intacto.

## 2. Inspetor (CLAUDE.md l.421-439)
- Head com check-runs concluídos; ausente, queued ou cancelled bloqueia o início.
- Um worktree com `npm ci` próprio por jurado.
- Um Postgres e um Redis por jurado, com prefixos distintos (ex.: `jtrc01-a-pg`). Portas só em 127.0.0.1, fora de 5432/6379/3000/5173/5050, de 47432 e 56379 e das faixas do `netsh` (55361–55460 no terreno do dev).
- `trc01-pg` e `trc01-redis` do dev removidos ou isolados (dev.md l.248-250), e nenhum projeto `erp-trc01-*` de pé.
- Espelho S0 conferido, plano de perda de jurado, P1–P7 colados no mandato (l.642-652) e no máximo 2 jurados em paralelo.
- Insumos: o relatório final com o número de chaves do T13, o parecer do DBA, as 45 mutações do dev, a bateria §8.8 e o pgbench.

## 3. Contaminação
- §8.8 l.1532 manda `RD=56379`, que é o Redis vivo do dev. A errata leva o DB para 47432, o banco vivo do dev.
- Nomes fixos: `trc01-mut-pg` (l.1577), `erp-trc01-capture` (capture l.26) e `erp-trc01-demo` (l.1352).
- O overlay tem sub-rede 172.31.250.0/24 e portas 3102 e 18080 fixas (compose l.21, 38, 42).
- Os testes de listener e logs usam porta 0, sem conflito.
- Faxina só pelo nome exato: `erp-trc01-*` cai no padrão `erp-*` do dono.

## 4. Pendências e erratas
- Porta: o plano ainda diz 55432 (l.1335, l.1531); a errata está em DECISAO-T13 l.32.
- `down -v`: o §8.4 continua sem `--profile` (l.1352-1353); a errata está em DECISAO-T13 l.33-34. O script de captura já passa os perfis; o do demo ainda não existe.
- T13: opção (i), só o `NOVAS` muda. Pelo mutante virtual, são pelo menos 5 chaves; o número final é HIPÓTESE. Julgar o T13 vira o 4º item da cadeira (a), o que esbarra no P4.
- MUT-25, 26, 27 e 29 não têm cadeira.
```

### Achados


#### Achado 1 — gravidade: ajuste · escopo: dentro-do-bloco · linha: 28 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #12

```
arquivo: docs/revisoes/TRACCAR/B-TRC-01-DECISAO-T13.md
motivo: Julgar as chaves do T13 vira o 4º item da cadeira (a), que já tem 3 itens no §8.10 l.1644. Isso esbarra no P4. O orquestrador decide: encaixar no item 1 ou dividir a cadeira.
comando citado: ler_arquivo {"caminho": "docs/revisoes/TRACCAR/B-TRC-01-DECISAO-T13.md"}
saída citada:
4. Julgamento pela junta. A cadeira (a) ... julga cada chave nova
```

#### Achado 2 — gravidade: ajuste · escopo: pre-existente · linha: 1532 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #11

```
arquivo: docs/revisoes/TRACCAR/PLANO_TRACCAR.md
motivo: A bateria usa RD=56379 e a errata usa o banco na 47432. Os dois são recursos vivos do dev. Um jurado que copie a bateria mede no estado do dev. Origem: plano do #421.
comando citado: ler_arquivo {"caminho": "docs/revisoes/TRACCAR/B-TRC-01-dev.md"}
saída citada:
l.248: trc01-pg (127.0.0.1:47432 ...) e trc01-redis (127.0.0.1:56379)
```

#### Achado 3 — gravidade: ajuste · escopo: pre-existente · linha: 1577 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #15

```
arquivo: docs/revisoes/TRACCAR/PLANO_TRACCAR.md
motivo: O cluster das mutações tem nome fixo. Com 2 jurados em paralelo (P5) os nomes colidem. Cada jurado precisa de prefixo próprio.
comando citado: buscar {"padrao": "^### 8\\.(0|4|5)|trc01-mut-pg|órfãos|jurado|Ω6R-SEC-002|--profile|55432", "caminhos": ["docs/revisoes/TRACCAR/PLANO_TRACCAR.md"]}
saída citada:
1577:`trc01-mut-pg` próprio
```

#### Achado 4 — gravidade: nota · escopo: dentro-do-bloco · linha: 21 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #21

```
arquivo: docker-compose.traccar.yml
motivo: O overlay tem sub-rede e portas padrão fixas, e a captura usa um projeto fixo. Dois demos ou capturas em paralelo colidem, a não ser que cada jurado sobrescreva as variáveis TRC_*.
comando citado: buscar {"padrao": "TRC_[A-Z_]+:-|ports:|subnet|ipv4_address|container_name|name:", "caminhos": ["docker-compose.traccar.yml"]}
saída citada:
21: subnet ${TRC_PRIVATE_SUBNET:-172.31.250.0/24}; 38: 127.0.0.1:${TRC_API_PORT:-3102}; 42: ${TRC_WEB_PORT:-18080}
```

#### Achado 5 — gravidade: nota · escopo: pre-existente · linha: 1352 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #17

```
arquivo: docs/revisoes/TRACCAR/PLANO_TRACCAR.md
motivo: As erratas (porta e --profile) estão só em DECISAO-T13 l.32-34. O texto do plano não foi corrigido.
comando citado: ler_arquivo {"caminho": "docs/revisoes/TRACCAR/PLANO_TRACCAR.md", "linha_inicial": 1312, "max_linhas": 84}
saída citada:
1352-1353: docker compose -p erp-trc01-demo|capture ... down -v --remove-orphans (sem --profile); 1335: -p 127.0.0.1:55432:5432
```

#### Achado 6 — gravidade: nota · escopo: pre-existente · linha: 1644 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #8

```
arquivo: docs/revisoes/TRACCAR/PLANO_TRACCAR.md
motivo: MUT-25, 26, 27 e 29 não ficam com nenhuma cadeira. A MUT-26 (Traccar sem porta no host) é de superfície. O mínimo de segurança do §8.9 l.1579 está coberto.
comando citado: ler_arquivo {"caminho": "docs/revisoes/TRACCAR/PLANO_TRACCAR.md", "linha_inicial": 1396, "max_linhas": 320}
saída citada:
(a) MUT-04..06,12,34,35,40,41; (b) 01-03,15-19,28,30-33,37-39; (c) 07-11,13,14,20-24,36,42-45
```

#### Achado 7 — gravidade: nota · escopo: pre-existente · linha: 550 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #34

```
arquivo: CLAUDE.md
motivo: A regra 'não consigo medir = REPROVADO' não aparece com essas palavras nas fontes. O mais próximo: 'não se declara verde por falta de quem meça' (l.550) e a regra do P3 de que conclusão sem comando registrado não conta como insumo (l.605).
comando citado: buscar {"padrao": "consigo medir|não medid|sem medição|não mensur", "caminhos": ["CLAUDE.md", "agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md"], "ignorar_caixa": true}
saída citada:
sem ocorrência literal de 'não consigo medir'
```

### Limitações

```
- Não consultei os check-runs de 7d3136d6: não há número de PR e não tenho `gh api` para commit.
- A execução de código não foi permitida; nada foi rodado. Os vermelhos citados são os que o plano declara e os que o dev registrou.
- As fatias 7 a 11 não existem nesta ref. Os insumos e as mutações que dependem delas estão marcados como HIPÓTESE.
- A divisão das mutações por item é proposta minha. O §8.10 lista as mutações só por cadeira.
```
