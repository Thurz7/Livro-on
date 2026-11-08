const express = require("express");
const axios = require("axios");

const router = express.Router();

const GUTENDEX = "https://gutendex.com/books/";
const MANGADEX = "https://api.mangadex.org/manga";

// Organiza os dados dos livros.
function organizarLivro(livro) {
    const formatos = livro.formats || {};

    const capa = Object.entries(formatos).find(
        ([tipo, url]) => tipo.startsWith("image/") && url
    )?.[1];

    const link = Object.entries(formatos).find(
        ([tipo, url]) => tipo.startsWith("text/html") && url
    )?.[1];

    return {
        id: livro.id,
        tipo: "livro",
        titulo: livro.title || "Título indisponível",
        autores: (livro.authors || []).map(autor => autor.name),
        capa: capa || `https://www.gutenberg.org/cache/epub/${livro.id}/pg${livro.id}.cover.medium.jpg`,
        descricao: livro.summaries?.[0] || "Sinopse não disponível.",
        idioma: livro.languages || [],
        link: link || null
    };
}

// Organiza os dados dos mangás.
function organizarManga(manga) {
    const atributos = manga.attributes || {};
    const relacionamentos = manga.relationships || [];

    const titulo = atributos.title || {};
    const descricao = atributos.description || {};

    const autor = relacionamentos.find(
        relacao => relacao.type === "author"
    );

    const capa = relacionamentos.find(
        relacao => relacao.type === "cover_art"
    );

    const nomeCapa = capa?.attributes?.fileName;

    return {
        id: manga.id,
        tipo: "manga",
        titulo:
            titulo["pt-br"] ||
            titulo.pt ||
            titulo.en ||
            Object.values(titulo)[0] ||
            "Título indisponível",
        autores: autor?.attributes?.name
            ? [autor.attributes.name]
            : [],
        capa: nomeCapa
            ? `https://uploads.mangadex.org/covers/${manga.id}/${nomeCapa}.256.jpg`
            : null,
        descricao:
            descricao["pt-br"] ||
            descricao.pt ||
            descricao.en ||
            Object.values(descricao)[0] ||
            "Descrição não disponível.",
        status: atributos.status || "desconhecido",
        link: `https://mangadex.org/title/${manga.id}`
    };
}

// Pesquisa livros e mangás.
router.get("/", async (req, res) => {
    const busca = req.query.busca?.trim();

    if (!busca) {
        return res.status(400).json({
            mensagem: "Informe o termo da pesquisa."
        });
    }

    try {
        const paramsManga = new URLSearchParams();

        paramsManga.append("title", busca);
        paramsManga.append("limit", "20");
        paramsManga.append("includes[]", "author");
        paramsManga.append("includes[]", "cover_art");
        paramsManga.append("contentRating[]", "safe");
        paramsManga.append("contentRating[]", "suggestive");

        const respostas = await Promise.allSettled([
            axios.get(GUTENDEX, {
                params: {
                    search: busca,
                    page: 1
                },
                timeout: 15000
            }),

            axios.get(`${MANGADEX}?${paramsManga.toString()}`, {
                timeout: 20000
            })
        ]);

        const erroLivros = respostas[0].status === "rejected";
        const erroMangas = respostas[1].status === "rejected";

        const dadosLivros = erroLivros
            ? []
            : respostas[0].value.data.results || [];

        const dadosMangas = erroMangas
            ? []
            : respostas[1].value.data.data || [];

        const livros = dadosLivros.map(organizarLivro);
        const mangas = dadosMangas.map(organizarManga);

        if (erroLivros) {
            console.error(
                "Erro Gutendex:",
                respostas[0].reason.code || respostas[0].reason.message
            );
        }

        if (erroMangas) {
            console.error(
                "Erro MangaDex:",
                respostas[1].reason.code || respostas[1].reason.message
            );
        }

        return res.json({
            busca,
            total: livros.length + mangas.length,
            livros,
            mangas,
            avisos: {
                livros: erroLivros
                    ? "Não foi possível consultar os livros."
                    : null,
                mangas: erroMangas
                    ? "Não foi possível consultar os mangás."
                    : null
            }
        });
    } catch (erro) {
        console.error("Erro na pesquisa:", erro.message);

        return res.status(500).json({
            mensagem: "Não foi possível realizar a pesquisa."
        });
    }
});

module.exports = router;