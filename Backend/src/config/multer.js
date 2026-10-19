const multer = require("multer");
const path = require("path");

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
fileFilter: (req, file, callback) => {
const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];

    if (tiposPermitidos.includes(file.mimetype)) {
        callback(null, true);
    } else {
        callback(new Error("Envie uma imagem JPG, PNG ou WEBP."));
    }
}


});

module.exports = upload;
