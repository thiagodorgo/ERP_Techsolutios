import json,tempfile,unittest
from pathlib import Path
from agente_claude.patches import analisar,publicar,PatchRecusado
from agente_claude.executor import Execucao

def diff(path="src/x.txt"):
 return f"diff --git a/{path} b/{path}\n--- a/{path}\n+++ b/{path}\n@@ -1 +1 @@\n-a\n+b\n"
class Ex:
 def __init__(self,check=0,mutar=False):self.check=check;self.mutar=mutar;self.n=0;self.chamadas=[]
 def __call__(self,argv,**kw):
  self.chamadas.append(argv)
  if "status" in argv:self.n+=1;out=" M x" if self.mutar and self.n>1 else ""
  else:out=""
  return Execucao(codigo=self.check if "apply" in argv else 0,saida=out,bytes_total=len(out),truncado=False,duracao_ms=1,expirou=False)
class TestPatches(unittest.TestCase):
 def setUp(self):self.t=tempfile.TemporaryDirectory();self.addCleanup(self.t.cleanup);self.r=Path(self.t.name);self.w=self.r/"w";self.w.mkdir();self.s=self.r/"s"
 def pub(self,d=None,ex=None,sha="a"*40):return publicar(entrega={"base_sha":sha,"diff_unificado":d or diff()},sha_efetivo="a"*40,contexto_md5="b"*32,pasta_saida=self.s,worktree=self.w,git="git",executar=ex or Ex())
 def test_patch_check_nao_muda_worktree_indice_nem_status(self):
  ex=Ex();m=self.pub(ex=ex);self.assertTrue(m["worktree_inalterado"]);self.assertIn("--check",ex.chamadas[1]);self.assertTrue((self.s/"proposta.patch").exists())
 def test_patch_sha_divergente_ou_check_vermelho_nao_publica_patch(self):
  with self.assertRaises(PatchRecusado):self.pub(sha="b"*40)
  with self.assertRaises(PatchRecusado):self.pub(ex=Ex(check=1))
 def test_patch_manifesto_derivado_nao_do_modelo(self):self.assertEqual(self.pub()["sha256"],analisar(diff())["sha256"])
 def test_mutacao_do_worktree_recusa(self):
  with self.assertRaises(PatchRecusado):self.pub(ex=Ex(mutar=True))
 def test_patch_formas_nao_textuais_recusadas(self):
  for x in ("GIT binary patch","rename from x","new file mode 120000","old mode 100644\nnew mode 100755"):
   with self.subTest(x=x),self.assertRaises(PatchRecusado):analisar(diff()+x+"\n")
 def test_segundo_arquivo_tambem_e_validado(self):
  with self.assertRaises(PatchRecusado):analisar(diff()+diff(".env.segundo"))

def _bad_path(n,p):
 def t(self):
  with self.assertRaises(PatchRecusado):analisar(diff(p))
 setattr(TestPatches,"test_patch_matriz_caminhos_negados_"+n,t)
for n,p in {"env":".env","envprod":"cfg/.env.prod","git":".git/config","node":"node_modules/x","dotdot":"../x","back":"src\\x","abs":"/x","ads":"src/x:ads","key":"id_rsa","pem":"x.pem","quote":"x\"y","ctrl":"x\ty","empty":""}.items():_bad_path(n,p)

def _valid(n,p):
 def t(self):self.assertEqual(analisar(diff(p))["hunks"],1)
 setattr(TestPatches,"test_patch_textual_valido_"+str(n),t)
for n,p in enumerate(["src/a.ts","docs/x.md","frontend/a.tsx","tests/a.test.ts","scripts/x.mjs","mobile/lib/a.dart","a.txt","x/y/z.json","README.md","agent-orchestration/x.md","docs/revisoes/GOV/x.md","scripts/agente-claude-api/x.py","src/a-b_c.ts","tests/ü.txt","frontend/A1.ts","docs/a1.md","docs/a2.md","docs/a3.md","docs/a4.md","docs/a5.md","docs/a6.md"]):_valid(n,p)
