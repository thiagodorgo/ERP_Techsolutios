// -----------------------------------------------------------------------------------------------
// B-O6R-01 ciclo 2 (R-B-O6R-01-ciclo1, B-2) — fixtures de COMPILAÇÃO do catálogo de autoridade.
//
// Este arquivo vive em `src/**` de propósito: é o que o `tsconfig.json` cobre, então `npm run
// check` o compila em toda bateria. Nada aqui roda em produção — nenhum módulo o importa; ele
// existe para que as propriedades fail-closed do ROLE_AUTHORITY sejam VERIFICADAS pelo
// compilador, não afirmadas em comentário (a classe de defeito que o ciclo 1 reprovou).
//
// Cada `@ts-expect-error` é bidirecional: se o erro esperado DEIXAR de acontecer (alguém
// afrouxou o tipo), a própria diretiva vira erro ("unused @ts-expect-error") e o check reprova.
// -----------------------------------------------------------------------------------------------

import {
  ROLE_AUTHORITY,
  type PlatformRole,
  type Role,
  type TenantAssignableRole,
} from "./catalog.js";

// 1 · O MECANISMO que protege o mapa real, reproduzido com um domínio um papel maior: a MESMA
// forma `Record<papéis, "platform" | "tenant">` com uma chave sem classificação NÃO COMPILA.
// É esta a propriedade que o drill 2 do ciclo 2 prova por mutação no mapa de verdade.
type RoleComPapelNovo = Role | "papel_novo_nao_classificado";
// @ts-expect-error — papel no domínio sem entrada no mapa = chave faltante; a omissão é erro de
// compilação, nunca um default.
const autoridadeComOmissao: Record<RoleComPapelNovo, "platform" | "tenant"> = {
  ...ROLE_AUTHORITY,
};
void autoridadeComOmissao;

// 2 · Não existe terceira classificação: o contradomínio é exatamente "platform" | "tenant".
// @ts-expect-error — "ambos"/qualquer outro valor não é uma autoridade válida.
const classificacaoInvalida: (typeof ROLE_AUTHORITY)[Role] = "ambos";
void classificacaoInvalida;

// 3 · Papel fora do catálogo não indexa a autoridade — a decisão só existe para Role.
// @ts-expect-error — "papel_fantasma" não é chave de ROLE_AUTHORITY.
const papelFantasma = ROLE_AUTHORITY["papel_fantasma"];
void papelFantasma;

// 4 · Os dois lados derivados não se misturam: papel de plataforma NUNCA é atribuível por
// tenant, e vice-versa — nos TIPOS, derivados por mapped type da mesma fonte.
// @ts-expect-error — platform_admin é "platform" no ROLE_AUTHORITY; não habita o lado tenant.
const plataformaNoLadoTenant: TenantAssignableRole = "platform_admin";
void plataformaNoLadoTenant;

// @ts-expect-error — manager é "tenant" no ROLE_AUTHORITY; não habita o lado plataforma.
const tenantNoLadoPlataforma: PlatformRole = "manager";
void tenantNoLadoPlataforma;

// 5 · Fixtures POSITIVAS (compilam hoje e devem continuar compilando): a classificação real.
const superAdminEhPlataforma: PlatformRole = "super_admin";
const tenantAdminEhAtribuivel: TenantAssignableRole = "tenant_admin";
void superAdminEhPlataforma;
void tenantAdminEhAtribuivel;
