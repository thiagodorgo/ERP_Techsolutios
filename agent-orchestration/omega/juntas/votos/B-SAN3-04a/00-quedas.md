# B-SAN3-04a — registro de quedas da junta (P6)

Workflow `wf_f7978f20-575`, 2026-09-18 ~16:00–16:50: o limite de sessão (HTTP 429, reset 19:20) derrubou 16 de 17 agentes das três
juntas. **Erro de desenho do orquestrador:** o workflow acionava o suplente assim que o titular voltava sem voto, e queda por limite de
sessão não é razão de suplente — os suplentes caíram na mesma janela sem medir. Nenhum suplente fica inelegível (não mediu); a
retomada relança os TITULARES (2ª instância), sem acionamento automático de suplente, com teto de 3 agentes simultâneos.

| Cadeira | Identidade | Instância | Causa | O que deixou | Conta como voto? |
|---|---|---|---|---|---|
| C1 | agente-dba-guardiao | 1ª | VOTOU (APROVADO) antes do limite | — | sim |
| C2 | coordenador-de-acessos | 1ª | HTTP 429, limite de sessão (reset 19:20) | evidência 23 KB (roteiro), voto em esqueleto; worktrees `j-bsan304a-c2` e `j-bsan304a-c2-base` (02bd7dab) e contêineres `j-bsan304a-c2-pg`/`-redis` vivos | não |
| C2 suplente | master-teste-telas-rotas | 1ª | HTTP 429, disparado automaticamente pelo workflow logo depois da queda do titular | nada | não (não mediu — não fica inelegível) |
| C3 | agente-ci-doutor | 1ª | HTTP 429 | nada | não |
| C3 suplente | validador-mestre | 1ª | HTTP 429, disparado automaticamente | nada | não (não mediu) |
