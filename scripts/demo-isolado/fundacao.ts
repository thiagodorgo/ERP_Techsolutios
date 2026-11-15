// B-SAN3-10b-F4-SEED-ISOLADO — a FUNDACAO da demonstracao isolada (item 44 do portao).
//
// E a unica peca do bloco que fala com o banco. Ela cria, numa pilha descartavel, a organizacao de exemplo e o
// seu administrador PELOS SERVICOS DO PRODUTO (`PrismaCoreSaasService.createTenant` e `.createUser`), sem SQL,
// sem escrita direta de modelo e sem escrever credencial: a senha provisoria e a que o proprio `createUser`
// gera, e vai so para um arquivo do diretorio de saida de segredos (nunca para a saida do processo).
// Tudo o que vem depois (usuarios por papel, cadastros, OS, patio, financeiro) e do motor, pela API.
//
// Ordem das travas (Emenda 1.1 §9.5), todas fail-closed:
//   1. lista fechada de argumentos;
//   2. ambiente, banco (texto bruto, `new URL` e o parser do driver), Redis e projeto;
//   3. sonda de escrita no diretorio de saida;
//   4. trava de execucao unica por arquivo. Ate aqui: nenhuma conexao e nenhum `await`;
//   5. so entao o codigo do produto e carregado, e o alvo e reconferido;
//   6. censo das organizacoes e dos e-mails da plataforma (as duas primeiras leituras);
//   7. o arquivo com o id da plataforma (grava se faltar; compara sempre);
//   8. criacao, provisoria e a deteccao da provisoria perdida;
//   9. a pos-condicao (exatamente 1 organizacao e 1 administrador da fixture);
//  10. no `finally`: desconecta e solta a trava.
//
// Nenhum import estatico do codigo do produto, do cliente do banco nem do carregador de `.env`: o modulo do banco
// carrega o `.env` no import, e so o import dinamico respeita a ordem acima (Emenda 1.2, A4).
//
// Uso (dentro da rede do projeto isolado; a URL do servico nao passa pelo argv):
//   npx tsx scripts/demo-isolado/fundacao.ts --fixture <fixture.json> --saida-segredo <diretorio>
// Saida (uma linha por evento, sem segredo e sem URL): `FUNDACAO projeto=… banco=… fixture_sha256=…`,
// `FUNDACAO CENSO …`, `FUNDACAO FIM criados=<n> existentes=<n>` ou `FUNDACAO RECUSA <MOTIVO> …`.
// Codigos: 0 fim · 1 erro inesperado ou fixture invalida · 2 trava pura · 3 censo/estado · 4 segredo.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  ErroTrava,
  adquirirTrava,
  alvoMudou,
  avaliarAlvoBanco,
  avaliarArgumentos,
  avaliarCenso,
  avaliarPlataforma,
  exigirSenha,
  sondarSaida,
} from "./alvo.mjs";

type Org = { id: string; slug: string; name: string };
// Forma minima do cliente do banco que a fundacao usa (o tipo do produto nao e importado: ver o cabecalho).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Cliente = any;

export type Resultado = {
  readonly ok: boolean;
  readonly codigo: number;
  readonly motivo: string;
  readonly criados: number;
  readonly existentes: number;
};

export type OpcoesFundar = {
  readonly nome: string;
  readonly nomeAdmin: string;
  readonly emailAdmin: string;
  readonly dirSaida: string;
  // So o teste passa o gancho; a linha de comando nunca (nao nasce de argumento nem de variavel de ambiente).
  readonly aposCriar?: () => Promise<void>;
  readonly saida?: (linha: string) => void;
};

const ENTIDADES_DA_FUNDACAO = 2; // a organizacao e o seu administrador

const sair = (codigo: number, motivo: string): Resultado => ({ ok: codigo === 0, codigo, motivo, criados: 0, existentes: 0 });

export function posCondicaoOk(depois: { mesmas: number; admins: number }): boolean {
  return depois.mesmas === 1 && depois.admins === 1;
}

async function carregarProduto() {
  const [rls, servico, store, repos, modulos, credenciais] = await Promise.all([
    import("../../src/database/rls.js"),
    import("../../src/modules/core-saas/services/prisma-core-saas.service.js"),
    import("../../src/modules/core-saas/store/prisma-core-saas.store.js"),
    import("../../src/modules/core-saas/repositories/index.js"),
    import("../../src/modules/navigation/route-modules.js"),
    import("../../src/modules/auth/repositories/local-auth-credential.repository.js"),
  ]);
  return { rls, servico, store, repos, modulos, credenciais };
}

// O servico do produto com o store INJETADO no cliente recebido (o mesmo arranjo das suites -db do repositorio):
// na linha de comando o cliente e o do produto; no teste, o do banco proprio do teste.
function servicoDoProduto(produto: Awaited<ReturnType<typeof carregarProduto>>, client: Cliente) {
  const { repos } = produto;
  return new produto.servico.PrismaCoreSaasService(
    new produto.store.PrismaCoreSaasStore(
      client,
      new repos.TenantRepository(client),
      new repos.UserRepository(client),
      new repos.RoleRepository(client),
      new repos.UserRoleRepository(client),
      new repos.AuditLogRepository(client),
    ),
  );
}

// Travas 6 a 9. Supoe a trava de execucao unica ja pega por quem chama.
async function fundarComTrava(client: Cliente, opcoes: OpcoesFundar): Promise<Resultado> {
  const nome = opcoes.nome;
  const emailAdmin = opcoes.emailAdmin.trim().toLowerCase();
  const dirSaida = opcoes.dirSaida;
  const saida = opcoes.saida ?? ((linha: string) => console.log(linha));
  try {
    const produto = await carregarProduto();
    const { withTenantRls } = produto.rls;
    const svc = servicoDoProduto(produto, client);
    const lerOrgs = (): Promise<Org[]> => client.tenant.findMany({ select: { id: true, slug: true, name: true } });

    // 6) Censo. `tenants` nao tem RLS: e a mesma fonte do `/platform/overview`.
    const orgs = await lerOrgs();
    const plataforma = orgs.find((o) => o.slug === "platform");
    const emailsPlataforma: string[] = plataforma
      ? (
          await withTenantRls(client, plataforma.id, (tx: Cliente) =>
            tx.user.findMany({ where: { tenant_id: plataforma.id }, select: { email: true } }),
          )
        ).map((u: { email: string }) => u.email)
      : [];
    const outras = orgs.filter((o) => o.slug !== "platform" && o.name !== nome).length;
    const daFixture = orgs.filter((o) => o.name === nome).length;
    const foraDoInvalid = emailsPlataforma.filter((e) => !e.endsWith(".invalid")).length;
    saida(`FUNDACAO CENSO total=${orgs.length} estranhas=${outras} mesmas=${daFixture} plataforma_fora_de_invalid=${foraDoInvalid}`);
    const censo = avaliarCenso(orgs, nome, "fundacao");
    if (!censo.ok) return sair(censo.codigo, censo.motivo);
    const plataformaOk = avaliarPlataforma(emailsPlataforma);
    if (!plataformaOk.ok) return sair(plataformaOk.codigo, plataformaOk.motivo);
    if (!plataforma) return sair(3, "BASE_SEM_OP6");

    // 7) O id da plataforma, para o 1o login do motor. Nunca vai para a saida do processo.
    const arquivoTenant = path.join(dirSaida, "plataforma.tenant-id");
    if (!fs.existsSync(arquivoTenant)) fs.writeFileSync(arquivoTenant, plataforma.id, { flag: "wx", mode: 0o600 });
    if (fs.readFileSync(arquivoTenant, "utf8") !== plataforma.id) return sair(3, "SAIDA_DE_OUTRA_BASE");

    // 8) Criacao pelos servicos do produto. A provisoria e gravada na instrucao seguinte ao `createUser`.
    let criados = 0;
    let organizacao: Org | null = censo.existente;
    if (!organizacao) {
      organizacao = (await svc.createTenant({ name: nome, modules: [...produto.modulos.ALL_MODULE_CLASSES] })) as Org;
      criados += 1;
    }
    const tenantId = organizacao.id;
    const lerAdmins = (): Promise<Array<{ id: string }>> =>
      withTenantRls(client, tenantId, (tx: Cliente) =>
        tx.user.findMany({ where: { tenant_id: tenantId, email: emailAdmin }, select: { id: true } }),
      );
    const arquivoProvisoria = path.join(dirSaida, `${emailAdmin}.provisoria`);
    const admin = (await lerAdmins())[0];
    if (!admin) {
      const criado = await svc.createUser({ tenantId, name: opcoes.nomeAdmin, email: emailAdmin, roles: ["tenant_admin"] });
      fs.writeFileSync(arquivoProvisoria, exigirSenha(criado.temporaryPassword), { flag: "wx", mode: 0o600 });
      criados += 1;
    } else {
      const credencial = await withTenantRls(client, tenantId, (tx: Cliente) =>
        new produto.credenciais.LocalAuthCredentialRepository(tx).findByUserForTenant(admin.id, tenantId),
      );
      const pendente = !credencial || credencial.must_change_password === true;
      if (pendente && !fs.existsSync(arquivoProvisoria)) return sair(3, "PROVISORIA_PERDIDA");
      if (pendente && fs.statSync(arquivoProvisoria).size === 0) return sair(3, "PROVISORIA_PERDIDA");
    }

    // 9) Pos-condicao: uma 2a fundacao concorrente (outro diretorio de saida) nao passa calada.
    if (opcoes.aposCriar) await opcoes.aposCriar();
    const depois = { mesmas: (await lerOrgs()).filter((o) => o.name === nome).length, admins: (await lerAdmins()).length };
    if (!posCondicaoOk(depois)) return sair(3, "CORRIDA_DETECTADA");

    const existentes = ENTIDADES_DA_FUNDACAO - criados;
    saida(`FUNDACAO FIM criados=${criados} existentes=${existentes}`);
    return { ok: true, codigo: 0, motivo: "FIM", criados, existentes };
  } catch (erro) {
    if (erro instanceof ErroTrava) return sair(erro.codigo, erro.motivo);
    throw erro;
  }
}

// Ponto de entrada para o teste (e o nucleo da linha de comando): sonda e trava SINCRONAS, antes do 1o `await`.
export async function fundar(client: Cliente, opcoes: OpcoesFundar): Promise<Resultado> {
  const sonda = sondarSaida(opcoes.dirSaida);
  if (!sonda.ok) return sair(sonda.codigo, sonda.motivo);
  const trava = adquirirTrava(opcoes.dirSaida);
  if (!trava.ok) return sair(trava.codigo, trava.motivo);
  try {
    return await fundarComTrava(client, opcoes);
  } finally {
    trava.soltar();
  }
}

type Fixture = { readonly nome: string; readonly nomeAdmin: string; readonly emailAdmin: string; readonly sha256: string };

function lerFixture(caminho: string | undefined): Fixture | Resultado {
  if (!caminho) return sair(2, "ARGUMENTO_RECUSADO");
  let bytes: Buffer;
  let dado: { organizacao?: { nome?: unknown }; admin?: { nome?: unknown; email?: unknown } };
  try {
    bytes = fs.readFileSync(caminho);
    dado = JSON.parse(bytes.toString("utf8"));
  } catch {
    return sair(1, "FIXTURE_INVALIDA");
  }
  const nome = dado?.organizacao?.nome;
  const nomeAdmin = dado?.admin?.nome;
  const emailAdmin = dado?.admin?.email;
  if (typeof nome !== "string" || typeof nomeAdmin !== "string" || typeof emailAdmin !== "string") return sair(1, "FIXTURE_INVALIDA");
  if (!nome.trim() || !nomeAdmin.trim() || !emailAdmin.trim()) return sair(1, "FIXTURE_INVALIDA");
  return { nome, nomeAdmin, emailAdmin, sha256: createHash("sha256").update(bytes).digest("hex") };
}

const DICAS: Record<string, string> = {
  PROVISORIA_PERDIDA: "recrie a pilha: down -v",
  FUNDACAO_EM_CURSO: "se nenhuma fundacao esta rodando, apague o arquivo fundacao.trava ou recrie a pilha",
  SAIDA_DE_OUTRA_BASE: "o diretorio de saida e de outra pilha: recrie-o vazio",
};

// A linha de comando. Devolve o resultado; quem imprime a recusa e o codigo de saida e `principal`.
async function executar(): Promise<Resultado> {
  const argumentos = avaliarArgumentos(process.argv.slice(2));
  if (!argumentos.ok) return sair(argumentos.codigo, argumentos.motivo);
  const veredito = avaliarAlvoBanco(process.env);
  if (!veredito.ok) return sair(veredito.codigo, veredito.motivo);
  const avaliado = { DATABASE_URL: process.env.DATABASE_URL, REDIS_URL: process.env.REDIS_URL };
  const dirSaida: string | undefined = argumentos.lido["--saida-segredo"];
  const sonda = sondarSaida(dirSaida);
  if (!sonda.ok) return sair(sonda.codigo, sonda.motivo);
  const fixture = lerFixture(argumentos.lido["--fixture"]);
  if ("codigo" in fixture) return fixture;
  const trava = adquirirTrava(dirSaida as string);
  if (!trava.ok) return sair(trava.codigo, trava.motivo);
  let client: Cliente;
  try {
    const banco = new URL(String(avaliado.DATABASE_URL)).pathname.slice(1);
    console.log(`FUNDACAO projeto=${process.env.DEMO_ISOLADO_PROJETO} banco=${banco} fixture_sha256=${fixture.sha256}`);
    ({ prisma: client } = await import("../../src/database/prisma.js"));
    if (alvoMudou(process.env, avaliado)) return sair(2, "ALVO_MUDOU");
    return await fundarComTrava(client, {
      nome: fixture.nome,
      nomeAdmin: fixture.nomeAdmin,
      emailAdmin: fixture.emailAdmin,
      dirSaida: dirSaida as string,
    });
  } finally {
    if (client) await client.$disconnect();
    trava.soltar();
  }
}

function nomeDoErro(erro: unknown): string {
  const codigo = (erro as { code?: unknown })?.code;
  if (typeof codigo === "string" && /^[A-Za-z0-9_]{1,40}$/.test(codigo)) return codigo;
  const nome = (erro as { name?: unknown })?.name;
  return typeof nome === "string" && /^[A-Za-z0-9_]{1,60}$/.test(nome) ? nome : "desconhecido";
}

async function principal(): Promise<void> {
  let resultado: Resultado;
  try {
    resultado = await executar();
  } catch (erro) {
    // Nunca a mensagem: ela pode carregar host ou corpo de resposta. So o codigo ou o nome do erro.
    console.log(`FUNDACAO ERRO ${nomeDoErro(erro)}`);
    process.exit(1);
  }
  if (!resultado.ok) {
    const dica = DICAS[resultado.motivo];
    console.log(`FUNDACAO RECUSA ${resultado.motivo}${dica ? ` (${dica})` : ""}`);
  }
  process.exit(resultado.codigo);
}

const invocado = String(process.argv[1] ?? "").split("\\").join("/");
if (invocado.endsWith("scripts/demo-isolado/fundacao.ts")) {
  await principal();
}
