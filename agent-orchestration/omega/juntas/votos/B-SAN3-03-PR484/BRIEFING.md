# Briefing da junta do PR #484 (B-SAN3-03), objeto `5b628b886520bcbece0228eec9d47c965a32b577`

Orquestrador: Claude Opus. Inspetor `inspetor-j484-opus`: **LIBERADO COM RESSALVA** (`inspetor-parecer.md`). Este briefing cobre as ressalvas R1–R6, e mandato sem ele não está coberto.

## Quórum (R5c)
- **Unanimidade de 3, com veto**: o bloco toca dinheiro e o isolamento entre organizações (§C7 item 10(1)).
- Voto perdido não conta. A junta só fecha com 3 votos válidos, todos referidos ao objeto `5b628b88`.

## Competências (R6)
| Cadeira | Competência | Temas |
|---|---|---|
| C1 | isolamento entre organizações e fail-closed | tag ambígua ou desconhecida mandando custo a outra organização: A5, E2-A1, E2B-A1 |
| C2 | cálculo de dinheiro no resumo | período e contrato da rota: A1, E2-A2, E2B-A2 |
| C3 | banco real, regressão, escopo e registro | suíte, CI e Postgres |

Cada uma usa o seu próprio Postgres descartável.

## A re-verificar (R1, R2): nada disto é fato
- As afirmações de "conserto feito" do relatório do dev (`docs/revisoes/SAN3/B-SAN3-03-dev.md` no objeto) e das §7/§8 da emenda 2 **são a re-verificar**. Nenhum verificador mediu as correções do §7 e do §8 depois das críticas.
- RETOMADA 16 do relatório: o driver de mutações terminou com **exit 1** depois da M16. A M13 e a M16 ficaram vermelhas por outro motivo que não `AssertionError`. Meça.

## Terreno (R3, R4)
| Cadeira | Worktree | Container | Porta |
|---|---|---|---|
| C1 | `C:/Users/thiag/w-j484-c1b` | `j484-c1b-pg` | 127.0.0.1:55484 |
| C2 | `C:/Users/thiag/w-j484-c2` | `j484-c2-pg` | 127.0.0.1:55482 |
| C3 | `C:/Users/thiag/w-j484-c3` | `j484-c3-pg` | 127.0.0.1:55483 |

- Cada worktree nasce por `git -C C:/Users/thiag/Documents/GitHub/ERP_Techsolutios worktree add --detach <wt> 5b628b88`, com `npm ci` próprio. Nunca junction de `node_modules` (§C7.1-ter(c)).
- **Proibidos:** `erp-postgres`, `erp-redis`, as portas 3000, 5173, 5432 e 6379, a árvore principal, `prune` e `down -v`.
- No fim, derrube o seu container e remova o worktree só por `git worktree remove --force`.
- No máximo 2 cadeiras ao mesmo tempo. A 3ª só nasce quando uma terminar e derrubar o container. Confira a memória de commit livre ≥ 4 GB antes de subir o Docker.

## Mandato (R5a, §C7.7, colar no disparo)
```
Após CADA item: apense a <cadeira>-evidencia.md → comando · saída resumida · veredito parcial.  [P1]
Antes da mensagem final: escreva <cadeira>-voto.json. Mensagem final = 1 linha apontando o arquivo.  [P2]
Máximo 3 itens; logs longos só no arquivo de evidência.  [P4]
Se você substituir um caído: re-execute cada comando do <cadeira>-evidencia.md dele e compare, depois
meça a cauda. Conclusão sem comando registrado NÃO é insumo.  [P3]
Se receber PAUSA: termine o comando em curso, grave `## PAUSA <hora UTC>` em <cadeira>-evidencia.md
(head · feito · falta · próximo comando · arquivos meio-escritos) e pare sozinho com 1 linha apontando
o arquivo. Não inicie item novo.  [P7]
```

## Registro de quedas (R5b)
`revisoes/j484/00-quedas.md` (P6).

## Voto (R5d)
O JSON tem: cadeira, identidade, modelo ("Claude Opus, nível menor, DECLARADO"), objeto, voto (APROVADO ou REPROVADO), evidencia, resumo, achados [{id, gravidade, escopo, comando, saida, motivo}] e **arquivos_medidos** (§C7 item 9(0)).

## Regras de julgamento
- Gravidade GRAVE = perde dado, vaza entre organizações, quebra permissão ou erra dinheiro.
- Escopo dentro-do-bloco ou pre-existente, com evidência de data ou origem.
- Lista COMPLETA de achados, cada um com o comando que o reproduz (item 10(3)).
- Não proponha correção (§C7.4-bis).
- "Não consigo medir" = REPROVADO.
