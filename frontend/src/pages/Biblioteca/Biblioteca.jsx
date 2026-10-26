import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Biblioteca.scss";
import Cabecario from "../../components/Cabecario/cabecario";
import BarraPesquisa from "../../components/BarraPesquisa/BarraPesquisa"

function Biblioteca() {
    const [busca, setBusca] = useState("");
    const [obras, setObras] = useState([]);
    const [favoritos, setFavoritos] = useState([]);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState("");
    const navigate = useNavigate();

    async function pesquisar(event) {
        event.preventDefault();

        if (!busca.trim()) return;

        setCarregando(true);
        setErro("");
        setObras([]);

        try {
            const resposta = await fetch(
                `http://localhost:3001/pesquisa?busca=${encodeURIComponent(busca)}`
            );

            if (!resposta.ok) {
                throw new Error("Não foi possível pesquisar as obras.");
            }

            const dados = await resposta.json();


const livros = (dados.livros || []).map((livro) => ({
    ...livro,
    tipo: "livro"
}));

const mangas = (dados.mangas || []).map((manga) => ({
    ...manga,
    tipo: "manga"
}));

setObras([...livros, ...mangas]);



            const token = localStorage.getItem("token");

            if (token) {
                const respostaFavoritos = await fetch(
                    "http://localhost:3001/favoritos",
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                if (respostaFavoritos.ok) {
                    setFavoritos(await respostaFavoritos.json());
                }
            }
        } catch (erro) {
            setErro(erro.message);
        } finally {
            setCarregando(false);
        }
    }

    async function alternarFavorito(obra) {
        const token = localStorage.getItem("token");

        if (!token) {
            navigate("/Cadastro");
            return;
        }

        const favorito = favoritos.find(
            (item) =>
                String(item.obra_id) === String(obra.id) &&
                item.tipo === obra.tipo
        );

        try {
            const resposta = favorito
                ? await fetch(
                    `http://localhost:3001/favoritos/${favorito.id}`,
                    {
                        method: "DELETE",
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                )
                : await fetch("http://localhost:3001/favoritos", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        obra_id: String(obra.id),
                        tipo: obra.tipo
                    })
                });

            if (!resposta.ok) {
                throw new Error("Não foi possível atualizar os favoritos.");
            }

            if (favorito) {
                setFavoritos(
                    favoritos.filter((item) => item.id !== favorito.id)
                );
            } else {
                const dados = await fetch(
                    "http://localhost:3001/favoritos",
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                if (dados.ok) {
                    setFavoritos(await dados.json());
                }
            }
        } catch (erro) {
            setErro(erro.message);
        }
    }

    return (
        <div className="Biblioteca">
            <div className="cabecario"><Cabecario/></div>
            <main className="ConteudoBiblioteca">
              
<div className="BarraAl">
    <BarraPesquisa/>
</div>


                {carregando && <p>Pesquisando obras...</p>}

                {erro && <p>{erro}</p>}

                {!carregando && obras.length > 0 && (
                    <div className="ListaLivros">
                        {obras.map((obra) => {
                            const favorito = favoritos.some(
                                (item) =>
                                    String(item.obra_id) === String(obra.id) &&
                                    item.tipo === obra.tipo
                            );

                            return (
                                <div
                                    className="CardLivro"
                                    key={`${obra.tipo}-${obra.id}`}
                                >
                                    <div
                                        onClick={() =>
                                            navigate(
                                                `/DetalhesLivros/${obra.tipo}/${obra.id}`
                                            )
                                        }
                                    >
                                        <img
                                            src={obra.capa || "/ftpadrao.avif"}
                                            alt={obra.titulo}
                                        />

                                        <h3>{obra.titulo}</h3>

                                        {obra.autores && (
                                            <p>{obra.autores}</p>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => alternarFavorito(obra)}
                                    >
                                        {favorito ? "★ Favoritado" : "☆ Favoritar"}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {!carregando && busca && obras.length === 0 && !erro && (
                    <p>Nenhuma obra encontrada.</p>
                )}
            </main>
        </div>
    );
}

export default Biblioteca;

