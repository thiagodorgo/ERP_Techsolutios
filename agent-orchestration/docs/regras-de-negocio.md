# Regras de Negocio

## Fonte consolidada

As regras iniciais do repositorio estao em `docs/04-regras-negocio.md`.

## Regras transversais ativas

- todo dado operacional pertence a um tenant
- toda acao critica gera trilha de auditoria
- exclusao de entidades criticas deve ser logica
- ordem de servico e a entidade central do fluxo operacional
- mobile deve suportar operacao offline controlada

## Observacao de alinhamento

As regras de negocio seguem a documentacao enviada pelo usuario e o repositorio oficial atual. Qualquer retorno para backend em C exige nova decisao explicita porque conflita com o estado atual do repositorio.

