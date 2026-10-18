const mysql = require("mysql2");

require("dotenv").config();

// Configuração da conexão com o banco de dados
const conexao = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Verifica a conexão com o MySQL
conexao.connect((erro) => {
    if (erro) {
        console.log("Erro ao conectar ao MySQL:", erro.message);
        return;
    }

    console.log("Conectado ao MySQL!");
});

module.exports = conexao;