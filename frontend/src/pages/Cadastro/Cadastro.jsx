import { useNavigate } from "react-router-dom";
import "./Cadastro.scss";
import logo from "../../assets/images/livroon.png";
import { useState } from "react";

export default function Cadastro() {
const navigate = useNavigate();
const [modoLogin, setModoLogin] = useState(false)

async function cadastrar(e) {
e.preventDefault();
const formulario = e.currentTarget;
const dados = new FormData(formulario);
const dia = dados.get("dia")?.trim().padStart(2, "0");
const mes = dados.get("mes")?.trim().padStart(2, "0");
const ano = dados.get("ano")?.trim();

const usuario = {
  nome: dados.get("nome"),
  email: dados.get("email"),
  data_nascimento: `${ano}-${mes}-${dia}`,
  senha: dados.get("senha"),
  confirmarSenha: dados.get("confirmarSenha"),
  genero: dados.get("genero")
};

try {
  const resposta = await fetch("http://localhost:3001/usuarios", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(usuario)
  });

  const resultado = await resposta.json();

  if (!resposta.ok) {
    alert(resultado.mensagem || resultado.message || "Erro ao realizar cadastro.");
    return;
  }

  alert(resultado.mensagem || resultado.message || "Cadastro realizado com sucesso!");
  formulario.reset();
  setModoLogin(true);
} catch (erro) {
  alert("Não foi possível conectar ao servidor.");
  console.error(erro);
}

}

async function entrar(e) {
e.preventDefault();
const formulario = e.currentTarget;
const dados = new FormData(formulario);

const usuario = {
  nome: dados.get("nome"),
  email: dados.get("email"),
  senha: dados.get("senha")
};

try {
  const resposta = await fetch("http://localhost:3001/usuarios/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(usuario)
  });

  const resultado = await resposta.json();

  if (!resposta.ok) {
    alert(resultado.mensagem || resultado.message || "E-mail ou senha incorretos.");
    return;
  }

  localStorage.setItem("token", resultado.token);
  localStorage.setItem("usuario", JSON.stringify({
    id: resultado.id,
    nome: resultado.nome,
    email: resultado.email
  }));

  navigate("/");
} catch (erro) {
  alert("Não foi possível conectar ao servidor.");
  console.error(erro);
}

}

return (
<div className="Cadastro">
<div className="Cabecario">
<div className="Logo">
<a href="/"><img src={logo} alt="Logo Livro-on" /></a>
</div>
<div className="Texto">
<h1>Faça seu cadastro ou entre em sua conta</h1>
</div>
</div>


  <div className="Conteudo">
    <div className="Formulario">

    {modoLogin ? (
       <form onSubmit={entrar}>
        <div className="Campo">
           <label htmlFor="nomeLogin">Nome:</label>
            <input type="text" id="nomeLogin" name="nome" required /> 
        </div>
        <div className="Campo">
          <label htmlFor="emailLogin">Email:</label> 
          <input type="email" id="emailLogin" name="email" required /> 
        </div> 
        <div className="Campo">
           <label htmlFor="senhaLogin">Senha:</label>
          <input type="password" id="senhaLogin" name="senha" required /> 
        </div>
        <div className="Botoes">
           <button type="submit" className="Entrar">Entrar</button> 
        </div>
        </form>)
          :
      (<form onSubmit={cadastrar}>
        <div className="Campo">
          <label htmlFor="nome">Nome:</label>
          <input type="text" id="nome" name="nome" required />
        </div>

        <div className="Campo">
          <label htmlFor="email">Email:</label>
          <input type="email" id="email" name="email" required />
        </div>

        <div className="Campo Opcoes">
          <label>Data de nascimento:</label>
          <div className="Data">
        <input type="text" name="dia" maxLength="2" inputMode="numeric" onChange={(e) => {
        e.target.value = e.target.value.replace(/\D/g, "");}}/>
        <input type="text" name="mes" maxLength="2" inputMode="numeric" onChange={(e) => {
        e.target.value = e.target.value.replace(/\D/g, "");}}/>
        <input type="text" name="ano" maxLength="4" inputMode="numeric" onChange={(e) => {
        e.target.value = e.target.value.replace(/\D/g, "");}}/>
          </div>
        </div>

        <div className="Campo">
          <label htmlFor="senha">Senha:</label>
          <input type="password" id="senha" name="senha" required />
        </div>

        <div className="Campo">
          <label htmlFor="confirmarSenha">Confirmar senha:</label>
          <input type="password" id="confirmarSenha" name="confirmarSenha" required />
        </div>

        <div className="Campo Opcoes">
          <span>Gênero:</span>
          <div className="Generos">
            <label><input type="radio" name="genero" value="Feminino" required /> Feminino</label>
            <label><input type="radio" name="genero" value="Masculino" /> Masculino</label>
            <label><input type="radio" name="genero" value="Outro" /> Outro</label>
          </div>
        </div>

        <div className="Botoes">
          <button type="reset" className="Limpar">Limpar</button>
          <button type="submit" className="Enviar">Enviar</button>
        </div>
      </form>
      )}
    </div>
    <div className="AlternarFormulario">
      <h1>{modoLogin ? "Ainda não tem conta?" : "Já tem uma conta?"}</h1>
      <button type="button" onClick={() => setModoLogin(!modoLogin)}> {modoLogin ? "Criar cadastro" : "Fazer login"} </button>
      </div>
  </div>
</div>

);
}