# Regras de Negocio

## Fonte consolidada

As regras iniciais do repositorio estao em `docs/04-regras-negocio.md`.

## Regras transversais ativas

- todo dado operacional pertence a um tenant
- toda acao critica gera trilha de auditoria
- exclusao de entidades criticas deve ser logica
- ordem de servico e a entidade central do fluxo operacional
- mobile deve suportar operacao offline controlada

## Modulo Controle de Frota (Rodada F) — regras ativas

### F1 Abastecimento (`FuelLog`) — aplicada 2026-07-08

- **R1.1 km/L derivado**: consumo (km/L) e SEMPRE calculado no servidor a partir da historia
  ordenada do odometro da viatura; nunca armazenado. Primeiro abastecimento da viatura nao tem
  km/L (baseline "—"). Cards de totais (litros, R$, km/L medio da frota) sao agregados reais da
  janela filtrada.
- **R1.2 odometro monotonico**: por viatura, o odometro de um novo lancamento deve ser >= ao
  ultimo registrado (ativo ou nao); violacao = **422** (`odometer_regressive`).
- **vinculo obrigatorio**: todo `FuelLog` referencia uma viatura do mesmo tenant (FK composta);
  referencia inexistente/cross-tenant = 400.
- transversais herdadas: tenant da claim, RLS, auditoria em toda mutacao, desativacao logica
  (`is_active`), dinheiro `Decimal(20,6)`, datas `timestamptz`.

### F2 Manutencao (`MaintenanceOrder`) — aplicada 2026-07-08

- **R2.1 maquina de estados**: `agendada→{em_execucao,cancelada}`, `em_execucao→{concluida,cancelada}`,
  `concluida`/`cancelada` finais; transicao invalida = **422**. **Concluir exige custo + data de
  conclusao** (senao 422).
- **R2.2 aviso idempotente**: preventiva `agendada` vencendo em <=7 dias gera 1 `Notification`
  (idempotente por `maintenance_due:<id>` — rodar 2x = 1 aviso).
- **R2.3 disponibilidade**: viatura com manutencao `em_execucao` fica indisponivel; criar OS nova
  vinculando-a = **409** (leitura em `resolveVehicle`/`create`; field-dispatch intocado).
- **odometro (R1.2 cross-entity)**: quando informado, >= maior odometro da viatura entre manutencoes e
  abastecimentos, senao 422. Viatura obrigatoria (400 se cross-tenant/inexistente).

### F3 Multas (`Fine`) — aplicada 2026-07-08

- **R3.1 maquina de estados**: `recebida→{em_recurso,paga,cancelada}`, `em_recurso→{deferida,indeferida,
  cancelada}`, `indeferida→{paga,cancelada}`, `deferida→{cancelada}`, `paga`/`cancelada` finais; invalida = 422.
- **cancelamento** so por `tenant_admin`/`super_admin` (403 caso contrario).
- **R3.3 unicidade**: `numero_auto` unico por tenant — duplicar = 409; mesmo numero em outro tenant = 201.
- **R3.2 prazos**: `prazo_recurso`/`prazo_pagamento` <=7d = aviso (ambar), vencido = perigo (vermelho);
  <=7d gera 1 `Notification` idempotente. `pontos` informativos (sem calculo de CNH).
- **condutor** opcional, validado no tenant (400 se cross-tenant/inexistente). Viatura obrigatoria.

### F4 Seguros (`InsurancePolicy`) — aplicada 2026-07-08

- **R4.1 `vencida` derivada**: status armazena so `vigente|cancelada`; `vencida` e computada
  (`vigencia_fim < hoje`), nunca setada manualmente (setar = 422). So `vigente↔cancelada` editaveis.
- **R4.2 alertas 30/15/7 dias** antes do fim da vigencia -> 1 `Notification` idempotente por janela.
- **unicidade**: `numero_apolice` unico por tenant (409 duplicado / 201 outro tenant); `vigencia_fim >
  inicio`. Viatura obrigatoria.
- **R4.3 (adiado, P-016)**: indicador "sem apolice vigente" na Viatura/Mapa fica para F6/bloco dedicado.

### F5 Danos (`Damage` + `DamageAttachment`) — aplicada 2026-07-08

- **R5.1 maquina de estados**: `registrado → em_tratativa → resolvido` (422 fora disso).
- **R5.2 fotos**: reusam o STORAGE PROVIDER do checklist (D-014) — sem storage novo/presigned; DTO expoe
  so metadados seguros (id/nome/mime/tamanho/marker) + URL de download autenticada; nunca path/key/bucket.
  Upload multipart com allowlist de mime (415) e limite de tamanho (413); galeria + download por API.
- **R5.3 vinculos**: dano -> OS de origem (`/work-orders/:id`, opcional, validado no tenant); viatura ->
  cadastro. Viatura obrigatoria. Custos estimado/real `Decimal(20,6)` opcionais.
- **RBAC**: operator/field_technician registram (create); manager/tenant_admin tratam (update);
  finance/auditor leem. Upload por create OU update; download por read; delete por update.

### F6 Mapa Operacional real — aplicada 2026-07-08

- **R6.1 painel lateral**: pin de operador -> OS ativa dele -> `/work-orders/:id`; pin/linha de
  despacho -> detalhe; pin stale (ultimo visto > threshold) -> alerta "ultimo visto ha X".
- **R6.2 estados**: skeleton, vazio orientado ("nenhum operador em campo"), erro+retry, stale.
  **Zero pin fabricado** (D-007): mock -> vazio; erro -> vazio + razao.
- **R6.3 polling** 30s + SSE com cleanup no unmount (preservados).
- **R6.4 badges no pin**: "Em manutencao" (viatura com MO `em_execucao`, F2) e "Sem seguro"
  (viatura sem apolice vigente, F4), com cor+label, gated por permissao; deep-link para
  `/fleet/maintenance` e `/fleet/insurance`. Despachante ganhou `insurance_policies:read` (D-015).

## Observacao de alinhamento

As regras de negocio seguem a documentacao enviada pelo usuario e o repositorio oficial atual. Qualquer retorno para backend em C exige nova decisao explicita porque conflita com o estado atual do repositorio.

