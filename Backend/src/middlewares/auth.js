const jwt = require("jsonwebtoken");

function autenticar(req, res, next) {
    const token = req.headers.authorization;

    if (!token || !token.startsWith("Bearer ")) {
        return res.status(401).json({
            mensagem: "Token não informado."
        }); 
    }

    try {
        const tokenLimpo = token.split(" ")[1];

        const dados = jwt.verify(
            tokenLimpo,
            process.env.JWT_SECRET
        );

        req.usuarioId = dados.id;

        next();
    } catch (erro) {
        return res.status(401).json({
            mensagem: "Token inválido ou expirado."
        });
    }
}

module.exports = autenticar;

