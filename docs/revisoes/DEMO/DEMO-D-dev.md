# DEMO-D — DEV: acentos e cartões sem tela

- **Papel:** `dev-demo-d-sol`
- **Modelo:** Codex GPT-5.6 Sol, nível menor declarado
- **Base medida:** `origin/main` em `c9a2d036c1aaff21df92817525d7f9c92cbbe272`
- **Branch:** `feat/demo-acentos-e-home`
- **Escopo:** AC-14 e AC-17 do plano da demonstração ao sócio
- **Skills aplicadas:** `ts-frontend-full` na implementação e `ui-ux-pro-max` na revisão

## Diagnóstico

O inventário foi feito com `git grep` antes de cada família de troca. Os textos antigos apareciam em cópia de UI web/mobile e em asserções que conferiam essa cópia. Identificadores, nomes de campo (`descricao`), valores de enum (`concluida`), chaves de API, classes CSS e `data-testid` foram preservados.

Para AC-17, a hipótese do plano não se reproduz no head medido:

- `mobile/flutter_app/lib/shared/ui/home_screen.dart` não contém cartões nem rótulos `Checklists` ou `Notificações`;
- os atalhos atuais da Home são Despesas, Sincronizar e Diagnóstico;
- o fluxo de checklist existente é válido e abre de dentro da OS pela rota `/work-orders/:workOrderId/checklists`; ele não foi removido;
- portanto, não houve alteração de layout na Home. O guard textual protege a ausência dos dois cartões sem tela.

## Implementação

- Corrigidas as cópias visíveis de Título, Descrição, Localização, Último fix, Não foi possível, Ciência, Atribuída(s) e Concluída(s) em `frontend/src` e `mobile/flutter_app/lib`.
- Corrigidos os botões do roteiro para `Enviar localização agora` e `Registrar evidência`.
- Atualizadas, sem remoção, as asserções que conferiam a cópia anterior.
- Criado `frontend/tests/demo-accent-copy.guard.test.ts`, executado pelo `test:smoke`, com duas propriedades:
  1. as strings de UI web/mobile não podem reintroduzir a lista sem acento do AC-14;
  2. a Home não pode reintroduzir `MobileActionTile` para Checklists ou Notificações.
- `Kpis/**`, lockfiles, contratos de API e enums permaneceram intocados.

## Validação

| Comando | Resultado |
|---|---|
| `npm --prefix frontend ci` | verde; instalação própria do worktree, sem junction |
| `npm --prefix frontend run check` | verde |
| `npm --prefix frontend run test:smoke` | verde, **1370/1370** |
| `npm --prefix frontend run build` | verde |
| `flutter pub get` | verde |
| `dart format --output=none --set-exit-if-changed lib test` | ressalva preexistente: aponta somente `test/features/bsan313_minhas_os_escopo_test.dart`, fora do escopo e sem alteração mantida |
| `dart format --output=none --set-exit-if-changed <31 arquivos Dart tocados>` | verde, **0 alterados** |
| `flutter analyze` | verde, sem issues |
| `flutter test --reporter compact` | verde, **905/905** |
| `git diff --check` | verde |

A tentativa de formatar o arquivo preexistente produziria um diff material fora do DEMO-D; a mudança foi revertida e não entrou na entrega. O problema existe idêntico na base `origin/main` e não foi criado por este bloco.

## Revisão UI/UX

O design system, a hierarquia, os componentes, as rotas, a navegação, os estados assíncronos e os alvos de toque não foram alterados. A mudança é exclusivamente de cópia visível; os termos técnicos continuam somente no código/contratos.

## Limpeza

Removidos os artefatos regeneráveis `frontend/dist/` e `mobile/flutter_app/build/`. Dependências próprias do worktree foram preservadas para rastreabilidade da bateria. Disco permaneceu acima de 8 GB durante a execução.
