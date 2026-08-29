# J-SAN2-1R — junta do resgate do SAN2-1, opção C do dono (2026-08-29)

**VEREDITO: APROVADO por maioria — 3 APROVADO · 0 REPROVADO · 0 voto perdido.** Nenhum veto exercido.
**Ciclo 1 de 2** (`D-TETO-DOIS-CICLOS`). Quórum: maioria de 3 (diff de código de produto **vazio**,
medido pelo inspetor e pela cadeira 2). Junta sob o `PROTOCOLO-JUNTA-RESILIENTE`.

## 1. Natureza do bloco e cadeia de hashes

O `SAN2-1` foi reprovado nos ciclos 1 e 2 e **PARADO** pelo teto de dois ciclos — o primeiro bloco a acionar
a regra. O dossiê foi ao dono; ele escolheu a **opção C** (`D-SAN2-OPCAO-C`, registrada em `decisoes.md` por
exigência do R2 do inspetor). **Este bloco executa aquela decisão — não é ciclo 3** (não existe ciclo 3).

Cadeia: `a0a1075` (base, #361) → `8860fc3` (conteúdo do resgate) → `31cd9ad` (briefing; **terreno liberado
aqui, 4ª tentativa do inspetor**) → **`4cd0867` (D-SAN2-OPCAO-C + parecer + quedas; head julgado pelas 3
cadeiras)**. O delta `31cd9ad..4cd0867` foi medido pela cadeira 1: **registro puro** — é a correção que o
próprio inspetor exigiu.

## 2. Os votos

| Cadeira | Veredito | Achados |
|---|---|---|
| 1 · fidelidade à opção C (veto) | **APROVADO** | 2 `nota` — os 5 elementos da decisão do dono executados fielmente; frase antiga só em 2 citações; nova nas 79 com amostra de 3 confirmada; P-036 duplicata conferida no gêmeo e no fix; tripwire fora com motivo; leitura adiada com dono/prazo/critério |
| 2 · diff/portagem/append-only (veto) | **APROVADO** | 1 `baixa` — diff de produto VAZIO (24 arquivos, todos permitidos); `decisoes.md` prefixo byte-a-byte + exatamente as 2 decisões declaradas; `pendencias.md` com só 2 remoções declaradas-e-preservadas (§A2); dívidas do porteiro do #361 quitadas (backfill `a0a1075`/`48dc863`; §C7 lendo 4/4-bis/5/6/7 com item 7 byte-idêntico nos dois contratos; artefatos SAN2-R presentes) |
| 3 · KPI/registro (suplente) | **APROVADO** | 1 `nota` (transliteração do ID Ω) — bateria 16/16 + freeze em dia; **o placar em prosa (229/221/184/77/45) confere com a execução** — a classe que reprovou este bloco duas vezes foi caçada e não reapareceu; gerador idempotente; métricas/`mvp_*`/`blocks_completed` intocados |

Votos e evidências item a item em `votos/SAN2-1R/` — todos escritos **em arquivo antes da mensagem final** (P2).

## 3. §C7.4-bis, respondido

**(a)** As 3 cadeiras cobrem a competência — fidelidade à decisão, integridade da portagem, veracidade dos
números. **(b)** Quem achou não consertou: o R2 (decisão do dono sem entrada) foi achado pelo inspetor e
corrigido pelo orquestrador **antes** da junta, que o verificou; os fechamentos indevidos dos ciclos 1–2
foram achados por jurados e executados aqui conforme a decisão do dono. **(c)** Dado podre: a cadeira 3
reconferiu o placar por execução própria em vez de herdar o número em prosa.

## 4. A junta como medição do protocolo (2ª da série)

| Métrica | Esta junta |
|---|---|
| Quedas | **4** (inspetor ×3 no endpoint pinado + 1 jurado KPI) em 8 disparos |
| Custo das quedas | **zero conteúdo perdido** — nenhuma havia escrito ainda (3 na largada/vão medir→escrever); redo = itens baratos |
| Votos perdidos em streaming | **0** |
| P5 aplicado | **1ª aplicação real**: pausa de 15 min após 2 quedas em 4 min; contador zerado pela pausa, leitura registrada |
| Exceção contratual | **1ª invocação** da indisponibilidade de modelo: o pin `fable` caiu 3× no mesmo gate; a 4ª tentativa rodou no endpoint da sessão **com nota** (R1), como o contrato manda |
| Série do endpoint | pinado: 5 quedas/7 corridas · sessão: **7 conclusões/8 corridas** — o discriminador real não é o modelo, é o **endpoint**; a série do P6 refinou a hipótese F5 duas vezes num dia |
| Lição nova (P1) | *"medir sem escrever é não ter medido"* — 3 quedas no vão medir→escrever; o texto dos mandatos passou a exigir a escrita **antes** do próximo item |

## 5. O que fica aberto, declarado

- `P-SAN2-LEITURA-DAS-79` — a leitura real, pós-ciclo 5 (compromisso da opção C, com dono e critério).
- Os 4 achados menores das cadeiras (2+1+1), nenhum bloqueante, registrados nos votos.

**Merge autorizado** (§C7.1). Segue para PR; após o merge, `porteiro-pos-merge` decide o start seguinte.
