import fs from 'node:fs';
import {B,ESF} from './c1-data.mjs';
const tree = fs.readFileSync('c1-tree.txt','utf8').split('\n').filter(Boolean);
function expand(p){
  if (p==='prisma/migrations/**') return ['HISTORICO:prisma/migrations'];
  if (p.includes('NOVO')) return [p];
  if (p.startsWith('frontend/src/**/*.')){ const ext=p.slice(p.lastIndexOf('.')); return tree.filter(f=>f.startsWith('frontend/src/')&&f.endsWith(ext)); }
  if (p.endsWith('/**')){ const pre=p.slice(0,-2); const r=tree.filter(f=>f.startsWith(pre)); return r.length?r:['VAZIO:'+p]; }
  return tree.includes(p)?[p]:['AUSENTE:'+p];
}
const files={}; const missing=[];
for (const [k,v] of Object.entries(B)){ files[k]=new Set(); for(const p of v[3]) for(const x of expand(p)){ files[k].add(x); if(x.startsWith('VAZIO:')||x.startsWith('AUSENTE:')) missing.push(k+' '+x);} }
console.log('== padroes sem arquivo na arvore: '+missing.join(' ; '));
const keys=Object.keys(B);
const over=(A,C)=>(C[2]>A[1])&&(A[2]>C[1]);
console.log('== pares em frentes diferentes com arquivo comum (SIM = janelas se sobrepoem):');
keys.forEach((a,i)=>keys.slice(i+1).forEach(b=>{
  const A=B[a], C=B[b]; if (A[0]===C[0]) return;
  const inter=[...files[a]].filter(x=>files[b].has(x)); if(inter.length===0) return;
  const ov=over(A,C);
  console.log((ov?'SIM ':'nao ')+a+'(F'+A[0]+' '+A[1]+'-'+A[2]+') x '+b+'(F'+C[0]+' '+C[1]+'-'+C[2]+') n='+inter.length+' :: '+inter.slice(0,3).join(' | '));
}));
const feKeys=keys.filter(k=>k!=='SAN3-21'&&[...files[k]].some(f=>f.startsWith('frontend/')));
const D={'SAN3-20':['SAN3-02'],'SAN3-03':['SAN3-05','SAN3-22'],'SAN3-04':['SAN3-12','SAN3-24'],'SAN3-18':['SAN3-04','SAN3-06a'],'SAN3-24':['SAN3-12'],'AV-REAL':['SAN3-05'],'SAN3-06a':['SAN3-04'],'SAN3-07':['SAN3-04'],'SAN3-08':['SAN3-01','SAN3-04'],'SAN3-21':feKeys,'SAN3-13':['11'],'SAN3-14':['SAN3-13'],'SAN3-15':['04a','SAN3-14'],'SAN3-16':['SAN3-15','07c'],'SAN3-17':['SAN3-16'],'04b':['04a','SAN3-17'],'03b':['03a','04b'],'SAN3-19':['03b'],'SAN3-23':['07c','SAN3-02'],'SAN3-10':keys.filter(k=>k!=='SAN3-10')};
let viol=0; for (const k of Object.keys(D)) for (const d of D[k]){ if (B[d][2] > B[k][1]){viol++; console.log('VIOLA '+k+' inicio '+B[k][1]+' antes do fim de '+d+' '+B[d][2]);} }
console.log('== Dep. x agenda: violacoes='+viol+' ; SAN3-21 depende de '+feKeys.length+' blocos com frontend/: '+feKeys.join(','));
const E={G:13,M:5,P:1.5}; let bad=0; for (const k of keys){ if (Math.abs((B[k][2]-B[k][1])-E[ESF[k]])>1e-9){bad++;console.log('DIVERGE '+k);} }
const cnt={G:0,M:0,P:0}; keys.forEach(k=>cnt[ESF[k]]++);
console.log('== duracao x esforco: divergencias='+bad+' ; blocos='+keys.length+' '+JSON.stringify(cnt));
[1,2,3,4,5].forEach(f=>{ const ks=keys.filter(k=>B[k][0]===f); console.log('   frente '+f+' blocos='+ks.length+' fim='+Math.max(...ks.map(k=>B[k][2]))); });
[1,2,3,4].forEach(f=>{ const ks=keys.filter(k=>B[k][0]===f).sort((x,y)=>B[x][1]-B[y][1]); ks.forEach((k,i)=>{ if(i && B[ks[i-1]][2] > B[k][1]) console.log('SOBREPOSICAO NA FRENTE '+f+' '+ks[i-1]+' '+k); }); });
fs.writeFileSync('c1-D.json', JSON.stringify(D));
