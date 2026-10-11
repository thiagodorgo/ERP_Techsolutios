import json,tempfile,unittest
from pathlib import Path
from agente_claude.entregas import publicar,EntregaRecusada,TIPOS,conferir_fontes,validar
from agente_claude.redacao import Redator

class TestEntregas(unittest.TestCase):
    def setUp(self):self.t=tempfile.TemporaryDirectory();self.addCleanup(self.t.cleanup);self.r=Path(self.t.name);self.s=self.r/"s";self.red=Redator([("CANARIO-SECRETO","x")])
    def evento(self):return {"ferramenta":"ler_arquivo","entrada":{"caminho":"x.md"},"negado":False}
    def entrega(self,t="registro"):return {"tipo":t,"texto_markdown":"ok","fontes_lidas":[{"arquivo":"x.md","linha_inicial":1,"linha_final":2,"evidencia":'ler_arquivo {"caminho": "x.md"}'}],"limitacoes":[]}
    def pub(self,e=None,t="registro",eventos=None):return publicar(entrega=e or self.entrega(t),tipo_esperado=t,pasta_saida=self.s,sha="a"*40,contexto_md5="b"*32,eventos=[self.evento()] if eventos is None else eventos,redator=self.red)
    def test_redigir_tipos_validos_e_tipo_divergente_recusado(self):
        for n,t in enumerate(TIPOS):self.s=self.r/f"s{n}";self.pub(self.entrega(t),t)
        self.s=self.r/"bad"
        with self.assertRaises(EntregaRecusada):self.pub(self.entrega("ata"),"registro")
    def test_validar_tipo_divergente_recusado(self):
        with self.assertRaises(EntregaRecusada):validar(self.entrega("ata"),"registro")
    def test_redigir_fonte_inventada_nao_e_conferida(self):self.assertFalse(conferir_fontes(self.entrega()["fontes_lidas"],[])[0]["conferida"])
    def test_registro_falha_fechado_com_fonte_inventada(self):
        with self.assertRaises(EntregaRecusada):self.pub(eventos=[])
    def test_redigir_segredo_e_nul_redigidos_ou_recusados(self):
        e=self.entrega();e["texto_markdown"]="CANARIO-SECRETO";self.pub(e);self.assertNotIn("CANARIO-SECRETO",(self.s/"entregavel.md").read_text())
        self.s=self.r/"nul";e=self.entrega();e["texto_markdown"]="x\0y"
        with self.assertRaises(EntregaRecusada):self.pub(e)
    def test_redigir_nao_escreve_no_repo(self):self.pub();self.assertEqual({p.name for p in self.s.iterdir()},{"entregavel.md","fontes-lidas.json"})

def _ok(nome,tipo,texto):
 def teste(self):
  self.s=self.r/nome;e=self.entrega(tipo);e["texto_markdown"]=texto;self.pub(e,tipo);self.assertTrue((self.s/"entregavel.md").is_file());json.loads((self.s/"fontes-lidas.json").read_text())
 setattr(TestEntregas,"test_saida_"+nome,teste)
for i in range(20):_ok(f"caso_{i:02d}",TIPOS[i%len(TIPOS)],f"# texto {i}\n")

def _bad(nome,mut):
 def teste(self):
  e=self.entrega();mut(e)
  with self.assertRaises(EntregaRecusada):self.pub(e)
 setattr(TestEntregas,"test_recusa_"+nome,teste)
for n,m in {"sem_tipo":lambda e:e.pop("tipo"),"tipo_extra":lambda e:e.update(tipo="x"),"texto_int":lambda e:e.update(texto_markdown=1),"texto_none":lambda e:e.update(texto_markdown=None),"texto_grande":lambda e:e.update(texto_markdown="x"*(256*1024+1))}.items():_bad(n,m)
