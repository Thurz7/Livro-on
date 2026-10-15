const express = require("express");
const axios = require("axios");

const router = express.Router();

// Pesquisar livros e mangás ao mesmo tempo
router.get("/", async (req, res) => {
    try {
        // Receber e validar o termo pesquisado
        const busca = (req.query.busca || "").trim();

        if (!busca) {
            return res.status(400).json({
                mensagem: "Digite o nome de um livro ou mangá."
            });
        }

        // Consultar as duas APIs simultaneamente
        const [respostaLivros, respostaMangas] = await Promise.all([
            axios.get("https://gutendex.com/books/", {
                params: {
                    search: busca,
                    page: 1
                },
                timeout: 10000
            }),

            axios.get("https://api.mangadex.org/manga", {
                params: {
                    title: busca,
                    limit: 20,
                    includes: ["author", "cover_art"],
                    "contentRating[]": ["safe", "suggestive"]
                },
                timeout: 10000
            })
        ]);

        // Organizar os resultados dos livros
        const livros = respostaLivros.data.results.map((livro) => ({
            id: livro.id,
            titulo: livro.title,
            autores: livro.authors.map((autor) => autor.name),
            capa: livro.formats["image/jpeg"] || null,
            tipo: "livro"
        }));

        // Organizar os resultados dos mangás
        const mangas = respostaMangas.data.data.map((manga) => {
            const atributos = manga.attributes;

            const autor = manga.relationships.find(
                (relacao) => relacao.type === "author"
            );

            const capa = manga.relationships.find(
                (relacao) => relacao.type === "cover_art"
            );

            const nomeCapa = capa?.attributes?.fileName;

            const urlCapa = nomeCapa
                ? `https://uploads.mangadex.org/covers/${manga.id}/${nomeCapa}.256.jpg`
                : null;

            return {
                id: manga.id,
                titulo:
                    atributos.title["pt-br"] ||
                    atributos.title["en"] ||
                    Object.values(atributos.title)[0],
                autores: [autor?.attributes?.name || "Autor não informado"],
                capa: urlCapa,
                tipo: "manga"
            };
        });

        // Retornar os dois tipos de resultados
        res.status(200).json({
            busca,
            total: livros.length + mangas.length,
            livros,
            mangas
        });

    } catch (erro) {
        console.error("Erro na pesquisa unificada:", erro.message);

        res.status(500).json({
            mensagem: "Não foi possível realizar a pesquisa."
        });
    }
});

module.exports = router;
