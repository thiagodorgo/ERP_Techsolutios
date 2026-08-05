# J-KPI-PAINEL — Junta do PR "Painel de KPI com visão gráfica" (D-KPI-INDEX-PAINEL)

**Decisão do dono (2026-08-04, verbatim):** *"ajuste a documentação para nao atualizar somente o kpi.json, o
principal arquivo é o index.html onde vc vai reorganizar colocar graficos para uma melhor visualização."*
Registro: `agent-orchestration/controle/decisoes.md` → `D-KPI-INDEX-PAINEL`.

**Composição:** `critico-adversarial` + `cognicao-visual` (2 agentes-veto; escopo painel/docs — sem migração,
sem RBAC, sem serviço pago → não exige junta-5).

## Ciclo 1 (2026-08-04) — REPROVADO pelos dois

Registro completo com o mapa achado→correção: `agent-orchestration/omega/reprovacoes/R-kpi-painel-ciclo1.md`.
Destaques (todos provados por execução/medição, não por leitura):

- **Barra fantasma de +969** no "Ritmo": métrica ausente lida como zero + chave legada `frontend_smoke`
  ignorada. O delta real do PR era 19. A barra falsa definia a escala e achatava as 24 reais para ≤2px.
- **`hidden` decorativo**: `.section-grid--tight{display:block}` (origem autor) vence `[hidden]` do UA —
  4 caixas vazias em `file://`, exatamente o modo como o dono abre o arquivo.
- **Guard-teatro**: o crítico substituiu as 3 séries por retas sintéticas e os 4 testes passaram.
- **Flutter achatado**: escala Y compartilhada escondia +37% de crescimento; fonte SVG variava 2× entre painéis.
- **11 hexes de outro design system** (3 azuis diferentes na 1ª dobra); manchete a 8,3 telas de rolagem;
  eixo X de índice rotulado como data; lacunas interpoladas em silêncio; `role="img"` mudo para leitor de tela.

## Ciclo 2 (2026-08-05) — APROVADO_CONDICIONADO pelos dois; condições APLICADAS

- `critico-adversarial`: os 4 ALTA fechados de verdade (verificou guard por mutação própria; recomputou a
  série; conferiu espelhamento CLAUDE.md×AGENTS.md byte a byte). Condições: gate de `latest` no render (N1),
  snapshot §C3 (A3), sincronizar fallback embutido (N2) — **todas aplicadas**; N3/N4/N5 (BAIXA) idem.
- `cognicao-visual`: as 5 condições mínimas do ciclo 1 medidas e cumpridas (renderizou em Edge real, DPR 2).
  ALTA nova A1-c2 (cards embutidos rançosos convivendo com os vivos por comparação de rótulo com acento) —
  **aplicada** (normalização NFD + lista estendida + remoção dos cards obsoletos). M1-c2 (eixo fora do canvas
  rolável), M2-c2 (rolagem abre no presente), M3-c2 (fallback congelado rotulado no merge #335), M4-c2
  (Fonte hidratada) — **aplicadas**. BAIXAs (srTable do ritmo, manchete negativa) — **aplicadas**.

## Validação final

- Guard `tests/kpi-dashboard-charts.test.ts` **6/6** — endurecido: compara a SÉRIE ponto a ponto com o JSON
  recalculado de forma independente; provado por **4 mutações** (série fabricada ×2 falhas, `[hidden]` removido
  ×1, history truncado ×3, `||0` restaurado ×1 — todas pegas).
- Render real (Edge headless, 1440/1100/380 + `file://`): fonte 11px em todos os painéis, zero hex cru no SVG,
  manchete a y=434px, `file://` esconde a seção e mostra o aviso.
- Suíte backend **2110/2110** (0 fail, 6 skip) — após a triagem `P-SUITE-ENV-PERSISTENCE` (as "88 falhas" eram
  env congelado por import; + incidente de node_modules por sonda minha, recuperado e lição registrada).
  `npm run check`/`lint` verdes; frontend `check`+`build` verdes; `git diff --check` limpo.

**Veredito da junta: APROVADO (condições cumpridas). Verde = merge (§C7).**
