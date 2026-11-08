const express = require("express");
const bcrypt = require("bcrypt");
const conexao = require("../database/conexao");
const jwt = require("jsonwebtoken");
const autenticar = require("../middlewares/auth");
const upload = require("../config/multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

const router = express.Router();
const db = conexao.promise();

const fontes = {
    livro: { nome: "gutendex", tipo: "Livro" },
    manga: { nome: "mangadex", tipo: "Manga" }
};

// Organiza os metadados de uma obra.
async function buscarMetadados(obraId, tipo) {
    try {
        if (tipo === "livro") {
            const resposta = await axios.get(
                `https://gutendex.com/books/${encodeURIComponent(obraId)}`,
                { timeout: 10000 }
            );

            const dados = resposta.data;
            const formatos = dados.formats || {};

            const capa = Object.entries(formatos).find(
                ([formato, url]) => formato.startsWith("image/") && url
            )?.[1];

            return {
                titulo: dados.title || "",
                autor: (dados.authors || []).map(a => a.name).join(", "),
                capa: capa || `https://www.gutenberg.org/cache/epub/${obraId}/pg${obraId}.cover.medium.jpg`,
                sinopse: dados.summaries?.[0] || ""
            };
        }

        const params = new URLSearchParams();
        params.append("includes[]", "cover_art");
        params.append("includes[]", "author");

        const resposta = await axios.get(
            `https://api.mangadex.org/manga/${encodeURIComponent(obraId)}?${params}`,
            { timeout: 10000 }
        );

        const dados = resposta.data.data;
        const atributos = dados.attributes || {};
        const titulos = atributos.title || {};
        const descricao = atributos.description || {};

        const capa = dados.relationships?.find(
            item => item.type === "cover_art"
        );

        const autor = dados.relationships?.find(
            item => item.type === "author"
        );

        return {
            titulo:
                titulos["pt-br"] ||
                titulos.pt ||
                titulos.en ||
                Object.values(titulos)[0] ||
                "",
            autor: autor?.attributes?.name || "",
            capa: capa?.attributes?.fileName
                ? `https://uploads.mangadex.org/covers/${obraId}/${capa.attributes.fileName}.256.jpg`
                : "",
            sinopse:
                descricao["pt-br"] ||
                descricao.pt ||
                descricao.en ||
                Object.values(descricao)[0] ||
                ""
        };
    } catch (erro) {
        console.error("Erro ao buscar metadados:", erro.code || erro.message);
        return null;
    }
}

// Salva ou atualiza os metadados no banco.
async function salvarMetadados(obraId, tipo) {
    const fonte = fontes[tipo];

    if (!fonte) return null;

    const [existentes] = await db.execute(
        `SELECT * FROM obras
         WHERE id_externo = ? AND fonte = ?
         LIMIT 1`,
        [String(obraId), fonte.nome]
    );

    const existente = existentes[0];

    // Evita consultar novamente uma obra que já possui os dados principais.
    if (existente?.titulo && existente?.capa) {
        return existente;
    }

    const metadados = await buscarMetadados(obraId, tipo);

    if (!metadados) return existente || null;

    const obra = {
        titulo: metadados.titulo || existente?.titulo || "",
        autor: metadados.autor || existente?.autor || "",
        capa: metadados.capa || existente?.capa || "",
        sinopse: metadados.sinopse || existente?.sinopse || ""
    };

    if (!obra.titulo) return existente || null;

    if (existente) {
        await db.execute(
            `UPDATE obras
             SET titulo = ?, autor = ?, capa = ?, sinopse = ?
             WHERE id_externo = ? AND fonte = ?`,
            [
                obra.titulo,
                obra.autor,
                obra.capa,
                obra.sinopse,
                String(obraId),
                fonte.nome
            ]
        );

        return { ...existente, ...obra };
    }

    await db.execute(
        `INSERT INTO obras
         (id_externo, titulo, autor, capa, fonte, tipo, sinopse)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            String(obraId),
            obra.titulo,
            obra.autor,
            obra.capa,
            fonte.nome,
            fonte.tipo,
            obra.sinopse
        ]
    );

    return obra;
}

// Cadastro de usuário.
router.post("/", async (req, res) => {
    try {
        const { nome, email, data_nascimento, senha, confirmarSenha, genero } = req.body;

        if (!nome || !email || !data_nascimento || !senha || !confirmarSenha || !genero) {
            return res.status(400).json({ mensagem: "Preencha todos os campos." });
        }

        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailValido.test(email)) {
            return res.status(400).json({ mensagem: "Digite um e-mail válido." });
        }

        if (senha !== confirmarSenha) {
            return res.status(400).json({ mensagem: "As senhas não coincidem." });
        }

        if (senha.length < 8) {
            return res.status(400).json({ mensagem: "A senha deve ter pelo menos 8 caracteres." });
        }

        if (!["Feminino", "Masculino", "Outro"].includes(genero)) {
            return res.status(400).json({ mensagem: "Selecione um gênero válido." });
        }

        const dataValida =
            /^\d{4}-\d{2}-\d{2}$/.test(data_nascimento) &&
            (() => {
                const [ano, mes, dia] = data_nascimento.split("-").map(Number);
                const data = new Date(Date.UTC(ano, mes - 1, dia));

                return data.getUTCFullYear() === ano &&
                    data.getUTCMonth() === mes - 1 &&
                    data.getUTCDate() === dia &&
                    data <= new Date();
            })();

        if (!dataValida) {
            return res.status(400).json({ mensagem: "Digite uma data de nascimento válida." });
        }

        const [usuarios] = await db.execute(
            "SELECT id FROM usuarios WHERE email = ?",
            [email.trim().toLowerCase()]
        );

        if (usuarios.length > 0) {
            return res.status(409).json({ mensagem: "Este e-mail já está cadastrado." });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const [resultado] = await db.execute(
            `INSERT INTO usuarios (nome, email, data_nascimento, senha, genero)
             VALUES (?, ?, ?, ?, ?)`,
            [nome.trim(), email.trim().toLowerCase(), data_nascimento, senhaHash, genero]
        );

        return res.status(201).json({
            mensagem: "Cadastro realizado com sucesso!",
            id: resultado.insertId
        });
    } catch (erro) {
        console.error("Erro ao cadastrar usuário:", erro);
        return res.status(500).json({ mensagem: "Erro interno ao cadastrar usuário." });
    }
});

// Login de usuário.
router.post("/login", async (req, res) => {
    try {
        const { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({ mensagem: "Informe o nome, e-mail e a senha." });
        }

        const [usuarios] = await db.execute(
            "SELECT id, nome, email, senha FROM usuarios WHERE email = ?",
            [email.trim().toLowerCase()]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({ mensagem: "E-mail ou senha incorretos." });
        }

        const usuario = usuarios[0];

        if (usuario.nome.trim().toLowerCase() !== nome.trim().toLowerCase()) {
            return res.status(401).json({ mensagem: "Nome, e-mail ou senha incorretos." });
        }

        const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

        if (!senhaCorreta) {
            return res.status(401).json({ mensagem: "E-mail ou senha incorretos." });
        }

        const token = jwt.sign(
            { id: usuario.id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(200).json({
            mensagem: "Login realizado com sucesso!",
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email
            }
        });
    } catch (erro) {
        console.error("Erro ao realizar login:", erro);
        return res.status(500).json({ mensagem: "Erro interno ao realizar login." });
    }
});

// Consulta o perfil.
router.get("/perfil", autenticar, async (req, res) => {
    try {
        const [usuarios] = await db.execute(
            "SELECT id, nome, email, foto_perfil FROM usuarios WHERE id = ?",
            [req.usuarioId]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({ mensagem: "Usuário não encontrado." });
        }

        return res.json(usuarios[0]);
    } catch (erro) {
        console.error("Erro ao consultar perfil:", erro);
        return res.status(500).json({ mensagem: "Erro ao consultar perfil." });
    }
});

// Atualiza os dados do perfil.
router.put("/perfil", autenticar, async (req, res) => {
    try {
        const { nome, email } = req.body;

        if (!nome || !email) {
            return res.status(400).json({ mensagem: "Preencha o nome e o e-mail." });
        }

        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailValido.test(email)) {
            return res.status(400).json({ mensagem: "Digite um e-mail válido." });
        }

        const [existentes] = await db.execute(
            "SELECT id FROM usuarios WHERE email = ? AND id != ?",
            [email.trim().toLowerCase(), req.usuarioId]
        );

        if (existentes.length > 0) {
            return res.status(409).json({ mensagem: "Este e-mail já está sendo utilizado." });
        }

        await db.execute(
            "UPDATE usuarios SET nome = ?, email = ? WHERE id = ?",
            [nome.trim(), email.trim().toLowerCase(), req.usuarioId]
        );

        return res.status(200).json({ mensagem: "Perfil atualizado com sucesso!" });
    } catch (erro) {
        console.error("Erro ao atualizar perfil:", erro);
        return res.status(500).json({ mensagem: "Erro ao atualizar perfil." });
    }
});

// Atualiza a foto de perfil.
router.put("/perfil/foto", autenticar, upload.single("foto"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ mensagem: "Selecione uma foto." });
        }

        const [usuarios] = await db.execute(
            "SELECT foto_perfil FROM usuarios WHERE id = ?",
            [req.usuarioId]
        );

        if (usuarios.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ mensagem: "Usuário não encontrado." });
        }

        const fotoAntiga = usuarios[0].foto_perfil;
        const caminhoFoto = `/uploads/${req.file.filename}`;

        await db.execute(
            "UPDATE usuarios SET foto_perfil = ? WHERE id = ?",
            [caminhoFoto, req.usuarioId]
        );

        if (fotoAntiga) {
            const caminhoAntigo = path.join(
                __dirname,
                "../uploads",
                path.basename(fotoAntiga)
            );

            if (fs.existsSync(caminhoAntigo)) {
                fs.unlinkSync(caminhoAntigo);
            }
        }

        return res.status(200).json({
            mensagem: "Foto de perfil atualizada!",
            foto_perfil: caminhoFoto
        });
    } catch (erro) {
        console.error("Erro ao atualizar foto:", erro);

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        return res.status(500).json({ mensagem: "Erro ao salvar a foto de perfil." });
    }
});

// Registra o acesso e salva os metadados.
router.post("/historico", autenticar, async (req, res) => {
    try {
        const { obra_id, tipo } = req.body;

        if (
            obra_id === undefined ||
            obra_id === null ||
            String(obra_id).trim() === "" ||
            !["livro", "manga"].includes(tipo)
        ) {
            return res.status(400).json({
                mensagem: "Informe uma obra e um tipo válido."
            });
        }

        try {
            await salvarMetadados(String(obra_id), tipo);
        } catch (erro) {
            console.error("Erro ao salvar metadados:", erro.message);
        }

        await db.execute(
            `INSERT INTO historico_leitura
             (usuario_id, obra_id, tipo, data_acesso)
             VALUES (?, ?, ?, NOW())`,
            [req.usuarioId, String(obra_id), tipo]
        );

        return res.status(201).json({
            mensagem: "Acesso registrado no histórico!"
        });
    } catch (erro) {
        console.error("Erro ao registrar histórico:", erro);
        return res.status(500).json({ mensagem: "Erro ao registrar acesso." });
    }
});

// Consulta o último acesso.
router.get("/historico", autenticar, async (req, res) => {
    try {
        const [historico] = await db.execute(
            `SELECT h.obra_id, h.tipo, h.data_acesso,
                    o.titulo, o.capa, o.sinopse
             FROM historico_leitura h
             LEFT JOIN obras o
                ON o.id_externo = h.obra_id
                AND o.fonte = CASE
                    WHEN h.tipo = 'livro' THEN 'gutendex'
                    ELSE 'mangadex'
                END
             WHERE h.usuario_id = ?
             ORDER BY h.data_acesso DESC, h.id DESC
             LIMIT 1`,
            [req.usuarioId]
        );

        if (historico.length === 0) {
            return res.json(null);
        }

        const obra = historico[0];

        return res.json({
            obra_id: obra.obra_id,
            tipo: obra.tipo,
            titulo: obra.titulo || "Título indisponível",
            capa: obra.capa || "",
            sinopse: obra.sinopse || "",
            data_acesso: obra.data_acesso
        });
    } catch (erro) {
        console.error("Erro ao consultar histórico:", erro);
        return res.status(500).json({ mensagem: "Erro ao consultar histórico." });
    }
});

// Busca a obra mais acessada nos últimos sete dias.
router.get("/mais-acessada-semana", async (req, res) => {
    try {
        const [obras] = await db.execute(
            `SELECT h.obra_id, h.tipo, COUNT(*) AS acessos,
                    o.titulo, o.capa, o.sinopse
             FROM historico_leitura h
             LEFT JOIN obras o
                ON o.id_externo = h.obra_id
                AND o.fonte = CASE
                    WHEN h.tipo = 'livro' THEN 'gutendex'
                    ELSE 'mangadex'
                END
             WHERE h.data_acesso >= NOW() - INTERVAL 7 DAY
             GROUP BY h.obra_id, h.tipo, o.titulo, o.capa, o.sinopse
             ORDER BY acessos DESC
             LIMIT 1`
        );

        if (obras.length === 0) {
            return res.json(null);
        }

        const obra = obras[0];

        return res.json({
            obra_id: obra.obra_id,
            tipo: obra.tipo,
            titulo: obra.titulo || "Título indisponível",
            capa: obra.capa || "",
            sinopse: obra.sinopse || "",
            acessos: Number(obra.acessos)
        });
    } catch (erro) {
        console.error("Erro ao buscar destaque:", erro);
        return res.status(500).json({ mensagem: "Erro ao buscar destaque." });
    }
});

// Lista as obras mais acessadas nos últimos sete dias.
router.get("/em-alta", async (req, res) => {
    try {
        const [obras] = await db.execute(
            `SELECT h.obra_id, h.tipo, COUNT(*) AS acessos,
                    o.titulo, o.capa
             FROM historico_leitura h
             LEFT JOIN obras o
                ON o.id_externo = h.obra_id
                AND o.fonte = CASE
                    WHEN h.tipo = 'livro' THEN 'gutendex'
                    ELSE 'mangadex'
                END
             WHERE h.data_acesso >= NOW() - INTERVAL 7 DAY
             GROUP BY h.obra_id, h.tipo, o.titulo, o.capa
             ORDER BY acessos DESC
             LIMIT 8`
        );

        return res.json(obras.map(obra => ({
            obra_id: obra.obra_id,
            tipo: obra.tipo,
            titulo: obra.titulo || "Título indisponível",
            capa: obra.capa || "",
            acessos: Number(obra.acessos)
        })));
    } catch (erro) {
        console.error("Erro ao buscar obras em alta:", erro);
        return res.status(500).json({ mensagem: "Erro ao buscar obras em alta." });
    }
});

module.exports = router;