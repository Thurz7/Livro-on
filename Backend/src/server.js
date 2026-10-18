require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");

// Conexão com o banco de dados
require("./database/conexao");

// Importação das rotas
const livrosRoutes = require("./routes/livros");
const usuariosRoutes = require("./routes/usuarios");
const mangasRoutes = require("./routes/mangas");
const favoritosRoutes = require("./routes/favoritos");
const progressoRoutes = require("./routes/progresso");
const historicoRoutes = require("./routes/historico");
const pesquisaRoutes = require("./routes/pesquisa");
const estatisticasRoutes = require("./routes/estatisticas");

const app = express();

// Configurações do servidor
app.use(express.json());
app.use(cors());

// Permite acessar os arquivos enviados
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Rota inicial da API
app.get("/", (req, res) => {
    res.send("API da Livraria funcionando!");
});

// Rotas da API
app.use("/usuarios", usuariosRoutes);
app.use("/livros", livrosRoutes);
app.use("/mangas", mangasRoutes);
app.use("/favoritos", favoritosRoutes);
app.use("/progresso", progressoRoutes);
app.use("/historico", historicoRoutes);
app.use("/pesquisa", pesquisaRoutes);
app.use("/estatisticas", estatisticasRoutes);

// Inicialização do servidor
app.listen(3001, () => {
    console.log("Servidor iniciado na porta 3001");
});