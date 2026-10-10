"""Cerca 6 — parada: arquivo STOP e Ctrl+C gravam parcial (plano §3.6, estilo P7)."""

import json
import unittest

from tests.fakes import Cenario, ExecutorFalso, ModeloFalso, WorktreeFalso, resposta, resposta_parecer, texto, uso


def criar_stop(pasta):
    def efeito(argv, execf):
        (pasta / "STOP").write_text("", encoding="utf-8")  # vazio: o conteúdo é irrelevante

    return efeito


class TestParada(unittest.TestCase):
    def novo(self, modelo, **kw) -> Cenario:
        cen = Cenario(modelo, **kw)
        self.addCleanup(cen.limpar)
        return cen

    def test_stop_antes_do_modelo_encerra_sem_chamar(self):
        modelo = ModeloFalso([resposta(uso("git_ls_files", {}))], padrao=resposta_parecer())
        cen = self.novo(modelo)
        cen.executor.efeito = criar_stop(cen.pasta)  # STOP nasce antes do 2º turno
        cen.rodar()
        self.assertEqual(len(modelo.chamadas), 1)
        self.assertEqual(cen.codigo, 2)
        self.assertTrue(cen.parecer["parcial"])
        self.assertEqual(cen.parecer["motivo_parcial"], "STOP")
        self.assertTrue(any(l.get("nome") == "stop_detectado" for l in cen.linhas_auditoria()))

    def test_stop_entre_ferramentas_do_mesmo_turno(self):
        modelo = ModeloFalso([resposta(uso("git_ls_files", {}), uso("git_ls_files", {}), uso("git_ls_files", {}))],
                             padrao=resposta_parecer())
        cen = self.novo(modelo)
        cen.executor.efeito = criar_stop(cen.pasta)
        cen.rodar()
        self.assertEqual(len(cen.executor.chamadas), 1)
        self.assertEqual(len(modelo.chamadas), 1)
        self.assertEqual(cen.parecer["motivo_parcial"], "STOP")
        paradas = [l for l in cen.linhas_auditoria() if l["tipo"] == "ferramenta" and l["motivo_negacao"] == "STOP"]
        self.assertEqual(len(paradas), 2)

    def test_ctrl_c_no_laco_grava_parcial(self):
        def interromper(argv, execf):
            raise KeyboardInterrupt

        modelo = ModeloFalso([resposta(uso("git_ls_files", {}))], padrao=resposta_parecer())
        cen = self.novo(modelo, executor=ExecutorFalso(efeito=interromper)).rodar()
        self.assertEqual(cen.codigo, 2)
        self.assertEqual(cen.parecer["motivo_parcial"], "ctrl_c")
        self.assertEqual(len(modelo.chamadas), 1)  # o modelo não é chamado de novo
        self.assertTrue((cen.pasta / "resumo.json").exists())
        self.assertTrue(cen.worktree.removido)
        interrompida = [l for l in cen.linhas_auditoria() if l["tipo"] == "ferramenta" and l.get("interrompido")]
        self.assertEqual(len(interrompida), 1)
        # o parcial é gravado PELO LAÇO (o 2º nível, na tarefa, é rede de segurança e não pode mascarar)
        ctrl_c = [l for l in cen.linhas_auditoria() if l.get("nome") == "ctrl_c"]
        self.assertEqual([l["detalhe"] for l in ctrl_c], ["interrompido no laço; o modelo não é chamado de novo"])

    def test_ctrl_c_durante_limpeza_nao_apaga_evidencia(self):
        def interromper(argv, execf):
            raise KeyboardInterrupt

        modelo = ModeloFalso([resposta(uso("git_ls_files", {}))], padrao=resposta_parecer())
        cen = self.novo(modelo, executor=ExecutorFalso(efeito=interromper))
        cen.worktree = WorktreeFalso(str(cen.raiz), falha_remocao=KeyboardInterrupt())
        cen.rodar()
        for nome in ("parecer.json", "parecer.md", "auditoria.jsonl", "resumo.json"):
            self.assertTrue((cen.pasta / nome).exists(), nome)
        self.assertEqual(cen.codigo, 2)
        self.assertFalse(cen.parecer["execucao"]["worktree_removido"])
        self.assertIn("worktree remove --force", cen.parecer["execucao"]["comando_limpeza"])
        self.assertIn("worktree remove --force", (cen.pasta / "parecer.md").read_text(encoding="utf-8"))

    def test_parcial_tem_ultimo_texto_e_proximo_passo(self):
        plano = "Li o diff. Falta conferir src/x.ts; próximo passo: ler_arquivo src/x.ts."
        modelo = ModeloFalso([resposta(texto(plano), uso("git_ls_files", {}))], padrao=resposta_parecer())
        cen = self.novo(modelo)
        cen.executor.efeito = criar_stop(cen.pasta)
        cen.rodar(alvo={"pr": 7, "sha": "c" * 40, "base": "main", "titulo": "t", "url": "u"})
        p = json.loads((cen.pasta / "parecer.json").read_text(encoding="utf-8"))
        self.assertTrue(p["parcial"])
        self.assertEqual(p["veredito"], "inconclusivo")
        self.assertEqual(p["resumo"], plano)  # falta + próximo passo, nas palavras do modelo
        self.assertEqual(p["ultimo_texto_do_modelo"], plano)
        self.assertEqual(p["alvo"]["sha"], "c" * 40)  # head medido
        self.assertEqual([c["ferramenta"] for c in p["comandos_executados"]], ["git_ls_files"])  # o que foi feito


if __name__ == "__main__":
    unittest.main()
