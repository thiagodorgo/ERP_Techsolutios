import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import ts from "typescript";

// -----------------------------------------------------------------------------------------------
// B-SAN3-21 (item 49 do gate, `P-028` + `P-Ω3F2B-ACENTOS`) — GUARD DE ACENTUAÇÃO DOS TEXTOS DA WEB.
//
// O QUE ELE AFIRMA: nenhum literal de texto de `frontend/src/**/*.{ts,tsx}` carrega uma palavra da
// lista fechada abaixo na grafia SEM acento. O critério é 0 ocorrências; ao falhar, lista
// arquivo:linha, a palavra e a grafia correta.
//
// COMO ELE LÊ: pela AST do TypeScript (`ts.createSourceFile`, só sintaxe), nunca por regex sobre o
// arquivo inteiro. Entram só os nós de TEXTO: `StringLiteral`, `NoSubstitutionTemplateLiteral`, as
// partes de template (`TemplateHead`/`Middle`/`Tail`) e o `JsxText`. Identificador, nome de tipo e
// chave de objeto sem aspas não são nós de texto, então não chegam ao detector (`situacaoX`,
// `{ situacao: 1 }`). Ficam fora, além disso, três posições que são texto na sintaxe mas nunca são
// exibidas: o especificador de `import`/`export`, o tipo literal (`type S = "Nao"`) e a chave de
// objeto entre aspas (`{ "Nao": 1 }`).
//
// AS DUAS REGRAS DE FRONTEIRA (medidas na `origin/main` 7c89c73b, relatório do dev, fatia 1):
//   (a) a palavra não pode vir colada a letra, dígito, `_`, `-`, `/`, `.`, `@` ou `#` antes, nem a
//       letra, dígito, `_`, `-` ou `/` depois. Isso tira rota (`/patios/patios`), classe CSS
//       (`comprovante-liberacao-print`), `@media print` e chave com ponto (`techsol.aparencia`). O
//       ponto DEPOIS da palavra continua valendo, porque é fim de frase ("...a evidencia.").
//   (b) a forma MINÚSCULA só conta em literal com mais de uma palavra (frase). Literal de uma palavra
//       só e minúsculo é chave na medição (`"situacao"` 15×, `"concluida"` 9×, `"movimentacoes"` 10×,
//       `"historico"` 5×: ordenação, status, aba), e o bloco não pode trocar chave (§2 do plano). A
//       forma com MAIÚSCULA inicial conta em qualquer literal: na medição, todas eram rótulo.
//
// LISTA FECHADA: a do §3 do plano (`TERMOS_DO_PLANO`) mais o que o dev mediu (`TERMOS_MEDIDOS`).
// Retirar termo exige uma linha de justificativa aqui. Nenhum foi retirado.
//
// EXCEÇÃO NOMEADA (`TEXTO_QUE_E_CHAVE`): texto que é também chave de comparação no código. Trocar a
// grafia ali muda comportamento (§4 do plano: pare e registre). A exceção é por LITERAL EXATO e é
// fail-closed nos dois sentidos: um literal novo com a mesma palavra acusa, e uma exceção que não
// casa mais com nada faz o guard falhar (exceção morta não fica no arquivo).
// -----------------------------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const FRONTEND_SRC = "frontend/src";

/** §3 do plano, na ordem dele. Chave = grafia sem acento; valor = grafia correta. */
const TERMOS_DO_PLANO: Readonly<Record<string, string>> = {
  Situacao: "Situação",
  Nao: "Não",
  Configuracoes: "Configurações",
  Configuracao: "Configuração",
  Operacao: "Operação",
  Operacoes: "Operações",
  Saude: "Saúde",
  Visao: "Visão",
  Descricao: "Descrição",
  Endereco: "Endereço",
  Servico: "Serviço",
  Servicos: "Serviços",
  Orcamento: "Orçamento",
  Orcamentos: "Orçamentos",
  Usuario: "Usuário",
  Usuarios: "Usuários",
  Organizacao: "Organização",
  Organizacoes: "Organizações",
  Permissao: "Permissão",
  Permissoes: "Permissões",
  Informacoes: "Informações",
  Acao: "Ação",
  Acoes: "Ações",
  Historico: "Histórico",
  Inicio: "Início",
  Numero: "Número",
  Concluido: "Concluído",
  Pendencia: "Pendência",
  Pendencias: "Pendências",
  Responsavel: "Responsável",
  Veiculo: "Veículo",
  Veiculos: "Veículos",
  Patio: "Pátio",
  Patios: "Pátios",
  Liberacao: "Liberação",
  Cobranca: "Cobrança",
  Cobrancas: "Cobranças",
  Codigo: "Código",
  Titulo: "Título",
  Titulos: "Títulos",
  Analise: "Análise",
  Relatorio: "Relatório",
  Relatorios: "Relatórios",
  Proximo: "Próximo",
  Ultimo: "Último",
  Periodo: "Período",
  Comissao: "Comissão",
  Conciliacao: "Conciliação",
  Emissao: "Emissão",
  Atencao: "Atenção",
  Media: "Média",
  Critico: "Crítico",
  Area: "Área",
  Metodo: "Método",
  Validacao: "Validação",
  Remocao: "Remoção",
  Exclusao: "Exclusão",
  Aprovacao: "Aprovação",
  Solicitacao: "Solicitação",
  Movimentacao: "Movimentação",
  Transacao: "Transação",
  Avaliacao: "Avaliação",
  Medicao: "Medição",
  Conclusao: "Conclusão",
  Atualizacao: "Atualização",
  Notificacao: "Notificação",
  Notificacoes: "Notificações",
};

/**
 * Acrescentados pelo dev, cada um medido em literal exibido na `origin/main` 7c89c73b (relatório,
 * fatia 1: o vocabulário acentuado do próprio `frontend/src` cruzado com os literais sem acento).
 */
const TERMOS_MEDIDOS: Readonly<Record<string, string>> = {
  Evidencia: "Evidência",
  Evidencias: "Evidências",
  Execucao: "Execução",
  Divergencia: "Divergência",
  Ciencia: "Ciência",
  Comparacao: "Comparação",
  Sessao: "Sessão",
  Manutencao: "Manutenção",
  Inspecao: "Inspeção",
  Identificacao: "Identificação",
  Criacao: "Criação",
  Edicao: "Edição",
  Autenticacao: "Autenticação",
  Autorizacao: "Autorização",
  Navegacao: "Navegação",
  Observacao: "Observação",
  Localizacao: "Localização",
  Selecao: "Seleção",
  Validacoes: "Validações",
  Refrigeracao: "Refrigeração",
  Versao: "Versão",
  Pressao: "Pressão",
  Contingencia: "Contingência",
  Critica: "Crítica",
  Tecnico: "Técnico",
  Tecnica: "Técnica",
  Logistica: "Logística",
  Logistico: "Logístico",
  Sintetico: "Sintético",
  Utilitario: "Utilitário",
  Caminhao: "Caminhão",
  Condominio: "Condomínio",
  Modulo: "Módulo",
  Atribuido: "Atribuído",
  Atribuida: "Atribuída",
  Atribuidos: "Atribuídos",
  Atribuidas: "Atribuídas",
  Reatribuido: "Reatribuído",
  Concluida: "Concluída",
  Concluidos: "Concluídos",
  Concluidas: "Concluídas",
  Possivel: "Possível",
  Disponivel: "Disponível",
  Indisponivel: "Indisponível",
  Aplicavel: "Aplicável",
  Compativel: "Compatível",
  Auditavel: "Auditável",
  Faturavel: "Faturável",
  Obrigatorio: "Obrigatório",
  Obrigatoria: "Obrigatória",
  Obrigatorios: "Obrigatórios",
  Obrigatorias: "Obrigatórias",
  Invalido: "Inválido",
  Invalida: "Inválida",
  Invalidos: "Inválidos",
  Necessaria: "Necessária",
  Aparecerao: "Aparecerão",
  Podera: "Poderá",
  Sera: "Será",
  Ate: "Até",
  Ja: "Já",
  Sao: "São",
  Faca: "Faça",
};

/**
 * Formas minúsculas que NÃO entram: a grafia minúscula é outra palavra correta em PT-BR.
 * `faca` (a lâmina) é palavra própria; só `Faca` (de "Faça login") é erro.
 */
const SEM_FORMA_MINUSCULA: ReadonlySet<string> = new Set(["Faca"]);

/**
 * Texto que é também chave de comparação (§4 do plano). Fica sem acento neste bloco e está registrado
 * no relatório do dev com o motivo. Literal EXATO, nunca palavra solta.
 */
const TEXTO_QUE_E_CHAVE: Readonly<Record<string, string>> = {
  "Operador Logistico":
    "nome de perfil comparado no código: `roles.includes(\"Operador Logistico\")` em layouts/appSidebarNav.ts, " +
    "`allowedRoles` de navigation/tenantNavigation.ts e o tipo `Role` de modules/auth/types.ts",
};

type Termo = { semAcento: string; correto: string; minuscula: boolean };

function construirTermos(): Termo[] {
  const termos: Termo[] = [];
  for (const [semAcento, correto] of Object.entries({ ...TERMOS_DO_PLANO, ...TERMOS_MEDIDOS })) {
    termos.push({ semAcento, correto, minuscula: false });
    if (!SEM_FORMA_MINUSCULA.has(semAcento)) {
      termos.push({ semAcento: semAcento.toLowerCase(), correto: correto.toLowerCase(), minuscula: true });
    }
  }
  return termos;
}

const TERMOS = construirTermos();
const POR_GRAFIA = new Map(TERMOS.map((termo) => [termo.semAcento, termo]));
const DETECTOR = new RegExp(
  String.raw`(?<![\p{L}\p{N}_\-./@#])(` +
    TERMOS.map((termo) => termo.semAcento).join("|") +
    String.raw`)(?![\p{L}\p{N}_\-/])`,
  "gu",
);

export type Ocorrencia = { arquivo: string; linha: number; termo: string; correto: string; literal: string };

type Varredura = { ocorrencias: Ocorrencia[]; literais: number; excecoesUsadas: Set<string> };

function textoDoNo(node: ts.Node, sf: ts.SourceFile): string | null {
  if (
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isTemplateHead(node) ||
    ts.isTemplateMiddle(node) ||
    ts.isTemplateTail(node)
  ) {
    return node.text;
  }
  if (node.kind === ts.SyntaxKind.JsxText) return node.getText(sf);
  return null;
}

function posicaoNaoExibida(node: ts.Node): boolean {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node) || ts.isLiteralTypeNode(node)) return true;
  if (ts.isExternalModuleReference(node)) return true;
  return false;
}

function ehChaveEntreAspas(node: ts.Node): boolean {
  const parent = node.parent;
  if (!parent) return false;
  return (
    (ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent) || ts.isMethodDeclaration(parent)) &&
    parent.name === node
  );
}

/** Varre UM arquivo-fonte (real ou fixture). Exportada para os controles deste arquivo. */
export function varrerFonte(arquivo: string, texto: string): Varredura {
  const kind = arquivo.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(arquivo, texto, ts.ScriptTarget.Latest, true, kind);
  const resultado: Varredura = { ocorrencias: [], literais: 0, excecoesUsadas: new Set() };

  const visitar = (node: ts.Node): void => {
    if (posicaoNaoExibida(node)) return;
    const literal = textoDoNo(node, sf);
    if (literal !== null && !ehChaveEntreAspas(node)) {
      resultado.literais += 1;
      const frase = /\s/u.test(literal.trim());
      const linha = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
      DETECTOR.lastIndex = 0;
      for (const match of literal.matchAll(DETECTOR)) {
        const termo = POR_GRAFIA.get(match[1]);
        if (!termo) continue;
        if (termo.minuscula && !frase) continue;
        if (Object.hasOwn(TEXTO_QUE_E_CHAVE, literal)) {
          resultado.excecoesUsadas.add(literal);
          continue;
        }
        resultado.ocorrencias.push({ arquivo, linha, termo: termo.semAcento, correto: termo.correto, literal });
      }
    }
    ts.forEachChild(node, visitar);
  };
  visitar(sf);
  return resultado;
}

function listarFontes(relativo: string): string[] {
  const saida: string[] = [];
  for (const nome of readdirSync(path.join(ROOT, relativo))) {
    const rel = path.posix.join(relativo, nome);
    if (statSync(path.join(ROOT, rel)).isDirectory()) saida.push(...listarFontes(rel));
    else if (/\.tsx?$/.test(nome)) saida.push(rel);
  }
  return saida.sort();
}

function formatar(ocorrencias: readonly Ocorrencia[]): string {
  return ocorrencias
    .map((o) => `  ${o.arquivo}:${o.linha}  "${o.termo}" -> "${o.correto}"  em ${JSON.stringify(o.literal.trim().slice(0, 80))}`)
    .join("\n");
}

test("B-SAN3-21: nenhum texto de frontend/src tem palavra da lista sem acento (critério: 0)", () => {
  const fontes = listarFontes(FRONTEND_SRC);
  const ocorrencias: Ocorrencia[] = [];
  const excecoesUsadas = new Set<string>();
  let literais = 0;
  for (const arquivo of fontes) {
    const varredura = varrerFonte(arquivo, readFileSync(path.join(ROOT, arquivo), "utf8"));
    ocorrencias.push(...varredura.ocorrencias);
    literais += varredura.literais;
    for (const excecao of varredura.excecoesUsadas) excecoesUsadas.add(excecao);
  }

  // Universo não vazio: um caminho errado ou uma extração quebrada não pode dar verde por vacuidade.
  assert.ok(fontes.length >= 300, `universo encolheu: ${fontes.length} arquivos em ${FRONTEND_SRC}`);
  assert.ok(literais >= 20000, `extração encolheu: ${literais} literais de texto`);
  console.log(`[B-SAN3-21] arquivos=${fontes.length} literais=${literais} termos=${TERMOS.length} ocorrencias=${ocorrencias.length}`);

  assert.equal(
    ocorrencias.length,
    0,
    `${ocorrencias.length} ocorrência(s) sem acento em texto da web:\n${formatar(ocorrencias)}`,
  );

  const mortas = Object.keys(TEXTO_QUE_E_CHAVE).filter((excecao) => !excecoesUsadas.has(excecao));
  assert.deepEqual(mortas, [], `exceção que não casa mais com nenhum literal (remova-a): ${mortas.join(", ")}`);
});

test("B-SAN3-21: controle de falso positivo — identificador, chave, tipo, import, rota e CSS não acusam", () => {
  const fixture = [
    'import { Configuracoes } from "./Configuracoes/Nao";',
    'export * from "../patios/Situacao";',
    "const situacaoX = 1;",
    "const Nao = situacaoX;",
    "const objeto = { situacao: 1, Nao: 2, \"Nao\": 3, 'Configuracoes': 4 };",
    'type Status = "Nao" | "Concluida" | "Operador Logistico";',
    'const ordenacao = "situacao";',
    'const status = "concluida";',
    'const rota = "/patios/patios";',
    'const chave = "techsol.aparencia";',
    'const css = `@media print { .comprovante-liberacao-print { display: none; } }`;',
    'const aba = "informacoes-gerais";',
    "// Nao foi possivel: comentário não é nó de texto",
    "/* Configuracoes */",
    "export const x = objeto[\"situacao\"] ?? Nao;",
  ].join("\n");
  const varredura = varrerFonte("fixture/falso-positivo.ts", fixture);
  assert.deepEqual(varredura.ocorrencias, [], `falso positivo:\n${formatar(varredura.ocorrencias)}`);
  assert.ok(varredura.literais >= 5, `a fixture precisa exercitar literais de verdade (${varredura.literais})`);
});

test("B-SAN3-21: controle positivo — as formas do M1 e do M2 acusam", () => {
  const fixture = [
    'export const m1 = "Nao";',
    "export function M2() { return <p>Configuracoes</p>; }",
    "export const frase = `${1} notificacoes nao lidas`;",
    'export const fim = "Nao foi possivel baixar a evidencia.";',
    'export const perfil = "Operador Logistico";',
    'export const painel = "Painel Logistico";',
  ].join("\n");
  const varredura = varrerFonte("fixture/positivo.tsx", fixture);
  const achados = varredura.ocorrencias.map((o) => `${o.linha}:${o.termo}`).sort();
  assert.deepEqual(achados, [
    "1:Nao",
    "2:Configuracoes",
    "3:nao",
    "3:notificacoes",
    "4:Nao",
    "4:evidencia",
    "4:possivel",
    "6:Logistico",
  ].sort());
  // A exceção é por literal EXATO: "Operador Logistico" passa, "Painel Logistico" acusa.
  assert.deepEqual([...varredura.excecoesUsadas], ["Operador Logistico"]);
});
