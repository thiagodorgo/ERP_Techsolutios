#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const MARKER = 'erp-porteiro-attestation:v1';
const CONTEXT = 'erp/porteiro-pre-merge';
const SHA40 = /^[0-9a-f]{40}$/;

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
const repoFromGh = () => gh(['repo', 'view', '--json', 'nameWithOwner']).nameWithOwner;

function requiredChecks(rulesets) {
  const active = rulesets.filter((r) => r.enforcement === 'active');
  const bypass = active.flatMap((r) => r.bypass_actors || []);
  if (bypass.length) fail('ruleset ativo contém bypass actor');
  const required = [];
  let strict = false;
  for (const ruleset of active) for (const rule of ruleset.rules || []) {
    if (rule.type !== 'required_status_checks') continue;
    strict ||= rule.parameters?.strict_required_status_checks_policy === true;
    for (const item of rule.parameters?.required_status_checks || []) required.push({ context: item.context, appId: item.integration_id ?? null });
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
  const required = requiredChecks(state.rulesets || []);
  const checks = (state.checks || []).filter((c) => c.context !== CONTEXT).map((c) => ({
    context: c.context, appId: c.appId ?? null, conclusion: c.conclusion, detailsUrl: c.detailsUrl || null,
  })).sort((a, b) => `${a.context}:${a.appId}`.localeCompare(`${b.context}:${b.appId}`));
  for (const req of required.filter((r) => r.context !== CONTEXT)) {
    const match = checks.find((c) => c.context === req.context && (req.appId == null || c.appId === req.appId));
    if (!match || match.conclusion !== 'success') fail(`check requerido não verde ou com fonte errada: ${req.context}`);
  }
  const rulesets = canonical((state.rulesets || []).filter((r) => r.enforcement === 'active'));
  const junta = validateJunta(state.junta);
  const snapshot = {
    schema: 'erp-porteiro-snapshot:v1', repo: state.repo, pr: pr.number,
    head: { ref: pr.head.ref, oid: pr.head.sha }, base: { ref: pr.base.ref, oid: pr.base.sha },
    bodySha256: digest(pr.body || ''), checks, requiredChecks: required,
    ruleset: { ids: rulesets.map((r) => r.id), sha256: digest(rulesets) },
    junta: { sha256: digest(junta), identities: juntaIdentities(junta), blobOid: state.juntaBlobOid || null },
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
  const allowed = ['schema','verdict','repo','pr','head','snapshotSha256','agentId','role','runtime','model','reasoningEffort','commands','snapshot'];
  const unknown = Object.keys(attestation).filter((k) => !allowed.includes(k));
  if (unknown.length) fail(`campo desconhecido no atestado: ${unknown.join(',')}`);
  if (attestation.repo !== snapshot.repo || attestation.pr !== snapshot.pr || attestation.head !== snapshot.head.oid) fail('atestado não pertence ao PR/head/repo');
  if (attestation.snapshotSha256 !== snapshot.snapshotSha256) fail('atestado pertence a snapshot diferente');
  if (!SHA40.test(attestation.head)) fail('SHA abreviado não é aceito');
  if (attestation.role !== 'porteiro-pos-merge' || attestation.runtime !== 'codex' || attestation.model !== 'gpt-5.6-sol' || attestation.reasoningEffort !== 'ultra') fail('recibo Codex Sol/ultra inválido');
  assertIndependent(snapshot, attestation.agentId, 'porteiro pré-merge');
  if (!Array.isArray(attestation.commands) || attestation.commands.length === 0) fail('atestado sem comandos reexecutados');
  return true;
}

async function liveState(prNumber) {
  const repo = repoFromGh();
  const pr = gh(['api', `repos/${repo}/pulls/${prNumber}`]);
  const rulesetSummaries = gh(['api', `repos/${repo}/rulesets?includes_parents=true`]);
  const rulesets = rulesetSummaries.map((r) => gh(['api', `repos/${repo}/rulesets/${r.id}?includes_parents=true`]));
  const checksRaw = gh(['api', `repos/${repo}/commits/${pr.head.sha}/check-runs?filter=latest&per_page=100`]);
  const statuses = gh(['api', `repos/${repo}/commits/${pr.head.sha}/status`]).statuses || [];
  const checks = [
    ...(checksRaw.check_runs || []).map((c) => ({ context: c.name, appId: c.app?.id ?? null, conclusion: c.conclusion, detailsUrl: c.html_url })),
    ...statuses.map((s) => ({ context: s.context, appId: s.creator?.type === 'Bot' ? s.creator?.id ?? null : null, conclusion: s.state === 'success' ? 'success' : s.state, detailsUrl: s.target_url })),
  ];
  const comments = gh(['api', `repos/${repo}/issues/${prNumber}/comments?per_page=100`]);
  const juntaComment = [...comments].reverse().find((c) => String(c.body).includes('erp-junta-attestation:v1'));
  if (!juntaComment) fail('comentário externo da junta ausente');
  return {
    repo, pr: { number: pr.number, state: pr.state, draft: pr.draft, body: pr.body || '', head: { ref: pr.head.ref, sha: pr.head.sha }, base: { ref: pr.base.ref, sha: pr.base.sha } },
    rulesets, checks, junta: parseAttestationBody(juntaComment.body), juntaBlobOid: arg('--junta-blob'), comments,
  };
}

async function snapshotCommand() {
  const statePath = arg('--state');
  const state = statePath ? JSON.parse(readFileSync(statePath, 'utf8')) : await liveState(Number(arg('--pr')));
  process.stdout.write(`${JSON.stringify(buildSnapshot(state), null, 2)}\n`);
}

async function publishCommand() {
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
  })() : command === 'publish' ? publishCommand() : command === 'guard-allowlist' ? allowlistCommand() : fail('comando: snapshot|verify|publish|guard-allowlist')).catch((e) => { console.error(`porteiro-pre-merge: ${e.message}`); process.exitCode = 1; });
}
