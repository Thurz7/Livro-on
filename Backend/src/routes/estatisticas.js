const express = require("express");
const router = express.Router();

const conexao = require("../database/conexao");
const autenticar = require("../middlewares/auth");

// Consultar as estatísticas do usuário
router.get("/", autenticar, async (req, res) => {
    try {
        const usuarioId = req.usuarioId;

        // Contar livros e mangás favoritados
        const [favoritos] = await conexao.promise().execute(
            `SELECT tipo, COUNT(*) AS total
             FROM favoritos
             WHERE usuario_id = ?
             GROUP BY tipo`,
            [usuarioId]
        );

        // Contar obras com progresso salvo
        const [progresso] = await conexao.promise().execute(
            `SELECT tipo, COUNT(*) AS total
             FROM progresso_leitura
             WHERE usuario_id = ?
             GROUP BY tipo`,
            [usuarioId]
        );

        // Contar os acessos registrados no histórico
        const [historico] = await conexao.promise().execute(
            `SELECT COUNT(*) AS total
             FROM historico_leitura
             WHERE usuario_id = ?`,
            [usuarioId]
        );

        // Organizar os resultados
        const resultado = {
            favoritos: {
                livros: 0,
                mangas: 0,
                total: 0
            },
            progresso: {
                livros: 0,
                mangas: 0,
                total: 0
            },
            historico: {
                totalAcessos: historico[0].total
            }
        };

        // Preencher os totais de favoritos
        favoritos.forEach((item) => {
            if (item.tipo === "livro") {
                resultado.favoritos.livros = item.total;
            } else {
                resultado.favoritos.mangas = item.total;
            }
        });

        resultado.favoritos.total =
            resultado.favoritos.livros +
            resultado.favoritos.mangas;

        // Preencher os totais de progresso
        progresso.forEach((item) => {
            if (item.tipo === "livro") {
                resultado.progresso.livros = item.total;
            } else {
                resultado.progresso.mangas = item.total;
            }
        });

        resultado.progresso.total =
            resultado.progresso.livros +
            resultado.progresso.mangas;

        res.status(200).json(resultado);

    } catch (erro) {
        console.error("Erro ao consultar estatísticas:", erro.message);

        res.status(500).json({
            mensagem: "Não foi possível consultar as estatísticas."
        });
    }
});

module.exports = router;
