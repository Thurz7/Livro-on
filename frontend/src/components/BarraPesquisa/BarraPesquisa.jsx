
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

console.log("Status:", resposta.status);
console.log("Dados recebidos:", dados);

if (!resposta.ok) {
  throw new Error(dados.mensagem || "Erro ao pesquisar.");
}

const livros = Array.isArray(dados.livros) ? dados.livros : [];
const mangas = Array.isArray(dados.mangas) ? dados.mangas : [];

console.log("Livros encontrados:", livros.length);
console.log("Mangás encontrados:", mangas.length);

setResultados([...livros, ...mangas]);
    } catch (erro) {
      console.error("Erro na pesquisa:", erro);
      setErro(erro.message || "Não foi possível realizar a pesquisa.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="BarraPesquisa">
      <form onSubmit={pesquisar}>
        <input
          type="text"
          placeholder="Pesquise por livros ou mangás..."
          value={pesquisa}
          onChange={(event) => setPesquisa(event.target.value)}
        />

        <button type="submit">Pesquisar</button>
      </form>

      {carregando && <p>Pesquisando...</p>}

      {erro && <p className="erro-pesquisa">{erro}</p>}

      {!carregando && pesquisou && !erro && resultados.length === 0 && (
  <p className="sem-resultados">
    Nenhum resultado encontrado. Tente outro título.
  </p>
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
              <p>
                {Array.isArray(item.autores)
                  ? item.autores.join(", ")
                  : item.autores || "Autor não informado"}
              </p>

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
