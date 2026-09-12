import fs from 'node:fs';
const t = fs.readFileSync(process.argv[2],'utf8').split('\n');
const s41 = t.findIndex(l=>l.startsWith('### 4.1')), s42=t.findIndex(l=>l.startsWith('### 4.2'));
const items={};
for (const l of t.slice(s41,s42)){ const m=l.match(/^\|\s*(\d+)\s*\|(.*)\|\s*`([^`]+)`\s*\|\s*(✓?)\s*\|\s*$/); if(m) items[+m[1]]={bloco:m[3],reclass:!!m[4]}; }
const s5=t.findIndex(l=>l.startsWith('## 5.')), s6=t.findIndex(l=>l.startsWith('## 6.'));
const blocks={};
for (const l of t.slice(s5,s6)){ const m=l.match(/^\|\s*`(B-[^`]+)`\s*·\s*`([^`]+)`\s*\|\s*([^|]+)\|/); if(m){ const fe=[...m[3].matchAll(/\d+/g)].map(x=>+x[0]); blocks[m[1]]={branch:m[2],fecha:fe}; } }
const norm=b=>b.replace(/^B-/,'');
console.log('itens §4.1:',Object.keys(items).length,' faixa',Math.min(...Object.keys(items).map(Number)),'-',Math.max(...Object.keys(items).map(Number)));
console.log('blocos §5:',Object.keys(blocks).length);
const itemsByBlock={}; for (const [n,v] of Object.entries(items)) (itemsByBlock[norm(v.bloco)]??=[]).push(+n);
let err=0;
for (const [b,v] of Object.entries(blocks)){ const exp=(itemsByBlock[norm(b)]||[]).sort((a,c)=>a-c).join(','); const got=[...v.fecha].sort((a,c)=>a-c).join(','); if(exp!==got){err++;console.log('DIVERGE',b,'§5 fecha',got,'× §4.1 aponta',exp);} }
for (const b of Object.keys(itemsByBlock)) if(!Object.keys(blocks).map(norm).includes(b)){err++;console.log('BLOCO do §4.1 sem linha no §5:',b);}
const covered=new Set(Object.values(blocks).flatMap(v=>v.fecha));
for (let i=1;i<=49;i++) if(!covered.has(i)){err++;console.log('item sem bloco:',i);}
const noItem=Object.entries(blocks).filter(([b,v])=>!v.fecha.length).map(([b])=>b); if(noItem.length){err++;console.log('bloco sem item:',noItem);}
console.log('divergências:',err);
console.log('reclass ✓:',Object.entries(items).filter(([n,v])=>v.reclass).map(([n])=>n).join(','));
const br=Object.values(blocks).map(v=>v.branch); console.log('branches únicas:',new Set(br).size,'de',br.length);
