const express = require("express");
const axios = require("axios");

const router = express.Router();

const API = "https://api.mangadex.org";

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
        autor: autor?.attributes?.name || "Autor não informado",
        descricao:
            descricao["pt-br"] ||
            descricao.pt ||
            descricao.en ||
            Object.values(descricao)[0] ||
            "Descrição não disponível.",
        capa: nomeCapa
            ? `https://uploads.mangadex.org/covers/${manga.id}/${nomeCapa}.256.jpg`
            : null,
        status: atributos.status || "desconhecido"
    };
}

// Pesquisa mangás.
router.get("/", async (req, res) => {
    try {
        const busca = req.query.busca?.trim();

        if (!busca) {
            return res.status(400).json({
                mensagem: "Informe o termo da pesquisa."
            });
        }

        const params = new URLSearchParams();

        params.append("title", busca);
        params.append("limit", "20");
        params.append("includes[]", "author");
        params.append("includes[]", "cover_art");
        params.append("contentRating[]", "safe");
        params.append("contentRating[]", "suggestive");

        const resposta = await axios.get(
            `${API}/manga?${params.toString()}`,
            { timeout: 15000 }
        );

        const mangas = (resposta.data.data || []).map(organizarManga);

        return res.json(mangas);
    } catch (erro) {
        console.error("Erro ao pesquisar mangás:", erro.code || erro.message);

        return res.status(503).json({
            mensagem: "Não foi possível consultar os mangás."
        });
    }
});

// Lista os capítulos de um mangá.
router.get("/:id/capitulos", async (req, res) => {
    try {
        const { id } = req.params;

        const resposta = await axios.get(`${API}/manga/${id}/feed`, {
            params: {
                "translatedLanguage[]": ["pt-br", "pt", "en"],
                limit: 100,
                order: {
                    chapter: "asc"
                }
            },
            timeout: 15000
        });

        const capitulos = (resposta.data.data || []).map(capitulo => ({
            id: capitulo.id,
            capitulo: capitulo.attributes.chapter,
            volume: capitulo.attributes.volume,
            titulo: capitulo.attributes.title,
            idioma: capitulo.attributes.translatedLanguage,
            paginas: capitulo.attributes.pages
        }));

        return res.json(capitulos);
    } catch (erro) {
        console.error("Erro ao buscar capítulos:", erro.code || erro.message);

        return res.status(503).json({
            mensagem: "Não foi possível carregar os capítulos."
        });
    }
});

// Busca as páginas de um capítulo.
router.get("/capitulos/:id/paginas", async (req, res) => {
    try {
        const { id } = req.params;

        const resposta = await axios.get(
            `${API}/at-home/server/${id}`,
            { timeout: 15000 }
        );

        const dados = resposta.data;
        const hash = dados.chapter.hash;

        const paginas = dados.chapter.data.map((arquivo, indice) => ({
            numero: indice + 1,
            imagem: `${dados.baseUrl}/data/${hash}/${arquivo}`
        }));

        return res.json({
            capitulo: id,
            paginas
        });
    } catch (erro) {
        console.error("Erro ao buscar páginas:", erro.code || erro.message);

        return res.status(503).json({
            mensagem: "Não foi possível carregar as páginas."
        });
    }
});

// Busca os detalhes de um mangá.
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const params = new URLSearchParams();
        params.append("includes[]", "author");
        params.append("includes[]", "cover_art");

        const resposta = await axios.get(
            `${API}/manga/${id}?${params.toString()}`,
            { timeout: 15000 }
        );

        return res.json(organizarManga(resposta.data.data));
    } catch (erro) {
        console.error("Erro ao buscar detalhes do mangá:", erro.code || erro.message);

        return res.status(503).json({
            mensagem: "Não foi possível carregar os detalhes do mangá."
        });
    }
});

module.exports = router;