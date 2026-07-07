# Checklists de auditoria ERP Techsolutions

Use este arquivo quando a revisão exigir detalhe por camada.

## 1. Backend e API

### Contrato
- O endpoint tem prefixo/versionamento consistente?
- O request/response usa DTO/envelope documentado?
- Há compatibilidade com clientes existentes?
- Status codes e códigos de erro são estáveis e seguros?
- Campos novos são opcionais quando a compatibilidade exige?

### Autenticação, autorização e tenant
- O ator autenticado é a única fonte de `tenantId`, `userId`, roles e permissões?
- O body/query/header do cliente não consegue trocar tenant?
- A permissão é validada no endpoint e na action interna sensível?
- Existem testes para sem tenant, sem permissão, tenant spoofing e tenant cruzado?
- Fallback de headers dev/test está bloqueado em produção, quando aplicável?

### Dados e transações
- Todas as queries filtram tenant?
- Há índices para filtros frequentes, joins e ordenação?
- Operações multi-step usam transação ou idempotência?
- Constraints impedem duplicidade e estado impossível?
- Migrations são reversíveis ou pelo menos seguras em rollout?

### Idempotência e filas
- `client_action_id`, idempotency key ou fingerprint são obrigatórios em replay?
- Replay idêntico retorna sucesso idempotente?
- Payload diferente com mesma key retorna conflito?
- Retry tem limite e backoff?
- Falha externa não marca sucesso local?

## 2. Segurança

- IDOR: usuário consegue consultar/alterar recurso de outro tenant?
- SQL/NoSQL injection: inputs entram em query raw?
- XSS: strings de usuário são renderizadas sem escape?
- CSRF: cookies ou sessões browser precisam proteção?
- SSRF/path traversal: URLs/caminhos enviados pelo usuário são usados no servidor?
- Upload: validar MIME, tamanho, extensão, hash, antivírus e storage seguro.
- Logs: não registrar token, senha, segredo, base64, caminho local, PII desnecessário.
- CORS: não usar wildcard perigoso em credenciais.
- Erros: não expor stack trace, SQL, segredo, caminho de arquivo ou payload sensível.

## 3. Frontend web

- Componentes têm responsabilidade clara?
- Data fetching e UI estão separados?
- Existe estado loading/empty/error/success?
- Erros são acionáveis e não técnicos demais?
- Tabelas têm paginação, filtro, ordenação, busca e empty state útil?
- Formulários validam antes de enviar e tratam erro backend?
- Semântica HTML, foco, teclado, aria e contraste foram considerados?
- Evitar renderização em lista grande sem virtualização ou paginação.
- Evitar chamadas duplicadas por renderização/retry descontrolado.

## 4. Flutter/mobile/offline

- Entidade local tem `syncStatus` coerente?
- Action local tem `client_action_id` e payload seguro?
- `local_id` nunca vira id remoto sem confirmação.
- Sucesso remoto atualiza action e entidade local quando necessário.
- Conflito fica visível e não é sobrescrito por pull.
- Pull remoto não apaga ação pending/conflict.
- Token não fica em SQLite.
- Erro de rede não vira sucesso falso.
- Dados sensíveis não aparecem em logs, analytics, toast ou crash report.
- Testar offline, reconnect, replay duplicado, falta de permissão e dados locais antigos.

## 5. Testes difíceis

Criar ou exigir testes para:

- tenant errado tentando ler/alterar recurso;
- usuário sem permissão e usuário com permissão parcial;
- payload com campos proibidos (`tenant_id`, `token`, `authorization`, `path`, `base64`);
- duplicidade e idempotência;
- corrida entre duas alterações;
- paginação limite/offset extremos;
- timeout e erro de rede;
- retry excedido;
- conflito remoto;
- estado local pending/synced/conflict;
- payload grande e campos ausentes;
- regressão de blocos anteriores.

## 6. Performance e baixa carga

- Evitar N+1 e consultas em loop.
- Evitar round trip por item quando batch é possível.
- Aplicar paginação e filtros no servidor.
- Reduzir payloads; não enviar binário/base64 em endpoints de metadados.
- Usar cache com invalidation explícita.
- Medir antes de micro-otimizar.
- Em UI, evitar re-render global por estado local pequeno.
- Em mobile, reduzir uso de rede, bateria e armazenamento.

## 7. UI/UX operacional

- O usuário sabe se a ação está pending, synced, failed ou conflict?
- Empty state explica o próximo passo?
- Erro mostra ação recuperável?
- A tela prioriza tarefas frequentes?
- A densidade é adequada para uso operacional?
- Há filtros, atalhos e feedback rápido?
- Acessibilidade: contraste, foco, teclado, labels e leitura por screen reader.
