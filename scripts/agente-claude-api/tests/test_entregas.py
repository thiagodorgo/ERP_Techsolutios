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
    def test_e4_reproducao_execucao_4_confere_as_dez_fontes_reais(self):
        fixture=json.loads((Path(__file__).parent/"fixtures/e4_execucao_4.json").read_text(encoding="utf-8"))
        resultado=conferir_fontes(fixture["fontes_lidas"],fixture["eventos"])
        self.assertEqual(10,len(resultado));self.assertTrue(all(f["conferida"] for f in resultado),resultado)
    def test_e4_normaliza_ponto_barra_separador_intervalo_e_busca(self):
        fontes=[{"arquivo":"./src\\modulo\\x.ts","linha_inicial":10,"linha_final":12,"evidencia":"livre"}]
        leitura={"ferramenta":"ler_arquivo","args":{"caminho":"src/modulo/x.ts","linha_inicial":10,"max_linhas":3},
                 "codigo_saida":0,"truncado":True,"linhas_resultado":[10,11,12]}
        busca={"ferramenta":"buscar","args":{"caminhos":["src/modulo"],"padrao":"x"},"codigo_saida":0,
               "fontes_resultado":[{"arquivo":"./src\\modulo\\x.ts","linha":12}]}
        self.assertTrue(conferir_fontes(fontes,[leitura])[0]["conferida"])
        fontes[0]["linha_final"]=999
        self.assertFalse(conferir_fontes(fontes,[leitura])[0]["conferida"])
        self.assertFalse(conferir_fontes(fontes,[busca])[0]["conferida"])
        fontes[0]["linha_inicial"]=fontes[0]["linha_final"]=12
        self.assertTrue(conferir_fontes(fontes,[busca])[0]["conferida"])
        busca["fontes_resultado"]=[{"arquivo":"src/modulo/outro.ts","linha":12}]
        self.assertFalse(conferir_fontes(fontes,[busca])[0]["conferida"])
    def test_e4_arquivo_inteiro_trecho_e_evento_negado_ficam_fail_closed(self):
        fonte={"arquivo":"src/x.ts","linha_inicial":1,"linha_final":3,"evidencia":"x"}
        leitura={"ferramenta":"ler_arquivo","args":{"caminho":"src/x.ts"},"codigo_saida":0,
                 "truncado":False,"linhas_resultado":[1,2,3]}
        self.assertTrue(conferir_fontes([fonte],[leitura])[0]["conferida"])
        fonte["linha_final"]=4
        self.assertFalse(conferir_fontes([fonte],[leitura])[0]["conferida"])
        fonte["linha_final"]=3
        leitura["negado"]=True
        self.assertFalse(conferir_fontes([fonte],[leitura])[0]["conferida"])
    def test_e4_fonte_nunca_lida_permanece_recusada(self):
        fixture=json.loads((Path(__file__).parent/"fixtures/e4_execucao_4.json").read_text(encoding="utf-8"))
        falsa={"arquivo":"docs/nunca-lido.md","linha_inicial":1,"linha_final":2,"evidencia":"inventada"}
        self.assertFalse(conferir_fontes([falsa],fixture["eventos"])[0]["conferida"])
        entrega=self.entrega();entrega["fontes_lidas"]=[falsa]
        with self.assertRaisesRegex(EntregaRecusada,"fonte não conferida"):
            self.pub(entrega,eventos=fixture["eventos"])

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
