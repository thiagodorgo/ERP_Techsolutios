"""Guardas da suíte (valem para TODO teste, porque o `discover -t .` importa este pacote).

- Sem rede: `socket.socket` passa a lançar (plano §6 B6, `test_nenhum_teste_abre_socket`).
- Sem registro real: `winreg.OpenKey`/`QueryValueEx` passam a lançar `OSError`. A chave
  verdadeira do dono está em HKCU\\Environment (F27); um teste que esquecesse de injetar
  o leitor falso a leria. Com a guarda, ele lê "ausente". Teste que precise do winreg
  usa `mock.patch` por cima desta guarda.
- Sem SDK: nenhum módulo da suíte importa `anthropic` (`test_suite_nao_importa_anthropic`).
"""

import socket


class _SocketProibido(socket.socket):
    def __init__(self, *args, **kwargs):
        raise RuntimeError("a suíte não abre socket (sem rede)")


socket.socket = _SocketProibido
GUARDA_SOCKET = _SocketProibido

try:
    import winreg
except ImportError:  # fora do Windows
    winreg = None

if winreg is not None:

    def _registro_bloqueado(*args, **kwargs):
        raise OSError("registro real bloqueado na suíte")

    winreg.OpenKey = _registro_bloqueado
    winreg.QueryValueEx = _registro_bloqueado

# Blindagem de escrita: nenhum teste (nem sob mutação) grava na pasta `saidas/` real nem
# cria `w-ag-*` no perfil do usuário. Medido na rodada de mutação: sob a mutação 3.7b, um
# teste que esperava recusa seguiu adiante sem `--saida` e escreveu fora do temporário.
import atexit as _atexit
import shutil as _shutil
import tempfile as _tempfile
from pathlib import Path as _Path

from agente_claude import tarefas as _tarefas

PASTA_TEMP_DA_SUITE = _Path(_tempfile.mkdtemp(prefix="agente-suite-"))
_tarefas.PASTA_SAIDAS = PASTA_TEMP_DA_SUITE / "saidas"
_atexit.register(_shutil.rmtree, PASTA_TEMP_DA_SUITE, True)
