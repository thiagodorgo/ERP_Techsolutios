# Ata da J-612: junta completa do PR #612 (B-ASS-10c-OPERACAO, a tela de operação da cobrança da plataforma)

**Redator:** `reg-2111-cl` (Claude Opus, nível menor, declarado), registro de 21/11. Fontes: a pasta da junta fora do
repositório (`~/erp-pausa-2026-10-03/revisoes/cob-op/junta-612/`: `ata-J-612.md`, `triagem.md`, `composicao.md`, os
mandatos, `votos/`, as conferências) e o parecer do porteiro (`omega/juntas/porteiro-612-parecer.md`). O texto da ata do
orquestrador e o da triagem vão aqui sem mudança de sentido; o redator só juntou os dois e acrescentou os pontos que a
nota C3 mandou ao registro (C3-05 e C3-06).

- **Nível:** junta completa (trava fail-closed: o bloco é cliente de escrita de dinheiro e carrega credencial do
  provedor no navegador). Fluxo rápido, §C7 item 10(3).
- **Objeto da junta:** `d948055c5948c683b03e8f44d1530e5900030a84`, um merge da `main` `38442d94` sobre o conserto da
  pré-revisão `61e90c1d`, sem conteúdo próprio (`git diff-tree --cc`). CI com 18 check-runs, todos verdes.
- **Objeto do merge:** `80b883cd2f7cb689a8df0c142f9cd61f0ea9fb67`, o conserto único da junta. CI 18/18 verdes. Squash
  na `main`: `36b5586d` (21/11 12:21 SP).
- **Composição:** recomendada por `briefing-j612-cl` (Claude Opus, nível menor). Os mandatos têm md5 EOL-neutro
  registrado na pasta da junta.
- **Cruzamento (§C7 item 11):** todo o código do bloco é Claude. A C1 ficou com a única conta externa que não tocou o
  bloco; a C2 com o DeepSeek, que só criticou o plano; a C3 é Claude, **sem cruzamento, declarado** (§C7 item 11(2)).

## Votos

| Papel | Identidade | Casa e modelo | Voto | Achados |
|---|---|---|---|---|
| Inspetor | `insp-j612-cl` | Claude Opus | LIBERADO COM RESSALVA (11:16) | 3 ressalvas, todas tratadas antes dos votos finais: o cabeçalho da C2 corrigido pelo próprio `jc2-612-dp` (só o cabeçalho, conferido por diff), 2 linhas acrescentadas ao registro de agentes vivos e o monitor de recursos religado |
| C1 — dinheiro, ações, permissão, rota e segredo | `jc1-612-sol3` | Codex conta 3, GPT-5.6 Sol | **REPROVADO** | C1-02 GRAVE (segredo na tela depois da recusa); C1-01 não grave (forma real sem banco) |
| C2 — telas, aparências e linguagem | `jc2-612-dp` | DeepSeek v4 Pro | APROVADO | C2-01 (nota) |
| C3 — regressão, escopo e registro | `jc3-612-cl` | Claude Opus (sem cruzamento, declarado) | APROVADO | C3-01 a C3-06 (notas) |

## Triagem (§C7 item 10(3))

Triador: o orquestrador (Claude Opus), 21/11 ~11:40 SP. Não achou nada, não consertou nem conferiu.

| Achado | Gravidade | Destino | Dono |
|---|---|---|---|
| **C1-02** — depois de um envio de credencial recusado, o segredo continua no estado local e no valor do campo e do HTML até a janela fechar; o certificado e a senha seguem o mesmo ramo (`CredentialDialog.tsx`; a sonda do achador dá `not ok T-SEG-3`) | **GRAVE** (segredo exposto na tela) | conserta agora | `fix-j612-cl` |
| C2-01 — o "Tentar de novo" da linha "não carregou" relê todas as organizações, não só a que falhou | não grave, simples | mesma leva | `fix-j612-cl` |
| C3-03 (parte do código) — a referência versionada `platform-cobranca-3opcoes.reference.html` ainda dizia "ela precisa ser cancelada", diferente da tela pela Q1 (b) | não grave, simples | mesma leva | `fix-j612-cl` |
| C3-04 — faltava a linha da referência nova no índice `docs/claude-code-handoff/screen-refs/README.md` | não grave, simples | mesma leva | `fix-j612-cl` |
| C1-01 — o aceite na forma real (§8.2 do plano) não roda sem banco: a API em memória responde 500 no login de `platform_admin` e devolve a lista vazia | não grave, grande | `P-612-ACEITE-FORMA-REAL` (ALTA) | orquestrador |
| C3-01 — as pendências que o plano §12 e a Emenda 2 item 7 mandavam abrir, fechar ou reatribuir não estavam registradas | não grave | este registro: abertas `P-ASS10C-RESUMO-ENTRE-ORGANIZACOES`, `P-ASS10C-NOTA-NUMERO-PDF-PLATAFORMA`, `P-ASS10C-MENU-SERVIDOR` e `P-GINVOICE-COMENTARIO-POR-REGEX`; fechada `P-567-VER-DEMONSTRATIVO`; `P-08C3-NOTA-DIVERGE-APOS-CREDITO-DESFEITO` reatribuída ao `B-ASS-10d` | orquestrador |
| C3-02 — a `P-567-TRAVA-DINHEIRO-TEMPLATE` não fecha no merge: a regra 2 (parâmetro `string`) não foi feita | não grave | este registro: a pendência fica aberta pela regra 2 | orquestrador |
| C3-03 (parte do registro) — a divergência entre a maquete e a Q1 (b) vai para `controle/` (§A2) | não grave | este registro: `C-612-MAQUETE-Q1B` em `controle/decisoes.md` | orquestrador |
| C3-05 — os 3 testes do A-03 e a troca M21 → M21a/b entraram antes da Emenda 2 que os autoriza | não grave | declarado abaixo | orquestrador |
| C3-06 — contagens publicadas defasadas | não grave | os números certos abaixo | orquestrador |

**Sem refazer cadeira** (§C7 item 10(4)): o conserto não mexe em regra de dinheiro, permissão nem isolamento fora do que
o C1-02 aponta.

### C3-05, o desvio declarado

Os 3 testes do A-03 (`f11916b4`, 20/11 16:36) e a troca literal M21 → M21a/M21b (`61e90c1d`, 20/11 22:27) entraram
antes do arquivo da Emenda 2 (20/11 22:29), que os autorizou; o cabeçalho da emenda diz "~22:50". Foi desvio do dev,
declarado no diário dele antes da pré-revisão. A `D-EMENDA-ANTES-DO-CODIGO` rege decisão do dono no meio do bloco; aqui
foi escopo do dev, ratificado depois. Fica registrado como desvio, sem efeito no produto.

### C3-06, os números certos (medidos pela C3 no objeto e na base)

- a suíte do bloco (`ass-10c-*`, com `cwd` em `frontend/`): **72/72**, não 64/64;
- falhas da raiz quando se roda fora de `frontend/` (o `tsconfig` da raiz não tem `jsx`): **39**, não 34;
- linha de base do smoke em `38442d94`: **2005**, não 2008.

## Conserto e conferência

- **Conserto único:** `fix-j612-cl` (Claude, identidade nova, não achou nada), commit `80b883cd`.
  - Bateria: check, build, `ass-10c-*` mais o guarda em 107/107 e o smoke em 2097/2097.
  - O vermelho sem o conserto está provado: 10 de 11 no segredo (o 11º, o caso de sucesso, já passava) e o T-PAR-4.
- **Conferência:**
  - `conf-j612-azc` (Azure) deu NÃO CONFERIDO só pelo C1-02. Foi artefato de medição: a sonda do achador tinha a raiz do
    worktree cravada, e a conferência criou um atalho de diretório sem registrar o head de cada rodada;
  - o orquestrador mediu num worktree limpo: `80b883cd` dá `# pass 1`; `d948055c` dá `not ok T-SEG-3`. Como é casa
    Claude medindo conserto Claude, isso não contou como cruzamento;
  - **`reconf-j612-azc` (Azure, identidade nova): CONFERIDO**, com o head medido antes de cada rodada: `80b883cd` dá
    `# pass 1`, `d948055c` dá `not ok T-SEG-3`, o restauro confere e os check-runs estão todos verdes.
- **Conferência das frases da tela** (orquestrador, 11:52 SP; a conferência das aparências é do Claude, regra do dono de
  03/11), no head `80b883cd`, por `git grep` do texto da tela e da referência:
  - "Nota emitida sem pagamento": `views/billingOps.shared.tsx:498` igual à referência, depois do C3-03;
  - a mensagem do estorno: `billing-ops.errors.ts:44` igual à referência;
  - o rótulo `live_on_unpaid`: `billing-ops.labels.ts:92` igual à referência.

  Segue a Q1 (b) do item 60: enquanto houver pagamento no mês, a nota não é cancelada. **CONFERIDO.**
- **Lição para os braços:** sonda copiada tem a raiz e o objeto trocados, e o head de cada rodada se registra antes de
  rodar.

## Resultado

**APROVADO PARA MERGE** pelo fluxo rápido: o grave foi consertado e conferido por outra casa, e o CI está verde. Os não
graves estão com dono. Merge: squash `36b5586d`, 21/11 12:21 SP. Porteiro: `porteiro-612` (Opus), **LIBERADO COM
RESSALVA** (`omega/juntas/porteiro-612-parecer.md`).
