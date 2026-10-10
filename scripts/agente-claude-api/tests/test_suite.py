"""A suíte não toca rede nem o SDK (plano §6 B5/B6)."""

import importlib
import pkgutil
import socket
import sys
import unittest
from pathlib import Path

import agente_claude
import tests


class TestSuite(unittest.TestCase):
    def test_suite_nao_importa_anthropic(self):
        for pacote in (agente_claude, tests):
            for info in pkgutil.iter_modules(pacote.__path__, pacote.__name__ + "."):
                if info.name.endswith(".__main__"):  # importar o __main__ executaria a CLI
                    continue
                importlib.import_module(info.name)
        self.assertNotIn("anthropic", sys.modules)
        # Defesa em profundidade: nenhum arquivo de teste importa o SDK no topo.
        for arquivo in Path(tests.__file__).parent.glob("*.py"):
            for linha in arquivo.read_text(encoding="utf-8").splitlines():
                limpa = linha.strip()
                self.assertFalse(limpa.startswith(("import anthropic", "from anthropic")), f"{arquivo.name}: {limpa}")

    def test_nenhum_teste_abre_socket(self):
        self.assertIs(socket.socket, tests.GUARDA_SOCKET)
        with self.assertRaises(RuntimeError):
            socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        with self.assertRaises(RuntimeError):
            socket.create_connection(("api.anthropic.com", 443), timeout=1)


if __name__ == "__main__":
    unittest.main()
