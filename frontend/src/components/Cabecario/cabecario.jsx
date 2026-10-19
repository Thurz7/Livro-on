import { useEffect, useState } from "react";
import "./cabecario.scss";
import logo from "../../assets/images/livroon.png";
import favoritos from "../../assets/images/favoritos.svg";
import ftpadrao from "../../assets/images/ftpadrao.avif";

export default function Cabecario() {
  const [fotoPerfil, setFotoPerfil] = useState(ftpadrao);
  const [nomeUsuario, setNomeUsuario] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://localhost:3001/usuarios/perfil", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((resposta) => {
        if (!resposta.ok) throw new Error("Não foi possível carregar o perfil.");
        return resposta.json();
      })
      .then((usuario) => {
        setNomeUsuario(usuario.nome || "");
        if (usuario.foto_perfil) {
          setFotoPerfil(`http://localhost:3001${usuario.foto_perfil}`);
        }
      })
      .catch((erro) => console.error("Erro ao carregar perfil:", erro));
  }, []);

  return (
<div className="Cabecario">
  <div className="logo">
    <a href="/Home"><img src={logo} alt="Logo" /></a>
  </div>

  <div className="opcoes">
    <button><a href="/Cadastro"><h2>Categorias</h2></a></button>
    <button><a href="/biblioteca"><h2>Biblioteca</h2></a></button>
    <button><a href="/doacoes"><h2>Doações</h2></a></button>
    <button><a href="/em-alta"><h2>Em alta</h2></a></button>
  </div>

    <div className="FotoPerfil">
    <a href="/leitor"><img src={favoritos} alt="Favoritos" /></a>

      <div className="PerfilContainer">
        <img src={fotoPerfil} alt="Foto de perfil" className="foto" />

        <div className="MenuPerfil">
        <div className="Alft">
          <img src={fotoPerfil} alt="Foto de perfil" className="foto" />
        </div>

        <p className="NomeUsuario">{nomeUsuario}</p>

        <div className="BotoesPerfil">
          <button onClick={() => (window.location.href = "/contas")}>
            Contas
          </button>
              <button
                onClick={() => {localStorage.removeItem("token");window.location.href = "/";}}>Sair</button>
              <button onClick={() => (window.location.href = "/Customizar")}>Customizar</button>
        </div>
        </div>
      </div>
    </div>
</div>
  );
}

