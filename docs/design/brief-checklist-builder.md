# BRIEF DE DESIGN — Construtor de Checklists (ERP Techsolutions)

> **Para:** ClaudeDesign (elaboração da tela).
> **Objeto:** redesenho completo da tela **"Modelos de Checklist"** (`/administrator/checklists`) — o construtor
> visual onde a organização configura os checklists que o guincheiro preenche no aplicativo de campo.
> **Fonte:** este documento foi extraído do código de produção real (endpoints, contratos, tipos, permissões,
> decisões de arquitetura registradas). Nada aqui é hipotético — é o sistema como ele existe hoje + o roadmap
> aprovado pelo dono. **Data:** 2026-08-04.

---

## 1. Missão do produto (por que esta tela existe)

O ERP Techsolutions é um SaaS multi-tenant de **serviços de campo** (guincho/reboque, socorro mecânico, pátios de
custódia de veículos). O checklist é a **prova documental do estado do veículo**: o que o guincheiro fotografa,
marca e assina no momento da coleta/entrega protege a empresa contra disputas ("o carro já estava riscado"),
alimenta o dossiê jurídico do veículo no pátio (cadeia de custódia, Res. CONTRAN 1025/2026) e é exigência
contratual de clientes corporativos (seguradoras/assistências).

**Divisão de trabalho decidida pelo dono (imutável):**
- **Web (esta tela):** CONFIGURA o modelo — campos, obrigatoriedade, exigência de fotos, mapa de avarias,
  assinatura do cliente. Na web o checklist preenchido é **só visualização**.
- **Mobile (app Flutter do guincheiro):** PREENCHE. O despacho cria a execução (run); o guincheiro responde,
  fotografa, marca avarias e colhe assinatura — **inclusive offline** (sincroniza depois).
- A tela de **execuções realizadas** (acompanhamento) é outra tela (roadmap P1-PR-05) — não misturar no builder,
  mas o design pode prever o link.

**A tela atual funciona mas "não ficou legal"** (avaliação do dono). Este brief existe para o redesign elevar o
builder ao nível das telas bespoke do produto (Cloud Billing, Dossiê do Veículo, Console Dispatcher).

---

## 2. Glossário do domínio (use estes termos, nesta grafia)

| Termo (UI, PT-BR) | Interno (código) | O que é |
|---|---|---|
| **Modelo de checklist** | `ChecklistTemplate` | O formulário configurado (nome, tipo, componentes, versão, status) |
| **Componente** | `ChecklistTemplateComponent` | Um campo/bloco do formulário (foto, escolha, assinatura…) |
| **Execução** | `ChecklistRun` | Um preenchimento do modelo, vinculado a uma OS/custódia |
| **Publicar** | `publish` | Congela o modelo numa versão imutável e o torna disponível ao app |
| **Guincheiro / Técnico de Campo** | `field_technician` | Quem preenche no app |
| **Despacho** | `field_dispatch` | Ato que envia a OS ao guincheiro — cria a execução automaticamente |
| **Organização** | `tenant` | O cliente do SaaS. **NUNCA escrever "tenant" na UI** |
| **Dossiê do veículo** | — | Prontuário por veículo no módulo Pátios; tem aba "Checklist do Guincho" (read-only) |

**Proibições de linguagem (regra dura do produto):** nada de termo técnico na UI — nunca "tenant", "template"
(usar "modelo"), "run" (usar "execução"), "draft" cru (usar "Rascunho"). Acentuação PT-BR correta sempre
("Configurações", "Execução", "Vistoria"). Nada de andaime de dev (badges TODO/WIP, códigos de rota como texto).

---

## 3. Papéis e permissões (quem vê o quê — RBAC real do backend)

| Permissão | Quem tem (papéis) | Habilita na tela |
|---|---|---|
| `tenant_checklists:read` | tenant_admin, manager, operator, support (leitura) | Ver a lista e abrir modelos |
| `tenant_checklists:create` | tenant_admin, manager | Botão "Novo modelo" |
| `tenant_checklists:update` | tenant_admin, manager | Editar/arquivar/inativar |
| `tenant_checklists:publish` | tenant_admin, manager | Botão "Publicar" |

O design deve prever a tela em **modo somente-leitura** (usuário com `read` sem `update`): tudo visível,
ações de escrita ausentes (não desabilitadas — ausentes; o padrão do produto é "esconde-fino", o backend é a
autoridade final com 403 real).

---

## 4. Ciclo de vida do modelo (FSM — o design comunica estado)

```
rascunho (draft) ──publicar──▶ publicado (published) ──inativar──▶ inativo (inactive)
     ▲                            │                                     │
     └──── editar (nova ordem) ◀──┘            arquivar ──▶ arquivado (archived)
```

Regras que o design DEVE tornar visíveis e compreensíveis:
1. **Publicar congela a versão** (`version` int incrementa; o schema é congelado no despacho — a execução usa a
   versão vigente no momento do envio, mudanças posteriores NÃO afetam execuções já despachadas).
2. **Editar um modelo publicado** = o modelo continua servindo a versão publicada até nova publicação
   (a tela atual chama isso de "pending_changes" — o design precisa de um selo claro: ex. "Publicado · alterações
   não publicadas").
3. Só modelos **publicados** aparecem para o app e podem virar execução (tentar executar rascunho → erro
   `checklist_not_published`).
4. **A execução trava ao concluir/assinar** (decisão do dono D-CHK-P1-RUN-LIFECYCLE): depois de concluída é
   imutável; reabrir = nova versão auditada. (Relevante para a tela de execuções, e para o texto de ajuda do builder.)

Status → selo (tons semânticos do design system): Rascunho=draft/neutro · Publicado=success ·
Inativo=default/neutro · Arquivado=default · "Alterações não publicadas"=warning.

---

## 5. A tela ATUAL e a crítica honesta (o que não ficou legal)

**Estrutura atual** (`TenantChecklistsPage`): uma página única com (a) lista de modelos da organização com busca e
filtro por status; (b) ao selecionar, um builder de 3 zonas — **paleta** de componentes (vinda do catálogo do
backend), **canvas** (ordenar/remover componentes) e **inspector** (edita label/obrigatório/config); (c) um
**preview do schema** (JSON-ish); (d) ações criar/salvar/publicar/inativar.

**Auditoria da tela atual (capturas fornecidas pelo dono, 2026-08-04) — a lista do que corrigir:**

1. **"Pré-visualização do checklist" é um BLOCO DE JSON PRETO** (`componentKey`, `type`, `orderIndex`, `config`
   crus na tela). Violação frontal da regra do produto ("nada de andaime de dev na UI"). O usuário-gestor não lê
   JSON — ele precisa ver **o formulário como o guincheiro verá no celular**.
2. **Texto de requisito de dev vazando na UI**: o rodapé exibe literalmente *"M10, M11 e M12 devem renderizar a
   partir do schema publicado pela API, sem campos hardcoded no cliente"* — isso é anotação interna de
   engenharia, jamais texto de produto. Idem o cartão *"Evidencias no runtime"* com chips *"Storage local em dev;
   S3-compatible futuro"* / *"Download protegido por permissao"* — jargão de infraestrutura exposto ao usuário.
   **Remover tudo isso do design** (se houver valor, vira tooltip de ajuda em linguagem de negócio).
3. **Acentuação errada em escala** (os rótulos vêm do catálogo backend sem acento): "Multipla escolha",
   "Escolha unica", "opcoes", "Observacao", "Comparacao", "Ciencia", "Configuracao", "Inspecao", "Alteracoes
   pendentes", "obrigatorio". O design DEVE especificar todos os rótulos com acentuação correta ("Múltipla
   escolha", "Escolha única", "opções", "Observação", "Comparação", "Ciência", "Configurações", "Alterações
   pendentes", "obrigatório") — e a implementação mapeará type→rótulo no frontend.
4. **Inspector ("Propriedades") vazio/genérico**: para um componente Foto mostra só "Label" + checkbox
   "Componente obrigatorio" + o texto *"Nenhuma configuracao inicial definida pelo catalogo"* — quando Foto TEM
   config relevante (mín/máx de fotos). Configurar opções de escolha hoje é impossível sem JSON. O inspector
   precisa ser **tipado por componente** (§7).
5. **Canvas expõe string interna**: o item mostra "1. photo_upload · Obrigatório" — `photo_upload` é identificador
   de código; o usuário deve ver "Foto".
6. **Paleta = scroll gigante vertical** de cards grandes, cada um com botão "Adicionar" — ocupa a coluna inteira
   e empurra o resto; com 10 tipos ficou pior. Precisa de forma compacta (grid 2-col de tiles com ícone+nome, ou
   lista fina) com arrastar/clicar.
7. **Ações da lista pesadas**: cada linha tem 3 botões empilhados (Visualizar/Publicar/Inativar) — vira uma
   coluna de botões maior que o conteúdo. Usar ações inline discretas (ícones + kebab) e reservar "Publicar" ao
   contexto do editor.
8. **"Tentar novamente" permanente no header** ao lado de "Novo checklist" — o estado de erro vazou para a UI
   default. Retry pertence ao estado de erro, não ao header.
9. **Layout desequilibrado num scroll único**: lista + builder + "pré-visualização" empilhados; colunas com
   vazios enormes (captura 2: coluna esquerda com um botão "Inativar" órfão flutuando); o builder aparece
   espremido à direita da lista em vez de ser um modo de edição focado.
10. **Sem preview de dispositivo, sem seções, sem hierarquia de edição** — ver anatomia proposta (§6).
11. **Título/hierarquia**: "ADMINISTRADOR / Checklists" + "Builder visual para configurar checklists publicados
    para Web e Mobile" — o termo "builder" é jargão; preferir "Modelos de Checklist" + subtítulo de negócio
    ("Configure os checklists que a equipe de campo preenche no aplicativo").
12. **Dado de teste visível em produção de demo** ("HACKEADO v99") — irrelevante ao design, mas o design deve
    prever nomes longos/estranhos com truncamento elegante.

**Referência competitiva** (o dono enviou 7 capturas do builder do concorrente **Autem** como norte): builder com
lista de campos à esquerda, edição por campo com tipos ricos (escolha única/múltipla com editor de opções,
toggle de exigência de fotos, assinatura do cliente), aplicabilidade do checklist por tipo de serviço/cliente,
e visual limpo de SaaS moderno. Benchmarks adicionais recomendados para pesquisa visual: **SafetyCulture
(iAuditor)** — padrão-ouro em construtores de checklist de inspeção de campo (edição inline no canvas, preview
mobile ao lado, lógica de resposta com cores semânticas), **Google Forms** (simplicidade de edição inline),
**Fulcrum/ODK** (formulários de campo offline).

---

## 6. Anatomia PROPOSTA (direção, não camisa de força)

Duas superfícies:

### 6.1 Lista de modelos (a "biblioteca")
- **Page header padrão do produto**: título "Modelos de Checklist" + subtítulo de 1 linha + ações à direita
  (busca, filtro por status, botão primário "Novo modelo"). Nunca um botão esticado de largura total.
- Tabela densa (padrão do produto) ou grid de cards: Nome · Tipo (rótulo PT-BR) · Status (selo) · Versão ·
  Componentes (contagem) · Atualizado em · ações por linha (Editar, Duplicar*, Inativar).
  (*Duplicar é roadmap — o design pode prever o slot.)
- Estados obrigatórios: loading skeleton · vazio honesto ("Nenhum modelo ainda — crie o primeiro") · erro+retry ·
  acesso-negado.

### 6.2 Editor do modelo (o builder — o coração do redesign)
Layout de referência: **3 painéis + header fixo** (ver §5 dos benchmarks):

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ◀ Voltar  Nome do modelo [editável]  ● Publicado v3 · alterações não publ.│
│                                        [Pré-visualizar] [Salvar] [Publicar]│
├────────────┬────────────────────────────────────────┬────────────────────┤
│ PALETA     │ CANVAS (o formulário)                  │ INSPECTOR          │
│ (10 tipos, │ ┌ Seção: Dados do veículo ┐            │ (config do campo   │
│ com ícone, │ │ ▤ Seletor de veículo  ⋮ │            │ selecionado,       │
│ nome e     │ │ ▤ Escolha única "Cor" ⋮ │            │ TIPADO por tipo:   │
│ descrição  │ └─────────────────────────┘            │ opções, min/max    │
│ de 1 linha;│ ┌ Seção: Avarias ┐                     │ fotos, obrigatório,│
│ arrastar   │ │ ▤ Mapa de avarias     ⋮ │            │ ajuda/descrição)   │
│ ou clicar  │ │ ▤ Foto (mín. 4)       ⋮ │            │                    │
│ p/ inserir)│ └─────────────────────────┘            │                    │
│            │ ┌ Seção: Encerramento ┐                │                    │
│            │ │ ▤ Observação          ⋮ │            │                    │
│            │ │ ▤ Assinatura          ⋮ │            │                    │
│            │ └─────────────────────────┘            │                    │
└────────────┴────────────────────────────────────────┴────────────────────┘
```

Decisões de design que o produto exige:
1. **Inspector TIPADO por componente** (mata o problema nº 1): cada tipo tem seu formulário de config
   (tabela completa no §7). Escolha única/múltipla = editor de opções (adicionar/remover/reordenar/renomear
   itens — nunca JSON cru).
2. **Pré-visualização como o app renderiza** (mata o nº 2): um painel/modal "Pré-visualizar" com moldura de
   celular (390×812) renderizando o formulário com os mesmos padrões visuais do app (os componentes têm
   equivalente 1:1 no Flutter). Idealmente live (atualiza enquanto edita); minimamente, sob demanda.
3. **Seções nomeadas** (mata o nº 4): agrupador visual arrastável. Nota técnica: o backend hoje NÃO tem entidade
   "seção" — o design pode propor; a implementação usará o `config`/`schema` livre do modelo (sem migração).
   Se o custo for alto, a v1 do redesign pode agrupar visualmente por divisores simples.
4. **Canvas com manipulação direta**: arrastar para reordenar, ⋮ para duplicar/remover, clique seleciona e abre
   no inspector, indicador claro do campo selecionado, obrigatório sinalizado (asterisco/selo).
5. **Header do editor** com identidade e estado: nome inline-editável, selo de status + versão, e a distinção
   explícita "o que está publicado" vs "o que estou editando" (nº 3 do §5).
6. **Guard-rails visíveis**: publicar com escolha sem opções é impossível (o backend rejeita com 400 — o design
   antecipa com validação inline no inspector: "Adicione ao menos 1 opção").

---

## 7. Catálogo COMPLETO de componentes (10 tipos — contrato real)

O endpoint `GET /api/v1/tenant/checklist-components` devolve o catálogo (a paleta é dinâmica). Cada item:
`{ type, label, description, defaultConfig }`. Os 10 tipos e a config que o inspector deve editar:

| # | `type` | Nome (UI) | O que faz no app | Config editável (inspector tipado) |
|---|--------|-----------|------------------|-------------------------------------|
| 1 | `vehicle_selector` | Seletor de veículo | Escolhe o tipo de veículo e resolve a imagem-base da vistoria | `vehicleTypes: string[]` (car/motorcycle/truck/van) · `imageStrategy` |
| 2 | `damage_map` | Mapa de avarias | Marca pontos de avaria (x,y) sobre a imagem do veículo, com tipo (risco/amassado/quebrado/faltante/outro) e descrição | `markerTypes: string[]` · `requireDescription: bool` |
| 3 | `photo_upload` | Foto | Coleta fotos (câmera/galeria), obrigatórias ou não | `minPhotos: int` · `maxPhotos: int` · `accept: mime[]` |
| 4 | `observation` | Observação | Texto livre (multiline), inclusive obrigatório em divergência | `multiline: bool` · `maxLength: int` |
| 5 | `comparison` | Comparação | Compara entrega × coleta (before/after de execuções relacionadas) | `compareWith` (related_collection) |
| 6 | `acknowledgement` | Ciência | Registro formal de ciência de responsabilidade (quem, mensagem) | `requireObservation: bool` |
| 7 | `before_after` | Antes e depois | Evidência técnica em 2 estágios (para manutenção/reparo) | `stages` · `requireBothStages: bool` |
| 8 | `single_choice` | Escolha única | Radio — uma opção entre várias | **`options: string[]` (mín. 1 — editor de opções)** |
| 9 | `multi_choice` | Múltipla escolha | Checkbox — uma ou mais opções | **`options: string[]` (mín. 1)** · `minSelected: int` |
| 10 | `signature` | Assinatura | Pad de assinatura do responsável/cliente | `requireName: bool` |

Todo componente tem ainda os campos comuns: `label` (o texto da pergunta), `required` (obrigatório),
`componentKey` (id técnico — o design NÃO expõe; é gerado), `orderIndex` (posição — manipulação direta no canvas).

**Validação dura do backend (a UI antecipa):** `single_choice`/`multi_choice` sem `config.options` não-vazio →
**400**. O modelo precisa de **ao menos 1 componente** para ser criado.

---

## 8. Contratos de API (endpoints reais — o design mapeia 1:1 com as ações)

Base: `/api/v1`. Autenticação: Bearer JWT + contexto de organização. Envelope de resposta: `{ data: ... }`.

### Modelos (a tela do builder consome estes)
| Ação na tela | Endpoint | Gate | Notas de payload |
|---|---|---|---|
| Carregar paleta | `GET /tenant/checklist-components` | `tenant_checklists:read` | `{data:[{type,label,description,defaultConfig}]}` (10 itens) |
| Listar modelos | `GET /tenant/checklists` | read | `{data:[modelo]}`; filtro client-side por status/busca hoje |
| Abrir modelo | `GET /tenant/checklists/:id` | read | modelo completo com `components[]` ordenados |
| Criar modelo | `POST /tenant/checklists` | `tenant_checklists:create` | `{name, description?, type, schema:{}, components:[{type,label,required,orderIndex?,config,validationRules?,visibilityRules?}]}` → 201; **400** se escolha sem opções |
| Salvar edição | `PATCH /tenant/checklists/:id` | update | mesmos campos, parciais; `components` substitui o conjunto |
| Publicar | `POST /tenant/checklists/:id/publish` | `tenant_checklists:publish` | → status `published`, `version`++ , `publishedAt` |
| Inativar/arquivar | `PATCH` (status) / `DELETE /tenant/checklists/:id` | update | soft-delete |

Shape do modelo (resposta): `{id, tenantId, name, description?, type, status, version, schema, publishedAt?,
createdAt, updatedAt, components:[{id, componentKey, type, label, required, orderIndex, config,
validationRules, visibilityRules}]}`.

`type` do modelo (rótulos UI): `towing_collection` = "Guincho — Coleta" · `towing_delivery` = "Guincho — Entrega"
· `technical_evidence` = "Evidência técnica" · `custom` = "Personalizado".

### Execuções (contexto — outra tela, mas o design entende o todo)
`GET /mobile/checklists/available` · `GET /mobile/checklists/:id/render` (o app baixa o formulário) ·
`POST/PATCH /mobile/checklist-runs` (+ `/attachments`, `/markers`, `/complete`, `/divergence`,
`/acknowledgement`, `/comparison`) — o preenchimento do guincheiro. Estados da execução:
`in_progress` "Em preenchimento" · `completed` "Concluído" · `completed_with_divergence` "Concluído com avarias"
· `pending_acknowledgement` "Aguardando ciência" · `cancelled` "Cancelado".

---

## 9. Roadmap aprovado que o DESIGN DEVE ACOMODAR (não implementar agora, mas não bloquear)

Decisões já ratificadas pelo dono (registradas em `agent-orchestration/controle/decisoes.md`):

1. **Aplicabilidade** (D-CHK-P1-APPLICABILITY): regras "este modelo se aplica a → serviço concreto OU tipo de
   serviço, e/ou cliente específico", com **fase** (coleta/entrega/genérico). Uma OS pode receber **um ou vários**
   checklists conforme a regra, e **o operador ajusta no envio** (despacho). O design do builder deve prever uma
   seção/aba "Aplicabilidade" no editor do modelo (ex.: "Aplica-se a: [Todo serviço ▾] [Todo cliente ▾]
   [Fase: Coleta ▾]" com múltiplas regras), mesmo que a v1 a mostre como "em breve".
2. **Imagens de referência** (P1-PR-07): upload da imagem-base do mapa de avarias por tipo de veículo (hoje são
   assets fixos do app). Prever no inspector do `damage_map`/`vehicle_selector`.
3. **Tela de execuções realizadas** (P1-PR-05): lista tenant-wide de execuções com filtros (modelo, período,
   status, OS) e detalhe read-only. Prever o link de navegação a partir do builder ("Ver execuções deste modelo").
4. **Impressão da execução** (P1-PR-06): documento imprimível de uma execução (padrão já existente no produto:
   documento read-only, cabeçalho com organização + carimbo de emissão).
5. **Duplicar modelo** e **histórico de versões**: previstos; slots de UI bastam.

---

## 10. Design system (obrigatório — a tela deve parecer IRMÃ das telas bespoke)

- **Shell**: sidebar navy 236px (colapsa 74px) + topbar 60px. A tela vive no grupo ADMINISTRAÇÃO
  ("Modelos de Checklist"). Ícones **lucide-react**.
- **Tokens de uso corrente no produto** (os mesmos das telas de Pátios/Dossiê): texto primário `#0F172A`,
  secundário `#64748B`/`#475569`, primário de ação `#2563EB`, bordas `#E2E8F0`, fundos suaves `#F8FAFC`/`#F0F9FF`;
  tons semânticos: sucesso verde, atenção âmbar, crítico vermelho, info azul, pendente roxo. Fonte sans (Inter-like),
  denso; títulos 18-20/800, corpo 13-14, legendas 11-12.
- **Componentes UI existentes para reusar**: `Card` (título+ação), `Table` densa, `Tabs`, `Chip`/`Badge`
  semânticos, `Modal` (base 420px e variante grande `size="lg"` 1180px), `EmptyState`, `Skeleton`, `Alert`,
  `Button` (primary/secondary/ghost/danger, sm).
- **Padrões do produto**: page-header com título+subtítulo+ações à direita; tabelas densas com chips de status;
  estados honestos; alvo de toque ≥44px em ações críticas; foco visível; aria em ícones-ação.

---

## 11. Estados obrigatórios (política do produto — TODA tela entrega os 6)

1. **Carregando**: skeleton (não spinner solto).
2. **Vazio honesto**: primeira visita sem modelos → convite claro para criar; canvas vazio → "Arraste componentes
   da paleta" com ilustração leve.
3. **Erro + tentar novamente**.
4. **Acesso não permitido**: mensagem honesta (sem leak técnico).
5. **Somente leitura**: usuário com `read` sem `update`.
6. **Alterações não salvas/publicadas**: aviso claro; guarda de navegação ("Sair sem salvar?").

---

## 12. Jornadas críticas (o design otimiza para estas, nesta ordem)

1. **Criar o primeiro checklist de coleta em <5 min** (gestor recém-chegado): Novo modelo → nome "Vistoria de
   coleta" → tipo "Guincho — Coleta" → arrasta Seletor de veículo + Mapa de avarias + Foto (mín. 4) + Observação
   + Assinatura → publica → mensagem de sucesso com "o modelo já está disponível no aplicativo".
2. **Adicionar uma pergunta de escolha ao modelo publicado**: abrir modelo → adicionar Escolha única "Cor
   predominante" → editor de opções (Preto/Prata/Branco...) → salvar (selo "alterações não publicadas") →
   publicar (v++).
3. **Conferir como o guincheiro verá**: pré-visualizar em moldura de celular antes de publicar.
4. **Despublicar/inativar com segurança**: entender o impacto (execuções em andamento não são afetadas — o
   despacho congela; novas OSs deixam de receber o modelo).

---

## 13. Critérios de aceitação do design (checklist do entregável)

- [ ] Lista + editor com hierarquia clara (rota/modo de edição focado; não tudo num scroll só).
- [ ] Paleta com os **10 tipos**, ícone + nome + descrição de 1 linha cada.
- [ ] Inspector **tipado por componente** (nunca JSON/chave-valor cru); editor de opções para escolhas.
- [ ] Pré-visualização em moldura de celular (390×812) fiel ao render do app.
- [ ] Header do editor: nome inline, selo status+versão, "Publicado vs. alterações não publicadas" explícito,
      ações Salvar/Publicar/Pré-visualizar.
- [ ] Estados obrigatórios (§11) desenhados — inclusive somente-leitura e canvas vazio.
- [ ] Slot de "Aplicabilidade" (§9.1) e link "Ver execuções deste modelo" (§9.3).
- [ ] PT-BR de negócio, acentuado; zero termo técnico; tokens/densidade do design system (§10).
- [ ] A11y: foco visível, arrastar-com-teclado alternativo (mover ↑/↓ no menu ⋮), aria nos ícones, ≥44px.
- [ ] Responsivo até 1280px (3 painéis → paleta colapsável; inspector vira drawer).

---

## 14. Apêndice — fundamentos de pesquisa (por que estas escolhas)

- **Manipulação direta + visibilidade de estado** (Norman/Nielsen): o par canvas-inspector com seleção explícita
  reduz o custo de correspondência entre "o que eu edito" e "o que aparece"; o selo de versão/publicação
  externaliza o estado do sistema (heurística nº 1 de Nielsen).
- **Preview fiel** (WYSIWYG parcial): em construtores de formulário, o erro nº 1 do autor é publicar um formulário
  que renderiza diferente no dispositivo-alvo. SafetyCulture (iAuditor) e Typeform resolvem com preview lado a
  lado; Google Forms com edição-que-é-o-preview. Dado que nosso render-alvo é um app Flutter com componentes
  próprios (mapa de avarias, assinatura), o preview em moldura de celular é a escolha certa (não edição-inline).
- **Editor de opções como lista manipulável** (não texto): padrão universal (Forms/Typeform/SurveyMonkey);
  reduz erro de sintaxe a zero e permite reordenar — que é semanticamente relevante para o guincheiro em campo
  (as opções mais comuns primeiro = menos toques com luva).
- **Seções nomeadas**: formulários de inspeção longos têm taxa de conclusão maior quando particionados em grupos
  com títulos (progressive disclosure); no app, seções também viram âncoras de navegação.
- **Guard-rails no ponto do erro** (validação inline no inspector, não só no submit): desloca o feedback para o
  momento da decisão — publicar nunca falha por surpresa.
- **Densidade de ERP**: o usuário é operador profissional recorrente (não consumidor casual); privilegiar
  densidade informacional e atalhos sobre espaçamento decorativo — mas com hierarquia tipográfica forte
  (títulos 800, legendas 11px) para varredura rápida.

---

*Referências internas: rotas `src/modules/checklists/checklist.routes.ts` · catálogo `checklist.components.ts` ·
validação `checklist.validator.ts` · tela atual `frontend/src/modules/checklists/pages/TenantChecklistsPage.tsx` ·
decisões `agent-orchestration/controle/decisoes.md` (D-CHK-DISPATCH-CREATE, D-CHK-P1-RUN-LIFECYCLE,
D-CHK-P1-APPLICABILITY) · plano da rodada `docs/juntas/J-CHECKLIST-P1.md` · design system `DESIGN_SYSTEM.md` +
`frontend/src/styles/` (tokens em uso).*
