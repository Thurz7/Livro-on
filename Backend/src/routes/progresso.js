const express = require("express");
const router = express.Router();

const conexao = require("../database/conexao");
const autenticar = require("../middlewares/auth");

// SALVAR OU ATUALIZAR O PROGRESSO DE LEITURA
router.post("/", autenticar, async (req, res) => {
try {
const { obra_id, tipo, posicao_leitura } = req.body;
const usuario_id = req.usuarioId;


    // Validar os dados recebidos
    if (
        obra_id === undefined ||
        obra_id === null ||
        String(obra_id).trim() === "" ||
        !["livro", "manga"].includes(tipo) ||
        !Number.isInteger(posicao_leitura) ||
        posicao_leitura < 1
    ) {
        return res.status(400).json({
            mensagem: "Informe uma obra, um tipo válido e uma posição de leitura maior que zero."
        });
    }

    // Criar ou atualizar o progresso da obra
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
        String(obra_id),
        tipo,
        posicao_leitura
    ]);

    return res.status(200).json({
        mensagem: "Progresso de leitura salvo com sucesso!"
    });

} catch (erro) {
    console.error("Erro ao salvar progresso:", erro);

    return res.status(500).json({
        mensagem: "Erro ao salvar o progresso de leitura."
    });
}


});

// LISTAR O PROGRESSO DE TODAS AS OBRAS DO USUÁRIO
router.get("/", autenticar, async (req, res) => {
try {
const sql = `             SELECT id, obra_id, tipo, posicao_leitura, ultima_leitura
            FROM progresso_leitura
            WHERE usuario_id = ?
            ORDER BY ultima_leitura DESC
        `;


    const [resultados] = await conexao.promise().execute(sql, [
        req.usuarioId
    ]);

    return res.status(200).json(resultados);

} catch (erro) {
    console.error("Erro ao consultar progresso:", erro);

    return res.status(500).json({
        mensagem: "Erro ao consultar o progresso de leitura."
    });
}


});

// CONSULTAR O PROGRESSO DE UMA OBRA ESPECÍFICA
router.get("/:tipo/:obra_id", autenticar, async (req, res) => {
try {
const { tipo, obra_id } = req.params;


    if (!["livro", "manga"].includes(tipo)) {
        return res.status(400).json({
            mensagem: "Tipo de obra inválido."
        });
    }

    const sql = `
        SELECT id, obra_id, tipo, posicao_leitura, ultima_leitura
        FROM progresso_leitura
        WHERE usuario_id = ? AND obra_id = ? AND tipo = ?
    `;

    const [resultados] = await conexao.promise().execute(sql, [
        req.usuarioId,
        obra_id,
        tipo
    ]);

    if (resultados.length === 0) {
        return res.status(404).json({
            mensagem: "Progresso de leitura não encontrado."
        });
    }

    return res.status(200).json(resultados[0]);

} catch (erro) {
    console.error("Erro ao consultar progresso:", erro);

    return res.status(500).json({
        mensagem: "Erro ao consultar o progresso de leitura."
    });
}


});

// REMOVER O PROGRESSO DE UMA OBRA
router.delete("/:tipo/:obra_id", autenticar, async (req, res) => {
try {
const { tipo, obra_id } = req.params;


    if (!["livro", "manga"].includes(tipo)) {
        return res.status(400).json({
            mensagem: "Tipo de obra inválido."
        });
    }

    const sql = `
        DELETE FROM progresso_leitura
        WHERE usuario_id = ? AND obra_id = ? AND tipo = ?
    `;

    const [resultado] = await conexao.promise().execute(sql, [
        req.usuarioId,
        obra_id,
        tipo
    ]);

    if (resultado.affectedRows === 0) {
        return res.status(404).json({
            mensagem: "Progresso não encontrado."
        });
    }

    return res.status(200).json({
        mensagem: "Progresso removido com sucesso!"
    });

} catch (erro) {
    console.error("Erro ao remover progresso:", erro);

    return res.status(500).json({
        mensagem: "Erro ao remover o progresso de leitura."
    });
}


});

module.exports = router;
