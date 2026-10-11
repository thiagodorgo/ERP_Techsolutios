import json,tempfile,unittest,threading,time
from types import SimpleNamespace
from pathlib import Path
from agente_claude.despachante import ler_fila,FilaRecusada,classificar_codex,argv_api,argv_codex,Status,executar

API={"id":"AG2-0001","executor":"api","tarefa":"redigir","prioridade":10,"parametros":{"entregavel":"registro","contexto":"pacotes/x.md","max_custo_usd":"0.30"}}
CODEX={"id":"AG2-0002","executor":"codex","tarefa":"executar-prompt","prioridade":20,"parametros":{"prompt":"prompts/y.md"}}
class TestDespachante(unittest.TestCase):
 def setUp(self):self.t=tempfile.TemporaryDirectory();self.addCleanup(self.t.cleanup);self.r=Path(self.t.name);(self.r/"pacotes").mkdir();(self.r/"prompts").mkdir();(self.r/"pacotes/x.md").write_text("x");(self.r/"prompts/y.md").write_text("y");self.f=self.r/"fila.jsonl"
 def write(self,*itens):self.f.write_text("".join(json.dumps(x)+"\n" for x in itens),encoding="utf-8")
 def test_fila_valida_prioridade(self):self.write(CODEX,API);it,h=ler_fila(self.f,self.r);self.assertEqual([x["id"] for x in it],["AG2-0001","AG2-0002"]);self.assertEqual(len(h),64)
 def test_fila_rejeita_chave_extra_id_duplicado_e_mutacao_apos_inicio(self):
  x=dict(API);x["argv"]=["x"];self.write(x)
  with self.assertRaises(FilaRecusada):ler_fila(self.f,self.r)
  self.write(API,API)
  with self.assertRaises(FilaRecusada):ler_fila(self.f,self.r)
 def test_status_seq_e_transicoes(self):
  self.write(API);it,h=ler_fila(self.f,self.r);s=Status(self.r,h);s.registrar(it[0],"pendente");s.registrar(it[0],"rodando");s.registrar(it[0],"ok",0);self.assertEqual(s.seq,3)
 def test_codex_tag_unica(self):
  a,t1=argv_codex(CODEX,self.r/"run.ps1",self.r);b,t2=argv_codex(CODEX,self.r/"run.ps1",self.r);self.assertNotEqual(t1,t2);self.assertIn("gpt-5.6-sol",a)
 def test_despachante_argv_fixo_shell_false_sol(self):
  a=argv_api(API);self.assertNotIn("argv",a);self.assertEqual(a[1:3],["-m","agente_claude"])
  hostil=json.loads(json.dumps(CODEX));hostil["parametros"]["model"]="topo";b,_=argv_codex(hostil,self.r/"run.ps1",self.r);self.assertIn("gpt-5.6-sol",b);self.assertNotIn("topo",b)
 def test_despachante_zero_git_e_codex_sequencial(self):
  src=(Path(__file__).parents[1]/"agente_claude/despachante.py").read_text(encoding="utf-8")
  trecho=src[src.index("def executar("):];self.assertNotIn('["git"',trecho);self.assertIn("for i in codex:k,v=rodar(i)",src)
 def test_limite_codex_sem_retry(self):
  src=(Path(__file__).parents[1]/"agente_claude/despachante.py").read_text(encoding="utf-8");self.assertEqual(src.count("classificar_codex(codigo,texto)"),1)
 def test_scheduler_limites_e_ordem_com_runners_falsos(self):
  itens=[]
  for i in range(5):
   x=json.loads(json.dumps(API));x["id"]=f"API-{i}";x["prioridade"]=i;itens.append(x)
  for i in range(3):
   x=json.loads(json.dumps(CODEX));x["id"]=f"COD-{i}";x["prioridade"]=10+i;itens.append(x)
  self.write(*itens);lock=threading.Lock();ativos={"api":0,"codex":0};maximos={"api":0,"codex":0}
  def runner(argv,**kw):
   k="codex" if "pwsh.exe" in argv[0] else "api"
   with lock:ativos[k]+=1;maximos[k]=max(maximos[k],ativos[k])
   time.sleep(.03)
   with lock:ativos[k]-=1
   return SimpleNamespace(returncode=0,stdout="fim x ec=0\n",stderr="")
  out=executar(self.f,self.r/"run.ps1",10,runner);self.assertEqual(len(out),8);self.assertLessEqual(maximos["api"],3);self.assertEqual(maximos["codex"],1)
 def test_limite_codex_uma_chamada_e_estado_aguardando(self):
  self.write(CODEX);chamadas=[]
  def runner(argv,**kw):chamadas.append(argv);return SimpleNamespace(returncode=1,stdout="hit your usage limit\ntry again at 12:00",stderr="")
  out=executar(self.f,self.r/"run.ps1",10,runner);self.assertEqual(out["AG2-0002"],"aguardando-codex");self.assertEqual(len(chamadas),1)

def _classe(n,codigo,log,esperado):
 def t(self):self.assertEqual(classificar_codex(codigo,log),esperado)
 setattr(TestDespachante,f"test_classificador_{n:02d}",t)
casos=[(0,"fim x ec=0","ok"),(1,"fim x ec=1","falhou"),(0,"sem fim","parcial"),(1,"try again at 1","parcial"),(1,"hit your usage limit","parcial"),(1,"hit your usage limit\ntry again at 1","aguardando-codex"),(0,"try again at citado\nfim ok ec=0","ok"),(9,"x","parcial"),(0,"FIM pronto EC=0","ok")]
for n,c in enumerate(casos):_classe(n,*c)

def _inval(n,mut):
 def t(self):
  x=json.loads(json.dumps(API));mut(x);self.write(x)
  with self.assertRaises(FilaRecusada):ler_fila(self.f,self.r)
 setattr(TestDespachante,f"test_fila_invalida_{n:02d}",t)
for n,m in enumerate([
 lambda x:x.update(id=""),lambda x:x.update(id="a"),lambda x:x.update(id="A B"),lambda x:x.update(executor="x"),lambda x:x.update(tarefa="x"),
 lambda x:x.update(prioridade="1"),lambda x:x.update(parametros={}),lambda x:x["parametros"].update(argv=[]),lambda x:x.pop("id"),lambda x:x.update(extra=1),
 lambda x:x["parametros"].pop("contexto"),lambda x:x["parametros"].pop("max_custo_usd"),lambda x:x.update(parametros=[]),lambda x:x.update(id="A"*65),
 lambda x:x.update(executor="codex"),lambda x:x.update(tarefa="executar-prompt"),lambda x:x["parametros"].update(model="topo"),
]):_inval(n,m)
