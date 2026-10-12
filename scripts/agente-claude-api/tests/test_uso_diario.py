import json,tempfile,unittest,threading
from datetime import datetime,timezone
from decimal import Decimal
from pathlib import Path
from agente_claude.uso_diario import teto_do_ambiente,ControladorUso,UsoRecusado

NOW=datetime(2026,10,11,12,tzinfo=timezone.utc)
class TestUsoDiario(unittest.TestCase):
 def setUp(self):self.t=tempfile.TemporaryDirectory();self.addCleanup(self.t.cleanup);self.r=Path(self.t.name);self.c=ControladorUso(self.r,teto=Decimal("15"),agora=lambda:NOW)
 def test_teto_diario_decimal_limites_e_env(self):
  self.assertEqual(teto_do_ambiente({}),Decimal("15.00"));self.assertEqual(teto_do_ambiente({"ERP_AGENTE_TETO_DIARIO_USD":"25.00"}),Decimal("25"));self.c.reservar("x",Decimal("15"),self.r/"x")
 def test_acima_recusa(self):
  with self.assertRaises(UsoRecusado):self.c.reservar("x",Decimal("15.01"),self.r/"x")
 def test_uso_diario_soma_resumos_e_falha_fechado(self):
  p=self.r/"x";p.mkdir();(p/"resumo.json").write_text('{',encoding="utf-8")
  with self.assertRaises(UsoRecusado):self.c.reservar("e",Decimal("1"),p)
 def test_erro_api_sem_usage_nao_libera_reserva(self):
  self.c.reservar("a",Decimal("10"),self.r/"a")
  with self.assertRaises(UsoRecusado):self.c.reservar("b",Decimal("6"),self.r/"b")
 def test_conclusao_remove_reserva(self):
  self.c.reservar("a",Decimal("5"),self.r/"a");self.c.concluir("a",Decimal("5"),Decimal("2"),self.r/"a")
  self.c.reservar("b",Decimal("10"),self.r/"b")
 def test_duas_execucoes_paralelas_nao_furam_teto_n50(self):
  for n in range(50):
   raiz=self.r/f"r{n}";g=raiz/"g";g.mkdir(parents=True);(g/"resumo.json").write_text(json.dumps({"inicio":{"inicio_utc":"2026-10-11T00:00:00Z","execucao_id":"gasto"},"fim":{"custo":{"usd_estimado":"10"}}}))
   barreira=threading.Barrier(2);result=[]
   def f(i):
    c=ControladorUso(raiz,teto=Decimal("15"),agora=lambda:NOW);barreira.wait()
    try:c.reservar(f"e{i}",Decimal("4"),raiz/f"e{i}");result.append("ok")
    except UsoRecusado:result.append("recusa")
   ts=[threading.Thread(target=f,args=(i,)) for i in range(2)];[t.start() for t in ts];[t.join(5) for t in ts];self.assertCountEqual(result,["ok","recusa"])
 def test_cliente_so_depois_da_reserva_e_simulacao_nao_reserva(self):
  src=(Path(__file__).parents[1]/"agente_claude/tarefas.py").read_text(encoding="utf-8");bloco=src[src.index("def executar_tarefa"):src.index("def parecer_de_emergencia")]
  self.assertLess(bloco.index("controlador.reservar"),bloco.index("_criar_modelo("));self.assertIn("if not opcoes.simular",bloco)
 def test_falha_nao_conclui_reserva(self):
  src=(Path(__file__).parents[1]/"agente_claude/tarefas.py").read_text(encoding="utf-8");self.assertIn("if reservado and controlador is not None and codigo in (0, 2):",src)

def _env(n,v):
 def t(self):
  with self.assertRaises(UsoRecusado):teto_do_ambiente({"ERP_AGENTE_TETO_DIARIO_USD":v})
 setattr(TestUsoDiario,"test_env_invalida_"+n,t)
for n,v in enumerate(["0","-1","NaN","Infinity","-Infinity","abc",""," ","1,2","--1","+NaN","sNaN"]):_env(str(n),v)

def _reserva(n,v):
 def t(self):
  if v<=15:self.c.reservar(f"e{n}",Decimal(str(v)),self.r/f"e{n}");self.assertTrue((self.r/"uso-2026-10-11.jsonl").exists())
  else:
   with self.assertRaises(UsoRecusado):self.c.reservar(f"e{n}",Decimal(str(v)),self.r/f"e{n}")
 setattr(TestUsoDiario,"test_limite_reserva_"+str(n),t)
for n,v in enumerate([0,0.01,1,2,3,4,5,6,7,8,9,10,11,12,13,14,14.99,15,15.01,16]):_reserva(n,v)
