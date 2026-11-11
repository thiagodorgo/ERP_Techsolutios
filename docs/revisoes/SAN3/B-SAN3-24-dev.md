# B-SAN3-24 — diário do dev (`dev-24-cl`)

- **Autor:** `dev-24-cl`, **Claude Opus 5.5**, subagente da sessão, nível menor, identidade de dev declarada.
- **Exceção declarada (§C7 itens 6 e 11(6)):** as duas contas Codex estão sem cota semanal até 16/11, a API está
  reservada para verificação e o Antigravity está no limite de 5 h. Por isso o dev é Claude, e a pré-revisão e a
  conferência ficam com outro modelo, pela API. Não escrevi o plano nem o critiquei.
- **Plano:** `plano-B-SAN3-24-v2.md` (fora do repositório, `erp-pausa-2026-10-03/planos/`), com a Emenda 1 (N-01..N-09
  da crítica r2, `crit-24-r2-cl`), que prevalece sobre o corpo.
- **Respostas do dono:** `D-DONO-TODAS-RECOMENDACOES-1111` (11/11, "Sim, todas (Recomendado)"): vale a recomendação de
  cada pergunta. Q1 = **(b)**: o motivo do fechamento forçado entra na auditoria (1 linha no controller).
- **Terreno:** worktree `C:/Users/thiag/w-24`, ramo `feat/web-cheques-fechamento`, a partir de `origin/main`
  `da12fec6` (#541). `npm ci` próprio na raiz e no `frontend/` (sem junction).
- **Toda hora** vem de `date` (fuso de São Paulo).

## Fatias

### a0 — registro (`53c041a3`, 11/11 10:56 SP)
- `decisoes.md`: adendo do `REGISTRO-SAN3-CONFLITOS` com C-24-1..4 (C-24-4 resolvido pela Q1 = (b)).
- `pendencias.md`: `P-COMISSAO-MOTOR-E-POLITICA` e `P-SAN3-24-AUDITORIA-BEST-EFFORT` (novas); nota na mãe
  `P-WEB-FIN-CHEQUE-FECHAMENTO-COMISSAO-SEM-TELA`; índice regenerado pelo gerador (`gerar-indice-pendencias.py`).
- `PLANO_SAN3.md`: só `:157` (item 29) e `:278` (linha do `B-SAN3-24` no §5, sem `commissions/**` e sem "editar
  política de comissão"; o ramo passou a `feat/web-cheques-fechamento`).
- **Desvio declarado (N-07):** `grep -n "política de comissão" PLANO_SAN3.md` ainda dá a linha 29, e a 536 promete
  "cheques/fechamento/comissão pela web (29)". As duas estão fora do PERMITIDO da a0; não as editei. **Pergunta ao
  orquestrador:** emenda para a a0 alcançar `:29` e `:536`, ou o PR de registro as corrige.

### M — referências (`6e20f8be`, 11/11 10:57 SP)
- `cheques-3opcoes.reference.html` e `fechamento-periodo-3opcoes.reference.html` copiadas sem alteração das maquetes
  aprovadas; `README.md` só com as 2 linhas do índice. `checar-3opcoes.cjs`: PASSOU nos dois;
  `data-opcao="[abc]"` = 3 e `>[ABC] · ` = 3 em cada.
- **Desvio declarado:** o prompt do orquestrador pede `fechamento-3opcoes.reference.html`; o plano (que prevalece)
  nomeia `fechamento-periodo-3opcoes.reference.html` no PERMITIDO e no B6. Usei o nome do plano.

### a1 + a2 — serviço, adaptador, ações e impacto de caixa (um commit só, 11/11 ~11:40 SP)
- Módulos novos em `frontend/src/modules/finance/cheques/`: `cheques.types.ts`, `cheques.adapter.ts`,
  `cheques.service.ts`, `cheque-actions.ts`, `cheque-cash-impact.ts` (só TypeScript puro, R-E2E-JWT).
- **Junção declarada:** a1 e a2 saíram num commit só, porque o arquivo de contrato (A1–A3 e A5/A6a) é um só e importa
  os módulos das duas fatias.
- **Arnês (R-E2E-JWT):** a ação sob teste vai SEMPRE pela função do front com JWT (`signAccessToken`); o preparo e a
  leitura de conferência vão como administrador por cabeçalho (`x-tenant-id`/`x-role`), que o modo memória aceita.
  Motivo medido: cada requisição com JWT passa pelo `attachAuthenticatedActor` de cada roteador montado; no 1º arranque
  medi ~700 ms por requisição com JWT contra ~10 ms por cabeçalho. No A5, as ações NEGADAS (que não mudam o cheque)
  rodam em paralelo sobre um cheque preparado, conferido intacto no fim; cada OFERECIDA roda sobre um cheque novo.
- **Contagens (TAP, execução real):** `tests/b-san3-24-cheques-front-contract.test.ts` 12/12 (20,8 s);
  `frontend/tests/b-san3-24-cheque-actions.test.ts` + `b-san3-24-cheque-cash-impact.test.ts` 8/8;
  `tests/cheque-title-link.test.ts` verde com a asserção nova do A3. A5: 24 oferecidas (2xx) + 246 negadas (403/422) =
  270 = 5 papéis × 9 combinações alcançáveis × 6 ações.
- **Mutações (todas vermelhas, cada uma restaurada; `grep -c` da âncora = 1 antes):**

  | # | Mutação literal | Resultado |
  |---|---|---|
  | A1 | `cheques.service.ts`: `/clear` → `/deposit` | 7 fail (A1 (i), A1 (v), A5, A6a…) |
  | A2 | `cheques.service.ts`: `body: { reason }` → `body: {}` | 2 fail (A2 com `bounce_reason_required`, A5) |
  | A3 | sonda no servidor: apagar `^      titleId: cheque.titleId ?? null,$` em `cheque.dto.ts` | 2 fail (A3 do contrato e K1 do `cheque-title-link`); os do detalhe verdes |
  | A4 | `cheque-actions.ts`: `moveMoney` só com `cheques:update` | 2 fail |
  | A5 | `cheque-actions.ts`: `const linkFree = true;` | 1 fail (A5) |
  | A5b | `cheque-actions.ts`: `perms.has("cheques:create")` → `perms.has("cheques:read")` | 1 fail (registrar: o gestor recebe 403) |
  | A6a | `cheque-cash-impact.ts`: `received` → `issued` no `clearMovement` | 4 fail (os 4 casos de caixa) |
  | A6b | a mesma, na tabela pura | 2 fail |
  | A6b-2 | apagar o ramo `title: "reopens"` da devolução de `cleared` | 2 fail |

- **N-05 (crítica r2) resolvido no impacto:** `cashImpactFor` aceita o título lido (`document`, `amount`, `paidAmount`)
  e devolve `titleAfter` (`open` ou `partially_paid`); o texto diz "volta a ficar em aberto" ou "volta a ficar
  parcialmente pago". O enum `title: "reopens"` do plano ficou como está.
- **N-04 (crítica r2) resolvido no tipo:** `EditChequePayload` só tem número, banco, "bom para", observações e o 1º
  vínculo; valor, conta e direção nem existem no corpo da edição.
