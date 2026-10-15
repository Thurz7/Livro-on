const express = require("express");
const bcrypt = require("bcrypt");
const conexao = require("../database/conexao");
const jwt = require("jsonwebtoken");
const autenticar = require("../middlewares/auth");

const router = express.Router();

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

        // 1. Verificar campos obrigatórios
        if (!nome || !email || !data_nascimento || !senha || !confirmarSenha || !genero) {
            return res.status(400).json({
                mensagem: "Preencha todos os campos."
            });
        }

        // 2. Verificar o formato do e-mail
      const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailValido.test(email)) {
            return res.status(400).json({
                mensagem: "Digite um e-mail válido."
            });
        }

        // 3. Verificar se as senhas são iguais
        if (senha !== confirmarSenha) {
            return res.status(400).json({
                mensagem: "As senhas não coincidem."
            });
        }

        // 4. Verificar o tamanho da senha
        if (senha.length < 8) {
            return res.status(400).json({
                mensagem: "A senha deve ter pelo menos 8 caracteres."
            });
        }

        // 5. Validar o gênero
        const generosPermitidos = ["Feminino", "Masculino", "Outro"];

        if (!generosPermitidos.includes(genero)) {
            return res.status(400).json({
                mensagem: "Selecione um gênero válido."
            });
        }

        // 6. Validar a data de nascimento
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

        // 7. Verificar se o e-mail já está cadastrado
        const [usuarios] = await conexao.promise().execute(
            "SELECT id FROM usuarios WHERE email = ?",
            [email.trim()]
        );

        if (usuarios.length > 0) {
            return res.status(409).json({
                mensagem: "Este e-mail já está cadastrado."
            });
        }

        // 8. Gerar o hash da senha
        const senhaHash = await bcrypt.hash(senha, 10);

        // 9. Cadastrar o usuário
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

        // 10. Responder ao frontend
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



router.post("/login", async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                mensagem: "Informe o e-mail e a senha."
            });
        }

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

        const senhaCorreta = await bcrypt.compare(
            senha,
            usuario.senha
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                mensagem: "E-mail ou senha incorretos."
            });
        }

        const token = jwt.sign(
    {
        id: usuario.id
    },
    process.env.JWT_SECRET,
    {
        expiresIn: "2h"
    }
);

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

module.exports = router;