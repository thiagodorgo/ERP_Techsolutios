"""Locks interprocesso de byte; o arquivo não é a trava, o descritor é."""

from __future__ import annotations

import contextlib
import os
import time
from pathlib import Path


class TravaOcupada(TimeoutError):
    pass


class TravaArquivo:
    def __init__(self, caminho: Path, timeout_s: float = 0.0, intervalo_s: float = 0.02):
        self.caminho, self.timeout_s, self.intervalo_s = Path(caminho), timeout_s, intervalo_s
        self._fh = None

    def adquirir(self):
        self.caminho.parent.mkdir(parents=True, exist_ok=True)
        self._fh = open(self.caminho, "a+b")
        limite = time.monotonic() + self.timeout_s
        while True:
            try:
                if os.name == "nt":
                    import msvcrt
                    self._fh.seek(0); self._fh.write(b"0"); self._fh.flush(); self._fh.seek(0)
                    msvcrt.locking(self._fh.fileno(), msvcrt.LK_NBLCK, 1)
                else:
                    import fcntl
                    fcntl.flock(self._fh.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                return self
            except OSError:
                if time.monotonic() >= limite:
                    self._fh.close(); self._fh = None
                    raise TravaOcupada(str(self.caminho))
                time.sleep(self.intervalo_s)

    def liberar(self):
        if not self._fh:
            return
        try:
            if os.name == "nt":
                import msvcrt
                self._fh.seek(0); msvcrt.locking(self._fh.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl
                fcntl.flock(self._fh.fileno(), fcntl.LOCK_UN)
        finally:
            self._fh.close(); self._fh = None

    def __enter__(self): return self.adquirir()
    def __exit__(self, *_): self.liberar()


@contextlib.contextmanager
def slot_api(raiz: Path, timeout_s: float = 0.0):
    ultimo = None
    limite = time.monotonic() + timeout_s
    while True:
        for n in range(3):
            trava = TravaArquivo(Path(raiz) / ".locks" / f"api-{n}.lock", 0)
            try:
                trava.adquirir(); yield n; trava.liberar(); return
            except TravaOcupada as e:
                ultimo = e
        if time.monotonic() >= limite:
            raise TravaOcupada("três slots da API ocupados") from ultimo
        time.sleep(0.02)
