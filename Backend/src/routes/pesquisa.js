
const express = require("express");
const axios = require("axios");

const router = express.Router();
axios.defaults.timeout = 30000;

router.get("/", async (req, res) => {
  const busca = req.query.busca?.trim();

  if (!busca) {
    return res.status(400).json({
      mensagem: "Informe o termo da pesquisa.",
    });
  }

  try {
    // Pesquisa livros na API Gutendex e mangás no MangaDex.
    const respostas = await Promise.allSettled([
      axios.get("https://gutendex.com/books/", {
        params: {
          search: busca,
          page: 1,
        },
       timeout: 15000,
      }),

      axios.get("https://api.mangadex.org/manga", {
        params: {
          title: busca,
          limit: 20,
          includes: ["author", "cover_art"],
          "contentRating[]": ["safe", "suggestive"],
        },
       timeout: 30000,
      }),
    ]);

    // Se uma API falhar, a outra ainda poderá funcionar.
    const dadosLivros =
      respostas[0].status === "fulfilled"
        ? respostas[0].value.data
        : { results: [] };

    const dadosMangas =
      respostas[1].status === "fulfilled"
        ? respostas[1].value.data
        : { data: [] };

    // Organiza os resultados dos livros.
    const livros = (dadosLivros.results || []).map((livro) => ({
      id: livro.id,
      tipo: "livro",
      titulo: livro.title,
      autores: (livro.authors || []).map((autor) => autor.name),
      capa: livro.formats?.["image/jpeg"] || null,
      descricao: livro.summaries?.[0] || "",
      idioma: livro.languages || [],
      link: livro.formats?.["text/html"] || null,
    }));

    // Organiza os resultados dos mangás.
    const mangas = (dadosMangas.data || []).map((manga) => {
      const atributos = manga.attributes || {};
      const relacionamentos = manga.relationships || [];

      const autor = relacionamentos.find(
        (relacao) => relacao.type === "author"
      );

      const capa = relacionamentos.find(
        (relacao) => relacao.type === "cover_art"
      );

      const nomeCapa = capa?.attributes?.fileName;

      return {
        id: manga.id,
        tipo: "manga",
        titulo:
          atributos.title?.["pt-br"] ||
          atributos.title?.["en"] ||
          Object.values(atributos.title || {})[0] ||
          "Título não informado",
        autores: autor?.attributes?.name
          ? [autor.attributes.name]
          : [],
        capa: nomeCapa
          ? `https://uploads.mangadex.org/covers/${manga.id}/${nomeCapa}.256.jpg`
          : null,
        descricao:
          atributos.description?.["pt-br"] ||
          atributos.description?.["en"] ||
          "",
        status: atributos.status || "desconhecido",
        link: `https://mangadex.org/title/${manga.id}`,
      };
    });

    // Informa se alguma das APIs falhou.
    const erroLivros = respostas[0].status === "rejected";
    const erroMangas = respostas[1].status === "rejected";

   if (erroLivros) {
  console.error("Gutendex indisponível:", respostas[0].reason.code || respostas[0].reason.message);
}

    if (erroMangas) {
  console.error("MangaDex indisponível:", respostas[1].reason.code || respostas[1].reason.message);
}
    return res.json({
      busca,
      total: livros.length + mangas.length,
      livros,
      mangas,
      avisos: {
        livros: erroLivros ? "Não foi possível consultar os livros." : null,
        mangas: erroMangas ? "Não foi possível consultar os mangás." : null,
      },
    });
  } catch (erro) {
    console.error("Erro na pesquisa unificada:", erro.message);

    return res.status(500).json({
      mensagem: "Não foi possível realizar a pesquisa.",
    });
  }
});

module.exports = router;
