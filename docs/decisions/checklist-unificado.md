# Decisão: Checklist unificado web ↔ mobile

## Conceito (uma entidade, dois papéis)
- TEMPLATE (molde): criado e editado no WEB pelo gestor. É configuração.
- RESPOSTA (instância): criada no MOBILE, a partir do template, para UMA OS.
  É dado operacional.
O web define a pergunta. O mobile grava a resposta. Nunca os dois definem
a pergunta.

## Entrega do template ao mobile — OPÇÃO A (aprovada)
O template VIGENTE viaja como SNAPSHOT dentro do payload da OS no despacho.
- O mobile NÃO busca catálogo de templates separado.
- Funciona 100% offline: o técnico já recebeu o molde junto com a OS.
- Auditoria: se o gestor editar o template amanhã, a OS despachada hoje
  mantém a versão que foi enviada (mesmo princípio do snapshot de cliente
  já aprovado no B1).
- Versão do template é gravada na resposta (rastreabilidade).

## Implicações obrigatórias
- Um único modelo de template no backend, servindo web e mobile.
- Qualquer builder de checklist no mobile que DEFINA molde é bug: remover.
- Contrato de sync mobile carrega o snapshot do template na OS (aditivo).
