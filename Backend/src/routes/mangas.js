const express = require("express");
const axios = require("axios");

const router = express.Router();

// Busca mangás pelo título
router.get("/", async (req, res) => {
    try {
        const busca = req.query.busca || "";

 // Consulta a API MangaDex
        const resposta = await axios.get("https://api.mangadex.org/manga", {
            params: {
                title: busca,
                limit: 20,
                includes: ["author", "cover_art"],
                "contentRating[]": ["safe", "suggestive"]
            },
            timeout: 10000
        });

// Organiza os dados dos mangás
        const mangas = resposta.data.data.map((manga) => {
            const atributos = manga.attributes;

 // Procura o autor e a capa
            const autor = manga.relationships.find(
                (relacao) => relacao.type === "author"
            );

            const capa = manga.relationships.find(
                (relacao) => relacao.type === "cover_art"
            );

 // Monta o endereço da capa
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
                autor: autor?.attributes?.name || "Autor não informado",
                descricao:
                    atributos.description?.["pt-br"] ||
                    atributos.description?.["en"] ||
                    "Descrição não disponível.",
                capa: urlCapa,
                status: atributos.status
            };
        });

 // Retorna os resultados
        res.status(200).json(mangas);

    } catch (erro) {
        console.error("Erro ao buscar mangás:", erro.message);

        res.status(500).json({
            mensagem: "Erro ao buscar mangás."
        });
    }
});

// Busca os capítulos disponíveis de um mangá
router.get("/:id/capitulos", async (req, res) => {
    try {
// Pega o ID do mangá
        const mangaId = req.params.id;

// Consulta os capítulos em português e inglês
        const resposta = await axios.get(
            `https://api.mangadex.org/manga/${mangaId}/feed`,
            {
                params: {
                    "translatedLanguage[]": ["pt-br", "pt", "en"],
                    limit: 100,
                    order: {
                        chapter: "asc"
                    }
                },
                timeout: 10000
            }
        );

 // Organiza os dados dos capítulos
        const capitulos = resposta.data.data.map((capitulo) => ({
            id: capitulo.id,
            titulo: capitulo.attributes.title || "Sem título",
            numero: capitulo.attributes.chapter || "Especial",
            volume: capitulo.attributes.volume || null,
            idioma: capitulo.attributes.translatedLanguage,
            paginas: capitulo.attributes.pages
        }));

// Retorna os capítulos encontrados
        res.status(200).json(capitulos);

    } catch (erro) {
        console.error("Erro ao buscar capítulos:", erro.message);

        res.status(500).json({
            mensagem: "Erro ao buscar capítulos."
        });
    }
});

// Busca as páginas de um capítulo
router.get("/capitulos/:id/paginas", async (req, res) => {
    try {
 // Pega o ID do capítulo
        const capituloId = req.params.id;

 // Consulta as páginas disponíveis na MangaDex
        const resposta = await axios.get(
            `https://api.mangadex.org/at-home/server/${capituloId}`,
            {
                timeout: 10000
            }
        );

        const dados = resposta.data;
        const hash = dados.chapter.hash;

 // Monta os endereços das imagens
        const paginas = dados.chapter.data.map((arquivo, indice) => ({
            numero: indice + 1,
            imagem: `${dados.baseUrl}/data/${hash}/${arquivo}`
        }));

// Retorna as páginas ao leitor
        res.status(200).json({
            capitulo: capituloId,
            paginas: paginas
        });

    } catch (erro) {
        console.error("Erro ao buscar páginas:", erro.message);

        res.status(500).json({
            mensagem: "Erro ao carregar as páginas do capítulo."
        });
    }
});

// Busca os detalhes de um mangá específico
router.get("/:id", async (req, res) => {
    try {
// Pega o ID do mangá
        const mangaId = req.params.id;

// Consulta os dados do mangá na MangaDex
        const resposta = await axios.get(
            `https://api.mangadex.org/manga/${mangaId}`,
            {
                params: {
                    includes: ["author", "cover_art"]
                },
                timeout: 10000
            }
        );

// Separa os dados recebidos
        const manga = resposta.data.data;
        const atributos = manga.attributes;

 // Procura o autor e a capa
        const autor = manga.relationships.find(
            (relacao) => relacao.type === "author"
        );

        const capa = manga.relationships.find(
            (relacao) => relacao.type === "cover_art"
        );

// Monta o endereço da capa
        const nomeCapa = capa?.attributes?.fileName;
        const urlCapa = nomeCapa
            ? `https://uploads.mangadex.org/covers/${mangaId}/${nomeCapa}.256.jpg`
            : null;

// Retorna os dados do mangá
        res.status(200).json({
            id: manga.id,
            titulo:
                atributos.title["pt-br"] ||
                atributos.title["en"] ||
                Object.values(atributos.title)[0],
            autor: autor?.attributes?.name || "Autor não informado",
            descricao:
                atributos.description?.["pt-br"] ||
                atributos.description?.["en"] ||
                "Descrição não disponível.",
            capa: urlCapa,
            status: atributos.status
        });

    } catch (erro) {
        console.error("Erro ao buscar detalhes:", erro.message);

        res.status(500).json({
            mensagem: "Erro ao buscar os detalhes do mangá."
        });
    }
});

module.exports = router;