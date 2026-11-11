const express = require("express");
const axios = require("axios");

const router = express.Router();

const API = "https://api.mangadex.org";

const TEMPO_LIMITE = 60000;
const TENTATIVAS = 4;
const TEMPO_CACHE = 5 * 60 * 1000;

const cache = new Map();

// Aguarda antes de realizar uma nova tentativa.
function esperar(tempo) {
    return new Promise(resolve => setTimeout(resolve, tempo));
}

// Realiza requisições com novas tentativas.
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
                `MangaDex: tentativa ${tentativa} falhou. Nova tentativa em ${espera / 1000}s.`
            );

            await esperar(espera);
        }
    }
}

// Consulta o cache antes de realizar uma requisição.
async function consultar(url, configuracao = {}, tempoCache = TEMPO_CACHE) {
    const chave = url + JSON.stringify(configuracao.params || {});

    const armazenado = cache.get(chave);

    if (armazenado && Date.now() < armazenado.expira) {
        return armazenado.dados;
    }

    const resposta = await requisitar(url, configuracao);

    cache.set(chave, {
        dados: resposta.data,
        expira: Date.now() + tempoCache
    });

    return resposta.data;
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

        const dados = await consultar(
            `${API}/manga?${params.toString()}`
        );

        const mangas = (dados.data || []).map(organizarManga);

        return res.json(mangas);

    } catch (erro) {
        console.error(
            "Erro ao pesquisar mangás:",
            erro.response?.status || erro.code || erro.message
        );

        return res.status(503).json({
            mensagem: "Não foi possível consultar os mangás."
        });
    }
});

// Lista os capítulos de um mangá.
router.get("/:id/capitulos", async (req, res) => {
    try {
        const { id } = req.params;

        const dados = await consultar(
            `${API}/manga/${id}/feed`,
            {
                params: {
                    "translatedLanguage[]": ["pt-br", "pt", "en"],
                    limit: 100,
                    order: {
                        chapter: "asc"
                    }
                }
            }
        );

        const capitulos = (dados.data || []).map(capitulo => ({
            id: capitulo.id,
            capitulo: capitulo.attributes.chapter,
            volume: capitulo.attributes.volume,
            titulo: capitulo.attributes.title,
            idioma: capitulo.attributes.translatedLanguage,
            paginas: capitulo.attributes.pages
        }));

        return res.json(capitulos);

    } catch (erro) {
        console.error(
            "Erro ao buscar capítulos:",
            erro.response?.status || erro.code || erro.message
        );

        return res.status(503).json({
            mensagem: "Não foi possível carregar os capítulos."
        });
    }
});

// Busca as páginas de um capítulo.
router.get("/capitulos/:id/paginas", async (req, res) => {
    try {
        const { id } = req.params;

        const dados = await consultar(
            `${API}/at-home/server/${id}`,
            {},
            10 * 60 * 1000
        );

        const hash = dados.chapter?.hash;
        const arquivos = dados.chapter?.data;

        if (!dados.baseUrl || !hash || !Array.isArray(arquivos) || arquivos.length === 0) {
            return res.status(404).json({
                mensagem: "Não foram encontradas páginas neste capítulo."
            });
        }

        const paginas = arquivos.map((arquivo, indice) => ({
            numero: indice + 1,
            imagem: `${dados.baseUrl}/data/${hash}/${arquivo}`
        }));

        return res.json({
            capitulo: id,
            paginas
        });

  } catch (erro) {
    console.error("ERRO AO CARREGAR PÁGINAS:", {
        status: erro.response?.status,
        codigo: erro.code,
        mensagem: erro.message,
        resposta: erro.response?.data
    });

    if (erro.response?.status === 404) {
        return res.status(404).json({
            mensagem: "A MangaDex não encontrou este capítulo. Ele pode estar indisponível."
        });
    }

    return res.status(503).json({
        mensagem: "Não foi possível carregar as páginas."
    });
}
});

// Busca os detalhes de um mangá.
router.get("/:id", async (req, res) => {
    try {
        const params = new URLSearchParams();

        params.append("includes[]", "author");
        params.append("includes[]", "cover_art");

        const dados = await consultar(
            `${API}/manga/${req.params.id}?${params.toString()}`
        );

        return res.json(organizarManga(dados.data));

    } catch (erro) {
        console.error(
            "Erro ao buscar detalhes do mangá:",
            erro.response?.status || erro.code || erro.message
        );

        return res.status(503).json({
            mensagem: "Não foi possível carregar os detalhes do mangá."
        });
    }
});

module.exports = router;