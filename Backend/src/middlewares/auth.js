const jwt = require("jsonwebtoken");

// Verifica se o usuário está autenticado
function autenticar(req, res, next) {
    const token = req.headers.authorization;

// Verifica se o token foi informado
    if (!token || !token.startsWith("Bearer ")) {
        return res.status(401).json({
            mensagem: "Token não informado."
        });
    }

    try {
// Valida o token
        const tokenLimpo = token.split(" ")[1];

        const dados = jwt.verify(
            tokenLimpo,
            process.env.JWT_SECRET
        );

// Guarda o ID do usuário na requisição
        req.usuarioId = dados.id;

        next();

    } catch (erro) {
        return res.status(401).json({
            mensagem: "Token inválido ou expirado."
        });
    }
}

module.exports = autenticar;
