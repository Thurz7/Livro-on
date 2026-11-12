const express = require("express");
const router = express.Router();
const conexao = require("../database/conexao");
const autenticar = require("../middlewares/auth");

// Busca o progresso de leitura do usuário.
router.get("/", autenticar, async (req, res) => {
    try {
        const { obra_id, tipo } = req.query;
        const usuario_id = req.usuarioId;

        if (
            obra_id === undefined ||
            obra_id === null ||
            String(obra_id).trim() === "" ||
            !["livro", "manga"].includes(tipo)
        ) {
            return res.status(400).json({
                mensagem: "Dados de leitura inválidos."
            });
        }

        const sql = `
            SELECT posicao_leitura
            FROM progresso_leitura
            WHERE usuario_id = ?
            AND obra_id = ?
            AND tipo = ?
            LIMIT 1
        `;

        const [resultado] = await conexao.promise().execute(sql, [
            usuario_id,
            String(obra_id).trim(),
            tipo
        ]);

        return res.status(200).json({
            posicao_leitura: resultado.length > 0
                ? resultado[0].posicao_leitura
                : 1
        });

    } catch (erro) {
        console.error("Erro ao buscar progresso:", erro);

        return res.status(500).json({
            mensagem: "Erro ao buscar o progresso de leitura."
        });
    }
});

// Salva ou atualiza o progresso de leitura.
router.post("/", autenticar, async (req, res) => {
    try {
        const { obra_id, tipo, posicao_leitura } = req.body;
        const usuario_id = req.usuarioId;

        // Valida os dados recebidos.
        if (
            obra_id === undefined ||
            obra_id === null ||
            String(obra_id).trim() === "" ||
            !["livro", "manga"].includes(tipo) ||
            !Number.isInteger(posicao_leitura) ||
            posicao_leitura < 1
        ) {
            return res.status(400).json({
                mensagem: "Dados de leitura inválidos."
            });
        }

        // Insere ou atualiza o progresso existente.
        const sql = `
            INSERT INTO progresso_leitura
                (usuario_id, obra_id, tipo, posicao_leitura)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                posicao_leitura = VALUES(posicao_leitura),
                ultima_leitura = CURRENT_TIMESTAMP
        `;

        await conexao.promise().execute(sql, [
            usuario_id,
            String(obra_id).trim(),
            tipo,
            posicao_leitura
        ]);

        return res.status(200).json({
            mensagem: "Progresso salvo com sucesso!"
        });

    } catch (erro) {
        console.error("Erro ao salvar progresso:", erro);

        return res.status(500).json({
            mensagem: "Erro ao salvar o progresso de leitura."
        });
    }
});

module.exports = router;