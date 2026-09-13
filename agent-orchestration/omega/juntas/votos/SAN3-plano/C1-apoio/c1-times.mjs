import fs from 'node:fs';
const nums=[360,353,359,380,357,369,385,371];
const rows=[];
for (const n of nums){
  const j=JSON.parse(fs.readFileSync(`c1-pr-${n}.json`,'utf8'));
  const c=j.commits;
  const auth=c.map(x=>Date.parse(x.authoredDate));
  const comm=c.map(x=>Date.parse(x.committedDate));
  const m=Date.parse(j.mergedAt);
  const fa=Math.min(...auth), fc=Math.min(...comm), f0a=Date.parse(c[0].authoredDate), f0c=Date.parse(c[0].committedDate);
  rows.push({n, commits:c.length, first0_auth:c[0].authoredDate, first0_comm:c[0].committedDate, minAuth:new Date(fa).toISOString(), mergedAt:j.mergedAt,
    h_first0_auth:((m-f0a)/3.6e6).toFixed(2), h_first0_comm:((m-f0c)/3.6e6).toFixed(2), h_minAuth:((m-fa)/3.6e6).toFixed(2), h_minComm:((m-fc)/3.6e6).toFixed(2),
    add:j.additions, del:j.deletions, files:j.changedFiles});
}
console.table(rows);
const med=a=>{const s=[...a].sort((x,y)=>x-y);const k=s.length;return k%2?s[(k-1)/2]:(s[k/2-1]+s[k/2])/2;};
for (const key of ['h_first0_auth','h_first0_comm','h_minAuth','h_minComm']){
  const v=rows.map(r=>+r[key]);
  const big=rows.filter(r=>[380,357,369,385,371].includes(r.n)).map(r=>+r[key]);
  console.log(key,'median8=',med(v).toFixed(2),'median5big=',med(big).toFixed(2),'minBig=',Math.min(...big).toFixed(2));
}
const p=JSON.parse(fs.readFileSync('c1-pr-386.json','utf8'));
console.log('#386 commits',p.commits.length,'first',p.commits[0].authoredDate,'last',p.commits.at(-1).committedDate,'createdAt',p.createdAt,'mergedAt',p.mergedAt);
