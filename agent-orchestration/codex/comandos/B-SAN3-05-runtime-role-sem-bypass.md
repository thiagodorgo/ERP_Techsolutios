# B-SAN3-05 — o papel de runtime nao escapa de RLS (itens 9 e 10)

> Comando do bloco, colado pelo orquestrador a partir do §14 do plano v3 (docs/revisoes/SAN3/B-SAN3-05-plano.md),
> como o §15 do proprio plano manda. O plano v3 e a fonte; em divergencia, vale ele.


`# B-SAN3-05 — o papel de runtime não escapa de RLS (itens 9 e 10)` · **Plano:** esta **v3** (`docs/plano-b-san3-05`), que responde às críticas r1 e r2 — v1 (`c3f57e9`) e v2 (`c727156`) **não** valem mais · **Objetivo** §1 · **Fontes** §0 e "Resposta à crítica r2" · **Regras** §2 e §4 (trava = Apêndice E byte a byte, md5 `36650de53be8504c76deef74ecc78811`; `.sh` = Apêndice C byte a byte, md5 `810c1c4a2552665d4947bf0ef4e93670`, `100755`, `eol=lf`; gerador = Apêndice A byte a byte, md5 `81d9259571391eded68255391a99fb61`; fixtures = Apêndice D; nenhum privilégio além de DML+USAGE; nada em `/health`; nenhum pulo de teste) · **Escopo** §6 · **Rito** §10 (inspetor → dev de identidade nova → junta unânime de 3 → porteiro) · **Teste de encerramento** §7 A1–A24 com T1–T15 · **Bateria** §8 (Node 20, `psql` presente) · **KPI** §9 · **DoD** §10 do contrato + A19 · **Atos do dono** §11 · **Rastreabilidade**: `pr`, `merge_commit`, `approved_head`, `J-B-SAN3-05.md`, `published_per_pr`.
