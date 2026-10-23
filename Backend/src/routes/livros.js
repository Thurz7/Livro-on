const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const router = express.Router();

// Busca livros pelo título ou termo pesquisado
router.get("/", async (req, res) => {
    try {
        const busca = req.query.busca || "";

// Consulta a API Gutendex
        const resposta = await axios.get("https://gutendex.com/books/", {
            params: {
                search: busca
            }
        });

 // Organiza os dados de cada livro
        const livros = resposta.data.results.map((livro) => ({
            id: livro.id,
            titulo: livro.title,
            autores: livro.authors.map((autor) => autor.name),
            idiomas: livro.languages,
            capa: livro.formats["image/jpeg"] || null,
            linkLeitura: livro.formats["text/html"] || null,
            downloads: livro.download_count
        }));

// Retorna os livros encontrados
        res.status(200).json(livros);

    } catch (erro) {
        console.error("Erro ao buscar livros:", erro.message);

        res.status(500).json({
            mensagem: "Erro ao buscar livros."
        });
    }
});

// Busca o texto de um livro do Projeto Gutenberg
router.get("/:id/leitura", async (req, res) => {
    try {
        const id = req.params.id;

        // Verifica se o ID é válido
        if (!/^\d+$/.test(id)) {
            return res.status(400).json({
                mensagem: "ID do livro inválido."
            });
        }

 // Busca o HTML do livro
        const resposta = await axios.get(
            `https://www.gutenberg.org/ebooks/${id}.html.images`,
            {
                timeout: 10000
            }
        );

        const $ = cheerio.load(resposta.data);

        // Remove elementos que não fazem parte da leitura
        $("script, style, nav, header, footer").remove();

        // Procura o conteúdo do livro
        let conteudo = $("#pg-scrolled");

// Usa o corpo da página caso o conteúdo não seja encontrado
        if (!conteudo.length) {
            conteudo = $("body");
        }

        const texto = conteudo.text().trim();

 // Retorna o texto do livro
        res.status(200).json({
            id: id,
            texto: texto
        });

    } catch (erro) {
        console.error("Erro ao buscar texto do livro:", erro.message);

        res.status(500).json({
            mensagem: "Não foi possível carregar o texto do livro."
        });
    }
});

// Busca os detalhes de um livro pelo ID
router.get("/:id", async (req, res) => {
    try {
        const id = req.params.id;

        if (!/^\d+$/.test(id)) {
            return res.status(400).json({
                mensagem: "ID do livro inválido."
            });
        }

        const resposta = await axios.get(
            `https://gutendex.com/books/${id}/`
        );

        const livro = resposta.data;

        res.status(200).json({
            id: livro.id,
            titulo: livro.title,
            autores: livro.authors.map((autor) => autor.name),
            ano: livro.publication_year || "Não informado",
            descricao: livro.summaries?.[0] || "Sinopse não disponível.",
            capa: livro.formats["image/jpeg"] || null,
            linkLeitura: livro.formats["text/html"] || null
        });
    } catch (erro) {
        console.error("Erro ao buscar detalhes do livro:", erro.message);

        res.status(500).json({
            mensagem: "Não foi possível carregar os detalhes do livro."
        });
    }
});
module.exports = router;