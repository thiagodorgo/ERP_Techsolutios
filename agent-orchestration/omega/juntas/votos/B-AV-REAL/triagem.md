# Triagem da junta J-B-AV-REAL (PR #477), fluxo rápido §C7 item 10(3)

Objeto julgado: `2746eb6055abcdab863a2d1ce3c7cb2a8a5f6c77`. Votos: C1, C2 e C3 reprovam. Feita pelo orquestrador em 31/10, 20:20 SP.

Nenhum achado é GRAVE na definição do item 10 (perde dado, vaza entre organizações, quebra permissão, erra dinheiro): todo vermelho do antivírus fecha falhando, sem aprovar nada. C2-A1/C3-A1 e C2-A2/C3-A2 são o mesmo defeito visto por duas cadeiras, e impedem o entregável de funcionar. Exigem decisão de desenho, por isso a auditoria do topo (item 10(5)).

## Consertar agora, num conserto só

| ID do lote | Achados | O que é preciso |
|---|---|---|
| L1 | C2-A1, C3-A1 | healthcheck do overlay: falso negativo de `clamdcheck.sh` (`localhost` resolve `::1`, clamd em `0.0.0.0`) |
| L2 | C2-A2, C3-A2 | overlay com base que atualiza sem abrir a rede privada do clamd; runbook diz a verdade |
| L3 | A1, A2 | teste de privacidade pega log `pino` real; caminho `detail`/corpo; canário de `JWT_SECRET` por valor |
| L4 | A3 | default 72 em produção com guarda |
| L5 | A5 | censo pega `import "x"` e `import("x")` |
| L6 | A7 | prazo de connect e de `VERSION` com teste que morde |
| L7 | A11, C2-A4 | `scanReason` com teste (log do gate) |
| L8 | A10, C3-A6 | EICAR em duas metades, montado em execução |
| L9 | C3-A4 | job e script exigem os 8 casos; sumir caso fica vermelho |
| L10 | C2-A5 | guard de topologia cobre o que L1/L2 mudam, mais as 4 mutações que ficaram verdes |
| L11 | C3-A3, C3-A8, C3-A9, C3-A7 | correção de registro: run 7/8, histórico dos commits do job, F11, pendência `P-AVREAL-RETRY-AFTER`, `PLANO_SAN3` l.191/270 com riscado honesto e 415×422, alerta `amd64` nos dois documentos |

## Vira pendência com dono (`B-AV-REAL-RESIDUAL`), não segura o bloco

| Pendência | Achado | Por quê |
|---|---|---|
| `P-AVREAL-TETO-IDADE` | A4 | regra nova (teto de `CLAMAV_MAX_DB_AGE_HOURS` em produção); fail-closed mantido |
| `P-AVREAL-PRAZO-SOMA` | A6 | limitado e fail-closed; 48 s no lugar de 45 s |
| `P-AVREAL-VERSION-FUTURO` | A8 | exige daemon adulterado ou relógio errado |
| `P-AVREAL-SEGUNDA-RESPOSTA` | A9 | exige daemon adulterado |
| `P-AVREAL-ROTAS-ROTULO` | C2-A3 | propriedade já guardada por `o6r07b-mime-sniff-routes`; o teste novo é fraco, não o produto |
| `P-AVREAL-B108-PROVA` | C2-A6 | `pre-existente`; comportamento de hoje correto, medido por sonda 6/6 |
| `P-AVREAL-PANE-CI` | C3-A5 | pane, recuperação e 503 sem prova em CI; 503 funcionou na sonda |

Nota sem pendência: A12 (custo de mutação ~45 s por caso).

## Ressalvas do inspetor a cuidar no fechamento

- Processos do teste travado em `w-avreal`: encerrar antes de remover o worktree.
- `arquivos_medidos` da C3 precisa usar `tests/avreal-clamd.integration.ts`.
