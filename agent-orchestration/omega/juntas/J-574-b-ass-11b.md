# Ata da J-574: junta completa do PR #574 (B-ASS-11b, a Parte R do item 62: o cliente perde a consulta de tendência)

**Orquestrador:** Claude Opus 5.5, 15/11, por volta das 01:05 SP (hora medida).
**Fluxo:** o rápido (§C7 10(3)), com uma votação só.
**Objeto:** `1409605b`. Cada cadeira conferiu o objeto pelo `ls-remote`.
**Quórum:** unanimidade de 3 (permissão e isolamento). **Unânime: APROVA, 3 de 3.**

## Terreno
O inspetor `insp-574-cl` (Claude Opus) deu **LIBERADO COM RESSALVA** (R1 a R7), registrado em `insp-574-parecer.md`. As ressalvas entraram no ADENDO do `BRIEFING.md` antes do disparo.

## Cadeiras e votos
| Cadeira | Identidade | Modelo | Voto | Graves | Não graves |
|---|---|---|---|---|---|
| C1 · permissão e isolamento | `j574-c1-perm` (`coordenador-de-acessos`) | Claude Opus 5.5, declarado | **APROVA** | 0 | 0 |
| C2 · censos e fixtures | `j574-c2-censo` (`guardiao-fail-closed`) | Claude Opus 5.5, declarado | **APROVA** | 0 | C2-01 (no bloco), C2-INF-01 (pré-existente) |
| C3 · P12, doc e TAP | `j574-c3-p12` (`validador-mestre`) | Claude Opus 5.5, declarado | **APROVA** | 0 | A-C3-01 (pré-existente) |

**Cruzamento (§C7 11(2), declarado no ADENDO):** não havia crédito para cruzar nas cadeiras. O Codex 1 estava a 97%, o Codex 2 e o Codex 3 estavam sem janela, e o Argon tinha feito a pré-revisão. O cruzamento real do bloco foi a pré-revisão do Argon, conferida pelo orquestrador.

**Quedas:** nenhuma.

**Papéis (§C7.4-bis):**
- acharam: as cadeiras;
- triou: o orquestrador;
- conserta: o dev do bloco, `dev-62r-cl`, que não achou;
- confere: um verificador que não consertou.

## Triagem (§C7 10(3)), feita pelo orquestrador
**Nenhum achado grave.**

### A. Conserta agora (não grave e simples)
| Id | O que falta | Aceite |
|---|---|---|
| **C2-01** | O T-R1 declara a exaustividade do roteador do cliente ("EXATAMENTE `GET /billing/subscription`"), mas só olha as camadas `route` (`tests/ass-11b-cliente-so-p12.test.ts` l.36–37). Um endpoint terminal montado com `router.use(BASE + '/…', handler)` compila, deixa o T-R1 e o san3-18 verdes e é SERVIDO (200). Só o `o6r07c-census-guard` pega o caso, e só sem regenerar. | O T-R1 passa a afirmar a pilha INTEIRA do roteador do cliente. Toda camada é ou a rota `GET /billing/subscription` ou um middleware conhecido, listado por nome no teste. Uma camada desconhecida reprova. A mutação da C2 (o `router.use` terminal, comando no voto dela) fica VERMELHA no T-R1. Os T-R2 a T-R5 continuam verdes. |

### B. Vira pendência com dono
| Id | Pendência | Dono | Critério |
|---|---|---|---|
| **C2-INF-01** (pré-existente) | `P-ROTA-FORA-DO-PREFIXO-SERVIDA-SEM-ATOR`: uma rota nova no roteador do cliente, fora de `BASE` e de todo prefixo, é negada pelo gate a quem tem JWT (403 `route_module_unclassified`). Mas uma requisição SEM credencial recebe 200, porque o gate pula quem não tem ator e a rota não tem `tenantContextMiddleware`. O CI fica vermelho nos 3 guardas, então a omissão não passa calada. A falha está na arquitetura de autenticação. | a varredura de segurança do fim (§C7 10(6)) | uma rota sem ator é recusada por padrão, com teste |
| **A-C3-01** (pré-existente) | `P-API-CONTRATOS-CURINGA-ASSINATURA`: `docs/claude-code-handoff/API_CONTRACTS.md:105` guarda o curinga `GET /billing/subscription*`, de `e4e181f2` (06/11, B-ASS-04 #507), arquivo fora do PERMITIDO da E1.1 §6.1. Reinserir a rota retirada nessa linha não derruba nenhum teste. Hoje a linha não cita a rota. | o próximo PR de registro ou de cobrança que tocar o `API_CONTRACTS.md` | a linha lista as rotas sem curinga, e um teste prende a ausência da rota retirada no contrato |

## O que vem depois
1. O conserto do C2-01, pelo `dev-62r-cl`.
2. A conferência por quem não consertou: ela roda a mutação da C2 e o CI inteiro nas 2 rodadas.
3. O merge com as travas: o head conferido, `gh pr ready`, `isDraft == false` e `--match-head-commit`.
4. A porteira.

Nenhuma cadeira se refaz (§C7 10(4)), porque o conserto é só de teste.

## Adendo do registro (`reg-1611-cl`, 16/11)
As horas são de São Paulo; o merge e o head vêm de `gh pr view`, e a CI do merge, de `gh run list --commit`. O resto vem do diário do orquestrador, fora do repositório.
- **Conserto do C2-01:** `dev-62r-cl`. A conferência do Argon deu CONFERIDO, e o orquestrador a conferiu por comando.
- **Merge:** squash `b00f3161` (15/11 01:44), do head `cfdaed78`; CI do merge `43678086415`.
- **Porteira:** `porteiro-574`, LIBERADO COM RESSALVA (15/11 02:07). O item 62 seguia PARCIAL e fechou com a Parte T (#576).
