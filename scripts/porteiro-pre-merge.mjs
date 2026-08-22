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
  const snapshot = {
    schema: 'erp-porteiro-snapshot:v1', repo: state.repo, defaultBranch: state.defaultBranch, pr: pr.number,
    head: { ref: pr.head.ref, oid: pr.head.sha }, base: { ref: pr.base.ref, oid: pr.base.sha },
    bodySha256: digest(pr.body || ''), checks, requiredChecks: required,
    ruleset: { ids: rulesets.map((r) => r.id), sha256: digest(rulesets) },
    junta: { sha256: digest(junta), identities: juntaIdentities(junta), blobOid: state.juntaBlobOid || null },
    evidence: { kpiLatestBlobSha: state.kpiLatestBlobSha },
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

async function liveState(prNumber) {
  const { repo, defaultBranch } = repoContext();
  const pr = gh(['api', `repos/${repo}/pulls/${prNumber}`]);
  const rulesetSummaries = gh(['api', `repos/${repo}/rulesets?includes_parents=true`]);
  const rulesets = rulesetSummaries.map((r) => gh(['api', `repos/${repo}/rulesets/${r.id}?includes_parents=true`]));
  const checksRaw = gh(['api', `repos/${repo}/commits/${pr.head.sha}/check-runs?filter=latest&per_page=100`]);
  const statuses = gh(['api', `repos/${repo}/commits/${pr.head.sha}/status`]).statuses || [];
  const checks = [
    ...(checksRaw.check_runs || []).map((c) => ({ context: c.name, appId: c.app?.id ?? null, conclusion: c.conclusion, detailsUrl: c.html_url })),
    ...statuses.map((s) => ({ context: s.context, appId: s.creator?.type === 'Bot' ? s.creator?.id ?? null : null, conclusion: s.state === 'success' ? 'success' : s.state, detailsUrl: s.target_url })),
  ];
  const kpiLatestBlobSha = gh(['api', `repos/${repo}/contents/${KPI_LATEST_PATH}?ref=${pr.head.sha}`]).sha;
  const comments = gh(['api', `repos/${repo}/issues/${prNumber}/comments?per_page=100`]);
  const juntaComment = [...comments].reverse().find((c) => String(c.body).includes('erp-junta-attestation:v1'));
  if (!juntaComment) fail('comentário externo da junta ausente');
  return {
    repo, defaultBranch, kpiLatestBlobSha,
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
  const expectedApp = Number(process.env.ERP_PORTEIRO_EXPECTED_APP_ID || 0);
  if (!Number.isInteger(expectedApp) || expectedApp <= 0) fail('ERP_PORTEIRO_EXPECTED_APP_ID positivo é obrigatório; fonte não comprovada');
  const before = buildSnapshot(await liveState(snapshot.pr));
  if (JSON.stringify(before) !== JSON.stringify(snapshot)) fail('snapshot remoto mudou antes da publicação');
  const persisted = { ...attestation, snapshot };
  const body = `${MARKER}\n${JSON.stringify(persisted)}`;
  const comment = gh(['api','-X','POST',`repos/${snapshot.repo}/issues/${snapshot.pr}/comments`,'-f',`body=${body}`]);
  const after = buildSnapshot(await liveState(snapshot.pr));
  if (JSON.stringify(after) !== JSON.stringify(snapshot)) fail('snapshot remoto mudou depois do comentário; status não publicado');
  const checkInput = JSON.stringify({ name:CONTEXT, head_sha:snapshot.head.oid, status:'completed', conclusion:'success', details_url:comment.html_url, output:{ title:`LIBERADO PR #${snapshot.pr}`, summary:`Head ${snapshot.head.oid} autorizado pelo porteiro independente.` } });
  const status = gh(['api','-X','POST',`repos/${snapshot.repo}/check-runs`,'--input','-'], checkInput);
  const sourceId = status.app?.id ?? null;
  if (sourceId !== expectedApp) {
    const failure = JSON.stringify({ name:CONTEXT, head_sha:snapshot.head.oid, status:'completed', conclusion:'failure', details_url:comment.html_url, output:{title:'Fonte não confiável',summary:'O app criador não corresponde à fonte esperada.'} });
    gh(['api','-X','POST',`repos/${snapshot.repo}/check-runs`,'--input','-'], failure);
    fail('status criado por fonte diferente da fonte confiável esperada');
  }
  console.log(JSON.stringify({ ok: true, pr: snapshot.pr, head: snapshot.head.oid, permalink: comment.html_url, sourceAppId: sourceId }));
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
