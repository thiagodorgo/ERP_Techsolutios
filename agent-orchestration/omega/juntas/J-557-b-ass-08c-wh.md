# Ata da J-557 (PR #557, B-ASS-08c-wh, item 60: o IP do webhook pelos saltos do proxy, o bloqueio antes da cota e a precondição; SEGURANÇA e DINHEIRO, junta completa, unanimidade de 3)

**Fluxo rápido (§C7 10(3)).** Ata do orquestrador (Claude Opus 5.5), escrita em 13/11 19:08 SP; transcrita para o repositório pelo PR de registro de 13/11 noite (`reg-1311n-cl`), com o conserto, a conferência, o merge e o porteiro. As fontes ficam no diretório de revisões do orquestrador, fora do repositório (`revisoes/j557/`).

## Objeto, pré-revisão e inspetor
- **Objeto:** `5537a726`, com 16 check-runs verdes.
- **Pré-revisão:** `prerev-557-dp` (DeepSeek, outra casa: o código é da Codex 3 e da API Claude), **APROVADO COM AJUSTES**, com 3 não graves:
  - A1: faltava o merge da `main` (conflito só em `pendencias.md`);
  - A2: a mutação nova N-IP-FORGE (o fallback devolve a 1ª entrada do XFF) sobrevivia; o código estava certo, faltava o teste;
  - A3: a guarda `tests/ass-08c-canal-off.test.ts` não existe na `main`. **Decisão do orquestrador:** sem ação no 08c-wh; a guarda nasce no 08c1a (#555), e o 08c-wh não acrescenta rota.
  - A1 e A2 consertados pelo `fix-557-cl` (Claude, declarado): o merge da `main` e o teste-dono IP5, vermelho sob a N-IP-FORGE e verde depois. Head `5537a726`; CI backend 5553/0/2 e backend-postgres 621/621.
- **Inspetor:** `insp-557-cl` (Claude, gate), **LIBERADO COM RESSALVA** (R1 a R6, incorporadas às 18:42 SP). A re-medição R6 (head, memória, contêineres e portas livres) foi feita a cada disparo.

## Votos
| Cadeira | Identidade | Modelo | Cruzamento | Voto | Achados |
|---|---|---|---|---|---|
| C1 (o IP) | `j557-c1-dp2` | DeepSeek Pro | sim | **APROVA** | 1 não grave (A1) |
| C2 (cota, bloqueio, precondição) | `j557-c2-cdx2` | Codex 2 (Sol) | parcial, declarado | **REPROVA** | 1 **grave** (C2-01) e 1 não grave (C2-02) |
| C3 (escopo, registro, CI) | `j557-c3-cdx3` | Codex 3 (Sol) | parcial, declarado | **APROVA** | nenhum |

**Resultado: REPROVADO no voto da C2, por 1 grave dentro do bloco.**

Pelo fluxo rápido (§C7 10(3) e (4)), a junta não se refaz. O grave vai para o conserto único. Depois, a conferência roda o comando do achado, confere o teste vermelho sem o conserto e lê o CI. Uma cadeira só se refaz se o conserto mudar regra fora do achado, ou se a conferência mostrar o grave ainda lá.

## Quedas e desvios
- **`j557-c1-dp`:** disparo ABORTADO pelo orquestrador aos ~12 s, por estourar o P5 (seria a 3ª cadeira em paralelo). Não houve evidência nem worktree; o esqueleto do voto foi separado. A C1 foi refeita com identidade nova, `j557-c1-dp2`. Lição do orquestrador: conferir o P5 antes de cada disparo, não só antes do primeiro.
- **`j557-c2-cdx2`:** a sessão Codex terminou com "flagged for possible cybersecurity risk" (ec=1) DEPOIS de gravar o voto completo dos 3 itens. O voto vale. Lição de mandato: nos próximos mandatos para Codex, pedir "um caso de borda de representação ou de entrada que os testes não cobrem", e não "uma forma nova de burlar".

## Triagem
| Achado | Classe | Decisão |
|---|---|---|
| **C2-01** | **grave:** um IP já bloqueado, reapresentado como IPv4 mapeado em IPv6 (`::ffff:a.b.c.d`), atravessa o bloqueio, gasta a cota global, e o legítimo recebe 429. Medido com um teste próprio da cadeira. Na produção a explorabilidade é baixa (com os saltos certos o cliente não escolhe a entrada usada), mas o caso está na classe de grave do briefing | **conserta agora:** normalizar o IP (IPv4 mapeado → IPv4; IPv6 em forma canônica) em `webhookClientIp`, nos caminhos do XFF e do socket, antes das chaves de bloqueio e de cota. Teste-dono: IP6 em `tests/ass-08c-webhook-ip.test.ts`. Mutação: tirar a normalização → IP6 vermelho |
| **C2-02** | não grave: a precondição P23 é fail-open quando o chamador omite `nodeEnv` e os saltos (os campos são opcionais; ainda não há chamador em `src/`) | **pendência** `P-557-PRECONDICAO-CAMPOS-OPCIONAIS` (MÉDIA). Dono: `B-ASS-08c3`, onde o chamador nasce. Torná-los obrigatórios agora editaria a regressão `ass-08-provider-enable` (§3.9 do plano proíbe) |
| **C1-A1** | não grave (risco de operação): saltos configurados ACIMA do número real de proxies deixam o cliente forjar a entrada usada | **pendência** `P-557-SALTOS-ACIMA-DO-REAL` (BAIXA). Dono: o go-live na AWS, que mede os saltos reais da borda e registra o valor em `docs/deployment.md`. A precondição recusa só o 0 |

## Papéis do ciclo (§C7.4-bis)
| Papel | Quem |
|---|---|
| Achou | `j557-c2-cdx2` e `j557-c1-dp2` |
| Triou | o orquestrador |
| Conserta | `fix-557b-cdx3`: Codex 3, identidade nova. Não achou nada; a C3 rodou na mesma conta com outra identidade |
| Confere | outra casa, com identidade nova: o comando da C2-01, o vermelho sem o conserto e o CI |
| Depois | o merge e o porteiro |

## Depois da junta (13/11)
- **Conserto:** `fix-557b-cdx3` (Codex 3), head `5a34f4fc`: `d4f480b3` normaliza o IP do webhook, e `5a34f4fc` registra as 2 pendências da triagem (já na `main` com o PR). O IP6 fica vermelho antes (401/429), verde depois e vermelho com a mutação. CI: backend 5554/0/2, com `ok 490 - IP6`.
- **Conferência:** `conf-557-api` (Claude pela API, outra casa), **CONFERIDO COM RESSALVA**.
  - O IP6 fica vermelho com a rota antiga, exatamente pelo motivo da C2-01, e verde no head; uma sonda extra cobriu 5 grafias do IP mapeado, todas bloqueadas; as regressões ficam verdes.
  - Ressalvas não graves: R1, o contêiner não lê o CI (o orquestrador conferiu: 16/16 verdes, backend 5554/0/2); R2, um JSDoc fora do lugar; O1, o teste da C2 tinha uma linha de controle que afirmava o defeito.
  - Nenhuma cadeira se refaz: o grave sumiu na conferência, e o conserto não mudou regra fora do achado.
- **Merge:** **#557 MERGED em `5728df31`** às 19:44 SP (hora do commit) (squash; árvore igual à de `5a34f4fc`). É o primeiro PR do item 60 a entrar; o item 60 **não** fecha com ele.
- **Porteiro:**
  - `porteiro-557-cdx3` (Codex 3) caiu por limite às 19:50 SP, com o item 1 e parte do 2 na evidência, preservada;
  - `porteiro-557-api` (Claude pela API, sucessor P3; cruzamento parcial, declarado) re-executou cada comando registrado (saída igual, menos o diff para um objeto ausente do contêiner) e mediu a cauda. **LIBERADO COM RESSALVA** para o B-ASS-08c1a (#555) e o próximo PR do item 60.
  - Conferido: 8 arquivos, nada em `src/app.ts`, `src/modules/auth/**`, `prisma/**`, `.github/**` ou `Kpis/**`; nenhum `trust proxy` configurado (as 8 linhas do `git grep` são comentário); testes-dono 7/7 e as 5 regressões do webhook 29/29; uma mutação própria (inverter `isIpBlocked`/`allowGlobal`) deixou o IP4 e o IP6 vermelhos.
  - Ressalvas para o PR de registro, pagas neste PR: R1, fechar a `P-ASS08C-TRUST-PROXY` e a `P-ASS08C-COTA-IP-BLOQUEADO` (merge `5728df31`); R2, dar dono à `P-AUTH-IP-ATRAS-DO-PROXY`; R3, regenerar o índice.
  - R4 (terreno): o CI da `main` em `5728df31` foi conferido pelo orquestrador às 20:01 SP: rodada `43521788979`, todos os jobs `success`.
