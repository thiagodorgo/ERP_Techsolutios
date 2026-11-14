# Demonstração isolada (`scripts/demo-isolado/`)

Monta, numa pilha descartável, o estado de dados que um roteiro de demonstração pede. Não é seed de produção, não
roda em ambiente real e não toca a base de quem desenvolve. A limpeza é `docker compose -p <projeto> down -v`.

## As peças

| Arquivo | O que faz | Fala com |
|---|---|---|
| `alvo.mjs` | travas puras: ambiente, alvo HTTP, alvo do banco e do Redis, projeto, argumentos, censo, segredo | nada |
| `fundacao.ts` | cria a organização e o administrador dela pelo serviço do produto | o banco da pilha (a única peça) |
| `semear.mjs` | o motor: ET1 a ET8, só pela API, com o papel que faria cada coisa no produto | a API da pilha |
| `verificar.mjs` | confere cada pré-condição de uma matriz, só lendo | a API da pilha |
| `censo.sql` | conta, só com SELECT, o que o motor escreve (aceite de "rodar 2 vezes não duplica") | o banco da pilha |
| `fixture-exemplo.json` | a fixture genérica (nomes inventados, e-mails `@exemplo.invalid`) | — |
| `matriz-exemplo.tsv` | a matriz genérica, no formato do verificador | — |

## Ordem na pilha

1. Pilha nova, com a imagem da ref sob teste.
2. Op-7 (`provision-rbac.ts`) e Op-6 (`bootstrap-platform-admin.ts --password-stdin`), como o roteiro de operação manda.
   O e-mail do administrador de plataforma é o `plataforma.email` da fixture.
3. Fundação, pelo serviço `migrate` da pilha. A URL do banco do serviço termina em `?schema=public`, e a trava não
   aceita query: a invocação corta esse sufixo dentro do contêiner.
4. Motor: `node scripts/demo-isolado/semear.mjs --fixture <fixture> --admin-plataforma <arquivo> --senhas <arquivo>
   --provisorias <diretório de saída da fundação>`, com `DEMO_ISOLADO_PROJETO` e `DEMO_ISOLADO_API` no ambiente.
5. Verificador: o mesmo, com `verificar.mjs` e `--matriz <matriz>`.

Os arquivos de senha trazem a senha na 1ª linha (a mesma regra do bootstrap da plataforma). O diretório de saída da
fundação tem o id da organização de plataforma (`plataforma.tenant-id`) e as senhas provisórias, que o motor apaga
quando a troca termina. Nada disso vai para a saída de nenhum programa.

## Travas (fail-closed; todas antes de qualquer conexão)

- `NODE_ENV=production` recusa, sem escape.
- O motor e o verificador só falam com `http://api:3000` (rede do projeto) ou `http://127.0.0.1:<3101-3199>`.
- A fundação só aceita o Postgres e o Redis do projeto (ou de um cluster descartável no host, numa faixa de portas
  reservada), conferidos no texto bruto, no `new URL` e no parser do driver; nunca a porta do Redis de demonstração.
- O projeto tem de começar por `b10b-` ou `demo-isolado-`.
- Censo na fonte real (`GET /platform/overview`): só a organização de plataforma e a da fixture; outra qualquer recusa.
  Uma API que responde sem organização nenhuma é API em memória e recusa.
- Todo login manda o id da organização; o motor e o verificador têm um ponto de login cada.

## Idempotência

Toda escrita é precedida de uma leitura pela chave natural (nome, e-mail, placa, código, título, documento). Toda
mudança de situação (OS, processo de pátio, título, tabela de valores, vaga) só sai se a situação lida for a anterior ao
passo; já adiante, pula; incompatível, para com o código 5. O motor nunca cria OS pelo sync e nunca confia no recibo
do sync, que vive na memória do processo da API e some quando ela reinicia. A 2ª execução imprime `criados=0`.

## Códigos de saída

| Código | Motor | Verificador |
|---|---|---|
| 0 | concluído | todas as pré-condições OK |
| 1 | erro inesperado (sem corpo de resposta nem segredo na mensagem) | matriz ou fixture inválida |
| 2 | ambiente, alvo, projeto ou argumento recusados: nada saiu do processo | idem |
| 3 | censo: fundação ausente, base não virgem ou persistência em memória | idem |
| 4 | senha ausente | idem |
| 5 | `ESTADO_INESPERADO <etapa>`: o motor não força estado | — |
| 6 | — | pelo menos 1 `FALTA` |

## Fixture

Chaves de topo: `organizacao`, `admin`, `plataforma` e `usuarios` (obrigatórias); `clientes`, `viaturas`, `equipes`,
`servicos`, `tabelas`, `perfis_normativos`, `patios`, `processos`, `localizacoes`, `ordens_de_servico`, `contas` e
`titulos` (opcionais). Dinheiro é sempre texto com 2 casas (`"754.00"`); quem converte é a API. Datas de título são
relativas (`vencimento_relativo_dias`), calculadas no fuso `America/Sao_Paulo`; nenhuma data de sistema é escrita.

- Um processo que termina em `ACTIVE_CUSTODY` precisa declarar, em `vistoria.fotos`, os conjuntos de foto que o
  produto exige para concluir a vistoria de recepção. A foto é só uma URL num domínio reservado (o produto não guarda
  o binário dela); ela não abre na tela.
- Uma OS com serviço precisa de tarifa publicada para esse serviço (`tabelas`).
- O passo `on_site` do app confere os 2 últimos caracteres de `placa_atendida`.

## Matriz

TSV com o cabeçalho `passo id papel leitura_api esperado assercao_tela errata`. O formato de `leitura_api` (com os
placeholders) e de `esperado` (os predicados) está no cabeçalho de `verificar.mjs`. Linhas com `-` em `leitura_api` e
em `esperado` são asserções de tela: o verificador conta e não confere.
