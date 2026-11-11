const express = require("express");
const axios = require("axios");

const router = express.Router();

const GUTENDEX = "https://gutendex.com/books/";
const MANGADEX = "https://api.mangadex.org/manga";

// Normaliza textos para facilitar a comparação.
function normalizar(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

// Palavras relacionadas a cada categoria.
const categorias = {
    romance: ["romance", "love", "relationships"],
    fantasia: ["fantasy", "fantasia", "magic", "supernatural"],
    suspense: ["thriller", "suspense", "mystery", "detective"],
    terror: ["horror", "terror", "ghost", "vampire"],
    ficcao: ["fiction", "ficcao", "science fiction", "sci-fi"],
    hq: ["comic", "comics", "graphic novel", "manga", "manhwa"],
    acao: ["action", "adventure", "acao", "martial arts"],
    comedia: ["comedy", "humor", "comedy and humor"]
};

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
        assuntos: livro.subjects || [],
        categorias: livro.bookshelves || [],
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

    const tags = (atributos.tags || []).map(tag => ({
        nome: tag.attributes?.name?.["pt-br"] ||
            tag.attributes?.name?.en ||
            Object.values(tag.attributes?.name || {})[0] ||
            "",
        grupo: tag.attributes?.group || ""
    }));

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
        tags,
        status: atributos.status || "desconhecido",
        link: `https://mangadex.org/title/${manga.id}`
    };
}

// Verifica se a obra pertence à categoria selecionada.
function pertenceCategoria(obra, categoria) {
    const categoriaNormalizada = normalizar(categoria);
    const termos = categorias[categoriaNormalizada];

    if (!termos) return false;

    let dados = [];

    if (obra.tipo === "livro") {
        dados = [
            ...(obra.assuntos || []),
            ...(obra.categorias || [])
        ];
    }

    if (obra.tipo === "manga") {
        dados = (obra.tags || []).map(tag => tag.nome);
    }

    return dados.some(item => {
        const texto = normalizar(item);

        return termos.some(termo =>
            texto.includes(normalizar(termo))
        );
    });
}

// Pesquisa livros e mangás.
router.get("/", async (req, res) => {
    const busca = req.query.busca?.trim() || "";
    const categoria = req.query.categoria?.trim() || "";

    if (!busca && !categoria) {
        return res.status(400).json({
            mensagem: "Informe um termo de pesquisa ou uma categoria."
        });
    }

    try {
        const paramsManga = new URLSearchParams();

        paramsManga.append("limit", "100");
        paramsManga.append("includes[]", "author");
        paramsManga.append("includes[]", "cover_art");
        paramsManga.append("contentRating[]", "safe");
        paramsManga.append("contentRating[]", "suggestive");

        if (busca) {
            paramsManga.append("title", busca);
        }

        const respostas = await Promise.allSettled([
            axios.get(GUTENDEX, {
                params: {
                    ...(busca ? { search: busca } : {}),
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

        let livros = dadosLivros.map(organizarLivro);
        let mangas = dadosMangas.map(organizarManga);

        // Filtra os resultados pela categoria.
        if (categoria) {
            livros = livros.filter(livro =>
                pertenceCategoria(livro, categoria)
            );

            mangas = mangas.filter(manga =>
                pertenceCategoria(manga, categoria)
            );
        }

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
            categoria,
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