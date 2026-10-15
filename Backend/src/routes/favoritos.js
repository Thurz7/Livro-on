const express = require("express");
const router = express.Router();

const conexao = require("../database/conexao");
const auth = require("../middlewares/auth");

// ADICIONAR UM FAVORITO
router.post("/", auth, (req, res) => {
const { obra_id, tipo } = req.body;
const usuario_id = req.usuarioId;


// Verifica se os dados foram enviados corretamente
if (
    obra_id === undefined ||
    obra_id === null ||
    String(obra_id).trim() === "" ||
    !["livro", "manga"].includes(tipo)
) {
    return res.status(400).json({
        mensagem: "Informe o ID da obra e o tipo: livro ou manga."
    });
}

// Verifica se a obra já está favoritada
const verificar = `
    SELECT id FROM favoritos
    WHERE usuario_id = ? AND obra_id = ? AND tipo = ?
`;

conexao.query(
    verificar,
    [usuario_id, String(obra_id), tipo],
    (erro, resultados) => {
        if (erro) {
            console.error(erro);
            return res.status(500).json({
                mensagem: "Erro ao verificar favorito."
            });
        }

        if (resultados.length > 0) {
            return res.status(409).json({
                mensagem: "Essa obra já está nos seus favoritos."
            });
        }

        // Salva o favorito no banco de dados
        const sql = `
            INSERT INTO favoritos (usuario_id, obra_id, tipo)
            VALUES (?, ?, ?)
        `;

        conexao.query(
            sql,
            [usuario_id, String(obra_id), tipo],
            (erro) => {
                if (erro) {
                    console.error(erro);
                    return res.status(500).json({
                        mensagem: "Erro ao adicionar favorito."
                    });
                }

                res.status(201).json({
                    mensagem: "Favorito adicionado com sucesso!"
                });
            }
        );
    }
);

});

// LISTAR OS FAVORITOS DO USUÁRIO LOGADO
router.get("/", auth, (req, res) => {
const usuario_id = req.usuarioId;


const sql = `
    SELECT id, obra_id, tipo, data_favorito
    FROM favoritos
    WHERE usuario_id = ?
    ORDER BY data_favorito DESC
`;

conexao.query(sql, [usuario_id], (erro, resultados) => {
    if (erro) {
        console.error(erro);
        return res.status(500).json({
            mensagem: "Erro ao buscar favoritos."
        });
    }

    res.status(200).json(resultados);
});


});

// REMOVER UM FAVORITO
router.delete("/:id", auth, (req, res) => {
const favorito_id = req.params.id;
const usuario_id = req.usuarioId;


// Só permite remover favoritos pertencentes ao usuário logado
const sql = `
    DELETE FROM favoritos
    WHERE id = ? AND usuario_id = ?
`;

conexao.query(
    sql,
    [favorito_id, usuario_id],
    (erro, resultado) => {
        if (erro) {
            console.error(erro);
            return res.status(500).json({
                mensagem: "Erro ao remover favorito."
            });
        }

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensagem: "Favorito não encontrado."
            });
        }

        res.status(200).json({
            mensagem: "Favorito removido com sucesso!"
        });
    }
);


});

module.exports = router;
