# B-AGENTE-API-2 — ensaio contra a API real (orquestrador, 2026-10-11 14:11–14:14Z)

Feito ANTES do merge, como o plano manda (lição do #418). Código do head `78507252`, venv do `w-agapi2`. Tarefa real:
`redigir --entregavel registro` com o pacote `scripts/agente-claude-api/pacotes/pacote-registro-2026-10-11.md`
(rascunho das pendências novas do dia), SHA alvo `1d4d2834`. Custo total do ensaio: US$ 0,86.

| # | execução | resultado |
|---|---|---|
| 1 | pacote em `erp-pausa-2026-10-03/prompts/` (fora das raízes) | `erro interno: ContextoRecusado`, exit 5, **sem o motivo** |
| 2 | pacote em `pacotes/`, caminho RELATIVO `pacotes/…` | `ContextoRecusado` de novo; o motivo, medido chamando `contexto.carregar` direto, é "pacote inexistente ou caminho inválido": o relativo é resolvido a partir da raiz do repo, não da pasta atual |
| 3 | caminho ABSOLUTO dentro de `pacotes/`, teto US$ 1 | rodou; PARCIAL `orcamento:custo` com **US$ 0,318** gastos: a previsão do pior caso da próxima chamada para ao ~1/3 do teto |
| 4 | idem, teto US$ 3 | o modelo entregou; a montagem recusou: `EntregaRecusada("fonte não conferida em entrega fail-closed")`, exit 5, veredito inconclusivo, US$ 0,537 |

## Achados do ensaio (para o dev; o orquestrador não conserta)
- **E1 · ajuste:** o CLI imprime só o nome da exceção (`ContextoRecusado`, `EntregaRecusada`). O motivo tem de sair na tela e no `erro.txt`.
- **E2 · ajuste:** `--contexto` relativo é resolvido a partir da raiz do repo, e não da pasta atual. Resolva a partir da pasta atual, ou recuse com mensagem que diga a regra. Documente as raízes permitidas no README.
- **E3 · ajuste:** a previsão de custo (A4 do #417) usa o pior caso e para cedo: 0,318 de 1,00. Calibre (por exemplo, pela média dos turnos já feitos) ou publique a regra prática "teto ≈ 3× o esperado" e ajuste os tetos padrão por tarefa.
- **E4 · bloqueia o uso do `redigir`:** a conferência de fontes em modo fail-closed recusa a entrega quando uma fonte citada pelo modelo não casa com a auditoria. Medir na auditoria desta execução (`saidas/20261011-141321Z-redigir-799e49d2…`) qual fonte foi citada e qual chamada real a sustentava. Corrigir a normalização (caminho, intervalo de linhas, busca × leitura) sem afrouxar a regra: fonte NUNCA lida continua recusada. O texto do modelo existe em `parecer_do_modelo_sem_montagem`.
- **Não ensaiado:** `propor-patch` e o despachante. Ensaiar depois do conserto.
