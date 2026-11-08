const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const router = express.Router();

const API = "https://gutendex.com/books/";

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

        const resposta = await axios.get(API, {
            params: { search: busca, page: 1 },
            timeout: 15000
        });

        const livros = (resposta.data.results || []).map(organizarLivro);

        return res.json(livros);
    } catch (erro) {
        console.error("Erro ao pesquisar livros:", erro.code || erro.message);

        return res.status(503).json({
            mensagem: "Não foi possível consultar os livros."
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

        const resposta = await axios.get(`${API}${id}`, {
            timeout: 15000
        });

        const livro = resposta.data;
        const formatos = livro.formats || {};

        const link = Object.entries(formatos).find(
            ([tipo, url]) => tipo.startsWith("text/html") && url
        )?.[1];

        if (!link) {
            return res.status(404).json({
                mensagem: "Conteúdo de leitura indisponível."
            });
        }

        const conteudo = await axios.get(link, {
            timeout: 20000,
            responseType: "text"
        });

        const $ = cheerio.load(conteudo.data);

        $("script, style, nav, header, footer, .pg-boilerplate").remove();

        const texto = $("#pg-scrolled").length
            ? $("#pg-scrolled").text()
            : $("body").text();

        return res.json({
            id: livro.id,
            titulo: livro.title || "Título indisponível",
            conteudo: texto.replace(/\s+/g, " ").trim()
        });
    } catch (erro) {
        console.error("Erro ao carregar leitura:", erro.code || erro.message);

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

        const resposta = await axios.get(`${API}${id}`, {
            timeout: 15000
        });

        return res.json(organizarLivro(resposta.data));
    } catch (erro) {
        console.error("Erro ao buscar detalhes do livro:", erro.code || erro.message);

        return res.status(503).json({
            mensagem: "Não foi possível carregar os detalhes do livro."
        });
    }
});

module.exports = router;