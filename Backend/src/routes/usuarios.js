const express = require("express");
const bcrypt = require("bcrypt");
const conexao = require("../database/conexao");
const jwt = require("jsonwebtoken");
const autenticar = require("../middlewares/auth");
const upload = require("../config/multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Cadastro de usuário
router.post("/", async (req, res) => {
    try {
        const {
            nome,
            email,
            data_nascimento,
            senha,
            confirmarSenha,
            genero
        } = req.body;

// Verifica os campos obrigatórios
        if (!nome || !email || !data_nascimento || !senha || !confirmarSenha || !genero) {
            return res.status(400).json({
                mensagem: "Preencha todos os campos."
            });
        }

 // Verifica o formato do e-mail
        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailValido.test(email)) {
            return res.status(400).json({
                mensagem: "Digite um e-mail válido."
            });
        }

 // Verifica se as senhas são iguais
        if (senha !== confirmarSenha) {
            return res.status(400).json({
                mensagem: "As senhas não coincidem."
            });
        }

// Verifica o tamanho da senha
        if (senha.length < 8) {
            return res.status(400).json({
                mensagem: "A senha deve ter pelo menos 8 caracteres."
            });
        }

// Valida o gênero
        const generosPermitidos = ["Feminino", "Masculino", "Outro"];

        if (!generosPermitidos.includes(genero)) {
            return res.status(400).json({
                mensagem: "Selecione um gênero válido."
            });
        }

 // Valida a data de nascimento
        const dataValida =
            /^\d{4}-\d{2}-\d{2}$/.test(data_nascimento) &&
            (() => {
                const [ano, mes, dia] = data_nascimento.split("-").map(Number);
                const data = new Date(Date.UTC(ano, mes - 1, dia));

                return (
                    data.getUTCFullYear() === ano &&
                    data.getUTCMonth() === mes - 1 &&
                    data.getUTCDate() === dia &&
                    data <= new Date()
                );
            })();

        if (!dataValida) {
            return res.status(400).json({
                mensagem: "Digite uma data de nascimento válida."
            });
        }

 // Verifica se o e-mail já está cadastrado
        const [usuarios] = await conexao.promise().execute(
            "SELECT id FROM usuarios WHERE email = ?",
            [email.trim()]
        );

        if (usuarios.length > 0) {
            return res.status(409).json({
                mensagem: "Este e-mail já está cadastrado."
            });
        }

 // Gera o hash da senha
        const senhaHash = await bcrypt.hash(senha, 10);

 // Cadastra o usuário no banco de dados
        const [resultado] = await conexao.promise().execute(
            `INSERT INTO usuarios
                (nome, email, data_nascimento, senha, genero)
            VALUES (?, ?, ?, ?, ?)`,
            [
                nome.trim(),
                email.trim().toLowerCase(),
                data_nascimento,
                senhaHash,
                genero
            ]
        );

// Retorna a confirmação do cadastro
        return res.status(201).json({
            mensagem: "Cadastro realizado com sucesso!",
            id: resultado.insertId
        });

    } catch (erro) {
        console.error("Erro ao cadastrar usuário:", erro);

        return res.status(500).json({
            mensagem: "Erro interno ao cadastrar usuário."
        });
    }
});

// Login de usuário
router.post("/login", async (req, res) => {
    try {
        const { email, senha } = req.body;

// Verifica se os campos foram preenchidos
        if (!email || !senha) {
            return res.status(400).json({
                mensagem: "Informe o e-mail e a senha."
            });
        }

// Busca o usuário pelo e-mail
        const [usuarios] = await conexao.promise().execute(
            "SELECT id, nome, email, senha FROM usuarios WHERE email = ?",
            [email.trim().toLowerCase()]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({
                mensagem: "E-mail ou senha incorretos."
            });
        }

        const usuario = usuarios[0];

// Compara a senha informada com a senha cadastrada
        const senhaCorreta = await bcrypt.compare(
            senha,
            usuario.senha
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                mensagem: "E-mail ou senha incorretos."
            });
        }

// Gera o token de autenticação
        const token = jwt.sign(
            {
                id: usuario.id
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

// Retorna o token e os dados do usuário
        return res.status(200).json({
            mensagem: "Login realizado com sucesso!",
            token: token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email
            }
        });

    } catch (erro) {
        console.error("Erro ao realizar login:", erro);

        return res.status(500).json({
            mensagem: "Erro interno ao realizar login."
        });
    }
});

// Consulta o perfil do usuário autenticado
router.get("/perfil", autenticar, async (req, res) => {
    try {
        const [usuarios] = await conexao.promise().execute(
            "SELECT id, nome, email, foto_perfil FROM usuarios WHERE id = ?",
            [req.usuarioId]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                mensagem: "Usuário não encontrado."
            });
        }

        return res.json(usuarios[0]);

    } catch (erro) {
        return res.status(500).json({
            mensagem: "Erro ao consultar perfil."
        });
    }
});

// Atualiza os dados do perfil
router.put("/perfil", autenticar, async (req, res) => {
    try {
        const { nome, email } = req.body;

        if (!nome || !email) {
            return res.status(400).json({
                mensagem: "Preencha o nome e o e-mail."
            });
        }

        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailValido.test(email)) {
            return res.status(400).json({
                mensagem: "Digite um e-mail válido."
            });
        }

        const [existentes] = await conexao.promise().execute(
            "SELECT id FROM usuarios WHERE email = ? AND id != ?",
            [email.trim().toLowerCase(), req.usuarioId]
        );

        if (existentes.length > 0) {
            return res.status(409).json({
                mensagem: "Este e-mail já está sendo utilizado."
            });
        }

        await conexao.promise().execute(
            "UPDATE usuarios SET nome = ?, email = ? WHERE id = ?",
            [
                nome.trim(),
                email.trim().toLowerCase(),
                req.usuarioId
            ]
        );

        return res.status(200).json({
            mensagem: "Perfil atualizado com sucesso!"
        });

    } catch (erro) {
        console.error("Erro ao atualizar perfil:", erro);

        return res.status(500).json({
            mensagem: "Erro ao atualizar perfil."
        });
    }
});

// Atualiza a foto de perfil
router.put("/perfil/foto", autenticar, upload.single("foto"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                mensagem: "Selecione uma foto."
            });
        }

        const [usuarios] = await conexao.promise().execute(
            "SELECT foto_perfil FROM usuarios WHERE id = ?",
            [req.usuarioId]
        );

        if (usuarios.length === 0) {
            fs.unlinkSync(req.file.path);

            return res.status(404).json({
                mensagem: "Usuário não encontrado."
            });
        }

        const fotoAntiga = usuarios[0].foto_perfil;

        const caminhoFoto = `/uploads/${req.file.filename}`;

        await conexao.promise().execute(
            "UPDATE usuarios SET foto_perfil = ? WHERE id = ?",
            [caminhoFoto, req.usuarioId]
        );

        // Remove a foto antiga, se existir
        if (fotoAntiga) {
            const nomeArquivo = path.basename(fotoAntiga);
            const caminhoAntigo = path.join(__dirname, "../uploads", nomeArquivo);

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

        return res.status(500).json({
            mensagem: "Erro ao salvar a foto de perfil."
        });
    }
});

module.exports = router;