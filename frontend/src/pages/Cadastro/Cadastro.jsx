import { useNavigate } from "react-router-dom";
import "./Cadastro.scss";
import logo from "../../assets/images/livroon.png";

export default function Cadastro() {
const navigate = useNavigate();

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
} catch (erro) {
  alert("Não foi possível conectar ao servidor.");
  console.error(erro);
}

}

async function entrar(e) {
const formulario = e.currentTarget.form;
const dados = new FormData(formulario);

const usuario = {
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
      <form onSubmit={cadastrar}>
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
            <input type="text" name="dia" placeholder="DD" maxLength={2} required />
            <span>/</span>
            <input type="text" name="mes" placeholder="MM" maxLength={2} required />
            <span>/</span>
            <input type="text" name="ano" placeholder="AAAA" maxLength={4} required />
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
          <button type="button" className="Entrar" onClick={entrar}>Entrar</button>
        </div>
      </form>
    </div>
  </div>
</div>

);
}