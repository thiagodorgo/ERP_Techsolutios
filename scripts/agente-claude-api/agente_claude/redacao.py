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
    # URL com senha. O esquema tem no máximo 32 caracteres (achado A6): com `*` ilimitado, um texto
    # como "yyyy…" custava O(n²) (16 KB = 1 s; 256 KB ≈ 4 min). Limitado, cada início testa no
    # máximo 32 caracteres: linear (256 KB ≈ 0,07 s). Esquema real tem bem menos de 32; com um
    # prefixo maior colado, o motor acha um início dentro dos 32 anteriores ao "://".
    (re.compile(r"([a-z][a-z0-9+.-]{0,31}://[^/\s:@]+:)[^@\s/]+(@)", re.IGNORECASE), r"\1[REDIGIDO]\2"),
    # JWT (N2 da reconferência, mesma classe do A6): com `eyJ…{8,}\.` o motor tentava um início em
    # CADA "eyJ" de uma sequência sem ponto e varria até o fim dela: 'eyJ'*n era O(n²) (64 KB = 1,1 s;
    # 256 KB = 17,6 s). Agora o início só acontece na borda de uma sequência [A-Za-z0-9_-] (lookbehind),
    # o prefixo até o 1º "eyJ" é atômico e os segmentos são possessivos: cada sequência é varrida uma
    # vez (linear). Não perde JWT colado: o início na borda alcança o 1º "eyJ" da sequência, e de
    # qualquer "eyJ" da mesma sequência o cabeçalho termina no mesmo ponto — redige-se o JWT inteiro
    # mais o que estiver colado antes dele. (Atômico e possessivo: Python >= 3.11.)
    (
        re.compile(
            r"(?<![A-Za-z0-9_-])(?>[A-Za-z0-9_-]*?eyJ)[A-Za-z0-9_-]{8,}+\.[A-Za-z0-9_-]{8,}+\.[A-Za-z0-9_-]{8,}+"
        ),
        "[REDIGIDO:jwt]",
    ),
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
