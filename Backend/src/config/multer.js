const multer = require("multer");
const path = require("path");
const upload = require("../config/multer");

// Define onde as imagens serão salvas e como serão nomeadas
const armazenamento = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, path.join(__dirname, "../uploads"));
    },

    filename: (req, file, callback) => {
        const nomeArquivo = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname).toLowerCase()}`;
        callback(null, nomeArquivo);
    }
});

const upload = multer({
    storage: armazenamento,
    limits: {
        fileSize: 5 * 1024 * 1024
    },

 // Aceita apenas imagens JPG, PNG e WEBP
    fileFilter: (req, file, callback) => {
        const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];

        if (tiposPermitidos.includes(file.mimetype)) {
            callback(null, true);
        } else {
            callback(new Error("Envie uma imagem JPG, PNG ou WEBP."));
        }
    }
});

// Atualiza a foto de perfil do usuário
router.put("/perfil/foto", autenticar, upload.single("foto"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                mensagem: "Selecione uma imagem."
            });
        }

        const caminhoFoto = `/uploads/${req.file.filename}`;

        await conexao.promise().execute(
            "UPDATE usuarios SET foto_perfil = ? WHERE id = ?",
            [caminhoFoto, req.usuarioId]
        );

        return res.status(200).json({
            mensagem: "Foto de perfil atualizada!",
            foto_perfil: caminhoFoto
        });
    } catch (erro) {
        console.error("Erro ao atualizar foto:", erro);

        return res.status(500).json({
            mensagem: "Erro ao atualizar a foto de perfil."
        });
    }
});

module.exports = upload;
