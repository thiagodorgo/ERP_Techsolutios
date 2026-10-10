"""Redação de segredos em TUDO o que sai: resultado de ferramenta, auditoria,
parecer (JSON e MD), `erro.txt`, stdout/stderr da CLI e mensagens de exceção.

Dois mecanismos (plano §3.4): (1) substituição exata dos valores carregados (a
chave); (2) padrões. O conteúdo de arquivo NEGADO nunca chega aqui, porque nunca
é lido (a negação acontece antes de `open()`).
"""

from __future__ import annotations

import re

_PEM = re.compile(
    r"-----BEGIN [A-Z ]*PRIVATE KEY-----(?:.*?-----END [A-Z ]*PRIVATE KEY-----|.*\Z)",
    re.DOTALL,
)
# (padrão, substituição). Ordem importa: PEM antes, atribuição genérica por último.
_PADROES: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"sk-ant-[A-Za-z0-9_-]{8,}"), "[REDIGIDO:anthropic]"),
    (re.compile(r"(AKIA|ASIA)[0-9A-Z]{16}"), "[REDIGIDO:aws]"),
    (re.compile(r"(aws_secret_access_key\s*[=:]\s*)\S+", re.IGNORECASE), r"\1[REDIGIDO:aws]"),
    (re.compile(r"gh[pousr]_[A-Za-z0-9]{20,}"), "[REDIGIDO:github]"),
    (re.compile(r"github_pat_[A-Za-z0-9_]{20,}"), "[REDIGIDO:github]"),
    (re.compile(r"AIza[0-9A-Za-z_-]{30,}"), "[REDIGIDO:google]"),
    (re.compile(r"([a-z][a-z0-9+.-]*://[^/\s:@]+:)[^@\s/]+(@)", re.IGNORECASE), r"\1[REDIGIDO]\2"),
    (re.compile(r"eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}"), "[REDIGIDO:jwt]"),
    (
        re.compile(r"((?:api[_-]?key|secret|token|password|senha)\s*[=:]\s*[\"']?)[A-Za-z0-9_\-/+=]{16,}", re.IGNORECASE),
        r"\1[REDIGIDO]",
    ),
)


class Redator:
    def __init__(self, segredos_exatos: list[tuple[str, str]] | None = None) -> None:
        # (valor, rótulo). Valores curtos demais não entram (evita apagar texto comum).
        self._exatos = [(v, r) for v, r in (segredos_exatos or []) if isinstance(v, str) and len(v) >= 8]

    def redigir(self, texto: object) -> str:
        if not isinstance(texto, str):
            texto = str(texto)
        texto = _PEM.sub("[REDIGIDO:chave-privada]", texto)
        for valor, rotulo in self._exatos:
            texto = texto.replace(valor, f"[REDIGIDO:{rotulo}]")
        for padrao, troca in _PADROES:
            texto = padrao.sub(troca, texto)
        return texto

    def redigir_objeto(self, obj: object) -> object:
        """Redige recursivamente as strings de dicts/listas (as chaves são nossas)."""
        if isinstance(obj, str):
            return self.redigir(obj)
        if isinstance(obj, dict):
            return {k: self.redigir_objeto(v) for k, v in obj.items()}
        if isinstance(obj, (list, tuple)):
            return [self.redigir_objeto(v) for v in obj]
        return obj
