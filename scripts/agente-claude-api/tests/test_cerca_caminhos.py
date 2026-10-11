"""Cerca 1 — raiz confinada (plano §3.1 e a tabela de vetores §3.10).

Junction, symlink e nome 8.3 são criados DE VERDADE (F18, F35); `skipTest` só
quando a máquina nega (erro 1314 = sem privilégio de symlink; 8.3 desligado).
"""

import ctypes
import os
import tempfile
import unittest
from pathlib import Path

from agente_claude.cerca import CercaNegada, ContextoComandos, Raiz
from agente_claude.ferramentas import Ferramentas
from tests.fakes import EXE


def criar_junction(link: Path, alvo: Path) -> None:
    try:
        import _winapi

        _winapi.CreateJunction(str(alvo), str(link))
    except (ImportError, AttributeError):
        raise unittest.SkipTest("junction indisponível nesta plataforma")


def criar_symlink(link: Path, alvo: Path, diretorio: bool) -> None:
    try:
        os.symlink(str(alvo), str(link), target_is_directory=diretorio)
    except OSError as e:
        if getattr(e, "winerror", None) == 1314:
            raise unittest.SkipTest("sem privilégio para symlink (1314)")
        raise


def nome_curto(caminho: Path) -> str:
    try:
        buf = ctypes.create_unicode_buffer(32768)
        n = ctypes.windll.kernel32.GetShortPathNameW(str(caminho), buf, 32768)
    except AttributeError:
        raise unittest.SkipTest("GetShortPathNameW indisponível")
    if n == 0:
        raise unittest.SkipTest("GetShortPathNameW falhou")
    curto = os.path.basename(buf.value)
    if curto.lower() == caminho.name.lower():
        raise unittest.SkipTest("8.3 desligado neste volume")
    return curto


class BaseCaminhos(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.base = Path(self._tmp.name)
        self.raiz = self.base / "raiz"
        self.fora = self.base / "fora"
        (self.raiz / "src").mkdir(parents=True)
        self.fora.mkdir()
        (self.raiz / "src" / "app.ts").write_text("export const x = 1;\n", encoding="utf-8")
        (self.fora / "alvo.txt").write_text("SEGREDO-DE-FORA\n", encoding="utf-8")
        self.r = Raiz(self.raiz)

    def tearDown(self) -> None:
        # junctions/symlinks primeiro (rmdir não segue o link), depois o resto
        for p in sorted(self.base.rglob("*"), key=lambda x: len(str(x)), reverse=True):
            try:
                if p.is_symlink() or (hasattr(p, "is_junction") and p.is_junction()):
                    os.unlink(p) if p.is_file() or not p.is_dir() else os.rmdir(p)
            except OSError:
                pass
        self._tmp.cleanup()

    def negado(self, texto, raiz: Raiz | None = None) -> str:
        with self.assertRaises(CercaNegada, msg=repr(texto)) as ctx:
            (raiz or self.r).resolver(texto)
        return ctx.exception.motivo

    def ferramentas(self, abrir=open) -> Ferramentas:
        return Ferramentas(ContextoComandos(raiz=self.r, executaveis=dict(EXE), repo_gh="dono/repo"), abrir=abrir)


class TestCercaCaminhos(BaseCaminhos):
    def test_relativo_dentro_passa(self):
        alvo = os.path.normcase(os.path.realpath(self.raiz / "src" / "app.ts"))
        for texto in ("src/app.ts", "src\\app.ts", "./src/../src/app.ts", "src/./app.ts"):
            self.assertEqual(os.path.normcase(str(self.r.resolver(texto))), alvo, texto)

    def test_raiz_irma_com_prefixo_igual(self):
        irma = self.base / "w-ag-10"
        irma.mkdir()
        (irma / "x.txt").write_text("irma", encoding="utf-8")
        (self.base / "w-ag-1").mkdir()
        raiz1 = Raiz(self.base / "w-ag-1")
        self.negado("../w-ag-10/x.txt", raiz1)

    def test_ponto_ponto_negado(self):
        for texto in ("..", "../fora/alvo.txt", "src/../../fora/alvo.txt", "src/../../../x"):
            self.negado(texto)

    def test_absoluto_negado(self):
        for texto in (str(self.fora / "alvo.txt"), str(self.raiz / "src" / "app.ts"), "C:/Windows/win.ini",
                      "/etc/passwd", "\\Windows\\win.ini"):
            self.negado(texto)

    def test_outra_unidade_negada(self):
        for texto in ("D:\\x", "Z:", "D:x", "d:/x"):
            self.negado(texto)

    def test_unc_negada(self):
        for texto in ("\\\\localhost\\c$\\Windows", "//servidor/share/x", "\\/servidor/x", "/\\servidor\\x"):
            self.assertIn("UNC", self.negado(texto))

    def test_prefixo_longo_negado(self):
        dentro = str(self.raiz / "src" / "app.ts")
        self.negado("\\\\?\\" + dentro)
        self.negado("//?/" + dentro.replace("\\", "/"))

    def test_dispositivo_negado(self):
        self.negado("\\\\.\\PhysicalDrive0")
        for texto in ("NUL", "con.txt", "src/aux.ts", "COM1", "lpt9.log", "src/CON"):
            self.assertIn("dispositivo", self.negado(texto), texto)

    def test_ads_negado(self):
        for texto in ("src/app.ts:zone", "src/app.ts::$DATA", "a.txt:x:$DATA"):
            self.assertIn("':'", self.negado(texto))
        self.negado("x:$DATA")  # ':' na posição 1 = unidade: negado como absoluto

    def test_junction_para_fora_negada(self):
        criar_junction(self.raiz / "j", self.fora)
        self.assertIn("fora", self.negado("j/alvo.txt"))
        self.negado("j")

    def test_symlink_dir_para_fora_negado(self):
        criar_symlink(self.raiz / "symd", self.fora, diretorio=True)
        self.negado("symd/alvo.txt")

    def test_symlink_arquivo_para_fora_negado(self):
        criar_symlink(self.raiz / "symf.txt", self.fora / "alvo.txt", diretorio=False)
        self.negado("symf.txt")

    def test_junction_para_dentro_passa(self):
        criar_junction(self.raiz / "jd", self.raiz / "src")
        resolvido = self.r.resolver("jd/app.ts")
        self.assertEqual(os.path.normcase(str(resolvido)), os.path.normcase(os.path.realpath(self.raiz / "src" / "app.ts")))

    def test_maiuscula_minuscula_mesmo_arquivo(self):
        (self.raiz / ".env").write_text("X=1\n", encoding="utf-8")
        (self.raiz / ".git").write_text("gitdir: x\n", encoding="utf-8")
        self.assertEqual(
            os.path.normcase(str(self.r.resolver("SRC/App.TS"))),
            os.path.normcase(os.path.realpath(self.raiz / "src" / "app.ts")),
        )
        self.negado(".ENV")
        self.negado("NODE_MODULES/x/package.json")  # inexistente: só o normcase pega a caixa
        self.negado(".GIT/config")
        raiz_maiuscula = Raiz(str(self.raiz).upper())
        raiz_maiuscula.resolver("src/app.ts")

    def test_nome_curto_83_negado_quando_destino_fora(self):
        criar_junction(self.raiz / "ligacao_para_fora_longa", self.fora)
        curto = nome_curto(self.raiz / "ligacao_para_fora_longa")
        self.negado(f"{curto}/alvo.txt")  # abspath não expandiria; realpath expande e segue
        (self.raiz / "subdiretorio_longo_83").mkdir()
        curto_dir = nome_curto(self.raiz / "subdiretorio_longo_83")
        self.negado(f"{curto_dir}/../../fora/alvo.txt")

    def test_nome_curto_83_de_arquivo_protegido_negado(self):
        (self.raiz / ".env.local").write_text("SEGREDO=1\n", encoding="utf-8")
        curto = nome_curto(self.raiz / ".env.local")
        self.assertIn("protegido", self.negado(curto))  # o padrão casa no RESOLVIDO

    def test_nome_curto_83_dentro_passa(self):
        sub = self.raiz / "subdiretorio_longo_83"
        sub.mkdir()
        (sub / "arquivo.txt").write_text("ok", encoding="utf-8")
        curto = nome_curto(sub)
        resolvido = self.r.resolver(f"{curto}/arquivo.txt")
        self.assertEqual(os.path.normcase(str(resolvido)), os.path.normcase(os.path.realpath(sub / "arquivo.txt")))

    def test_ponto_e_espaco_finais_casam_no_resolvido(self):
        # Arquivos EXISTENTES: o Win32 abriria 'x.pem' pedido como 'x.pem.'; o realpath o devolve sem o ponto.
        for nome in (".env", "x.pem", "x.key", "segredo.pem"):
            (self.raiz / nome).write_text("SEGREDO=1\n", encoding="utf-8")
        for texto in (".env.", ".env ", "x.pem.", "x.key ", "segredo.pem. "):
            self.assertIn("protegido", self.negado(texto), repr(texto))
        # Inexistentes: nada a vazar, mas a cerca nega igual (fail-closed).
        for texto in ("nao_existe.pem.", "nao_existe.key ", "id_rsa."):
            self.assertIn("protegido", self.negado(texto), repr(texto))

    def test_env_pem_key_id_negados(self):
        for texto in (".env", ".env.local", "x.pem", "x.key", "id_rsa", "id_ed25519.pub", "src/.env.production", "certs/a.PEM"):
            self.assertIn("protegido", self.negado(texto), texto)

    def test_git_interno_e_node_modules_negados(self):
        (self.raiz / ".git").write_text("gitdir: C:/x/.git/worktrees/w\n", encoding="utf-8")
        for texto in (".git", ".git/config", "node_modules/x/package.json", "src/node_modules/y/index.js"):
            self.assertIn("protegido", self.negado(texto), texto)

    def test_vazio_e_controle_negados(self):
        for texto in ("", "a\x00b", "a\nb", "a\rb", None, 123, "x" * 401):
            self.negado(texto)


class TestLeituraConfinada(BaseCaminhos):
    def test_binario_negado(self):
        (self.raiz / "bin.dat").write_bytes(b"abc\x00def")
        res = self.ferramentas().executar("ler_arquivo", {"caminho": "bin.dat"})
        self.assertTrue(res.negado)
        self.assertIn("binário", res.motivo_negacao)

    def test_teto_bytes_e_linhas(self):
        (self.raiz / "muitas.txt").write_text("".join(f"linha {i}\n" for i in range(1, 3001)), encoding="utf-8")
        f = self.ferramentas()
        res = f.executar("ler_arquivo", {"caminho": "muitas.txt", "linha_inicial": None, "max_linhas": 5000})
        self.assertEqual(res.texto.count("\n"), 2000)  # 2000 linhas + "[truncado]"
        self.assertTrue(res.truncado)
        self.assertTrue(res.texto.endswith("[truncado]"))
        padrao = f.executar("ler_arquivo", {"caminho": "muitas.txt"})
        self.assertEqual(len(padrao.texto.splitlines()), 401)
        fim = f.executar("ler_arquivo", {"caminho": "muitas.txt", "linha_inicial": 2999})
        self.assertFalse(fim.truncado)
        self.assertIn("linha 3000", fim.texto)
        self.assertNotIn("linha 2998", fim.texto)
        (self.raiz / "grande.txt").write_text(("x" * 999 + "\n") * 300, encoding="utf-8")
        grande = f.executar("ler_arquivo", {"caminho": "grande.txt", "max_linhas": 2000})
        self.assertTrue(grande.truncado)
        self.assertLessEqual(grande.bytes, 256 * 1024)

    def test_listar_nao_segue_link(self):
        (self.fora / "segredo-de-fora.txt").write_text("x", encoding="utf-8")
        criar_junction(self.raiz / "j", self.fora)
        f = self.ferramentas()
        res = f.executar("listar_diretorio", {"caminho": "."})
        self.assertFalse(res.erro)
        self.assertIn("j <link>", res.texto)
        self.assertNotIn("segredo-de-fora", res.texto)
        self.assertTrue(f.executar("listar_diretorio", {"caminho": "j"}).negado)

    def test_raiz_trocada_depois_de_criar_e_recusada(self):
        (self.raiz / "alvo.txt").write_text("dentro", encoding="utf-8")
        r = Raiz(self.raiz)
        os.rename(self.raiz, self.base / "raiz-antiga")
        criar_junction(self.raiz, self.fora)
        # motivo EXATO: "fora da raiz" também contém "raiz" e mascararia a ausência da checagem
        self.assertEqual(self.negado("alvo.txt", r), "raiz do worktree mudou desde a criação")

    def test_hard_link_negado(self):
        # A1: o `realpath` não enxerga hard link; um arquivo dentro da raiz pode ser o de fora.
        try:
            os.link(self.fora / "alvo.txt", self.raiz / "src" / "hl.txt")
        except OSError as e:
            self.skipTest(f"hard link indisponível: {e}")
        aberturas = []

        def abrir(caminho, modo="r", *a, **k):
            aberturas.append(str(caminho))
            return open(caminho, modo, *a, **k)

        f = self.ferramentas(abrir=abrir)
        res = f.executar("ler_arquivo", {"caminho": "src/hl.txt"})
        self.assertTrue(res.negado)
        self.assertIn("hard link", res.motivo_negacao)
        self.assertNotIn("SEGREDO-DE-FORA", res.texto)
        self.assertEqual(aberturas, [])  # negado ANTES de abrir (lstat)
        # O alvo de fora também tem 2 links agora; dentro da raiz, um arquivo comum segue legível.
        self.assertFalse(f.executar("ler_arquivo", {"caminho": "src/app.ts"}).erro)

    def test_hard_link_criado_depois_do_lstat_negado_no_arquivo_aberto(self):
        # A1, 2ª camada: o `fstat` do arquivo ABERTO recusa, mesmo que o link nasça entre checar e abrir.
        destino = self.raiz / "src" / "app.ts"

        def abrir_criando_link(caminho, modo="r", *a, **k):
            os.link(destino, self.fora / "outro-nome.ts")
            return open(caminho, modo, *a, **k)

        res = self.ferramentas(abrir=abrir_criando_link).executar("ler_arquivo", {"caminho": "src/app.ts"})
        self.assertTrue((self.fora / "outro-nome.ts").exists())  # o link nasceu de fato
        self.assertTrue(res.negado)
        self.assertIn("hard link", res.motivo_negacao)
        self.assertNotIn("export const", res.texto)

    def test_conteudo_negado_nunca_e_lido(self):
        (self.raiz / ".env").write_text("SEGREDO=1\n", encoding="utf-8")
        criar_junction(self.raiz / "j", self.fora)
        aberturas = []

        def abrir(caminho, modo="r", *a, **k):
            aberturas.append(str(caminho))
            return open(caminho, modo, *a, **k)

        f = self.ferramentas(abrir=abrir)
        for caminho in (".env", "j/alvo.txt", "../fora/alvo.txt", "C:/Windows/win.ini"):
            res = f.executar("ler_arquivo", {"caminho": caminho})
            self.assertTrue(res.negado, caminho)
            self.assertNotIn("SEGREDO", res.texto)
        self.assertEqual(aberturas, [])
        controle = f.executar("ler_arquivo", {"caminho": "src/app.ts"})  # o falso está ligado
        self.assertFalse(controle.erro)
        self.assertEqual(len(aberturas), 1)


if __name__ == "__main__":
    unittest.main()
