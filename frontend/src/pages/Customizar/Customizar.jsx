import "./Customizar.scss";
import Cabecario from "../../components/Cabecario/cabecario";
import ftpadrao from "../../assets/images/ftpadrao.avif";
import ftsvg from "../../assets/images/camera.svg";
import imgsvg from "../../assets/images/image.svg";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function Customizar() {
  const navigate = useNavigate();
  const [foto, setFoto] = useState(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");

  function selecionarFoto(event) {
    const arquivo = event.target.files[0];
    if (arquivo) setFoto(URL.createObjectURL(arquivo));
  }

async function salvar() {
const token = localStorage.getItem("token");

try {
    // Atualiza nome e e-mail
    const resposta = await fetch("http://localhost:3001/usuarios/perfil", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ nome, email })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
        throw new Error(dados.mensagem || "Erro ao atualizar perfil.");
    }

    // Envia a foto somente se uma nova imagem foi selecionada
    const arquivo = document.getElementById("fotoPerfil").files[0];

    if (arquivo) {
        const formulario = new FormData();
        formulario.append("foto", arquivo);

        const respostaFoto = await fetch("http://localhost:3001/usuarios/perfil/foto", {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formulario
        });

        const dadosFoto = await respostaFoto.json();

        if (!respostaFoto.ok) {
            throw new Error(dadosFoto.mensagem || "Erro ao salvar a foto.");
        }
    }

    alert("Perfil atualizado com sucesso!");
} catch (erro) {
    alert(erro.message);
}

}

  useEffect(() => {
    async function carregarPerfil() {
        const token = localStorage.getItem("token");

        try {
            const resposta = await fetch("http://localhost:3001/usuarios/perfil", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const usuario = await resposta.json();

            if (!resposta.ok) {
                throw new Error(usuario.mensagem || "Erro ao carregar perfil.");
            }

            setNome(usuario.nome || "");
            setEmail(usuario.email || "");
        } catch (erro) {
            alert(erro.message);
        }
    }

    carregarPerfil();
}, []);
return (
    <div className="Customizar">
    <div className="cabecario">
        <Cabecario/>
    </div>

    <div className="AlCustomizar">
    <div className="PtCustomizacao">
         <div className="FotoPerfil">
          <img src={foto || ftpadrao} alt="Foto de perfil" />
          <div className="OpcoesFoto">
            <label htmlFor="fotoPerfil" title="Escolher imagem"><img src={imgsvg} alt="" /></label>
            <label htmlFor="fotoPerfil" title="Alterar foto"><img src={ftsvg} alt="" /></label>
            <input id="fotoPerfil" type="file" accept="image/png,image/jpeg,image/webp" onChange={selecionarFoto} />
          </div>
        </div>

         <div className="CampoPerfil">
          <label htmlFor="nome">Nome de usuário:</label>
          <input id="nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>

         <div className="CampoPerfil">
          <label htmlFor="email">Email:</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>


        <div className="BotoesPerfil">
            <button type="button" onClick={salvar}><p>Salvar</p></button>
            <button type="button" onClick={() => navigate("/")}><p>Cancelar</p></button>
        </div>
    </div>
    </div>
    </div>
)};