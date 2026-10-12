"""Despachante local da fila imutável; somente stdlib, runners injetáveis nos testes."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import uuid
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

SCHEMA_FILA="agente-claude-api.fila@2026-10-11.v1"
SCHEMA_STATUS="agente-claude-api.fila-status@2026-10-11.v1"
_ID=re.compile(r"^[A-Z0-9][A-Z0-9._-]{0,63}$")
TERMINAIS={"ok","falhou","parcial","aguardando-codex"}

class FilaRecusada(ValueError): pass

def _regular_sob(p: Path, raiz: Path)->Path:
    p=(raiz/p).resolve() if not p.is_absolute() else p.resolve()
    try:p.relative_to(raiz.resolve())
    except ValueError as e: raise FilaRecusada("arquivo fora da raiz da fila") from e
    if not p.is_file() or os.lstat(p).st_nlink != 1: raise FilaRecusada("arquivo não regular")
    return p

def ler_fila(caminho: Path, raiz: Path)->tuple[list[dict],str]:
    p=_regular_sob(Path(caminho),Path(raiz)); bruto=p.read_bytes(); h=hashlib.sha256(bruto).hexdigest(); itens=[]; ids=set()
    for n,linha in enumerate(bruto.decode("utf-8",errors="strict").splitlines(),1):
        try:item=json.loads(linha)
        except json.JSONDecodeError as e: raise FilaRecusada(f"linha {n} inválida") from e
        if set(item)!={"id","executor","tarefa","prioridade","parametros"}: raise FilaRecusada("chaves da fila divergentes")
        if not _ID.fullmatch(str(item["id"])) or item["id"] in ids: raise FilaRecusada("id inválido ou duplicado")
        ids.add(item["id"])
        if type(item["prioridade"]) is not int: raise FilaRecusada("prioridade inválida")
        ex,tar,pa=item["executor"],item["tarefa"],item["parametros"]
        if ex=="api":
            if tar not in ("revisar-pr","investigar","redigir","propor-patch") or not isinstance(pa,dict): raise FilaRecusada("tarefa API inválida")
            permitidas={"contexto","max_custo_usd"}|({"entregavel"} if tar=="redigir" else set())|({"numero"} if tar=="revisar-pr" else set())|({"pergunta"} if tar=="investigar" else set())
            obrigatorias={"contexto","max_custo_usd"}|({"entregavel"} if tar=="redigir" else set())|({"numero"} if tar=="revisar-pr" else set())|({"pergunta"} if tar=="investigar" else set())
            if set(pa) != obrigatorias or set(pa)-permitidas: raise FilaRecusada("parâmetros API inválidos")
        elif ex=="codex":
            if tar!="executar-prompt" or set(pa)!={"prompt"}: raise FilaRecusada("parâmetros Codex inválidos")
        else: raise FilaRecusada("executor inválido")
        item["_linha"]=n; itens.append(item)
    itens.sort(key=lambda x:(x["prioridade"],x["_linha"])); return itens,h

def argv_api(item:dict)->list[str]:
    p=item["parametros"]; a=[sys.executable,"-m","agente_claude",item["tarefa"]]
    if item["tarefa"]=="revisar-pr":a.append(str(p["numero"]))
    elif item["tarefa"]=="investigar":a.append(str(p["pergunta"]))
    elif item["tarefa"]=="redigir":a += ["--entregavel",str(p["entregavel"])]
    a += ["--contexto",str(p["contexto"]),"--max-custo-usd",str(p["max_custo_usd"])]
    return a

def argv_codex(item:dict,lancador:Path,raiz:Path)->tuple[list[str],str]:
    prompt=_regular_sob(Path(item["parametros"]["prompt"]),raiz)
    tag=f"ag2-{item['id']}-{uuid.uuid4().hex}"
    return ["pwsh.exe","-NoProfile","-File",str(Path(lancador).resolve()),"-Tag",tag,"-Prompt",str(prompt),"-Model","gpt-5.6-sol"],tag

def classificar_codex(codigo:int,log:str,status:str="")->str:
    t=(log+"\n"+status).lower()
    if "hit your usage limit" in t and "try again at" in t:return "aguardando-codex"
    if codigo==0 and re.search(r"(?m)^fim\b.*\bec=0\b",t):return "ok"
    if not re.search(r"(?m)^fim\b",t):return "parcial"
    return "falhou"

class Status:
    def __init__(self,pasta:Path,fila_sha256:str):
        self.arquivo=Path(pasta)/"fila.status.jsonl"; self.hash=fila_sha256; self.seq=0; self.estados={}; self._lock=threading.Lock()
        if self.arquivo.exists():
            for linha in self.arquivo.read_text(encoding="utf-8").splitlines():
                e=json.loads(linha); self.seq+=1
                if e.get("seq")!=self.seq or e.get("fila_sha256")!=self.hash: raise FilaRecusada("status/hash inválido")
                self.estados[e["id"]]=e["status"]
    def registrar(self,item,status,codigo=None,resultado=None,detalhe=None):
      with self._lock:
        anterior=self.estados.get(item["id"])
        validas={None:{"pendente"},"pendente":{"rodando"},"rodando":TERMINAIS}
        if status not in validas.get(anterior,set()):raise FilaRecusada("transição de status inválida")
        self.seq+=1;e={"schema":SCHEMA_STATUS,"seq":self.seq,"ts_utc":datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),"fila_sha256":self.hash,"id":item["id"],"tentativa":1,"executor":item["executor"],"status":status,"codigo_saida":codigo,"resultado":resultado,"detalhe":detalhe}
        with open(self.arquivo,"a",encoding="utf-8",newline="\n") as f:f.write(json.dumps(e,sort_keys=True,ensure_ascii=False)+"\n");f.flush();os.fsync(f.fileno())
        self.estados[item["id"]]=status

def executar(caminho:Path,lancador:Path,timeout_item:int=18000,runner=subprocess.run)->dict:
    raiz=Path(caminho).resolve().parent; itens,h=ler_fila(caminho,raiz); st=Status(raiz,h); resultados={}
    pendentes=[]
    for i in itens:
        antigo=st.estados.get(i["id"])
        if antigo in TERMINAIS:continue
        if antigo=="rodando":st.registrar(i,"parcial",detalhe="rodando órfão; não reexecutado");continue
        st.registrar(i,"pendente");pendentes.append(i)
    def rodar(i):
        st.registrar(i,"rodando")
        if i["executor"]=="api":argv=argv_api(i);tag=None
        else:argv,tag=argv_codex(i,lancador,raiz)
        try:r=runner(argv,cwd=str(raiz),shell=False,capture_output=True,text=True,timeout=timeout_item)
        except subprocess.TimeoutExpired:estado="parcial";codigo=None;texto="timeout"
        else:
            codigo=r.returncode;texto=(r.stdout or "")+(r.stderr or "")
            estado=("ok" if codigo==0 else "parcial" if codigo==2 else "falhou") if i["executor"]=="api" else classificar_codex(codigo,texto)
        st.registrar(i,estado,codigo,tag,texto[-4000:]);return i["id"],estado
    apis=[i for i in pendentes if i["executor"]=="api"];codex=[i for i in pendentes if i["executor"]=="codex"]
    with ThreadPoolExecutor(max_workers=3) as pool:
        for f in as_completed([pool.submit(rodar,i) for i in apis]):k,v=f.result();resultados[k]=v
    for i in codex:k,v=rodar(i);resultados[k]=v
    return resultados

def main(argv=None):
    p=argparse.ArgumentParser();p.add_argument("--fila",required=True);p.add_argument("--lancador-codex",required=True);p.add_argument("--timeout-item",type=int,default=18000);a=p.parse_args(argv)
    executar(Path(a.fila),Path(a.lancador_codex),a.timeout_item);return 0
if __name__=="__main__":raise SystemExit(main())
