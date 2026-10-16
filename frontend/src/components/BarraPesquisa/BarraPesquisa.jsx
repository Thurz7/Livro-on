import { useState } from "react";
import "./BarraPesquisa.scss";

export default function BarraPesquisa() {
const [pesquisa, setPesquisa] = useState("");
const [resultados, setResultados] = useState([]);
const [carregando, setCarregando] = useState(false);
const [erro, setErro] = useState("");
const [pesquisou, setPesquisou] = useState(false);

async function pesquisar(event) {
event.preventDefault();

const termo = pesquisa.trim();

if (!termo) return;

setCarregando(true);
setErro("");
setResultados([]);
setPesquisou(true);

try {
  const resposta = await fetch(
    `http://localhost:3001/pesquisa?busca=${encodeURIComponent(termo)}`
  );

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados.mensagem || "Erro ao pesquisar.");
  }

  setResultados([...dados.livros, ...dados.mangas]);
} catch (erro) {
  setErro(erro.message || "Não foi possível realizar a pesquisa.");
} finally {
  setCarregando(false);
}

}

return (
     <div className="BarraPesquisa">
    <form onSubmit={pesquisar}>
        <input type="text" placeholder="Pesquise por livros ou mangás..." value={pesquisa}
        onChange={(event) => setPesquisa(event.target.value)}/>

         <button type="submit">Pesquisar</button>
     </form>

  {carregando && <p>Pesquisando...</p>}

  {erro && <p className="erro-pesquisa">{erro}</p>}

  {!carregando && pesquisou && !erro && resultados.length === 0 && (
    <p className="sem-resultados">Nenhum resultado encontrado.</p>
  )}

  {resultados.length > 0 && (
    <div className="ResultadosPesquisa">
      {resultados.map((item) => (
        <div
          className="CardPesquisa"
          key={`${item.tipo}-${item.id}`}
        >
          {item.capa && (
            <img src={item.capa} alt={`Capa de ${item.titulo}`} />
          )}

          <h3>{item.titulo}</h3>
          <p>{item.autores.join(", ")}</p>

          <span>
            {item.tipo === "livro" ? "Livro" : "Mangá"}
          </span>
        </div>
      ))}
    </div>
  )}
</div>

);
}
