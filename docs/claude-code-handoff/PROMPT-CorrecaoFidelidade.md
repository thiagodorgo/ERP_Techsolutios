# Prompt — Correção de Fidelidade Visual (ERP Techsolutions)

> Cole o bloco abaixo no início de uma sessão do Claude Code, com o repositório aberto
> (o pacote de handoff — `CLAUDE.md`, `PROJECT_MEMORY.md`, `screen-refs/` — deve estar na raiz
> ou na pasta de docs do projeto). Ajuste apenas o parágrafo **ESCOPO DESTE LOTE** conforme o
> que você quer atacar primeiro.

---

## PROMPT (copiar a partir daqui)

**Papel:** Você é um engenheiro de front-end sênior. Sua entrega é avaliada por **fidelidade
visual absoluta** ao protótipo aprovado — não por criatividade. Nesta tarefa você **não cria
features novas**: você **reproduz 1:1** telas que já existem e foram validadas.

**Contexto:** O protótipo oficial (ERP Web + ERP Mobile) está congelado e aprovado. A
implementação atual **divergiu** do protótipo em praticamente todas as telas dos dois apps
(layout, densidade, cópia, componentes e terminologia diferentes do aprovado). Sua missão é
**corrigir essa divergência** até a implementação ficar indistinguível do protótipo.

### 1. Leitura obrigatória ANTES de tocar em qualquer código
Leia e trate como fonte da verdade, nesta ordem:
1. `CLAUDE.md` — regras do projeto. Preste atenção especial à **§11 (Fidelidade visual)** e à
   **§3 (linguagem de UI)**.
2. `PROJECT_MEMORY.md` — estado real, stack confirmada, contratos, invariantes e RBAC.
3. `screen-refs/README.md` — o **índice da galeria de referência**: 74 telas renderizadas do
   protótipo (35 Web + 39 Mobile), cada PNG mapeado para a sua chave `screen`.
4. Para cada tela que for corrigir: o **PNG alvo** em `screen-refs/web/` ou `screen-refs/mobile/`
   **e** o trecho correspondente no código-fonte do protótipo (`ERP Web.dc.html` /
   `ERP Mobile.dc.html`) — localize pela chave `screen` indicada no índice.
5. `screen-refs/Cloud Billing.reference.html` — **padrão-ouro** em HTML estático isolado. É o
   nível de fidelidade que espero em TODAS as telas.

Não escreva código antes de me confirmar, em 3–5 linhas, que leu esses arquivos e entendeu as
regras de fidelidade.

### 2. ESCOPO DESTE LOTE  ← ajuste aqui
> Ex.: "Comece pela **Plataforma Web** (9 telas): Visão Geral, Organizações, Organização·detalhe,
> Planos e Módulos, Cloud Billing, Auditoria, Health, APIs, Configurações. Depois pare e me
> mostre o relatório antes de seguir para Operação."

Trabalhe **somente** no escopo deste lote. Não toque em telas fora dele.

### 3. Processo obrigatório, tela por tela (não pule etapas)
Para **cada** tela do escopo:
1. Abra o **PNG alvo** e o **fonte** da tela no protótipo.
2. Recrie o componente React **1:1**: mesma grade, mesmos espaçamentos, mesmos tokens (cor,
   tipografia, raio, sombra), mesma densidade, mesmos estados e **a mesma cópia** (PT-BR).
3. **Prova de fidelidade (auto-verificação):** rode o app, renderize a tela nos mesmos
   tamanhos das referências (**Web = 1440px** de largura; **Mobile = 390×812**) e **capture um
   screenshot**. Compare lado a lado com o PNG alvo. Ajuste até não haver diferença perceptível
   de layout, espaçamento, cor ou texto. Anexe o **antes/depois** na sua resposta.
4. Só marque a tela como concluída quando a comparação estiver fiel.

### 4. Regras de fidelidade INEGOCIÁVEIS (de `CLAUDE.md` §11)
1. **Linguagem PT-BR de negócio:** "Organização / Organizações". **NUNCA** "Tenant/Tenants"
   (em nenhum lugar da UI: título, coluna, chip, placeholder, tooltip).
2. **Zero andaime de dev na UI:** sem badges `PLANNED`/`TODO`/`WIP`, sem código de tela
   (`P04…`), sem path de rota/endpoint como texto visível.
3. **Acentuação correta:** Visão, Órgão, Configurações, Auditoria, média… (jamais sem acento).
4. **Page header = título + subtítulo + AÇÕES à direita** (seletores + botão primário). Nunca um
   único botão esticado na largura toda.
5. **KPIs com semântica:** reproduza **todos** os cards (valor + variação + selo de risco com a
   cor certa: azul plataforma · verde sucesso · âmbar atenção · vermelho crítico · roxo receita).
6. **Composição completa:** se a referência tem gráficos + painel "O que mudou?" (IA) + tabela,
   **todos** entram. Não reduza a tela a "KPIs + tabela".
7. **Sidebar/navegação:** grupos, ordem, ícones e item ativo (azul sólido) idênticos; colapso
   preserva ícones e badges.

### 5. Guard-rails de escopo (o que você NÃO deve fazer)
- Não invente telas, abas, seções, colunas ou textos que não existam no protótipo.
- Não "melhore", simplifique ou modernize nada por conta própria — **fidelidade > opinião**.
- Não altere contratos de API, schema ou RBAC além do necessário para renderizar a tela; toda
  permissão é validada no **backend** conforme `PROJECT_MEMORY.md`/`RBAC_MATRIX.md`.
- Não exponha segredo/PII em payload ou log.
- **KPIs de progresso só no relatório final** — nunca commitados na UI.
- Respeite o fluxo de PR do projeto; um lote = um PR.

### 6. Ordem de execução sugerida (se o escopo for amplo)
Web: Plataforma → Operação → Despacho → Administração → Financeiro.
Mobile: Sessão/Navegação → Fluxo Guincho → Fluxo Prestador → Despesas/RDV/Comissões.
Priorize dentro de cada grupo as telas mais divergentes primeiro.

### 7. Definition of Done
**Por tela:** comparação antes/depois anexada e fiel ao PNG; regras da §4 cumpridas; cópia e
acentuação corretas; estados (vazio/carregando/erro/offline onde couber) presentes.
**Por lote:** todas as telas do escopo fiéis; build e lint verdes; um PR aberto com a lista de
telas e os prints antes/depois; nenhum item fora do escopo tocado.

### 8. Como reportar
Ao terminar o lote, entregue:
- um **checklist** tela-a-tela (✅ fiel / ⚠️ divergência residual + motivo);
- os **prints antes/depois** de cada tela;
- o **link do PR**.
Se em alguma tela o PNG e o código-fonte divergirem, **pare e pergunte** — não decida sozinho.

## PROMPT (copiar até aqui)

---

### Dica de uso
- Rode **por lote** (um grupo por vez) e exija o relatório antes de liberar o próximo — é assim
  que se garante fidelidade sem o agente "correr" e reinterpretar.
- Se quiser fidelidade ainda maior em uma tela crítica, peça que ele use
  `screen-refs/Cloud Billing.reference.html` como molde de estrutura e produza o mesmo nível.
- Telas longas: as referências mostram a **dobra inicial**; peça o screenshot rolado (dobra 2)
  quando precisar validar o rodapé da tela.
