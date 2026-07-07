# Pixel Perfect Forensics

Use quando a entrada for figma, print, wireframe, tela existente ou app visual.

## Método de leitura

1. Identificar a intenção da tela:
   - tarefa principal do usuário;
   - persona;
   - estado do fluxo;
   - dados críticos;
   - ações primárias e secundárias.
2. Mapear estrutura:
   - canvas/frame;
   - grid;
   - colunas;
   - breakpoints;
   - regiões fixas: appbar, sidebar, bottom nav, toolbar, cards, tabela, footer.
3. Extrair tokens:
   - cores com função semântica;
   - tipografia: família, peso, tamanho, line-height;
   - espaçamento: 4/8/12/16/24/32;
   - radius;
   - border;
   - elevation/shadow;
   - opacidade;
   - ícones;
   - densidade.
4. Mapear estados:
   - loading;
   - empty;
   - error;
   - disabled;
   - hover/focus/pressed;
   - selected;
   - offline/cache;
   - permission denied.
5. Traduzir para Flutter:
   - widget tree;
   - design tokens;
   - componentes reutilizáveis;
   - adaptive/responsive layout;
   - scroll behavior;
   - animações/microinterações.

## Checklist visual extremo

Para cada componente importante, verificar:

- padding interno e externo;
- alinhamento óptico;
- altura mínima clicável;
- área de toque mobile;
- contraste;
- truncamento e overflow;
- densidade em tabelas;
- comportamento com dados longos;
- comportamento sem dados;
- comportamento em telas pequenas;
- consistência de estados.

## Padrões Flutter recomendados

- Preferir `ThemeData`, `ColorScheme`, `TextTheme` e tokens centrais antes de widgets isolados.
- Usar `LayoutBuilder` para breakpoints locais.
- Usar `Sliver` quando a tela tiver header fixo, lista longa ou dashboard.
- Usar componentes pequenos e nomeados: `MetricCard`, `StatusBadge`, `SectionHeader`, `FilterBar`, `EmptyState`, `ErrorBanner`.
- Para ERP, manter densidade controlada: tabelas compactas no desktop e cards/listas no mobile.
- Em mobile de campo, priorizar legibilidade, toque grande, feedback claro e operação offline.

## Saída esperada para conversão visual

Entregar:

```md
## análise visual
## tokens detectados
## árvore de widgets sugerida
## componentes reutilizáveis
## responsividade
## estados
## acessibilidade
## prompt claude code
```

## Cuidados

- Se a entrada for print sem dimensões, estimar proporções e declarar incerteza.
- Se houver Figma URL, obter contexto/screenshot da node quando ferramentas estiverem disponíveis.
- Se o usuário pedir visual fiel, não simplificar a hierarquia visual sem avisar.
