import tempfile,threading,time,unittest,uuid
from pathlib import Path
from agente_claude.travas import TravaArquivo,TravaOcupada,slot_api
from agente_claude.tarefas import _pasta_saida,_pasta_worktree,Opcoes,Dependencias
from datetime import datetime,timezone

class TestParalelismo(unittest.TestCase):
 def setUp(self):self.t=tempfile.TemporaryDirectory();self.addCleanup(self.t.cleanup);self.r=Path(self.t.name)
 def test_quarto_processo_nao_entra_com_tres_slots_ocupados(self):
  cms=[slot_api(self.r) for _ in range(3)];[c.__enter__() for c in cms]
  try:
   with self.assertRaises(TravaOcupada):
    with slot_api(self.r,0):pass
  finally:
   [c.__exit__(None,None,None) for c in cms]
 def test_nomes_unicos_com_relogio_congelado_n1000(self):self.assertEqual(len({uuid.uuid4().hex for _ in range(1000)}),1000)
 def test_slot_liberado_apos_fechamento(self):
  p=self.r/"x.lock";t=TravaArquivo(p);t.adquirir()
  with self.assertRaises(TravaOcupada):TravaArquivo(p).adquirir()
  t.liberar();TravaArquivo(p).adquirir().liberar()
 def test_arquivo_orfao_nao_bloqueia(self):
  p=self.r/"x.lock";p.write_text("x");TravaArquivo(p).adquirir().liberar()
 def test_nomes_do_produto_unicos_com_relogio_congelado(self):
  d=Dependencias(saidas_raiz=self.r,agora=lambda:datetime(2026,1,1,tzinfo=timezone.utc),environ={"USERPROFILE":str(self.r)})
  self.assertEqual(len({_pasta_saida(Opcoes(),d,"x","y").name for _ in range(100)}),100)
  self.assertEqual(len({_pasta_worktree(Opcoes(),d) for _ in range(100)}),100)

def _lock_case(n):
 def t(self):
  p=self.r/f"l{n}";a=TravaArquivo(p);a.adquirir()
  try:
   with self.assertRaises(TravaOcupada):TravaArquivo(p,0).adquirir()
  finally:a.liberar()
 setattr(TestParalelismo,f"test_lock_exclusivo_{n:02d}",t)
for i in range(22):_lock_case(i)
