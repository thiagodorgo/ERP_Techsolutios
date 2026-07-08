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

## Observacao de alinhamento

As regras de negocio seguem a documentacao enviada pelo usuario e o repositorio oficial atual. Qualquer retorno para backend em C exige nova decisao explicita porque conflita com o estado atual do repositorio.

