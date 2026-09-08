# Checklist técnico

Use este arquivo como guia, não como formulário obrigatório. Ignore itens que não se apliquem ao código revisado.

As armadilhas **já medidas nesta base** — arnês de teste, RLS sob superusuário, lista `SUITES` da CI, float em dinheiro, concorrência de catálogo — estão em [repo-erp.md](repo-erp.md). Elas têm precedência sobre a intuição genérica deste checklist.

## Node.js

- Promises aguardadas, rejeições tratadas e erros assíncronos encaminhados corretamente.
- Recursos encerrados em sucesso e falha: streams, timers, conexões, listeners e arquivos.
- Operações bloqueantes ou consumo de memória não limitado no caminho de requisições.
- Timeouts, cancelamento e backpressure em chamadas externas.
- Validação de entrada antes de coerções; limites para payload, paginação, upload e concorrência.
- Uso seguro de variáveis de ambiente, caminhos, comandos de shell, URLs e serialização.
- Encerramento gracioso sem aceitar trabalho novo nem abandonar operações críticas.

## TypeScript

- Ausência de `any`, assertions, casts ou `!` que escondam estados realmente possíveis.
- Narrowing correto de unions e tratamento exaustivo de estados.
- Tipos de entrada externa não tratados como confiáveis sem validação em runtime.
- Diferença correta entre campo ausente, `undefined`, `null`, string vazia e zero.
- Contratos de funções assíncronas, genéricos, DTOs e tipos de retorno coerentes.
- Erros não silenciados por `catch`, optional chaining ou valores padrão inadequados.
- Configuração e saída de build compatíveis com ESM/CJS, versão do Node e resolução de módulos do projeto.

## Prisma

- `where` de update/delete realmente único e protegido contra operações amplas acidentais.
- Autorização e isolamento por tenant presentes na própria consulta quando necessários.
- `select`/`include` não expõem colunas sensíveis nem carregam grafos excessivos.
- Ausência de N+1, loops com queries sequenciais e round trips evitáveis.
- Paginação determinística, limites máximos e ordenação estável; cursor coerente com a ordenação.
- Transações abrangem toda a regra atômica e evitam chamadas externas prolongadas dentro delas.
- Read-modify-write protegido contra atualizações perdidas, duplicidade e corridas.
- Tratamento correto de erros conhecidos do Prisma sem depender apenas de texto da mensagem.
- Relações, cascatas, `onDelete`/`onUpdate`, optionalidade e defaults refletem a regra de negócio.
- Tipos `Decimal`, `BigInt`, `DateTime` e JSON convertidos/serializados sem perda ou ambiguidade.
- Uso de `$queryRaw` parametrizado; nunca concatenação/interpolação insegura ou `$queryRawUnsafe` com entrada externa.
- `tenant_id` **explícito** na query mesmo onde a RLS já filtra — dev e CI conectam como superusuário, que ignora RLS (repo-erp.md §2).
- `createMany({ skipDuplicates })` em caminho idempotente: o `ON CONFLICT` emitido não tem alvo e engole conflito de qualquer constraint (repo-erp.md §3).

## PostgreSQL e migrações

- Constraints no banco sustentam invariantes importantes: `NOT NULL`, `UNIQUE`, `CHECK` e FKs.
- Índices apoiam filtros, joins, ordenações e unicidade reais; considere ordem das colunas e índices parciais.
- Mudanças de schema são compatíveis com deploy gradual e dados existentes.
- Colunas obrigatórias novas usam estratégia segura de backfill; evite default/rewrite ou lock longo sem necessidade.
- Criação de índices em tabelas grandes considera `CONCURRENTLY` e sua incompatibilidade com bloco transacional.
- Alterações de enum, tipo, FK, cascade e exclusão não causam perda de dados ou bloqueios inesperados.
- Queries raw usam parâmetros, tipos compatíveis e semântica correta para `NULL`.
- Níveis de isolamento, locks e ordem das operações não criam corrida ou deadlock provável.
- Datas usam timezone e limites coerentes; valores monetários evitam ponto flutuante.
- Pool de conexões é compatível com concorrência, réplicas, serverless/proxy e limites do PostgreSQL.

## API, segurança e privacidade

- Autenticação não é confundida com autorização; ownership, tenant e papel são verificados.
- Proteção contra IDOR, mass assignment, SQL injection, command injection, SSRF e path traversal.
- Senhas, tokens e dados pessoais não aparecem em logs, erros, respostas ou telemetria.
- Mensagens de erro não revelam detalhes internos e preservam códigos HTTP adequados.
- Rate limiting, idempotência e replay são considerados em endpoints sensíveis e webhooks.
- CORS, cookies, CSRF e headers seguem o modelo real de autenticação da aplicação.

## Testes e observabilidade

- Testes cobrem caminho feliz, limites, falhas e regressão do defeito mais provável.
- Testes de banco verificam constraints, concorrência e transações quando mocks seriam insuficientes.
- Teste `-db.test.ts` novo entrou na lista `SUITES` de `.github/workflows/ci.yml` — senão não roda em CI nenhuma (repo-erp.md §1).
- Teste de isolamento roda sob role `NOSUPERUSER NOBYPASSRLS`; sob `postgres` não prova nada (repo-erp.md §2).
- Testes são determinísticos e não dependem de horário local, ordem, rede ou dados compartilhados.
- O denominador (nº de casos) não varia entre execuções do mesmo comando; verde é publicado com **N e forma**.
- Logs estruturados permitem correlação sem registrar segredos; erros preservam causa e stack.
- Métricas e alertas distinguem erro do cliente, erro interno, latência e saturação.

## Perguntas para validar cada achado

1. Existe um caminho de execução alcançável?
2. Qual entrada ou estado dispara o problema?
3. O impacto é observável e proporcional à severidade?
4. O código adjacente, uma constraint ou middleware já evita o problema?
5. A correção proposta resolve a causa sem ampliar desnecessariamente o escopo?
