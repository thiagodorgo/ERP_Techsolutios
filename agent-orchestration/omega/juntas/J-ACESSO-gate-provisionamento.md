# J-ACESSO — Gate do provisionamento + acesso por papel (Ω-ACESSO) — junta de 4 com LOGIN REAL

**Tema:** a cadeia de acesso (login → menu → clique) está correta para os 9 papéis e o Mapa Operacional
aparece para quem deve?

## Ciclo 1 — 3 APROVADO, 1 REPROVADO (validador)
| Agente | Veredito | Evidência (login real) |
|---|---|---|
| coordenador-de-acessos (VETO) | **APROVADO** | 9 papéis logam (senha errada→401); matriz efetiva do Mapa = esperada (admin/manager/operator/auditor/super VÊ; finance/inventory/support/field_tech NÃO); gating dinâmico provado e revertido ao vivo (remover field_operations → Mapa some; restaurar → volta). Nenhum item visível com feature não provisionada. |
| inspetor-de-rotas (VETO) | **APROVADO** | Rota /operations/map nas 3 camadas; contagens 22/18/11/8/10/1/1/5/4 batem com T-ACESSO; governedPaths(23) presente; 401/403 corretos; checks verdes. |
| master-teste | **APROVADO** | screen-element-map de T-ACESSO validado ponta a ponta; testes 13 back + 6 front. |
| validador-mestre | **REPROVADO** (1 ALTA) | RBAC não reconciliado: catalog concedeu `field_location:read` ao operator sem atualizar RBAC_MATRIX.md nem registrar o conflito em controle/ (A2 + regra de ouro 6). |

## Correção do veto + Ciclo 2
Reconciliada a fonte de verdade (decisão **D-ACESSO** em `controle/`): por A1 a diretriz #1 do usuário
("operator opera o Mapa") vence a matriz; `RBAC_MATRIX.md` linha "Field operator location" operator
`send-own` → `send-own/read-tenant`; ponteiro em `decisoes.md`; `navigation-matrix.md` operator R→E.

**validador-mestre (re-confirmação):** **APROVADO** — verificou em código real que RBAC_MATRIX ↔ catalog
coincidem, o conflito está registrado em controle/ (A2), e a leitura é tenant-scoped (filtro por claim +
`withTenantRls` em `field-location-prisma.repository`) — sem vazamento cross-tenant.

**Veredito final:** **4/4 APROVADO.** O ciclo veto→reconciliação→reverificação pegou um drift real da
fonte de verdade RBAC antes do merge.

## Aprendizado permanente
`inspetor-de-rotas` e `master-teste` agora exigem o **caminho do usuário com login real** + o cruzamento
**featureKey/moduleKey × provisionamento do tenant**. Novo agente **coordenador-de-acessos** (veto) entra em
toda PR de auth/RBAC/navegação/provisioning.
