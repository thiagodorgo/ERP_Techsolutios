import re,sys
S=sys.argv[1]
nav=open(S+'/nav.ts',encoding='utf-8').read()
reg=open(S+'/reg.ts',encoding='utf-8').read()
# MVP_NAV_PATHS: bloco do Set literal
m=re.search(r'export const MVP_NAV_PATHS = new Set<string>\(\[(.*?)\]\)',nav,re.S)
mvp=re.findall(r'"([^"]+)"',re.sub(r'//[^\n]*','',m.group(1)))
print('MVP_NAV_PATHS',len(mvp),'unicos',len(set(mvp)))
# registro: cada objeto com path: ... ; recorta por 'path:' ate o proximo 'path:'
code=re.sub(r'//[^\n]*','',reg)
pos=[mm.start() for mm in re.finditer(r'\bpath:\s*"',code)]+[len(code)]
entries=[]
for a,b in zip(pos,pos[1:]):
    seg=code[a:b]
    p=re.match(r'path:\s*"([^"]+)"',seg).group(1)
    entries.append((p,'requiredModules' in seg,'platformOnly: true' in seg))
print('registro entradas',len(entries))
regpaths={p for p,_,_ in entries}
diff=[p for p in mvp if p not in regpaths]
print('MVP - registro =',len(diff))
semmod=[p for p,rm,po in entries if not rm]
org_semmod=[p for p,rm,po in entries if not rm and not po]
print('registro sem requiredModules =',len(semmod),'| desses, nao-platformOnly =',len(org_semmod))
for p in org_semmod: print('   ',p,'| no MVP?',p in mvp)
print('13 no MVP:',sum(p in mvp for p in org_semmod),'| disjuntos da diferenca:',not (set(org_semmod)&set(diff)))
print('TOTAL item 16 =',len(diff)+len(org_semmod))
