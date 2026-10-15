const express = require("express");
const axios = require("axios");

const router = express.Router();

// Busca livros pelo título ou termo pesquisado
router.get("/", async (req, res) => {
try {
const busca = req.query.busca || "";


// Consulta a Gutendex sem limitar o idioma
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

// Retorna os livros organizados
res.status(200).json(livros);

} catch (erro) {
console.error("Erro ao buscar livros:", erro.message);


res.status(500).json({
  mensagem: "Erro ao buscar livros."
});


}
});


// Bibliotecas para buscar e analisar o conteúdo HTML
const cheerio = require("cheerio");

// Busca o texto de um livro do Projeto Gutenberg
router.get("/:id/leitura", async (req, res) => {
  try {

    const id = req.params.id;
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

    // Caso o conteúdo esteja em outro elemento, usa o corpo da página
    if (!conteudo.length) {
      conteudo = $("body");
    }

    const texto = conteudo.text().trim();

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


module.exports = router;
