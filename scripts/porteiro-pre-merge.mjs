#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const MARKER = 'erp-porteiro-attestation:v1';
const CONTEXT = 'erp/porteiro-pre-merge';
const SHA40 = /^[0-9a-f]{40}$/;
// Evidencia de reexecucao conferivel: o blob deste arquivo NO HEAD. O gate confere o digest contra
// o blob real via API — um porteiro que nao olhou o head nao tem como produzi-lo por conta propria.
const KPI_LATEST_PATH = 'Kpis/kpis-latest.json';
// Vereditos que NAO autorizam merge. Existem para deixar RASTRO EXTERNO do "nao".
const VEREDITOS_NEGATIVOS = ['BLOQUEADO', 'RESSALVA'];

// PD-GOV-PORTEIRO-APPID (docs/omega-pd.md, 2026-08-22 — 14 fontes, 4 primarias).
// `GET https://api.github.com/apps/github-actions` responde SEM autenticacao com:
//   id 15368 · slug github-actions · owner.login github / owner.id 9919 · created_at 2018-07-30.
// Id GLOBAL do host: identico em orgs distintas (medido em actions/checkout e microsoft/vscode;
// Azure Pipelines aparece como 9426 no mesmo payload). O objeto `app` NAO existe no corpo do
// POST /check-runs — so na resposta, preenchido pelo servidor a partir do token.
// RESSALVA DECLARADA PELA PD: nenhuma fonte oficial promete estabilidade contratual desse numero;
// ele e observavel, nao documentado como constante. Por isso existe o override — que TAMBEM prova.
// LIMITE QUE MUDA A LEITURA: isto prova "foi o app GitHub Actions", NAO prova "foi o job do
// porteiro". `permissions: checks: write` e declarado POR WORKFLOW, nao por repositorio, entao um
// check homonimo publicado por outro workflow DESTE repositorio carrega a mesma identidade de app.
// E nao da para desempatar depois: PD-GOV-PORTEIRO-PROVENIENCIA (docs/omega-pd.md, 24 respostas
// reais da API) mediu que a cadeia check-run -> check-suite -> workflow run devolve DADO FALSO para
// check criado por `POST /check-runs`. Derivar `path` por ela esta VETADO na lei. O residuo fica
// ABERTO e e mitigado pela escalada de superficie de governanca (abaixo) e pela reexecucao do
// porteiro sobre o diff.
export const APP_GITHUB_ACTIONS = { id: 15368, slug: 'github-actions', ownerId: 9919 };

// ---------------------------------------------------------------------------
// SUPERFICIE DE GOVERNANCA — escalada obrigatoria para junta critica 5/5.
//
// Motivo (achado central da PD-GOV-PORTEIRO-APPID): `app.id === 15368` prova "foi o GitHub
// Actions", NAO prova "foi o job do porteiro". Qualquer workflow DESTE repositorio com
// `checks: write` publica check-run com o mesmo app id. O pin fecha PAT/usuario, app de terceiro e
// outra integracao; nao fecha workflow acrescentado ou alterado dentro do proprio repositorio.
//
// O controle que fecha o vetor principal e de processo, e mecanico: diff que toque a superficie
// abaixo so passa com `junta.critical === true` (5 votantes distintos e unanimes, ja conferido por
// validateJunta). Como TODO merge passa por este gate, workflow malicioso nao entra por fora.
const SCRIPTS_GATE = [
  'scripts/porteiro-pre-merge.mjs', 'scripts/merge-authorized-pr.mjs', 'scripts/post-merge-finalize.mjs',
  'scripts/configure-main-ruleset.mjs', 'scripts/sync-agent-agents.mjs', 'scripts/sync-agent-skills.mjs',
];
const TESTES_GOVERNANCA = ['tests/porteiro-pre-merge-governance.test.ts', 'tests/agent-model-routing.test.ts'];
const PREFIXOS_GOVERNANCA = ['.github/workflows/', '.github/rulesets/', '.claude/agents/', '.agents/agents/'];
const ARQUIVOS_GOVERNANCA = new Set(['.gitattributes', 'CLAUDE.md', 'AGENTS.md', ...SCRIPTS_GATE, ...TESTES_GOVERNANCA]);

export function pathsDeGovernanca(files) {
  const hit = (p) => ARQUIVOS_GOVERNANCA.has(p) || PREFIXOS_GOVERNANCA.some((x) => p.startsWith(x));
  return [...new Set((files || []).filter((p) => nonEmpty(p) && hit(p)))].sort();
}

// A API de files do PR e PAGINADA. Truncar abriria exatamente o buraco que a escalada fecha:
// bastaria empurrar o workflow para a pagina 2. Coleta ate a pagina incompleta e inclui
// `previous_filename` — rename PARA FORA da superficie tambem tem de contar.
export function coletarPaths(fetchPage, porPagina = 100) {
  const paths = [];
  for (let page = 1; page <= 300; page += 1) {
    const lote = fetchPage(page);
    if (!Array.isArray(lote)) fail('resposta inesperada da API de files do PR');
    for (const f of lote) {
      if (nonEmpty(f?.filename)) paths.push(f.filename);
      if (nonEmpty(f?.previous_filename)) paths.push(f.previous_filename);
    }
    if (lote.length < porPagina) return [...new Set(paths)].sort();
  }
  return fail('paginação de files do PR excedeu o limite seguro');
}

// Cross-check triplo sobre o objeto `app` da RESPOSTA do check-run. `owner.id` em vez de
// `owner.login` porque login e renomeavel e o id nao. Divergencia em qualquer campo = fail-closed.
// O NOME DIZ O QUE A EXECUCAO PROVA, e so isso: que o check foi CRIADO PELO APP GitHub Actions,
// com id, slug e owner.id conferidos (D-11). O nome anterior prometia "fonte confiavel" do check —
// propriedade que a execucao NAO produz; num ciclo cujo tema e "artefato que afirma o que a
// execucao nao entrega", a tabela de simbolos nao podia ser a excecao. E condicao necessaria,
// nunca suficiente: passar neste cross-check nao diz QUAL workflow publicou o check. Ver
// PD-GOV-PORTEIRO-APPID e PD-GOV-PORTEIRO-PROVENIENCIA (docs/omega-pd.md).
export function assertCriadoPeloAppGitHubActions(app, expectedAppId) {
  if (!Number.isInteger(expectedAppId) || expectedAppId <= 0) fail('fonte confiável esperada não resolvida');
  if (!app || typeof app !== 'object' || Array.isArray(app)) fail('resposta sem objeto `app`: fonte do status não comprovada');
  if (app.id !== expectedAppId) fail(`status criado por app id ${app.id ?? 'ausente'}; fonte confiável esperada é ${expectedAppId}`);
  if (app.slug !== APP_GITHUB_ACTIONS.slug) fail(`status criado por app slug ${app.slug ?? 'ausente'}; fonte confiável esperada é ${APP_GITHUB_ACTIONS.slug}`);
  if (app.owner?.id !== APP_GITHUB_ACTIONS.ownerId) fail(`status criado por owner.id ${app.owner?.id ?? 'ausente'}; fonte confiável esperada é ${APP_GITHUB_ACTIONS.ownerId}`);
  return true;
}

// Caminho rapido: o literal do YAML tem de bater com o pin do codigo — dois lugares que se conferem.
// Caminho de override (existe SO para o cenario "o GitHub mudou o id"): o valor overridado tambem
// prova contra o REGISTRO GLOBAL do app antes de ser aceito. OVERRIDE QUE NAO PROVA = VERMELHO.
// O override nao pode ser canal de afrouxamento silencioso.
export function resolveExpectedAppId({ literal, override, registro }) {
  const lit = Number(literal);
  if (!Number.isInteger(lit) || lit <= 0) fail('ERP_PORTEIRO_EXPECTED_APP_ID positivo é obrigatório; fonte não comprovada');
  if (!nonEmpty(override === undefined || override === null ? '' : String(override))) {
    if (lit !== APP_GITHUB_ACTIONS.id) fail(`ERP_PORTEIRO_EXPECTED_APP_ID (${lit}) diverge do app id fixado pela PD-GOV-PORTEIRO-APPID (${APP_GITHUB_ACTIONS.id})`);
    return lit;
  }
  const ov = Number(override);
  if (!Number.isInteger(ov) || ov <= 0) fail('ERP_PORTEIRO_APP_ID_OVERRIDE precisa ser inteiro positivo');
  if (!registro || typeof registro !== 'object' || Array.isArray(registro)) fail('override sem o registro global do app: prova ausente');
  if (registro.slug !== APP_GITHUB_ACTIONS.slug) fail(`registro global consultado não é ${APP_GITHUB_ACTIONS.slug}: override não provado`);
  if (registro.owner?.id !== APP_GITHUB_ACTIONS.ownerId) fail(`registro global com owner.id ${registro.owner?.id ?? 'ausente'}: override não provado`);
  if (registro.id !== ov) fail(`override ${ov} não confere com o registro global do app (${registro.id ?? 'ausente'}): override que não prova é vermelho`);
  return ov;
}

export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((k) => [k, canonical(value[k])]));
  return value;
}
export const digest = (value) => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(canonical(value))).digest('hex');
const fail = (message) => { throw new Error(message); };
const nonEmpty = (value) => typeof value === 'string' && value.trim() !== '';
const arg = (name, fallback = undefined) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : fallback; };
const gh = (args, input = undefined) => JSON.parse(execFileSync('gh', args, { cwd: ROOT, input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }));
export const repoContext = () => {
  const info = gh(['repo', 'view', '--json', 'nameWithOwner,defaultBranchRef']);
  const repo = info.nameWithOwner;
  const defaultBranch = info.defaultBranchRef?.name;
  if (!nonEmpty(repo) || !nonEmpty(defaultBranch)) fail('repositório ou branch default não resolvidos pelo GitHub');
  return { repo, defaultBranch };
};

// ---------------------------------------------------------------------------
// NORMALIZACAO UNICA de check-runs + commit statuses (D-10).
//
// Existia em TRES copias — `liveState` aqui, `merge-authorized-pr.mjs` e
// `configure-main-ruleset.mjs:sources` — e as copias JA TINHAM DIVERGIDO: duas usavam
// `creator.id` cru, esta usava o condicional de Bot. O mesmo commit status normalizado de dois
// jeitos produz snapshot diferente, e o compare-and-swap do merge acusa "snapshot ... mudou" sem
// que nada tenha mudado. O defeito era fail-closed (falso-vermelho, nunca gate aberto) — mas
// falso-vermelho recorrente no CAS ENSINA O OPERADOR A DESCONFIAR DO GATE e a re-rodar ate passar,
// e isso e degradacao real. Por isso a correcao e UMA funcao exportada, nao tres linhas iguais:
// igualar as copias deixaria a divergencia voltar no ciclo seguinte, porque a causa-raiz e a
// triplicacao, nao o valor.
//
// ERRO DE CATEGORIA que a unificacao corrige: `creator.id` de um commit status e id de
// USUARIO-bot (`github-actions[bot]` = 41898282), enquanto o `integration_id` do ruleset e id de
// APP (`github-actions` = 15368). Sao entidades distintas em numeracoes distintas; escrever o id
// de usuario no campo `appId` compara maca com laranja. A consequencia e INTENCIONAL e
// fail-closed: um commit status nunca satisfaz um check requerido com `integration_id` fixado —
// o matching de `buildSnapshot` exige igualdade estrita e o pin do template e sempre id de app.
// Criador que nao e Bot nem chega a candidato: vira `null`, e `null` nunca e curinga.
export function normalizarChecks(checkRuns, statuses) {
  return [
    ...(checkRuns || []).map((c) => ({ context: c.name, appId: c.app?.id ?? null, conclusion: c.conclusion, detailsUrl: c.html_url ?? null })),
    ...(statuses || []).map((s) => ({ context: s.context, appId: s.creator?.type === 'Bot' ? s.creator?.id ?? null : null, conclusion: s.state === 'success' ? 'success' : s.state, detailsUrl: s.target_url ?? null })),
  ];
}

// Regras que o ruleset da branch default PRECISA conter para que "main usa ruleset ativo/strict"
// signifique alguma coisa. Sem `pull_request` não há PR obrigatório; sem `deletion`/
// `non_fast_forward` a branch pode ser apagada ou reescrita por trás do gate.
const REGRAS_OBRIGATORIAS = ['pull_request', 'deletion', 'non_fast_forward'];

// Um ruleset só governa a branch default se for de branch E a incluir explicitamente. Ruleset
// apontado para outra branch (ou que exclua a default) é DESCARTADO — nunca satisfaz o gate.
export function aplicaSeABranchDefault(ruleset, defaultBranch) {
  if (ruleset?.target !== 'branch') return false;
  const refs = [`refs/heads/${defaultBranch}`, '~DEFAULT_BRANCH'];
  const include = ruleset?.conditions?.ref_name?.include;
  const exclude = ruleset?.conditions?.ref_name?.exclude || [];
  if (!Array.isArray(include) || !include.some((x) => refs.includes(x))) return false;
  if (Array.isArray(exclude) && exclude.some((x) => refs.includes(x))) return false;
  return true;
}

function requiredChecks(rulesets, defaultBranch) {
  if (!nonEmpty(defaultBranch)) fail('branch default do repositório é obrigatória para conferir o ruleset');
  const active = rulesets.filter((r) => r.enforcement === 'active');
  const bypass = active.flatMap((r) => r.bypass_actors || []);
  if (bypass.length) fail('ruleset ativo contém bypass actor');
  const applicable = active.filter((r) => aplicaSeABranchDefault(r, defaultBranch));
  if (!applicable.length) fail(`nenhum ruleset ativo se aplica à branch default (${defaultBranch})`);
  const types = new Set(applicable.flatMap((r) => (r.rules || []).map((x) => x.type)));
  for (const t of REGRAS_OBRIGATORIAS) if (!types.has(t)) fail(`ruleset da branch default não exige a regra obrigatória: ${t}`);
  const required = [];
  let strict = false;
  for (const ruleset of applicable) for (const rule of ruleset.rules || []) {
    if (rule.type !== 'required_status_checks') continue;
    strict ||= rule.parameters?.strict_required_status_checks_policy === true;
    for (const item of rule.parameters?.required_status_checks || []) {
      // integration_id ausente/null era curinga: qualquer fonte verde satisfazia o check requerido.
      if (!Number.isInteger(item.integration_id) || item.integration_id <= 0) fail(`check requerido sem fonte confiável resolvida (integration_id): ${item.context}`);
      required.push({ context: item.context, appId: item.integration_id });
    }
  }
  if (!strict) fail('ruleset não exige atualização estrita da base');
  if (!required.some((r) => r.context === CONTEXT)) fail(`ruleset não requer ${CONTEXT}`);
  return required.sort((a, b) => `${a.context}:${a.appId}`.localeCompare(`${b.context}:${b.appId}`));
}

// Conjunto canônico de alçadas ocupadas pela junta. NÃO usa `.filter(Boolean)`: alçada omitida é
// erro (validateJunta), nunca colisão apagada em silêncio. Esta lista vai para o snapshot e é a
// única fonte de verdade de independência — o porteiro deixou de declarar a própria independência.
export function juntaIdentities(junta) {
  const entries = [
    ['origin', junta?.origin], ['planner', junta?.planner], ['developer', junta?.developer],
    ...(junta?.fabrica ? [['fabrica', junta.fabrica]] : []),
    ...(Array.isArray(junta?.votes) ? junta.votes.map((v, i) => [`vote:${String(i).padStart(2, '0')}`, v?.agentId]) : []),
  ];
  return entries
    .map(([role, agentId]) => ({ role, agentId: typeof agentId === 'string' ? agentId : null }))
    .sort((a, b) => `${a.role} ${a.agentId}`.localeCompare(`${b.role} ${b.agentId}`));
}

export function validateJunta(junta) {
  if (!junta || junta.marker !== 'erp-junta-attestation:v1') fail('junta externa v1 ausente');
  if (junta.result !== 'APROVADO') fail('junta não aprovada');
  for (const role of ['origin', 'planner', 'developer']) {
    if (!nonEmpty(junta[role])) fail(`alçada obrigatória da junta ausente ou vazia: ${role}`);
  }
  if (!Object.prototype.hasOwnProperty.call(junta, 'fabrica')) fail('campo fabrica obrigatório na junta (null quando não houve fábrica)');
  if (junta.fabrica !== null && !nonEmpty(junta.fabrica)) fail('fabrica precisa ser null ou identidade não vazia');
  if (typeof junta.critical !== 'boolean') fail('campo critical booleano é obrigatório na junta');
  if (!Array.isArray(junta.votes) || junta.votes.length < 3) fail('junta tem menos de três votos');
  if (junta.votes.some((v) => !v || v.vote !== 'APROVADO' || !nonEmpty(v.agentId))) fail('voto ausente ou não aprovado');
  if (junta.critical && junta.votes.length < 5) fail('decisão crítica exige cinco votantes distintos e unânimes');
  const ids = juntaIdentities(junta).map((x) => x.agentId);
  if (ids.some((x) => !nonEmpty(x))) fail('identidade vazia em alçada da junta');
  if (new Set(ids).size !== ids.length) fail('identidade repetida em alçadas incompatíveis da junta');
  return canonical(junta);
}

// Limite admitido por escrito: identidades são DECLARADAS. Este cruzamento pega colisão e omissão;
// NÃO pega pseudônimo (o mesmo agente reaparecendo com outro nome). A ata é o controle compensatório.
export function assertIndependent(snapshot, agentId, papel) {
  const identities = snapshot?.junta?.identities;
  if (!Array.isArray(identities) || identities.length === 0) fail('snapshot sem as identidades canônicas da junta');
  if (!nonEmpty(agentId)) fail(`${papel} sem identidade declarada`);
  const collision = identities.find((x) => x.agentId === agentId);
  if (collision) fail(`${papel} ocupou a alçada ${collision.role} da junta; independência não comprovada`);
  return true;
}

export function buildSnapshot(state) {
  const pr = state.pr;
  if (!pr || pr.state !== 'open' || pr.draft) fail('PR precisa estar aberto e fora de draft');
  if (pr.base?.ref !== 'main') fail('base do PR precisa ser main');
  if (!SHA40.test(pr.head?.sha || '') || !SHA40.test(pr.base?.sha || '')) fail('head/base precisam ser SHA completo');
  // O ruleset conferido tem de ser o da branch que o PR mergeia. Se a default do repositório não
  // for a base do PR, o ruleset "da default" não protege nada aqui — fail-closed.
  if (!nonEmpty(state.defaultBranch)) fail('branch default do repositório é obrigatória no estado observado');
  if (state.defaultBranch !== pr.base.ref) fail(`branch default (${state.defaultBranch}) não é a base do PR (${pr.base.ref})`);
  // Evidência de reexecução: sem o blob do head não há o que o atestado possa provar.
  if (!SHA40.test(state.kpiLatestBlobSha || '')) fail(`blob SHA de ${KPI_LATEST_PATH} no head é obrigatório no estado observado`);
  const required = requiredChecks(state.rulesets || [], state.defaultBranch);
  const checks = (state.checks || []).filter((c) => c.context !== CONTEXT).map((c) => ({
    context: c.context, appId: c.appId ?? null, conclusion: c.conclusion, detailsUrl: c.detailsUrl || null,
  })).sort((a, b) => `${a.context}:${a.appId}`.localeCompare(`${b.context}:${b.appId}`));
  for (const req of required.filter((r) => r.context !== CONTEXT)) {
    // Matching ESTRITO: null nunca e curinga (req.appId ja foi validado como inteiro positivo).
    const match = checks.find((c) => c.context === req.context && c.appId === req.appId);
    if (!match || match.conclusion !== 'success') fail(`check requerido não verde ou com fonte errada: ${req.context}`);
  }
  const rulesets = canonical((state.rulesets || []).filter((r) => r.enforcement === 'active'));
  const junta = validateJunta(state.junta);
  // Escalada por superficie de governanca (D-5). A lista de paths entra no snapshot: mudar o diff
  // invalida a autorizacao, do mesmo jeito que mudar o head invalida.
  if (!Array.isArray(state.files)) fail('lista de paths do diff do PR é obrigatória no estado observado');
  if (state.files.some((p) => !nonEmpty(p))) fail('path vazio na lista de arquivos do PR');
  const files = [...new Set(state.files)].sort();
  const governanceSurface = pathsDeGovernanca(files);
  if (governanceSurface.length && junta.critical !== true) fail(`diff toca a superfície de governança e exige junta crítica 5/5 (critical:true): ${governanceSurface.join(', ')}`);
  const snapshot = {
    schema: 'erp-porteiro-snapshot:v1', repo: state.repo, defaultBranch: state.defaultBranch, pr: pr.number,
    head: { ref: pr.head.ref, oid: pr.head.sha }, base: { ref: pr.base.ref, oid: pr.base.sha },
    bodySha256: digest(pr.body || ''), checks, requiredChecks: required,
    ruleset: { ids: rulesets.map((r) => r.id), sha256: digest(rulesets) },
    junta: { sha256: digest(junta), identities: juntaIdentities(junta), blobOid: state.juntaBlobOid || null },
    evidence: { kpiLatestBlobSha: state.kpiLatestBlobSha },
    files, governanceSurface,
  };
  return { ...snapshot, snapshotSha256: digest(snapshot) };
}

function parseAttestationBody(body) {
  const line = String(body).split('\n').find((x) => x.startsWith('{'));
  if (!String(body).includes(MARKER) || !line) fail('comentário não contém atestado v1');
  return JSON.parse(line);
}

export function verifyAttestation(snapshot, attestation) {
  const literal = `LIBERADO: merge do PR #${snapshot.pr} no head ${snapshot.head.oid}`;
  if (attestation.schema !== 'erp-porteiro-attestation:v1' || attestation.verdict !== literal) fail('veredito não é a liberação literal exata');
  // `independentOf` saiu do schema: era a lista que o próprio porteiro escrevia sobre si mesmo.
  const allowed = ['schema','verdict','repo','pr','head','snapshotSha256','agentId','role','runtime','model','reasoningEffort','commands','evidence','snapshot'];
  const unknown = Object.keys(attestation).filter((k) => !allowed.includes(k));
  if (unknown.length) fail(`campo desconhecido no atestado: ${unknown.join(',')}`);
  if (attestation.repo !== snapshot.repo || attestation.pr !== snapshot.pr || attestation.head !== snapshot.head.oid) fail('atestado não pertence ao PR/head/repo');
  if (attestation.snapshotSha256 !== snapshot.snapshotSha256) fail('atestado pertence a snapshot diferente');
  if (!SHA40.test(attestation.head)) fail('SHA abreviado não é aceito');
  // DECLARACAO DE INVOCACAO — nao e recibo nem prova. Estes tres campos sao auto-escritos e a
  // decisao do dono (D-PORTEIRO-PRE-MERGE) os torna obrigatorios com estes valores exatos.
  // Falsear a declaracao e violacao nomeada da decisao do dono, detectavel so a posteriori.
  // A PROVA conferivel deste atestado e outra: `evidence` + `commands`, logo abaixo.
  if (attestation.role !== 'porteiro-pos-merge' || attestation.runtime !== 'codex' || attestation.model !== 'gpt-5.6-sol' || attestation.reasoningEffort !== 'ultra') fail('declaração de invocação fora da decisão do dono (D-PORTEIRO-PRE-MERGE)');
  assertIndependent(snapshot, attestation.agentId, 'porteiro pré-merge');
  if (!Array.isArray(attestation.commands) || attestation.commands.length === 0) fail('atestado sem comandos reexecutados');
  for (const c of attestation.commands) {
    if (!c || typeof c !== 'object' || Array.isArray(c)) fail('cada comando reexecutado precisa ser um objeto {cmd, exitCode}');
    const extra = Object.keys(c).filter((k) => !['cmd', 'exitCode'].includes(k));
    if (extra.length) fail(`campo desconhecido em comando reexecutado: ${extra.join(',')}`);
    if (!nonEmpty(c.cmd)) fail('comando reexecutado sem `cmd`');
    if (c.exitCode !== 0) fail(`comando reexecutado não terminou em 0: ${c.cmd} (exitCode ${c.exitCode})`);
  }
  const esperado = snapshot?.evidence?.kpiLatestBlobSha;
  if (!SHA40.test(esperado || '')) fail(`snapshot sem o digest de ${KPI_LATEST_PATH} no head`);
  const evidence = attestation.evidence;
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) fail('atestado sem evidência de reexecução conferível');
  const sobra = Object.keys(evidence).filter((k) => k !== 'kpiLatestBlobSha');
  if (sobra.length) fail(`campo desconhecido em evidence: ${sobra.join(',')}`);
  if (evidence.kpiLatestBlobSha !== esperado) fail(`evidência de reexecução divergente do head: ${KPI_LATEST_PATH}`);
  return true;
}

// Veredicto negativo: mesmo marcador do atestado, para SOMBREAR qualquer liberacao anterior no PR
// (o consumidor le sempre o ULTIMO comentario marcado). `verifyAttestation` o recusa por desenho.
export function buildNegativeVerdict({ verdict, repo, pr, head, agentId, reason }) {
  if (!VEREDITOS_NEGATIVOS.includes(verdict)) fail(`--verdict aceita apenas ${VEREDITOS_NEGATIVOS.join('|')}`);
  if (!nonEmpty(repo)) fail('repositório é obrigatório no veredicto negativo');
  if (!Number.isInteger(pr) || pr <= 0) fail('--pr inteiro positivo é obrigatório');
  if (!SHA40.test(head || '')) fail('--head SHA40 completo é obrigatório');
  if (!nonEmpty(agentId)) fail('--agent (identidade do porteiro) é obrigatório');
  if (!nonEmpty(reason)) fail('--reason é obrigatório: veredicto negativo precisa nomear a propriedade violada');
  const literal = verdict === 'BLOQUEADO'
    ? `BLOQUEADO: merge do PR #${pr} no head ${head}`
    : `LIBERADO COM RESSALVA: merge do PR #${pr} no head ${head}`;
  return {
    schema: 'erp-porteiro-attestation:v1', verdict: literal, autoriza: false,
    repo, pr, head, agentId, role: 'porteiro-pos-merge',
    runtime: 'codex', model: 'gpt-5.6-sol', reasoningEffort: 'ultra', reason,
  };
}

export const fetchPrFiles = (repo, prNumber) =>
  coletarPaths((page) => gh(['api', `repos/${repo}/pulls/${prNumber}/files?per_page=100&page=${page}`]));

async function liveState(prNumber) {
  const { repo, defaultBranch } = repoContext();
  const pr = gh(['api', `repos/${repo}/pulls/${prNumber}`]);
  const rulesetSummaries = gh(['api', `repos/${repo}/rulesets?includes_parents=true`]);
  const rulesets = rulesetSummaries.map((r) => gh(['api', `repos/${repo}/rulesets/${r.id}?includes_parents=true`]));
  const checksRaw = gh(['api', `repos/${repo}/commits/${pr.head.sha}/check-runs?filter=latest&per_page=100`]);
  const statuses = gh(['api', `repos/${repo}/commits/${pr.head.sha}/status`]).statuses || [];
  const checks = normalizarChecks(checksRaw.check_runs, statuses);
  const kpiLatestBlobSha = gh(['api', `repos/${repo}/contents/${KPI_LATEST_PATH}?ref=${pr.head.sha}`]).sha;
  const files = fetchPrFiles(repo, prNumber);
  const comments = gh(['api', `repos/${repo}/issues/${prNumber}/comments?per_page=100`]);
  const juntaComment = [...comments].reverse().find((c) => String(c.body).includes('erp-junta-attestation:v1'));
  if (!juntaComment) fail('comentário externo da junta ausente');
  return {
    repo, defaultBranch, kpiLatestBlobSha, files,
    pr: { number: pr.number, state: pr.state, draft: pr.draft, body: pr.body || '', head: { ref: pr.head.ref, sha: pr.head.sha }, base: { ref: pr.base.ref, sha: pr.base.sha } },
    rulesets, checks, junta: parseAttestationBody(juntaComment.body), juntaBlobOid: arg('--junta-blob'), comments,
  };
}

async function snapshotCommand() {
  const statePath = arg('--state');
  const state = statePath ? JSON.parse(readFileSync(statePath, 'utf8')) : await liveState(Number(arg('--pr')));
  process.stdout.write(`${JSON.stringify(buildSnapshot(state), null, 2)}\n`);
}

// `publish --verdict BLOQUEADO|RESSALVA`: veredicto negativo deixa rastro EXTERNO (comentario
// marcado + check-run `failure`). Nao exige app id esperado: um `failure` nunca autoriza nada.
async function publishNegativeCommand(verdict) {
  if (arg('--state')) fail('publish não aceita fixture');
  const { repo } = repoContext();
  const payload = buildNegativeVerdict({ verdict, repo, pr: Number(arg('--pr')), head: arg('--head'), agentId: arg('--agent'), reason: arg('--reason') });
  const body = `${MARKER}
${JSON.stringify(payload)}`;
  const comment = gh(['api', '-X', 'POST', `repos/${repo}/issues/${payload.pr}/comments`, '-f', `body=${body}`]);
  const checkInput = JSON.stringify({ name: CONTEXT, head_sha: payload.head, status: 'completed', conclusion: 'failure', details_url: comment.html_url, output: { title: `${verdict} PR #${payload.pr}`, summary: payload.reason } });
  gh(['api', '-X', 'POST', `repos/${repo}/check-runs`, '--input', '-'], checkInput);
  console.log(JSON.stringify({ ok: true, verdict, autoriza: false, pr: payload.pr, head: payload.head, permalink: comment.html_url }));
}

async function publishCommand() {
  const negativo = arg('--verdict');
  if (negativo !== undefined) return publishNegativeCommand(negativo);
  if (arg('--state')) fail('publish não aceita fixture');
  const snapshot = JSON.parse(readFileSync(arg('--snapshot'), 'utf8'));
  const attestation = JSON.parse(readFileSync(arg('--attestation'), 'utf8'));
  verifyAttestation(snapshot, attestation);
  const override = process.env.ERP_PORTEIRO_APP_ID_OVERRIDE;
  // O registro global so e consultado quando ha override — o caminho rapido nao acrescenta rede.
  const registro = nonEmpty(override || '') ? gh(['api', '/apps/github-actions']) : null;
  const expectedApp = resolveExpectedAppId({ literal: process.env.ERP_PORTEIRO_EXPECTED_APP_ID, override, registro });
  const before = buildSnapshot(await liveState(snapshot.pr));
  if (JSON.stringify(before) !== JSON.stringify(snapshot)) fail('snapshot remoto mudou antes da publicação');
  const persisted = { ...attestation, snapshot };
  const body = `${MARKER}\n${JSON.stringify(persisted)}`;
  const comment = gh(['api','-X','POST',`repos/${snapshot.repo}/issues/${snapshot.pr}/comments`,'-f',`body=${body}`]);
  const after = buildSnapshot(await liveState(snapshot.pr));
  if (JSON.stringify(after) !== JSON.stringify(snapshot)) fail('snapshot remoto mudou depois do comentário; status não publicado');
  const checkInput = JSON.stringify({ name:CONTEXT, head_sha:snapshot.head.oid, status:'completed', conclusion:'success', details_url:comment.html_url, output:{ title:`LIBERADO PR #${snapshot.pr}`, summary:`Head ${snapshot.head.oid} autorizado pelo porteiro independente.` } });
  const status = gh(['api','-X','POST',`repos/${snapshot.repo}/check-runs`,'--input','-'], checkInput);
  try {
    assertCriadoPeloAppGitHubActions(status.app, expectedApp);
  } catch (e) {
    const failure = JSON.stringify({ name:CONTEXT, head_sha:snapshot.head.oid, status:'completed', conclusion:'failure', details_url:comment.html_url, output:{title:'Fonte não confiável',summary:e.message} });
    gh(['api','-X','POST',`repos/${snapshot.repo}/check-runs`,'--input','-'], failure);
    fail(e.message);
  }
  console.log(JSON.stringify({ ok: true, pr: snapshot.pr, head: snapshot.head.oid, permalink: comment.html_url, sourceAppId: status.app.id, sourceSlug: status.app.slug }));
}

export function checkAllowlist(changed, manifest) {
  const forbidden = changed.filter((p) => !manifest.has(p));
  if (forbidden.length) fail(`path fora da allowlist: ${forbidden.join(', ')}`);
  return true;
}
function allowlistCommand() {
  const manifest = new Set(readFileSync(arg('--manifest'), 'utf8').split(/\r?\n/).map((x) => x.trim()).filter((x) => x && !x.startsWith('#')));
  const base = arg('--base', 'origin/main');
  const changed = execFileSync('git', ['diff','--name-only',`${base}...HEAD`], { cwd: ROOT, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
  checkAllowlist(changed, manifest);
  console.log(`allowlist: OK (${changed.length} paths)`);
}

const direct = process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(new URL(`file:///${process.argv[1].replace(/\\/g,'/')}`));
if (direct) {
  const command = process.argv[2];
  Promise.resolve(command === 'snapshot' ? snapshotCommand() : command === 'verify' ? (() => {
    const s = JSON.parse(readFileSync(arg('--snapshot'), 'utf8')); const a = JSON.parse(readFileSync(arg('--attestation'), 'utf8')); verifyAttestation(s,a); console.log('attestation: OK');
  })() : command === 'publish' ? publishCommand() : command === 'guard-allowlist' ? allowlistCommand() : fail('comando: snapshot|verify|publish [--verdict BLOQUEADO|RESSALVA]|guard-allowlist')).catch((e) => { console.error(`porteiro-pre-merge: ${e.message}`); process.exitCode = 1; });
}
