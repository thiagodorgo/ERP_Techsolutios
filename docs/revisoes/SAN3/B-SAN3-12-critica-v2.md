# Crítica do plano v2 do B-SAN3-12 (tela financeira: baixa, contas e conciliação)

- **Crítico:** o orquestrador (Claude Opus 5.5), por exceção aberta pelo dono em 13/10: *"vamos abrir uma excessao, faça você a crítica do plano da tela financeira"*.
- **Separação de papéis:** o crítico não planejou nem desenvolve. O plano v2 é do agente da API (Opus 5.5).
- **Objeto:** o plano v2, versionado em `docs/revisoes/SAN3/B-SAN3-12-plano-v2.md` (base `ade03028`; origem: a saída da API `scripts/agente-claude-api/saidas/20261013-014807Z-plano-san3-12-v2/`, que não é versionada).
- **Ref medida:** `origin/main` de 13/10 (`f59ad1d6`; o código do backend não mudou desde `ade03028`).

## Veredito: **APROVA COM AJUSTES**

Nenhum achado bloqueia. Ficam **4 ajustes** que o plano incorpora antes do dev, e **1 decisão do dono**.

## O que conferi por medição e se sustenta
| Premissa do plano | Medido | Situação |
|---|---|---|
| B1: os 422 são *fast-fail* fora da transação e o 409 sai dentro dela | `financial-entry.service.ts:417` (`assertPayable`: cancelado, já pago e overpayment dão 422) e o comentário de `:397-405` mais o `ctx.entries.create` dentro do `uow.run` (P2002 → 409 `duplicate_payment`) | ✅ confere |
| O `client_action_id` é aceito na baixa | `financial-entry.service.ts:413` (`parseOptionalClientActionId`) e o índice parcial em `financial-entry-prisma.repository.ts:299` | ✅ confere |
| `invalid_amount` (deixado como HIPÓTESE no plano) | existe, mas é **400**, não 422 (`financial-entry.validators.ts:74-81`) | ⚠️ ajuste: o T4 lista o código com o status certo |
| A faixa de 7 dias usa `GET /financial-titles?from&to` | `financial-title.service.ts:70-75` aceita `direction`, `status`, `overdue`, `from` e `to` (vencimento) | ✅ confere |
| Os componentes reaproveitados existem | `components/patterns/KpiStatCard.tsx`; `components/dense-list/DenseTable.tsx` | ✅ confere |
| Moeda da conta × moeda do título | `financial-account.types.ts:12`: só BRL | ✅ o erro de moeda diferente não acontece hoje |

## Ajustes

**A1 — Duas telas para o mesmo título.**
- **O defeito:** o plano deixa `App.tsx` e `appSidebarNav.ts` sem diff. Só que o menu mantém **Cobranças** (`/finance/charges`) e **Pagamentos** (`/finance/payments`), que listam os mesmos títulos SEM a baixa (`appSidebarNav.ts:92-93`, `App.tsx:650` e `:668`). O resultado são duas portas para a mesma ação, com comportamento diferente: a nova tem a baixa, a antiga não.
- **A trava permite:** o próprio `PLANO_SAN3.md:351` põe o 12 na trava desses arquivos (`SAN3-04a → SAN3-12 → SAN3-24 → SAN3-06a → SAN3-18`).
- **O ajuste:** o 12 decide, e registra a decisão, entre duas saídas:
  - (a) as rotas antigas redirecionam para `/finance` com a aba e o filtro certos, e os itens de menu passam a abrir a aba;
  - (b) as páginas antigas passam a usar o MESMO componente de aba.
  - Recomendo a (a): menos superfície, uma tela só. Com teste de que a rota antiga abre a aba certa.

**A2 — O T4 com o status certo.** O `invalid_amount` é 400 (`validators.ts:74-81`). A mensagem em PT-BR e o teste T4 usam 400, e a lista de códigos do C3 fica com os 10 códigos mais este.

**A3 — Nada de aba vazia.** O plano entrega 4 dos 6 indicadores e deixa as abas Despesas e Comissões para outros blocos.
- Para não haver placeholder (meta do dono: *"telas sem place holde, funcional"*), o 12 NÃO mostra o que não funciona.
- **Indicadores:** só os 4, sem cartão vazio. A grade se ajusta.
- **Aba Despesas:** entra **somente leitura**, porque a lista existe (`GET /expense-reports`), sem os botões de aprovar e devolver, que não têm rota.
- **Aba Comissões:** um atalho para a tela que já funciona (`/finance/commissions`, RemuneracoesPage) até o 24.
- Um teste garante que não há botão de ação sem rota no backend.

**A4 — Fidelidade à tela aprovada.** O verificador da maquete aprovada (`checar-ab.cjs`) já confere, no navegador:
- blocos clicáveis que abrem a aba certa, com o filtro;
- linhas de até 44 px;
- um detalhe aberto por vez, e o Enter fecha.

O plano porta essas checagens para o `test:smoke` do frontend (T11 e T12 cobrem parte delas). Assim a tela pronta é conferida contra a referência por máquina, não só por olho.

## Decisão do dono (fica fora deste bloco, mas muda o que você vê)
A tela aprovada é "A + B". **A metade B — "Resultado do mês", os valores em R$ da faixa de 7 dias, e os indicadores de Despesas e Comissões — não tem dado no backend** (`financial-summary.types.ts:57`: o resumo não traz resultado por categoria, despesas, comissões nem competência).
- O plano está CERTO em não somar no front.
- Mas, sem um bloco de backend, a tela entregue pelo 12 fica **só com a metade A**.
- **Opções:**
  1. **Recomendada:** planejar já um bloco de backend, o resumo financeiro por competência (resultado por categoria, despesas, comissões, valores dos 7 dias e o parâmetro de competência). É junta de dinheiro. Ele corre em paralelo ao 12a, e o 12b liga a faixa B.
  2. Aceitar a tela em duas fases, sem a faixa B por enquanto.

## Também endosso
- **Dividir em 12a e 12b.** 12a: painel, baixa e as abas de títulos. 12b: contas, extrato e conciliação. Bloco G em junta de dinheiro converge pior. As duas metades mexem em superfícies distintas.
- **Estender o `KpiStatCard`** com `aria-pressed`, em vez de criar componente novo (§4 item 3).
- **A reler-antes-de-falar depois de qualquer não-sucesso (B1),** e o reenvio bloqueado até a releitura voltar.
- **A conciliação sem CAS no backend:** a releitura no front estreita a janela, e o CAS fica como pendência com bloco dono (no máximo o último a escrever vence, sem perda de dinheiro).

## Limitações desta crítica
- Não rodei testes: é plano, não há código.
- Não conferi se o adapter lê `pagination.total`; isso fica como verificação do dev.
