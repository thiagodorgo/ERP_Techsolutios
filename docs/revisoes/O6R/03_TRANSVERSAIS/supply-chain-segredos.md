# Cadeia de suprimentos e segredos

Lentes: A2 + A5. Status: ✅.

## Dependências

| Workspace | Low | Moderate | High | Critical |
|---|---:|---:|---:|---:|
| raiz | 2 | 4 | 2 | 0 |
| frontend | 0 | 1 | 4 | 0 |
| owner portal | 0 | 0 | 1 | 0 |
| authority portal | 0 | 0 | 1 | 0 |

Após `npm ls` e busca de uso: 0 avisos com caminho de exploração produtivo confirmado. Prisma CLI, Vite/PostCSS/nanoid são dev/build nos caminhos encontrados; React Router não recebeu destino externo controlável nos fluxos revisados.

## Segredos e uploads

Caça AWS/GitHub/Google/private-key/Stripe não confirmou segredo versionado. Ω6R-SEC-004 registra o scanner no-op de uploads. Seeds auxiliares ainda aceitam senha demo sob escape hatch de produção e imprimem credencial; corrigir como P2 operacional antes de qualquer seed produtivo.

Saídas brutas: `../01_VARREDURAS/06_*` a `10_*`.
