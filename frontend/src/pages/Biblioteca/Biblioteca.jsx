import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Biblioteca.scss";
import Cabecario from "../../components/Cabecario/cabecario";


const recomendacoes = [
    { id: "11", tipo: "livro" },
    { id: "1661", tipo: "livro" },
    { id: "1661", tipo: "livro" },
    { id: "1342", tipo: "livro" },
    { id: "84", tipo: "livro" },
    { id: "345", tipo: "livro" },
    { id: "174", tipo: "livro" },
    { id: "120", tipo: "livro" },
    { id: "2701", tipo: "livro" }
];




function Biblioteca() {
    const [busca, setBusca] = useState("");
    const [obras, setObras] = useState([]);
    const [favoritos, setFavoritos] = useState([]);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState("");
    const navigate = useNavigate();
    const [obrasRecomendadas, setObrasRecomendadas] = useState([]);

    useEffect(() => {
    async function carregarRecomendacoes() {
        try {
            const resultados = await Promise.all(
                recomendacoes.map(async (obra) => {
                    const resposta = await fetch(
                        `http://localhost:3001/livros/${obra.id}`
                    );

                    if (!resposta.ok) return null;

                    const dados = await resposta.json();

                    return {
                        ...dados,
                        id: obra.id,
                        tipo: obra.tipo
                    };
                })
            );

            setObrasRecomendadas(resultados.filter(Boolean));
        } catch (erro) {
            console.error("Erro ao carregar recomendações:", erro);
        }
    }

    carregarRecomendacoes();
}, []);

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
              
            <form className="Brpesquisa" onSubmit={pesquisar}>
                
                <input type="" placeholder="Pesquise algum livro ou manga" value={busca} onChange={(event) => setBusca(event.target.value)}/>
                <button type="submit">Pesquisar</button>
            </form>


                {carregando && <p>Pesquisando obras...</p>}

                {erro && <p>{erro}</p>}

                {!carregando && (
    <div className="ListaLivros">
        {(busca.trim() ? obras : obrasRecomendadas).map((obra) => {
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
                            alt={obra.titulo || obra.title || "Livro"}
                        />

                        <h3>{obra.titulo || obra.title}</h3>
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

