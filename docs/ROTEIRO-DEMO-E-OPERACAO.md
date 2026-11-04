# Roteiro de demonstração e operação

## 0. Como usar

Este repositório é público. O roteiro privado de demonstração não é versionado. Este documento contém apenas
procedimentos técnicos, resultados neutros e hashes verificáveis; não contém credencial, dado de cliente, conteúdo
comercial nem valor de segredo.

Execute os ensaios somente em ambiente descartável e isolado. Nunca reutilize banco, cache, porta, aparelho ou
conta de um ambiente ativo. Segredos entram por cofre, arquivo protegido ou entrada padrão, nunca por argumento de
linha de comando. Se uma pré-condição não puder ser provada, adie o procedimento: não substitua o aceite por uma
simulação.

## 1. Demonstração — registro neutro

O roteiro funcional é privado porque este repositório é público. A execução independente registra aqui apenas data,
head, resultado numerado e hashes SHA-256 do roteiro e da evidência, sem descrever os fluxos.

| Data | Head | Executor independente | Fluxo 1 | Fluxo 2 | Fluxo 3 | Fluxo 4 | SHA-256 do roteiro | SHA-256 da evidência |
|---|---|---|---|---|---|---|---|---|
| 2026-11-04 | a11d91f2 | demo-exec-10b | ADIADA | ADIADA | ADIADA | ADIADA | `1f1fc91b303b26a911d36718b24ec279c5422b8215da38e670de4c3ef9ea9d80` | `753dcf80224d9d00f75bfc5c15a23d6fb0876625acbecad882d77ccb6e29f9f9` |

### Adiamentos desta entrega parcial

| Fatia ou trecho | Estado | Motivo | Dono |
|---|---|---|---|
| F3 | ADIADA | O aplicativo release não declara `android.permission.INTERNET`; build debug não substitui o aceite. | `B-MOBILE-INTERNET-RELEASE` |
| Op-10 | ADIADA | Depende da conectividade real do aplicativo release para exercitar a fila contra a API isolada. | `B-MOBILE-INTERNET-RELEASE` |
| Op-8 mobile | ADIADA | A prova da preservação da fila após a rotação depende da mesma conectividade do release. | `B-MOBILE-INTERNET-RELEASE` |
| F4 | ADIADA | O seed versionado não reproduz o estado funcional exigido pelo roteiro privado. | `B-SAN3-10b-F4-SEED-ISOLADO` |

Este PR é parcial. O item 44 permanece **PARCIAL** até os quatro adiamentos acima serem executados com prova real.

## 2. Procedimentos de operação

Cada procedimento informa quando usar, responsável, pré-condições, passos, prova de fim e recuperação. Os comandos
que alteram dados devem ser executados apenas depois de confirmar visualmente o projeto e o alvo isolados.

### Op-1 Subir e validar a imagem de produção fora do provedor

**Quando usar:** antes de promover uma imagem e depois de alterar compose, boot ou persistência.
**Quem:** operador de release.
**Pré-condições:** Docker saudável; portas-alvo livres; projeto descartável com nome próprio; `API_PORT` fora de
3000; imagem local com tag exclusiva; nenhuma variável herdada apontando para banco, cache ou API ativos.

1. Conferir o compose renderizado e o nome do projeto.
2. Executar `API_PORT=<porta-isolada> API_IMAGE=<imagem-isolada> SMOKE_COMPOSE_BUILD=1 node scripts/smoke-compose-persistence.mjs`.
3. Ler o log numerado inteiro. O smoke deve escrever, reiniciar e ler o mesmo registro, comprovar processo novo e
   obter `/health/ready` com Postgres, Redis e worker saudáveis.
4. Derrubar somente o projeto descartável, com volumes e órfãos dele.

**Prova de fim:** todos os passos do smoke terminam `OK`, inclusive persistência e readiness; inventário final sem o
projeto.
**Se falhar:** preservar o log, não promover a imagem e investigar o primeiro passo vermelho. Não repetir contra
ambiente ativo.

### Op-1a Pré-condição do deploy: censo de duplicatas

**Quando usar:** antes da migração `20260873000000_add_stock_movements_unique_backstops`.
**Quem:** DBA ou operador com acesso controlado.
**Pré-condições:** janela de manutenção; backup válido; execução por superusuário ou papel com `BYPASSRLS`;
`scripts/inventory-duplicates-census.sql` conferido no mesmo head da migração.

1. Executar o censo com o papel de runtime como controle negativo. Ele deve recusar com SQLSTATE 42501.
2. Executar o censo sob superusuário ou papel com `BYPASSRLS`.
3. Se o resultado for zero grupos, executar a migração.
4. Se houver grupos, parar. A decisão é humana, grupo a grupo, usando movimento compensatório; nunca apagar linha.
5. Se a migração abortar com SQLSTATE P0001 e a frase `grupo(s) DUPLICADO(S) de legado`, confirmar que o censo
   permaneceu inalterado e marcar
   `20260873000000_add_stock_movements_unique_backstops` como rolled back com `prisma migrate resolve --rolled-back`,
   reconciliar os grupos e então executar `prisma migrate deploy` novamente.
6. Confirmar com `prisma migrate status` que a base está atualizada.

**Prova de fim:** controle negativo 42501, censo autorizado com zero grupos e status atualizado.
**Se falhar:** não forçar a migração nem apagar duplicatas; manter a janela e escalar com o relatório do censo.

### Op-2 Deploy no provedor AWS

**Quando usar:** somente depois de existir infraestrutura AWS aprovada.
**Quem:** dono da conta e operador autorizado.
**Pré-condições:** estudo `P-TRC-AWS-ESTUDO-MIGRACAO` encerrado, infraestrutura versionada, cofre configurado, imagem
aprovada e plano de retorno aprovado.

O runbook específico da AWS ainda não existe. Não invente comandos nem reutilize a configuração inerte do provedor
anterior. A contratação, o deploy real e a rotação no cofre são atos do dono.

**Prova de fim:** a definir no runbook AWS.
**Se falhar:** não improvisar; manter a versão atual e abrir incidente.

### Op-3 Rollback restrito

**Quando usar:** regressão confirmada depois de um deploy.
**Quem:** operador de release com autorização do incidente.
**Pré-condições:** identificar o SHA da imagem atual, o SHA de destino e se ambos contêm o 03a; backup e smoke
disponíveis.

1. Rollback com dois escritores atendendo ao mesmo tempo é proibido.
2. Destino anterior ao 03a, entregue no PR #425, é proibido: use fix-forward. A pendência
   `P-O6R-B03-PUBLICACAO-SEM-WRITER-ANTIGO` permanece aberta.
3. Entre imagens que já contêm o 03a, parar a API, trocar a imagem sem sobreposição de escritores e subir uma única
   versão.
4. Executar o smoke completo da Op-1 e registrar o tempo.

**Prova de fim:** uma única versão atendendo, smoke verde e ausência de escritor antigo.
**Se falhar:** manter a API parada se houver risco de duplicação financeira e aplicar fix-forward.

### Op-4 Backup local validado

**Quando usar:** antes de mudança destrutiva, restore drill ou janela de manutenção.
**Quem:** DBA ou operador autorizado.
**Pré-condições:** alvo conferido; destino protegido; espaço livre; credencial fornecida sem argumento.

1. Executar `pg_dump -Fc` dentro do ambiente que contém o Postgres-alvo.
2. Conferir código zero e tamanho maior que zero.
3. Executar `pg_restore -l <arquivo.dump>` e confirmar que há entradas.
4. Registrar data, head, banco lógico, tamanho e contagem de entradas, sem registrar credencial.

O envio ao S3 é ato do dono e só ocorre depois de a conta AWS e o bucket existirem.

**Prova de fim:** dump em formato custom, `pg_restore -l` legível e mais de zero entradas.
**Se falhar:** apagar apenas o dump incompleto, preservar o banco e repetir depois de corrigir causa e espaço.

### Op-5 Restore cronometrado com a aplicação na base restaurada

**Quando usar:** drill periódico e validação antes de go-live.
**Quem:** DBA com um operador da aplicação.
**Pré-condições:** dump validado; cluster descartável; contêiner Postgres confirmado pelo projeto; URLs de API e
migração derivadas do compose e apontadas a `erp_restore_drill` por `<override>` obrigatório.

1. Autenticar na base de origem, chamar `GET /api/v1/me` e guardar o nome da organização como canário inicial.
2. Criar o dump da Op-4.
3. Alterar o nome somente na base de origem com sufixo de controle e limpar apenas o Redis do projeto descartável.
4. Confirmar que `GET /api/v1/me` na origem mostra o sufixo.
5. Executar `bash scripts/restore-drill.sh <dump> <container-isolado>` e registrar tempo e contagens.
6. Subir `migrate` e `api` com `RESTORE_MIGRATE_DATABASE_URL` e `RESTORE_API_DATABASE_URL` obrigatórias, derivadas
   do compose e com o banco trocado somente para `erp_restore_drill`.
7. Dentro da API, imprimir somente o pathname da URL e confirmar `/erp_restore_drill`.
8. Ler o log de migração e confirmar que não há migrações pendentes.
9. Fazer login e chamar `GET /api/v1/me`: ambos devem responder 200, e o nome deve ser o canário inicial sem o sufixo.

**Prova de fim:** contagens origem/restaurado iguais, pathname restaurado, migração em dia, login 200 e leitura 200
sem o sufixo. O RTO inclui o restore e o tempo até o login, junto do volume por tabela-chave.
**Se falhar:** não promover. Se o papel de runtime perder privilégios no restore, emendar o runbook para reaplicá-los,
revisar a emenda e repetir o mesmo aceite.

### Op-6 Bootstrap do primeiro admin

**Quando usar:** primeira ativação de plataforma ou recuperação explícita de credencial.
**Quem:** operador autorizado, em janela controlada.
**Pré-condições:** alvo isolado; `NODE_ENV=production`; opt-in explícito; e-mail e nome conferidos; senha aleatória por
entrada padrão.

1. Sem opt-in, executar o script e confirmar recusa com exit 2.
2. Confirmar que senha em argumento é recusada como `PASSWORD_IN_ARGV`.
3. Executar `scripts/bootstrap-platform-admin.ts` com `--dry-run`; a contagem de usuários deve ficar igual.
4. Executar de verdade com `--password-stdin`; confirmar exit 0 e criação de um usuário.
5. Repetir sem reset; a contagem não muda.
6. Fazer login e confirmar 200.
7. Para recuperação, usar `--reset-password` conscientemente. A simulação hoje pode dizer “senha mantida” embora a
   execução real redefina; `P-SAN3-09-DRYRUN-RESET-DIZ-SENHA-MANTIDA` continua aberta.

**Diagnóstico:** se a saída terminar apenas em `FALHOU`, verificar conectividade sem imprimir a URL do banco;
`P-SAN3-09-FALHOU-SEM-CAUSA` continua aberta.
**Prova de fim:** dry-run sem escrita, criação única, repetição convergente e login 200.
**Se falhar:** não contornar o opt-in; corrigir alvo ou conectividade e repetir desde o dry-run.

### Op-7 Provisionamento de RBAC

**Quando usar:** bootstrap e depois de alterar o catálogo canônico de permissões.
**Quem:** operador de plataforma autorizado.
**Pré-condições:** base-alvo isolada e conexão fornecida por ambiente protegido.

1. Executar `scripts/provision-rbac.ts` e ler papéis, permissões, concessões e revogações nomeadas.
2. Executar novamente no mesmo estado.
3. Confirmar que a segunda rodada não cria nem remove nada adicional.

**Prova de fim:** duas rodadas verdes e segunda rodada convergente.
**Se falhar:** preservar o relatório, não editar RBAC diretamente e corrigir a fonte canônica.

### Op-8 Rotação de JWT e refresh

**Quando usar:** suspeita de exposição, política periódica ou troca planejada de cofre.
**Quem:** operador de segurança com dono do ambiente.
**Pré-condições:** janela de baixo uso; novos valores aleatórios com ao menos 64 caracteres; valores diferentes entre
si e de todo `PORTAL_*_SECRET`; plano de comunicação e fila do app conferida.

1. Gerar os dois valores em arquivo protegido ou cofre, sem ecoar nem colocar em argumento.
2. Atualizar `JWT_SECRET` e `JWT_REFRESH_SECRET` no cofre e reiniciar a API.
3. Ler o boot. A trava mede presença, rejeita valores de desenvolvimento e recusa igualdade com segredos do portal;
   ela não mede força criptográfica.
4. Confirmar que token de acesso anterior retorna 401 e refresh anterior retorna 401.
5. Fazer novo login e confirmar 200.
6. Confirmar o efeito operacional: sessões expiram; contadores de bloqueio derivados de `JWT_SECRET` zeram.
7. No app, fazer login novamente. Se houver “Envio não concluído”, usar “Tentar de novo”; nunca descartar por causa da
   rotação. Conferir que a fila sobrevive e registrar a variação do contador de tentativas.

**Prova de fim:** boot saudável, 401/401/200, valor igual ao segredo do portal recusado e fila preservada.
**Se falhar:** restaurar o valor pelo cofre apenas se a análise de exposição permitir; caso contrário, manter a nova
credencial e corrigir o cliente. Nunca imprimir valores no incidente.

### Op-9 Rotação do segredo do Traccar

**Quando usar:** rotação programada do segredo de encaminhamento.
**Quem:** operador de segurança.
**Pré-condições:** segredo novo no cofre, relógios sincronizados e janela máxima de 72 horas.

1. Promover o valor novo para `TRACCAR_FORWARD_SECRET_CURRENT`.
2. Mover o valor anterior para `TRACCAR_FORWARD_SECRET_PREVIOUS`.
3. Definir `TRACCAR_FORWARD_SECRET_PREVIOUS_UNTIL` com prazo de até 72 horas.
4. Reiniciar e verificar aceitação do atual, aceitação temporária do anterior e recusa fora da janela.
5. Remover o valor anterior ao final da janela.

**Prova de fim:** suíte `tests/traccar-ingest-listener.test.ts` verde, segredo atual aceito e anterior expirado. A
ingestão ainda não está em produção.
**Se falhar:** manter a superfície privada e não ampliar a janela além de 72 horas.

### Op-10 Drenagem da fila do app antes de atualizar

**Quando usar:** em todo aparelho instalado antes de uma atualização que altere o fluxo da fila. O número atual não
distingue o app antigo; veja `P-MOBILE-VERSAO-SEM-INCREMENTO`.
**Quem:** técnico no aparelho e operador com permissão de cancelar OS no console.
**Pré-condições:** aparelho on-line, técnico autenticado, console disponível e fila visível.

1. Antes de atualizar, abrir **Sincronização** e enviar até não restar pendência.
2. Atualizar por cima do app instalado. Nunca desinstalar nem apagar os dados antes da prova final.
3. Abrir **Sincronização**. Se houver “Envio não concluído” de Ordem de serviço com mudança para Cancelada, anotar o
   código e avisar a operação. Não descartar ainda.
4. O papel autorizado cancela a OS no console web, incluindo a decisão financeira. O técnico não arbitra cobrança.
5. Somente depois de a OS aparecer Cancelada no console, descartar aquele envio no aparelho.
6. Despesa nunca é descartada. Usar “Tentar de novo” e escalar se continuar falhando; nunca limpar o aparelho com
   despesa na fila.
7. Confirmar 0 pendente, 0 envio não concluído e as OS canceladas com decisão no console.

**Prova de fim:** fila vazia, nenhum encalhado e decisão persistida; despesa enfileirada não oferece “Descartar”.
**Se falhar:** não apagar dados nem desinstalar. Preservar o aparelho e escalar com os códigos das OS.

### Op-11 Chave do Google Maps

Não há procedimento de rotação ativo. `D-GOLIVE-MAPS-ROTACAO-DISPENSADA` dispensou a ação porque o produto usa
MapLibre e OpenFreeMap. A dispensa caduca se o projeto voltar a usar Google Maps Platform; nesse caso, reabrir a
decisão antes de configurar qualquer chave.

## 3. Registro de ensaio

As linhas resumem saídas saneadas. Logs brutos e valores sensíveis não são versionados.

| Procedimento | Data | Head | Comando principal | Saída resumida | Veredito | Ensaiador |
|---|---|---|---|---|---|---|
| Op-1 | 2026-11-04 | a11d91f2 | smoke de compose em projeto isolado | doze passos verdes; persistência e processo novo comprovados | passou | dev-44-sol |
| Op-1a | 2026-11-04 | a11d91f2 | censo e migração em banco descartável | aborto P0001 nomeado; censo inalterado; recuperação e status atualizados | passou | dev-44-sol |
| Op-5 | 2026-11-04 | a11d91f2 | restore cronometrado com canário | API leu `/erp_restore_drill`; canário restaurado sem sufixo | passou | dev-44-sol |
| Op-6 | 2026-11-04 | a11d91f2 | bootstrap por entrada padrão | recusas, dry-run, criação única, repetição e login comprovados | passou | dev-44-sol |
| Op-8 | 2026-11-04 | a11d91f2 | rotação na API isolada | ADIADA: backend comprovado, trecho mobile sem INTERNET no release; dono B-MOBILE-INTERNET-RELEASE | ADIADA | dev-44-sol |
| Op-10 | 2026-11-04 | a11d91f2 | atualização por cima no AVD isolado | ADIADA: release sem INTERNET não alcança a API isolada; dono B-MOBILE-INTERNET-RELEASE | ADIADA | dev-44-sol |

## 4. Atos do dono no ambiente real

- Aprovar e executar o deploy AWS quando o runbook e a infraestrutura existirem.
- Criar o bucket e autorizar o upload do backup.
- Executar o restore cronometrado com a aplicação viva e medir RPO/RTO.
- Executar o censo em staging e produção sob o papel correto.
- Rotacionar valores nos cofres reais e coordenar novo login dos usuários.
- Aplicar a Op-10 nos aparelhos reais antes da atualização.

Esses atos não fazem parte dos ensaios locais e não podem ser inferidos de um CI verde.
