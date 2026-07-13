# J-OMEGA3C — Ata da junta Ω3-c (Checklist snapshot — freeze + entrega aditiva)

Bloco **backend + migration**, sem frontend. cognicao-visual/frontend-pixel = N/A. Junta de 5 (o 5º = critico
verificando o recorte Req A–E) com login real :3000 + Postgres vivo.

## Veredictos (5/5 APROVADO)
| Agente | Veredito | Nota |
|---|---|---|
| critico-adversarial | **APROVADO** | recorte Req A–E respeitado; **skew v1×v2 EVITADO** (nem `/available` nem `createRun` tocados; ambos leem o vigente, consistentes). Port sem ciclo. |
| master-teste-telas-rotas | **APROVADO** | 14/14 bloco + 60/60 regressão + `migrate status` sem drift. Achado cosmético: assert tautológico (removido). |
| validador-mestre | **APROVADO** | **up/down/re-up no Postgres vivo** (RLS t/t em todos os estados); sem ciclo. 2 BAIXA (assert tautológico removido; P-037 assimetria adapter). |
| inspetor-de-rotas | **APROVADO** | live: freeze 201, snapshot no GET/:id, §2.8 na API E na coluna JSONB, list DTO enxuto, reassign não re-congela. |
| coordenador-de-acessos | **APROVADO** | cadeia de acesso íntegra ao vivo; cross-tenant 404 com login de 2ª org; sem nova superfície/permissão; imutabilidade template→v999. Cleanup 0 leftover. |

## O recorte do crítico (por que é o núcleo do bloco)
Fazer METADE do consumo (neutralizar `/available` servindo o snapshot v1 enquanto `createRun` relê o
template vigente v2) criaria **skew render×run** que viola a decisão (`:17`), quebra correção (component
ids de v1 rejeitados no sync) e quebra o Flutter. Ω3-c ficou **freeze + entrega aditiva** puros; o consumo
atômico (`/available` OS-scoped + `createRun` do snapshot + Flutter) é **Ω3-c.1 declarado**. Todos os 5
confirmaram que `/available` e `createRun` estão intocados.

## Prova ao vivo (Postgres real; template seedado via psql — P-036 contorna o create quebrado pré-existente)
- Freeze no despacho (201) → `GET /work-orders/:id` carrega o snapshot (template_id/version/status/contract).
- §2.8: snapshot SEM `tenant_id` — na API E na coluna JSONB (`SELECT ... LIKE '%tenant_id%'` = 0).
- Imutabilidade: template mutado (v999/HACKEADO) → snapshot da OS inalterado.
- Isolamento: login real de 2ª org → GET da mesma OS → 404.
- List DTO enxuto (sem checklistSnapshot); técnico de campo já vê o snapshot (superfície existente).

## Bateria final
Back `check`/`build` verde. **14 novos** (9 HTTP + 5 unit) + regressão dos afetados verde. Migration
up/down/re-up no Postgres vivo, RLS intacto.

## Pendências (não-veto) — `controle/`
- **Ω3-c.1** (Req B): consumo atômico do snapshot (backend + Flutter).
- **P-036** (pré-existente): create de checklist quebrado no live prisma (não deste bloco).
- **P-037** (BAIXA): assimetria memory×prisma em `freezeChecklistSnapshot` (mesma de `updateGeocode`).
