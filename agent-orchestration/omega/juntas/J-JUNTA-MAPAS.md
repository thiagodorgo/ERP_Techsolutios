# J-JUNTA-MAPAS — Criação da Junta de Mapas (3 agentes)

**Tema:** aprovar a criação da **Junta de Mapas** — 3 agentes no molde da casa
(`planejador-mapas` → `dev-mapas` → `avaliador-mapas`) acionados em toda tarefa de mapa/geo
(web ou Flutter), + base de conhecimento viva `docs/maps/kb-mapas.md` + registro `D-JUNTA-MAPAS`.
Autor humano: **Thiago**. Rodada de **1 PR** (`feat/agents-junta-mapas`, a partir de `main`).

**Escopo do PR:** cria a junta + KB + registro. **Nenhuma chave, billing ou SKU do Google ativado.**

**Regra de ouro fixada:** MapLibre GL + OpenFreeMap permanecem como base de exibição web (custo
zero, junta Ω1 — ver `agent-orchestration/omega/juntas/J-002-provedor-de-mapa.md`); Google entra só
onde agrega; **ativar SKU pago / trocar/adicionar provedor geo = serviço externo → PD-xxx (≥3 fontes)
+ junta de 5 unânime** (coerente com D-SAN-AUTONOMIA §1).

**Junta de aprovação (maioria simples, 4 membros):** agente-fabrica · planejador-mestre ·
critico-adversarial · inspetor-de-rotas.

## Votos

| Agente | Voto | Justificativa (resumo) |
|---|---|---|
| **agente-fabrica** | ✅ FAVORÁVEL | Frontmatter válido nos 3 (`name`/`description`/`tools`); ferramentas mínimas corretas (só `dev-mapas` tem Edit/Write); corpo denso PT-BR no molde da casa; `description` rica em gatilhos; **sem colisão de nomes**; divisão planeja→implementa→veta limpa, sem sobreposição perigosa. Nenhum defeito bloqueante. |
| **planejador-mestre** | ✅ FAVORÁVEL | `planejador-mapas` reproduz os 8 campos do meu template (objetivo; ator; fluxo; contrato 404/422/409; modelagem aditiva tenant-scoped; arquivos c/ regra do espelho; baseline N + meta ≥2N; riscos+rollback); dossiê geo é **acréscimo**, não contradição; "sem plano = veto" preservado; **sem dupla autoridade** — especializa, não compete. |
| **critico-adversarial** | ✅ FAVORÁVEL (c/ furos a endurecer) | Nenhum bloqueante — D-SAN-AUTONOMIA §1 já trava chamada externa tarifada em junta-5. Furos levantados → viram follow-up (abaixo). |
| **inspetor-de-rotas** | ✅ FAVORÁVEL | Caminhos citados existem (`frontend/src/modules/operations/map/`, `OperationsMapLibreCanvas.tsx`, `OperationsMapCanvas.tsx`, `mapStyle.ts`, `mapMarkers.ts`, `planejador-mestre.md`); cadeia de delegação fechada (cada agente declara o próximo); **nenhuma rota de app nova**, escopo = 3 agentes + KB + decisão. Alerta (não veto): trabalho de frontend não commitado deve ficar FORA do PR. |

## Veredito

**APROVADO — maioria 4/4 (unânime entre os membros).** Merge liberado (autonomia por juntas,
CLAUDE.md §C7). Aprovação **condicionada** aos critérios de aceite, todos atendidos:

- [x] 3 arquivos de agente idênticos ao especificado, frontmatter válido no molde dos existentes (19 agentes agora, sem colisão).
- [x] `docs/maps/kb-mapas.md` **preenchida** com fontes datadas de 2026 (preços verificados na tabela oficial marcada 2026-07-10 UTC; ToS 2025-05-01 / EEA 2025-10-01; `google_maps_flutter` 2.17.1; `flutter_map` 8.3.0; OpenFreeMap sem limites).
- [x] Nenhuma chave, billing ou SKU ativado.
- [~] Teste de gatilho: **evidência abaixo** (limite de sessão obriga verificação em sessão nova — o próprio critério prevê isso).

## Ações incorporadas neste PR (furos não-bloqueantes do crítico + inspetor)

Endereçadas **dentro do escopo de autoria** (KB e decisão — o corpo dos 3 agentes é **verbatim por
ordem do dono** e não pode ser editado nesta rodada):
- **KB (furo 3):** valores de assinatura ganharam **linha-fonte datada própria** + ressalva "reconfirmar antes de assinar".
- **KB (furo 5):** adicionado **enforcement do TTL ≤30d** de `lat/lng` (carimbo `expires_at` + purga automática = requisito de veto) e **guarda de custo** (Cloud Billing budget/alertas + quotas por SKU + rate limit por tenant no dia da ativação).
- **decisoes.md (inspetor):** wikilink `[[J-002-provedor-de-mapa]]` **normalizado** para o path em backtick (padrão da casa).

## Follow-ups registrados (fora do escopo verbatim desta rodada)

O corpo dos 3 agentes está **congelado** (o dono passou "EXATAMENTE este conteúdo"). O próprio
critério de aceite só autoriza refinar `description` **se o teste de gatilho falhar** em sessão
nova. Portanto os itens abaixo ficam como **watch-items da 1ª execução real** (`R-MAPAS-1` se
confirmarem problema de delegação):
- **F-1 (crítico furo 4):** `description` do `planejador-mapas` inclui "localização" (amplo — pode
  disparar em check-in/GPS puro sem mapa); a do `dev-mapas` pode convidar bugfix direto pulando o
  planejador. Validar no 1º gatilho real; refinar `description` só se rotear errado.
- **F-2 (crítico furo 1):** definir com precisão o que é "SKU pago **ativado**" (item 6 do checklist
  do avaliador) — deixar código de proxy pronto **não** é ativação; ligar billing/quota **é**.
- **F-3 (crítico furo 6):** avaliador devolve só a `dev-mapas`; defeito de **premissa** (provedor
  errado) deveria voltar ao `planejador-mapas`. Ajustar na 1ª ata de tema real, se ocorrer.

## Evidência do teste de gatilho (cadeia planejador→dev→avaliador)

**Objetivo do critério:** em sessão nova, o pedido "adicione um mini-mapa com a posição da OS na
tela de detalhe" deve acionar **`planejador-mapas` PRIMEIRO** e percorrer a cadeia até
`avaliador-mapas`, **sem** menção explícita aos nomes.

**Limitação técnica observada (2026-07-13):** o roteador de subagentes carrega a lista de agentes
**no início da sessão**. Os 3 agentes foram criados **durante** esta sessão → tentativa de acioná-los
(inclusive chamada explícita a `planejador-mapas`) retornou **"Agent type not found"**, listando
apenas os 19 pré-existentes. **Logo o teste ao vivo é obrigatoriamente de sessão nova** — que é
exatamente o que o critério pede ("em sessão nova").

**Validação possível agora (feita):**
1. Frontmatter dos 3 parseado com sucesso (mesmo molde dos existentes) — a `description` (que dispara
   o roteamento) está bem-formada.
2. **Análise de casamento de gatilho** para "adicione um **mini-mapa** com a **posição da OS** na tela
   de detalhe":
   - `planejador-mapas.description`: "Use PROATIVAMENTE **no INÍCIO** de qualquer tarefa que envolva
     **mapa** … **markers** … **localização**" → casa em "mini-**mapa**" e "**posição** da OS"; "no
     INÍCIO" + "Nenhum código de mapa sem plano meu" o firmam como **entrada** da cadeia. ✔ deve ser 1º.
   - `dev-mapas.description`: "Use PROATIVAMENTE para **IMPLEMENTAR** … **Só atua com plano do
     planejador-mapas**" → só depois do plano. ✔
   - `avaliador-mapas.description`: "Use PROATIVAMENTE para **REVISAR/validar** … antes do merge" → fim
     da cadeia. ✔

**Procedimento de verificação em sessão nova (a executar e anexar ao PR):**
> Abrir sessão nova neste repo e digitar **exatamente**: `adicione um mini-mapa com a posição da OS na
> tela de detalhe`. Esperado: o fio principal delega **primeiro** ao `planejador-mapas` (plano + dossiê),
> depois `dev-mapas` (implementação), depois `avaliador-mapas` (veredito), **sem** que o nome de nenhum
> agente seja citado no pedido. Se a delegação errar de agente ou pular fase → refinar as `description`
> (F-1) e repetir. Registrar o print/log da cadeia como evidência final.

**Status do teste:** PENDENTE de sessão nova (não reproduzível na sessão de autoria por design do
harness). Análise estática de gatilho: **favorável**.
