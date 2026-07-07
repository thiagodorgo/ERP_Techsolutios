# Claude Code Prompt Craft

Use quando o usuário pedir prompt para claude code no vscode, terminal, web ou desktop.

## Princípios

Claude Code consegue ler o codebase, editar arquivos, executar comandos e integrar ferramentas de desenvolvimento. Em VS Code, pode trabalhar com diffs, contexto selecionado e histórico dentro do editor. Use prompts que deem escopo, contexto, restrições e validações.

## Estrutura de prompt mestre

```md
Você está no repositório <nome>.

# <código> — <nome da entrega>

## 0. Contexto
<estado do projeto, PRs anteriores, branch/base, decisões>

## 1. Objetivo
<resultado verificável>

## 2. Escopo permitido
<paths e ações permitidas>

## 3. Escopo proibido
<paths e ações proibidas, secrets, push, pr, merge>

## 4. Investigação obrigatória
<arquivos, termos de busca, contratos e riscos>

## 5. Requisitos técnicos
<arquitetura, estado, api, local db, erros, offline>

## 6. UX
<estados visuais, mensagens, acessibilidade>

## 7. Testes
<cenários obrigatórios>

## 8. KPIs/docs
<arquivos a atualizar e regras>

## 9. Validações
<commands exatos>

## 10. Commits sugeridos
<mensagens sem wip>

## 11. Relatório final
<formato obrigatório>

Não faça push.
Não crie PR.
```

## Regras para prompts fortes

- Sempre separar o que pode e o que não pode ser alterado.
- Sempre pedir investigação antes de codar.
- Sempre exigir relatório final com validações.
- Sempre incluir comandos de teste.
- Para branches com WIP, pedir `git status --short` e proibir `git add .`.
- Quando houver risco de conflito, pedir backup/stash ou commit local antes de rebase.
- Para PRs, revisar antes de merge e não autorizar merge sem checks.
- Para Flutter, exigir `flutter analyze`, testes específicos e suite completa.
- Para backend, exigir testes, lint, build e diff check.
- Para KPIs, exigir atualização de JSON, histórico e snapshot embutido quando existir.

## Padrão de prompt para conversão visual para Flutter

```md
Você está no projeto Flutter.

Objetivo: converter o protótipo/tela anexa em Flutter com fidelidade visual alta.

Entrada visual:
- <figma/print/wireframe>

Implemente:
- tokens de cor/tipografia/espaçamento
- componentes reutilizáveis
- layout responsivo
- estados loading/empty/error/offline
- testes widget principais

Não implemente:
- backend novo
- features fora do visual
- push/pr

Antes de codar:
- inspecione a estrutura atual
- identifique design system existente
- proponha widgets e arquivos

Validações:
- flutter analyze
- flutter test
- golden tests se aplicável

Relatório:
- arquivos alterados
- decisões visuais
- divergências do protótipo
- testes
```

## Dicas durante interação

- Se Claude Code começar amplo demais, pedir para ele parar e listar plano antes de editar.
- Se o output vier genérico, pedir arquivos exatos, diffs e validações.
- Se mexer fora do escopo, pedir relatório de rollback.
- Se houver WIP, preservar antes de rebase.
- Se testes locais passam mas CI não cobre, criar risco não bloqueante e sugerir bloco de infra.
