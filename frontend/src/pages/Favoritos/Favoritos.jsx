import './Favoritos.scss'
import Cabecario from '../../components/Cabecario/cabecario'
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Favoritos() {
const [favoritos, setFavoritos] = useState([]);
const [carregando, setCarregando] = useState(true);
const [erro, setErro] = useState("");
const navigate = useNavigate();

  useEffect(() => {
    async function carregarFavoritos() {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/Cadastro", { replace: true });
        return;}

      try {
      const resposta = await fetch(
      "http://localhost:3001/favoritos",{headers: {Authorization: `Bearer ${token}`}});

      if (resposta.status === 401 || resposta.status === 403) {
        localStorage.removeItem("token");
        navigate("/Cadastro", { replace: true });
        return;}

      if (!resposta.ok) {
        throw new Error("Não foi possível carregar os favoritos.");}

                const dados = await resposta.json();

                const lista = await Promise.all(
                    dados.map(async (favorito) => {
                        const rota = favorito.tipo === "manga"
                            ? "mangas"
                            : "livros";

                        const respostaObra = await fetch(
                            `http://localhost:3001/${rota}/${favorito.obra_id}`
                        );

                        if (!respostaObra.ok) {
                            return {
                                ...favorito,
                                titulo: `Obra ${favorito.obra_id}`,
                                capa: null
                            };
                        }

                        const resultado = await respostaObra.json();
                        const obra = resultado.livro || resultado.manga || resultado;

                        return {
                            ...favorito,
                            titulo: obra.titulo || obra.title || "Título indisponível",
                            capa:
                                obra.capa ||
                                obra.capa_url ||
                                obra.imagem ||
                                obra.formats?.["image/jpeg"] ||
                                null,
                            autores: obra.autores || obra.authors || ""
                        };
                    })
                );

                setFavoritos(lista);
            } catch (erro) {
                setErro(erro.message);
            } finally {
                setCarregando(false);
            }
        }

        carregarFavoritos();
    }, [navigate]);

    async function removerFavorito(favorito) {
        const token = localStorage.getItem("token");

        if (!token) {
            navigate("/Cadastro", { replace: true });
            return;
        }

        try {
            const resposta = await fetch(
                `http://localhost:3001/favoritos/${favorito.id}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (!resposta.ok) {
                throw new Error("Não foi possível remover o favorito.");
            }

            setFavoritos((atuais) =>
                atuais.filter((item) => item.id !== favorito.id)
            );
        } catch (erro) {
            setErro(erro.message);
        }
    }

    function abrirObra(obra) {
        navigate(`/Leitor/${obra.tipo}/${obra.obra_id}`);
    }

    return (
        <main className="Favoritos">
          <div className="cabecario"> <Cabecario/> </div>
            <div className="ConteudoFavoritos">
                <div className="meusf">
                  <div className="mf"><h2>Meus Favoritos</h2></div>
                </div>
                {carregando && <p>Carregando favoritos...</p>}

                {erro && <p className="ErroFavoritos">{erro}</p>}

                {!carregando && !erro && favoritos.length === 0 && (
                    <p className="FavoritosVazio">
                        Você ainda não tem obras favoritas.
                    </p>
                )}

                {!carregando && favoritos.length > 0 && (
                    <div className="ListaFavoritos">
                        {favoritos.map((obra) => (
                            <article
                                className="CardFavorito"
                                key={obra.id}
                            >
                                <div
                                    className="ImagemFavorito"
                                    onClick={() => abrirObra(obra)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            abrirObra(obra);
                                        }
                                    }}
                                >
                                    <img
                                        src={obra.capa || "/ftpadrao.avif"}
                                        alt={obra.titulo}
                                    />

                                    <span className="TipoObra">
                                        {obra.tipo === "manga" ? "Mangá" : "Livro"}
                                    </span>
                                </div>

                                <div className="InformacoesFavorito">
                                    <h3>{obra.titulo}</h3>

                                    {obra.autores && (
                                        <p>
                                            {Array.isArray(obra.autores)
                                                ? obra.autores
                                                    .map((autor) =>
                                                        typeof autor === "string"
                                                            ? autor
                                                            : autor.name
                                                    )
                                                    .join(", ")
                                                : obra.autores}
                                        </p>
                                    )}

                                    <button
                                        type="button"
                                        className="ContinuarLeitura"
                                        onClick={() => abrirObra(obra)}
                                    >
                                        Continuar leitura
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    className="IconeFavorito ativo"
                                    title="Remover dos favoritos"
                                    aria-label={`Remover ${obra.titulo} dos favoritos`}
                                    onClick={() => removerFavorito(obra)}
                                >
                                    ★
                                </button>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

export default Favoritos;



