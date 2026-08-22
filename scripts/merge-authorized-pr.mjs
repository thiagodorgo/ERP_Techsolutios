#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildSnapshot, verifyAttestation } from './porteiro-pre-merge.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const CONTEXT = 'erp/porteiro-pre-merge';
const arg = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; };
const fail = (m) => { throw new Error(m); };
const gh = (args) => JSON.parse(execFileSync('gh', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }));
const parseMarked = (comments, marker) => {
  const comment = [...comments].reverse().find((c) => String(c.body).includes(marker));
  if (!comment) fail(`${marker} ausente`);
  const line = String(comment.body).split('\n').find((x) => x.startsWith('{'));
  return { comment, payload: JSON.parse(line) };
};

export function assertMergeCandidate({ snapshot, currentSnapshot, attestation, status, comment, expectedHead, mergeAgentId }) {
  if (snapshot.head.oid !== expectedHead || currentSnapshot.head.oid !== expectedHead) fail('compare-and-swap: head divergiu');
  if (JSON.stringify(snapshot) !== JSON.stringify(currentSnapshot)) fail('snapshot/ruleset/checks/body/base/junta mudou');
  verifyAttestation(snapshot, attestation);
  if (!status || status.context !== CONTEXT || status.state !== 'success') fail('status requerido não está verde');
  if (status.target_url !== comment.html_url) fail('status não aponta para o permalink do atestado');
  if (!mergeAgentId || mergeAgentId === attestation.agentId || attestation.independentOf?.includes(mergeAgentId)) fail('executor de merge não é independente');
  return true;
}

async function main() {
  const prNumber = Number(arg('--pr'));
  const expectedHead = arg('--expected-head');
  const mergeAgentId = arg('--executor');
  if (!prNumber || !/^[0-9a-f]{40}$/.test(expectedHead || '')) fail('--pr e --expected-head SHA40 são obrigatórios');
  const repo = gh(['repo','view','--json','nameWithOwner']).nameWithOwner;
  const pr = gh(['api',`repos/${repo}/pulls/${prNumber}`]);
  if (pr.state !== 'open' || pr.draft || pr.base.ref !== 'main' || pr.head.sha !== expectedHead) fail('PR não é candidato congelado contra main');
  const comments = gh(['api',`repos/${repo}/issues/${prNumber}/comments?per_page=100`]);
  const { comment, payload: attestation } = parseMarked(comments, 'erp-porteiro-attestation:v1');
  const snapshot = attestation.snapshot;
  if (!snapshot) fail('atestado precisa carregar o snapshot canônico integral para o merge CAS');
  const rulesetSummaries = gh(['api',`repos/${repo}/rulesets?includes_parents=true`]);
  const rulesets = rulesetSummaries.map((r) => gh(['api',`repos/${repo}/rulesets/${r.id}?includes_parents=true`]));
  const checksRaw = gh(['api',`repos/${repo}/commits/${expectedHead}/check-runs?filter=latest&per_page=100`]);
  const statuses = gh(['api',`repos/${repo}/commits/${expectedHead}/status`]).statuses || [];
  const checks = [
    ...(checksRaw.check_runs || []).map((c) => ({ context:c.name, appId:c.app?.id ?? null, conclusion:c.conclusion, detailsUrl:c.html_url })),
    ...statuses.map((s) => ({ context:s.context, appId:s.creator?.id ?? null, conclusion:s.state === 'success' ? 'success' : s.state, detailsUrl:s.target_url })),
  ];
  const junta = parseMarked(comments, 'erp-junta-attestation:v1').payload;
  const currentSnapshot = buildSnapshot({ repo, pr:{ number:pr.number,state:pr.state,draft:pr.draft,body:pr.body||'',head:{ref:pr.head.ref,sha:pr.head.sha},base:{ref:pr.base.ref,sha:pr.base.sha}}, rulesets, checks, junta, juntaBlobOid:snapshot.junta.blobOid });
  const porterRun=(checksRaw.check_runs||[]).find(c=>c.name===CONTEXT);
  const status=porterRun?{context:CONTEXT,state:porterRun.conclusion,target_url:porterRun.details_url}:null;
  assertMergeCandidate({ snapshot, currentSnapshot, attestation, status, comment, expectedHead, mergeAgentId });
  const result = gh(['api','-X','PUT',`repos/${repo}/pulls/${prNumber}/merge`,'-f',`sha=${expectedHead}`,'-f','merge_method=squash']);
  if (!result.merged) fail(`GitHub recusou merge CAS: ${result.message || 'sem motivo'}`);
  console.log(JSON.stringify({ merged:true, pr:prNumber, approvedHead:expectedHead, mergeCommit:result.sha }));
}

if (process.argv[1]?.endsWith('merge-authorized-pr.mjs')) main().catch((e) => { console.error(`merge-authorized-pr: ${e.message}`); process.exitCode=1; });
