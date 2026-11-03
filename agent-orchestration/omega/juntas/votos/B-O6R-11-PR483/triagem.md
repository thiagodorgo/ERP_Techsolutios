# Junta do PR #483 (B-O6R-11, corte 1): resultado e triagem

- **Objeto:** `d3e80027979af647725f61eeb07606e2d000cd16`.
- **Inspetor:** `insp-o6r11-argon` (Gemini 4 Argon), `LIBERADO`.
- **Régua:** fluxo rápido (`CLAUDE.md` §C7 item 10), unanimidade de 3, bloco de perda de dado.

| Cadeira | Identidade | Modelo | Voto | Achados |
|---|---|---|---|---|
| C1 — fila e durabilidade | `jurado-o6r11-c1-opus` | Claude Opus | APROVADO | 2 não graves |
| C2 — tela, saída e fail-closed Dart | `jurado-o6r11-c2-argon` | Gemini 4 Argon | APROVADO | 0 |
| C3 — escopo e registro | `jurado-o6r11-c3-opus` | Claude Opus | APROVADO | 6 não graves |

**Troca na C2, antes de qualquer voto:** a identidade prevista, `jurado-o6r11-c2-sol` (Codex), ficou sem conta até 14:27. Foi substituída por `jurado-o6r11-c2-argon`. A elegibilidade foi conferida por nome, com 0 ocorrências no ramo `d3e80027`, no obituário da `origin/main` e nos pareceres. O registro está em `painel/filas.log`.

**Conferência do voto Gemini** (`D-GEMINI-SEGUNDO-REVISOR`), feita pelo orquestrador Claude:
- a evidência traz os comandos e as saídas das 19 mutações (16 listadas e 3 novas);
- a suíte local deu `+969`, com zero skip;
- os resumos do CI foram lidos no log (`Formatted 213 files (0 changed)`, `No issues found!`, `+969: All tests passed!`);
- a árvore principal está limpa e o worktree `w-j483-c2` foi removido;
- a pendência que a evidência cita, `P-MOBILE-SYNC-SCREEN-RETRATO-VELHO`, já estava no objeto (`pendencias.md:11867`).

**Resultado: unanimidade, 3 APROVADO, nenhum grave.**

## Triagem (item 10(3)). Quem tria é o orquestrador, que não achou nem vai consertar.

| Achado | Origem | Decisão | Motivo |
|---|---|---|---|
| A-C1-01: a ordem do resgate antes do 1º serviço não tem teste | C1 | **conserto agora** | não grave e simples: um teste que fica vermelho com a mutação N1 da C1 |
| A-C1-02: o resgate lê fora da seção serializada (RMW) | C1 | **pendência** | não grave e grande: pede API de leitura e escrita dentro da trava. Vai como apenso à `P-MOBILE-FILA-RMW-STORE`, com a sonda da C1 como evidência. Não há par de produção provado. |
| A-01: o Diagnóstico mostra Descartado como problema, com código cru no título | C3 | **conserto agora** | não grave e simples: termo técnico na tela (§3) e "Descartado" mostrado como problema, nos códigos novos deste bloco. O título cru dos demais códigos é mecanismo anterior e fica fora. |
| A-02: o `analyzer` transitivo não está declarado onde o R-f promete | C3 | **conserto agora** (registro) | nota na `P-MOBILE-FILA-RMW-STORE` e no corpo do PR |
| A-03: a cópia da emenda 3 está fora da lista literal do PERMITIDO | C3 | **só declarar** | é registro, não PROIBIDO. Declarar a extensão no corpo do PR, sem mudar arquivo. |
| A-04: o campo `dono:` de `P-O6R-B03-FILA-POR-USUARIO` está desatualizado | C3 | **conserto agora** (registro) | trocar o campo para `B-FILA-USUARIO`, deixando anotado o valor anterior e a origem (emenda 2 R6) |
| A-05: o banner promete "alteracoes serao sincronizadas" ao lado do aviso de despesa | C3 | **pendência** | pré-existente desde 13/06, fora do PERMITIDO (`erp_components.dart`). Pendência nova `P-MOBILE-BANNER-PROMETE-SINCRONIZAR`, BAIXA, dono `B-SAN3-19`. |
| A-06: o log publica 683 → 690 e o índice entregue vai de 701 a 708 | C3 | **conserto agora** (registro) | errata apensa ao `log-execucao.md`, append-only, sem reescrever a linha antiga |

**Um conserto só:**
- **Dev:** `dev-o6r11-conserto-opus` (Claude Opus, identidade nova). Ele não achou, não votou e não desenvolveu fatia. O Codex está sem conta, e a cobertura está autorizada (`D-CLAUDE-COBRE-ATE-0411` e a fala do dono de 02/11, "tem o argon e vc nao pare").
- **Conferência:** Codex GPT-5.6 Sol, identidade nova, que não consertou. É o cruzamento de modelos do item 11.
