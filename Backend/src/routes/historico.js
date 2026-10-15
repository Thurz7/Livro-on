const express = require("express");
const router = express.Router();

const conexao = require("../database/conexao");
const autenticar = require("../middlewares/auth");

// Registrar uma leitura no histórico
router.post("/", autenticar, async (req, res) => {
    try {
        const { obra_id, tipo } = req.body;

        // Validar os dados recebidos
        if (!obra_id || !["livro", "manga"].includes(tipo)) {
            return res.status(400).json({
                mensagem: "Informe um ID de obra válido e seu tipo."
            });
        }

        // Registrar o acesso do usuário
        const [resultado] = await conexao.promise().execute(
            `INSERT INTO historico_leitura
            (usuario_id, obra_id, tipo)
            VALUES (?, ?, ?)`,
            [req.usuarioId, String(obra_id), tipo]
        );

        res.status(201).json({
            mensagem: "Leitura registrada no histórico!",
            id: resultado.insertId
        });

    } catch (erro) {
        console.error("Erro ao registrar histórico:", erro.message);
        res.status(500).json({
            mensagem: "Erro ao registrar o histórico."
        });
    }
});

// Listar o histórico do usuário
router.get("/", autenticar, async (req, res) => {
    try {
        const [historico] = await conexao.promise().execute(
            `SELECT id, obra_id, tipo, data_acesso
             FROM historico_leitura
             WHERE usuario_id = ?
             ORDER BY data_acesso DESC`,
            [req.usuarioId]
        );

        res.json(historico);

    } catch (erro) {
        console.error("Erro ao buscar histórico:", erro.message);
        res.status(500).json({
            mensagem: "Erro ao buscar o histórico."
        });
    }
});

// Excluir um registro do histórico
router.delete("/:id", autenticar, async (req, res) => {
    try {
        const { id } = req.params;

        const [resultado] = await conexao.promise().execute(
            `DELETE FROM historico_leitura
             WHERE id = ? AND usuario_id = ?`,
            [id, req.usuarioId]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensagem: "Registro não encontrado no seu histórico."
            });
        }

        res.json({
            mensagem: "Registro removido do histórico!"
        });

    } catch (erro) {
        console.error("Erro ao excluir histórico:", erro.message);
        res.status(500).json({
            mensagem: "Erro ao excluir o histórico."
        });
    }
});

module.exports = router;
