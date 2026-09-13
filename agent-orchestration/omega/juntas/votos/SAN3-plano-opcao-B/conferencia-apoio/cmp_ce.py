import re,sys,difflib
S=sys.argv[1]
ap=open(S+'/aplic.md',encoding='utf-8').read()
pl=open(S+'/plano.md',encoding='utf-8').read()
def bullets(txt):
    out={}
    for m in re.finditer(r'^- \*\*(CE-[G0-9]+) — (.*?)(?=^- \*\*CE-|^\n|\Z)',txt,re.M|re.S):
        out[m.group(1)]=re.sub(r'\s+',' ',m.group(2)).strip()
    return out
secB=ap[ap.index('## B.'):ap.index('## C.')]
sec56=pl[pl.index('### 5.6'):pl.index('## 6.')]
A=bullets(secB); P=bullets(sec56)
print('CE no §B:',list(A)); print('CE no §5.6:',list(P))
for k in A:
    a=A[k].split(' '); p=P.get(k,'').split(' ')
    sm=difflib.SequenceMatcher(None,a,p,autojunk=False)
    ch=[(op,' '.join(a[i1:i2]),' '.join(p[j1:j2])) for op,i1,i2,j1,j2 in sm.get_opcodes() if op!='equal']
    print(f'\n### {k}: {len(ch)} trechos diferentes')
    for op,x,y in ch: print(f'  [{op}] §B: «{x}»\n         §5.6: «{y}»')
# abertura
print('\nABERTURA no §B:', re.search(r'parágrafo de abertura \("(.*?)"\)',secB,re.S).group(1).replace('\n',' '))
print('ABERTURA no §5.6:', sec56.split('\n')[2])
print('titulo 5.6:', sec56.split('\n')[0])
