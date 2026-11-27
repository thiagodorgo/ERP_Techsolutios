// B-MARCA-LOGIN-SIDEBAR (fatia L) — a marca Pátio Sul ERP (D-DONO-2511-MARCA-PATIOSUL): o nome e o endereço das imagens.
// `new URL(…, import.meta.url)` (risco R1 do plano): no build o Vite resolve o arquivo e põe a marca de versão no nome
// (`dist/assets/`); nos testes, que rodam em Node sem carregador de imagem, vira um endereço de arquivo.
// Os dois logos vão SEM a linha do site do cliente, porque o repositório é público (P-MARCA-LOGO-SEM-SITE):
//   - o de letras amarelas, transparente (Grafite e Preta): 709 × 259, recortado na linha 259;
//   - o de letras pretas (Branca, misturado ao fundo claro): 709 × 258, recortado na linha 1077 e reduzido.

export const PATIOSUL_NOME = "Pátio Sul ERP";
export const PATIOSUL_SLOGAN = "Gestão de pátio, guincho e leilão em um só sistema.";
export const PATIOSUL_LOGO_ALT = "Pátio Sul Brasil";

export const PATIOSUL_LOGO_LOGIN = new URL("./patiosul-logo-login.png", import.meta.url).href;
export const PATIOSUL_LOGO_LOGIN_ESCURO = new URL("./patiosul-logo-login-escuro.png", import.meta.url).href;
