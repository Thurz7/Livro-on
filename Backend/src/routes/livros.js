const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const router = express.Router();

const API = "https://gutendex.com/books/";

const TEMPO_LIMITE = 60000;
const TENTATIVAS = 4;
const cache = new Map();
const requisicoesEmAndamento = new Map();
const TEMPO_CACHE = 5 * 60 * 1000;

// Aguarda antes de realizar uma nova tentativa.
function esperar(tempo) {
    return new Promise(resolve => setTimeout(resolve, tempo));
}

// Realiza requisições com novas tentativas em caso de falha.
async function requisitar(url, configuracao = {}) {
    for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
        try {
            return await axios.get(url, {
                ...configuracao,
                timeout: TEMPO_LIMITE
            });
        } catch (erro) {
            const status = erro.response?.status;

            const erroTemporario =
                !status ||
                status === 429 ||
                status >= 500;

            if (!erroTemporario || tentativa === TENTATIVAS) {
                throw erro;
            }

            const espera = 2000 * Math.pow(2, tentativa - 1);

            console.log(
                `Tentativa ${tentativa} falhou. Nova tentativa em ${espera / 1000}s.`
            );

            await esperar(espera);
        }
    }
}

// Organiza os dados dos livros.
function organizarLivro(livro) {
    const formatos = livro.formats || {};

    const capa = Object.entries(formatos).find(
        ([tipo, url]) => tipo.startsWith("image/") && url
    )?.[1];

    const linkLeitura = Object.entries(formatos).find(
        ([tipo, url]) => tipo.startsWith("text/html") && url
    )?.[1];

    return {
        id: livro.id,
        tipo: "livro",
        titulo: livro.title || "Título indisponível",
        autores: (livro.authors || []).map(autor => autor.name),
        idiomas: livro.languages || [],
        capa: capa || `https://www.gutenberg.org/cache/epub/${livro.id}/pg${livro.id}.cover.medium.jpg`,
        descricao: livro.summaries?.[0] || "Sinopse não disponível.",
        linkLeitura: linkLeitura || null,
        downloads: livro.download_count || 0
    };
}

// Pesquisa livros.
router.get("/", async (req, res) => {
    try {
        const busca = req.query.busca?.trim();

        if (!busca) {
            return res.status(400).json({
                mensagem: "Informe o termo da pesquisa."
            });
        }

        const chave = busca.toLowerCase();

        const resultadoCache = cache.get(chave);

        if (resultadoCache && Date.now() < resultadoCache.expira) {
            return res.json(resultadoCache.dados);
        }

        let requisicao = requisicoesEmAndamento.get(chave);

        if (!requisicao) {
            requisicao = requisitar(API, {
                params: {
                    search: busca,
                    page: 1
                }
            }).then(resposta => {
                const livros = (resposta.data.results || []).map(organizarLivro);

                cache.set(chave, {
                    dados: livros,
                    expira: Date.now() + TEMPO_CACHE
                });

                return livros;
            }).finally(() => {
                requisicoesEmAndamento.delete(chave);
            });

            requisicoesEmAndamento.set(chave, requisicao);
        }

        const livros = await requisicao;

        return res.json(livros);

    } catch (erro) {
        console.error(
            "Erro ao pesquisar livros:",
            erro.response?.status || erro.code || erro.message
        );

        return res.status(503).json({
            mensagem: "Não foi possível consultar os livros. Tente novamente."
        });
    }
});
// Busca o conteúdo para leitura.
router.get("/:id/leitura", async (req, res) => {
    try {
        const { id } = req.params;

        if (!/^\d+$/.test(id)) {
            return res.status(400).json({
                mensagem: "ID do livro inválido."
            });
        }

        const resposta = await requisitar(`${API}${id}`);
        const livro = resposta.data;
        const formatos = livro.formats || {};

        const linkHTML = Object.entries(formatos).find(
            ([tipo, url]) =>
                tipo.toLowerCase().startsWith("text/html") && url
        )?.[1];

        const linkTexto = Object.entries(formatos).find(
            ([tipo, url]) =>
                tipo.toLowerCase().startsWith("text/plain") && url
        )?.[1];

        if (!linkHTML && !linkTexto) {
            return res.status(404).json({
                mensagem: "Este livro não possui um formato de leitura disponível."
            });
        }

        let texto = "";
        let erroHTML = null;

        // Tenta carregar a versão HTML.
        if (linkHTML) {
            try {
                const conteudo = await requisitar(linkHTML, {
                    responseType: "text",
                    headers: {
                        "User-Agent": "Livro-on/1.0",
                        Accept: "text/html"
                    }
                });

                const $ = cheerio.load(conteudo.data);

                $("script, style, nav, header, footer").remove();

                texto = $("#pg-scrolled").length
                    ? $("#pg-scrolled").text()
                    : $("body").text();

            } catch (erro) {
                erroHTML = erro;
                console.log(
                    "Falha no HTML do Gutenberg:",
                    erro.response?.status || erro.code || erro.message
                );
            }
        }

        // Se o HTML falhar, tenta a versão TXT.
        if (!texto.trim() && linkTexto) {
            try {
                const conteudo = await requisitar(linkTexto, {
                    responseType: "text",
                    headers: {
                        "User-Agent": "Livro-on/1.0",
                        Accept: "text/plain"
                    }
                });

                texto = conteudo.data;

            } catch (erro) {
                console.error(
                    "Falha no TXT do Gutenberg:",
                    erro.response?.status || erro.code || erro.message
                );

                throw erro;
            }
        }

        texto = texto.replace(/\s+/g, " ").trim();

        if (!texto) {
            return res.status(404).json({
                mensagem: "O conteúdo deste livro está vazio."
            });
        }

        return res.json({
            id: livro.id,
            titulo: livro.title || "Título indisponível",
            texto
        });

    } catch (erro) {
        console.error("Erro ao carregar leitura:", {
            status: erro.response?.status,
            codigo: erro.code,
            mensagem: erro.message,
            url: erro.config?.url
        });

        return res.status(503).json({
            mensagem: "Não foi possível carregar o conteúdo do livro."
        });
    }
});

// Busca os detalhes de um livro.
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!/^\d+$/.test(id)) {
            return res.status(400).json({
                mensagem: "ID do livro inválido."
            });
        }

        const resposta = await requisitar(`${API}${id}`);

        return res.json(organizarLivro(resposta.data));

    } catch (erro) {
        console.error(
            "Erro ao buscar detalhes do livro:",
            erro.response?.status || erro.code || erro.message
        );

        return res.status(503).json({
            mensagem: "Não foi possível carregar os detalhes do livro."
        });
    }
});

module.exports = router;