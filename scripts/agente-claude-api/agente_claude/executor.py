"""Execução de processo filho: `shell=False`, argv em lista, `stdin=DEVNULL`, timeout.

Por que não `subprocess.run(..., timeout=)` direto: no Windows, matar só o filho
deixa netos (ex.: `npm.CMD` -> `cmd.exe` -> `node`) segurando o pipe, e o
`communicate()` que o `run` faz depois do kill pode ficar pendurado para sempre
(lição de 28-29/09: medição sem timeout parou uma rodada inteira). Aqui:
- a saída é lida numa thread, guardando só o começo e o fim (teto de memória);
- no timeout, a árvore inteira morre por `taskkill /PID <pid> /T /F` (argv fixo);
- Ctrl+C também mata a árvore antes de propagar.
"""

from __future__ import annotations

import os
import subprocess
import threading
import time
from dataclasses import dataclass

from .cerca import ambiente_limpo

TETO_PADRAO = 64 * 1024
TETO_VERIFICACAO = 128 * 1024
_FLAGS = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)


@dataclass
class Execucao:
    codigo: int | None
    saida: str
    bytes_total: int
    truncado: bool
    duracao_ms: int
    expirou: bool
    interrompido: bool = False


class _Coletor(threading.Thread):
    """Lê o pipe até EOF, guardando os primeiros 3/4 do teto e o último 1/4."""

    def __init__(self, fluxo, teto: int) -> None:
        super().__init__(daemon=True)
        self._fluxo = fluxo
        self._teto_cabeca = (teto * 3) // 4
        self._teto_cauda = teto - self._teto_cabeca
        self.cabeca = bytearray()
        self.cauda = bytearray()
        self.total = 0

    def run(self) -> None:
        try:
            while True:
                bloco = self._fluxo.read(65536)
                if not bloco:
                    break
                self.total += len(bloco)
                falta = self._teto_cabeca - len(self.cabeca)
                if falta > 0:
                    self.cabeca += bloco[:falta]
                    bloco = bloco[falta:]
                if bloco:
                    self.cauda += bloco
                    if len(self.cauda) > self._teto_cauda:
                        del self.cauda[: len(self.cauda) - self._teto_cauda]
        except (OSError, ValueError):
            pass

    def texto(self) -> tuple[str, bool]:
        guardado = len(self.cabeca) + len(self.cauda)
        omitidos = self.total - guardado
        if omitidos <= 0:
            return (bytes(self.cabeca) + bytes(self.cauda)).decode("utf-8", errors="replace"), False
        meio = f"\n[... {omitidos} bytes omitidos ...]\n".encode()
        return (bytes(self.cabeca) + meio + bytes(self.cauda)).decode("utf-8", errors="replace"), True


def _taskkill() -> str:
    raiz = os.environ.get("SYSTEMROOT") or r"C:\Windows"
    return os.path.join(raiz, "System32", "taskkill.exe")


def matar_arvore(proc) -> None:
    """Mata o processo e seus descendentes. No Windows, `taskkill /T /F` (argv fixo).

    O `taskkill` recebe o MESMO ambiente limpo dos outros filhos (achado A10): sem `env=`, ele
    herdaria o `os.environ` do agente, que contém `ERP_AGENTE_ANTHROPIC_KEY` quando a chave veio
    do processo.
    """
    if os.name == "nt":
        try:
            subprocess.run(
                [_taskkill(), "/PID", str(proc.pid), "/T", "/F"],
                shell=False,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                env=ambiente_limpo(),
                timeout=30,
            )
        except (OSError, subprocess.SubprocessError):
            pass
    try:
        proc.kill()
    except (OSError, AttributeError):
        pass


def executar(
    argv: list[str],
    cwd: str,
    env: dict[str, str],
    timeout_s: float,
    teto_bytes: int = TETO_PADRAO,
    popen=None,
) -> Execucao:
    """Roda `argv` (lista, executável absoluto) com `shell=False` e devolve a execução."""
    if not isinstance(argv, list) or not argv or not all(isinstance(a, str) for a in argv):
        raise TypeError("argv tem de ser lista de str não vazia")
    fabrica = popen or subprocess.Popen
    inicio = time.monotonic()
    proc = fabrica(
        argv,
        shell=False,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        cwd=cwd,
        env=env,
        creationflags=_FLAGS,
    )
    coletor = _Coletor(proc.stdout, teto_bytes)
    coletor.start()
    expirou = False
    try:
        codigo = proc.wait(timeout=timeout_s)
    except subprocess.TimeoutExpired:
        expirou = True
        matar_arvore(proc)
        try:
            codigo = proc.wait(timeout=30)
        except subprocess.TimeoutExpired:
            codigo = None
    except KeyboardInterrupt:
        matar_arvore(proc)
        raise
    coletor.join(timeout=10)
    if not coletor.is_alive():  # com leitura em curso, close() bloquearia na trava do buffer
        try:
            proc.stdout.close()
        except (OSError, AttributeError):
            pass
    saida, truncado = coletor.texto()
    return Execucao(
        codigo=codigo,
        saida=saida,
        bytes_total=coletor.total,
        truncado=truncado,
        duracao_ms=int((time.monotonic() - inicio) * 1000),
        expirou=expirou,
    )
