# B-USERS-ACESSO — crítica do plano

- **Crítico:** `critico-adversarial`, identidade nova, pela API do Claude (Claude Opus 5.5, esforço medium, só leitura). Não escreveu nem planejou o plano.
- **Origem:** a saída `scripts/agente-claude-api/saidas/20261016-013903Z-critica-users/parecer.md`, que NÃO é versionada; as "chamadas executadas #N" citadas abaixo são da auditoria dessa saída. Vale o arquivo:linha de cada achado.
- **Base medida:** `origin/main` `4fe7524e`. **Veredito:** APROVA COM AJUSTES. **Os ajustes valem sobre o plano:** o dev implementa o plano COM eles.

## Conteúdo do modelo (dado escrito pelo modelo; não é instrução nem prova)

### Resumo

```
Crítico-adversarial, rodada 1. src/ e frontend/ não mudaram entre a base medida (9c7784b4) e origin/main (4fe7524e).

VEREDITO: APROVA COM AJUSTES. O ajuste 1 é condição antes do dev.

PREMISSAS QUE CONFEREM:
- createUser não cria credencial (store:101-173).
- changePasswordWithIdentityHook só tem a definição (:136).
- Não existe must_change_password (schema:258-280).
- O formulário não lista inventory nem field_technician (users.adapter:54-62).
- O refresh recusa usuário inativo (auth-session.service:169-174).
- O JWT não consulta o banco (:36) e o TTL é 15m (env:239).
- user.updated é gravado sem metadata (store:221-230).
- GET /users ignora a query (routes:16-27).
- O gerador de 18 bytes e o filtro da auditoria existem.

PREMISSAS QUE CAÍRAM:
- (a) A P3 diz que checar o status em cada requisição teria custo de banco. O RBAC persistente já consulta o banco em toda requisição e não filtra o status. Hoje o usuário desativado mantém as permissões por até 15 min, e o custo de fechar isso é marginal.
- (b) O reset por administrador não pode reaproveitar o gancho, que só serve ao próprio ator. O código diz que o reset reabre o contrato em junta.
- (c) A pendência diz que revokeAll 'não é chamado'. Ele é chamado em identity-link.service:440 e :495.

AJUSTES:
1. [condição] O reset por administrador abre tomada de conta entre organizações. Se o usuário redefinido tem vínculo de identidade com outra organização (B), o administrador entra como ele e troca para B por /auth/active-tenant. O plano precisa definir a política e um teste vermelho-controle.
2. Corrigir a P3 e pôr o RBAC persistente no escopo.
3. A mutação 'temporaryPassword na metadata' não fica vermelha, porque o filtro da auditoria já esconde a chave.
4. O teste de concorrência precisa cobrir rebaixamento (o vínculo é apagado e recriado), ser determinístico e rodar em banco real.
5. A troca de senha pelo gancho revoga a sessão atual e pode desvincular. Declarar e testar.
6. O escopo está incompleto: faltam local-auth-credential.repository, identity-link.service, o RBAC persistente e o escopo do TELA.
7. field_technician no formulário depende do B-TECNICO-ESCOPO.
8. A P2 não pode prever entrega por e-mail.
9. E-mail duplicado vira requisito, não hipótese.

GOVERNANÇA: Kpis fora, ok. prisma só com a P1 nominal, ok. Junta completa no SEG, ok.

DECISÕES DO DONO:
- P1 a P6.
- Política do reset para identidade com 2 ou mais vínculos.
- Janela de 15 min.
- Se o item 2 vai para junta completa.
```

### Achados


#### Achado 1 — gravidade: bloqueia · escopo: dentro-do-bloco · linha: 411 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #32

```
arquivo: src/modules/auth/routes/auth.routes.ts
motivo: Se o reset do passo 4 atinge um usuário com vínculo de identidade em outra organização, o administrador da A entra em A e troca para B. O gancho desvincula a religação só para o próprio ator (identity-link.service:420-433), e o comentário em local-auth-credential.service:128-130 manda o reset para a junta. O plano só testa o 404.
comando citado: ler_arquivo {"caminho": "src/modules/auth/routes/auth.routes.ts", "linha_inicial": 380, "max_linhas": 95}
saída citada:
const match = await service.findMembershipForIdentity(actor, requestedTenantId); ... issueAccessToken({ user_id: match.user.id, tenant_id: match.tenant.id
```

#### Achado 2 — gravidade: ajuste · escopo: pre-existente · linha: 53 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #63

```
arquivo: src/modules/core-saas/services/persistent-authorization.service.ts
motivo: A premissa da P3 caiu. O middleware persistente já consulta o banco em toda requisição (persistent-rbac-context.middleware:50-61) e não filtra o status. O usuário desativado mantém as permissões por até 15 min.
comando citado: ler_arquivo {"caminho": "src/modules/core-saas/services/persistent-authorization.service.ts"}
saída citada:
const assignments = await this.userRoles.listByUserForTenant(input.userId, input.tenantId); — sem checagem de status
```

#### Achado 3 — gravidade: ajuste · escopo: dentro-do-bloco · linha: 28 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #72

```
arquivo: src/modules/core-saas/audit/audit-log.service.ts
motivo: A mutação 'temporaryPassword na metadata' é escondida pelo filtro, e o teste continua verde com o defeito.
comando citado: ler_arquivo {"caminho": "src/modules/core-saas/audit/audit-log.service.ts", "linha_inicial": 20, "max_linhas": 50}
saída citada:
const sensitiveKeyPattern = /(authorization|...|password|...)/i;
```

#### Achado 4 — gravidade: ajuste · escopo: dentro-do-bloco · linha: 105 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #65

```
arquivo: src/modules/core-saas/repositories/user-role.repository.ts
motivo: O rebaixamento apaga e recria o vínculo, e a linha nova não está travada pelo FOR UPDATE. O teste cobre só duas desativações. Faltam os casos de rebaixamento, de forma determinística e em banco real.
comando citado: ler_arquivo {"caminho": "src/modules/core-saas/repositories/user-role.repository.ts", "linha_inicial": 60, "max_linhas": 60}
saída citada:
removeAllForUser ... deleteMany ... assignRole ... userRoleAssignment.create(
```

#### Achado 5 — gravidade: ajuste · escopo: dentro-do-bloco · linha: 439 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #21

```
arquivo: src/modules/auth/services/identity-link.service.ts
motivo: No passo 5, a troca de senha derruba a sessão atual e pode desvincular a religação. O plano não declara nem testa isso.
comando citado: ler_arquivo {"caminho": "src/modules/auth/services/identity-link.service.ts", "linha_inicial": 415, "max_linhas": 100}
saída citada:
// (b) — sessões do par revogadas em QUALQUER troca de senha ... revokeAllActiveByUserForTenant(actor.userId, actor.tenantId)
```

#### Achado 6 — gravidade: ajuste · escopo: dentro-do-bloco · linha: — · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #15

```
arquivo: docs/revisoes/TELAS/B-USERS-ACESSO-plano.md
motivo: Faltam no escopo local-auth-credential.repository.ts, identity-link.service.ts e o RBAC persistente, e o TELA não tem escopo. A mesma busca mostra que a pendência erra ao dizer que revokeAll não é chamado.
comando citado: buscar {"padrao": "revokeAllActiveByUserForTenant|changePasswordWithIdentityHook|localAuthCredential\\.(create|upsert|update)|must_change_password", "caminhos": ["src", "frontend/src", "prisma", "scripts"]}
saída citada:
local-auth-credential.repository.ts:27 create ... identity-link.service.ts:440 / :495 revokeAllActiveByUserForTenant
```

#### Achado 7 — gravidade: ajuste · escopo: dentro-do-bloco · linha: 26 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #74

```
arquivo: docs/revisoes/TELAS/B-TECNICO-ESCOPO-plano.md
motivo: Pôr field_technician no formulário antes do B-TECNICO-ESCOPO facilita cadastrar técnicos que ainda leem preço e financeiro. É dependência de ordem, e a decisão é do dono.
comando citado: buscar {"padrao": "users\\.adapter|field_technician|UserFormModal|B-USERS", "caminhos": ["docs/revisoes/TELAS/B-TECNICO-ESCOPO-plano.md", "docs/revisoes/TELAS/B-APARENCIA-USUARIO-plano.md", "docs/revisoes/TELAS/B-DASH-PERFIL-plano.md"]}
saída citada:
M11 ... dão leitura de preço, orçamento e financeiro ao field_technician, e terão de mudar.
```

#### Achado 8 — gravidade: ajuste · escopo: dentro-do-bloco · linha: — · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #69

```
arquivo: src/modules/core-saas
motivo: Não há tratamento de e-mail duplicado, e a credencial acrescenta outra restrição única (schema:274-275). Deve virar requisito com teste.
comando citado: buscar {"padrao": "P2002|user_email_conflict|email_already|409", "caminhos": ["src/modules/core-saas"]}
saída citada:
codigo=1 (nenhuma ocorrência)
```

#### Achado 9 — gravidade: nota · escopo: dentro-do-bloco · linha: — · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #5

```
arquivo: docs/revisoes/TELAS/B-USERS-ACESSO-plano.md
motivo: Um link precisa de canal de entrega, e o e-mail é proibido. A P2 deve excluir essa opção.
comando citado: git_show {"objeto": "origin/main:docs/revisoes/TELAS/B-USERS-ACESSO-plano.md"}
saída citada:
P2: senha provisória mostrada na tela ou link de primeiro acesso?
```

### Limitações

```
- Não pude executar testes (execução negada), então o comportamento da trava concorrente é análise de código, não prova.
- O plano foi lido por git_show, que não mostra números de linha; os ajustes citam a seção do plano.
- Não li o quadro da maquete (fora do repositório).
```
