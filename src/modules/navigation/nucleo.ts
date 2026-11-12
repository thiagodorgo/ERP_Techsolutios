// B-SAN3-18 (P3, R-A8) — o NÚCLEO do menu: as entradas de organização que aparecem sem módulo nenhum, porque nunca se
// desligam por plano (resposta P2(a) do dono, `D-DONO-TODAS-RECOMENDACOES-1111`): o Painel, Usuários e perfis (com
// Acessos e Sessões), Configurações e Minha assinatura. Desligar qualquer uma delas tranca o administrador fora da
// própria organização.
//
// Lista LITERAL, comparada pela string exata do caminho. Entrada de núcleo NÃO tem `requiredModules`; toda outra
// entrada de organização tem (tests/san3-18-menu-modules.test.ts confere o "xor"). A contraparte na API é `NUCLEO_API`
// (route-modules.ts).
export const NUCLEO_MENU_PATHS: readonly string[] = [
  "/dashboard",
  "/administrator/settings",
  "/administrator/users",
  "/administrator/subscription",
  "/users",
  "/controle/usuarios/acessos",
  "/controle/usuarios/sessoes",
];

// Chaves do catálogo que NÃO podem ser `requiredModules` de entrada de menu: elas nomeiam o núcleo, que não se
// contrata nem se desliga (R-A8).
export const FORBIDDEN_MENU_MODULE_KEYS: readonly string[] = ["users", "tenant-admin"];
