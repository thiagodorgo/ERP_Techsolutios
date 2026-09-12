import {B,ESF} from './c1-data.mjs';
const keys=Object.keys(B);
const fronts={}; for (const k of keys) (fronts[B[k][0]] ??= []).push(k);
for (const f in fronts) fronts[f].sort((a,b)=>B[a][1]-B[b][1]);
const FE=['SAN3-04','SAN3-22','SAN3-18','SAN3-01','SAN3-12','SAN3-24','SAN3-11','SAN3-06a','SAN3-08','SAN3-06b'];
const BASE={'SAN3-20':['SAN3-02'],'SAN3-03':['SAN3-05','SAN3-22'],'SAN3-04':['SAN3-12','SAN3-24'],'SAN3-18':['SAN3-04','SAN3-06a'],'SAN3-24':['SAN3-12'],'AV-REAL':['SAN3-05'],'SAN3-06a':['SAN3-04'],'SAN3-07':['SAN3-04'],'SAN3-08':['SAN3-01','SAN3-04'],'SAN3-21':FE,'SAN3-13':['11'],'SAN3-14':['SAN3-13'],'SAN3-15':['04a','SAN3-14'],'SAN3-16':['SAN3-15','07c'],'SAN3-17':['SAN3-16'],'04b':['04a','SAN3-17'],'03b':['03a','04b'],'SAN3-19':['03b'],'SAN3-23':['07c','SAN3-02'],'SAN3-10':keys.filter(k=>k!=='SAN3-10')};
function sim({G,M,P,p=0,q=0,extra={}}){
  const DEP={...BASE}; for (const k in extra) DEP[k]=[...(DEP[k]||[]),...extra[k]];
  const dur={G,M,P}; const st={}, en={}; const idx={}, free={}; for (const f in fronts){idx[f]=0; free[f]=0;}
  const merges=[];
  const gate=(t)=>{ const ms=merges.filter(x=>t >= x).sort((a,b)=>a-b); let e=0; for (const m of ms) e=Math.max(e,m)+p+q; return e; };
  let n=keys.length, porteiros=0;
  while(n){
    let best=null;
    for (const f in fronts){ const k=fronts[f][idx[f]]; if(k===undefined) continue; const ds=DEP[k]||[];
      if (ds.some(d=>en[d]===undefined)) continue; const r=Math.max(free[f],0,...ds.map(d=>en[d]));
      if (best===null || best.r > r) best={k,f,r}; }
    if (best===null) return {erro:'deadlock'};
    let s=best.r; for(;;){ const g=gate(s); if (g > s) s=g; else break; }
    st[best.k]=s; en[best.k]=s+dur[ESF[best.k]]; free[best.f]=en[best.k]; idx[best.f]++; merges.push(en[best.k]); n--;
  }
  const fim=Math.max(...Object.values(en));
  const fr={}; for (const f in fronts) fr[f]=Math.max(...fronts[f].filter(k=>B[k][0]==f).map(k=>en[k]));
  return {fim:+fim.toFixed(2), frentes:fr, st, en};
}
const show=(nome,o)=>{ const r=sim(o); console.log(nome.padEnd(46)+' fim='+r.fim+'  frentes='+JSON.stringify(r.frentes)); return r; };
const b0=show('melhor caso sem porteiro (G13 M5 P1.5)',{G:13,M:5,P:1.5});
show('melhor caso G=12.8',{G:12.8,M:5,P:1.5});
for (const p of [0.25,0.35,0.48]) show('melhor + porteiro '+p+' h',{G:13,M:5,P:1.5,p});
for (const q of [0.25,0.5,1]) show('melhor + porteiro 0.48 + KPI '+q+' h/merge',{G:13,M:5,P:1.5,p:0.48,q});
show('realista G57 M10 P2 sem porteiro',{G:57,M:10,P:2});
show('realista + porteiro 0.48 + KPI 1',{G:57,M:10,P:2,p:0.48,q:1});
const fix=show('melhor, O6R-12 serializado apos SAN3-20',{G:13,M:5,P:1.5,extra:{'O6R-12':['SAN3-20']}});
show('melhor, idem + porteiro 0.48',{G:13,M:5,P:1.5,p:0.48,extra:{'O6R-12':['SAN3-20']}});
console.log('agenda reproduzida? '+keys.every(k=>b0.st[k]===B[k][1]&&b0.en[k]===B[k][2])+' ; divergentes: '+keys.filter(k=>b0.st[k]!==B[k][1]).map(k=>k+'@'+b0.st[k]).join(','));
