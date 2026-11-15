import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./Biblioteca.scss";
import Cabecario from "../../components/Cabecario/cabecario";
import capaIndisponivel from "../../assets/images/capai.png";

const recomendacoes = [
    // Mangás
    { id: "789642f8-ca89-4e4e-8f7b-eee4d17ea08b", tipo: "manga" }, // Demon Slayer
    { id: "d1a9fdeb-f713-407f-960c-8326b586e6fd", tipo: "manga" }, // Vagabond

    // Livros Gutenberg
    { id: "11", tipo: "livro" },
    { id: "1661", tipo: "livro" },
    { id: "1342", tipo: "livro" },
    { id: "84", tipo: "livro" },
    { id: "345", tipo: "livro" },
    { id: "174", tipo: "livro" },
    { id: "120", tipo: "livro" },
    { id: "2701", tipo: "livro" }
];

// Substitui capas ausentes ou imagens que não carregaram.
function substituirCapa(e) {
    e.currentTarget.onerror = null;
    e.currentTarget.src = capaIndisponivel;
}

function Biblioteca() {
    const [busca, setBusca] = useState("");
    const [obras, setObras] = useState([]);
    const [favoritos, setFavoritos] = useState([]);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState("");

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const categoria = searchParams.get("categoria") || "";

    const [obrasRecomendadas, setObrasRecomendadas] = useState([]);
    const [carregandoRecomendacoes, setCarregandoRecomendacoes] = useState(true);

// Carrega as recomendações iniciais.
useEffect(() => {
    let cancelado = false;
    let indice = 0;

    async function carregarObra() {
        while (indice < recomendacoes.length && !cancelado) {
            const obra = recomendacoes[indice++];

            const rota = obra.tipo === "manga" ? "mangas" : "livros";
            const controller = new AbortController();

            const timeout = setTimeout(() => {
                controller.abort();
            }, 15000);

            try {
                const resposta = await fetch(
                    `http://localhost:3001/${rota}/${obra.id}`,
                    { signal: controller.signal }
                );

                if (!resposta.ok) {
                    console.error(
                        `Erro ${resposta.status}: ${obra.tipo} ${obra.id}`
                    );
                    continue;
                }

                const dados = await resposta.json();

                if (!cancelado) {
                    setObrasRecomendadas(prev => [
                        ...prev,
                        {
                            ...dados,
                            id: obra.id,
                            tipo: obra.tipo
                        }
                    ]);
                }
            } catch (erro) {
                console.error(`Erro ao carregar ${obra.tipo}:`, erro);
            } finally {
                clearTimeout(timeout);
            }
        }
    }

    async function carregarRecomendacoes() {
        setCarregandoRecomendacoes(true);
        setObrasRecomendadas([]);

        try {
            await Promise.all([
                carregarObra(),
                carregarObra(),
                carregarObra()
            ]);
        } finally {
            if (!cancelado) {
                setCarregandoRecomendacoes(false);
            }
        }
    }

    carregarRecomendacoes();

    return () => {
        cancelado = true;
    };
}, []);

    // Carrega as obras da categoria selecionada.
    useEffect(() => {
        async function carregarCategoria() {
            if (!categoria) {
                setObras([]);
                return;
            }

            setCarregando(true);
            setErro("");
            setBusca("");

            try {
                const resposta = await fetch(
                    `http://localhost:3001/pesquisa?categoria=${encodeURIComponent(categoria)}`
                );

                if (!resposta.ok) {
                    throw new Error("Não foi possível carregar a categoria.");
                }

                const dados = await resposta.json();

                const livros = (dados.livros || []).map(livro => ({
                    ...livro,
                    tipo: "livro"
                }));

                const mangas = (dados.mangas || []).map(manga => ({
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

        carregarCategoria();
    }, [categoria]);

    // Pesquisa livros e mangás pelo nome.
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

            const livros = (dados.livros || []).map(livro => ({
                ...livro,
                tipo: "livro"
            }));

            const mangas = (dados.mangas || []).map(manga => ({
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

    // Adiciona ou remove uma obra dos favoritos.
    async function alternarFavorito(obra) {
        const token = localStorage.getItem("token");

        if (!token) {
            navigate("/Cadastro");
            return;
        }

        const favorito = favoritos.find(
            item =>
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
                    favoritos.filter(item => item.id !== favorito.id)
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

    // Define quais obras serão exibidas.
    const obrasExibidas = busca.trim()
        ? obras
        : categoria
            ? obras
            : obrasRecomendadas;

    return (
        <div className="Biblioteca">
            <div className="cabecario">
                <Cabecario />
            </div>

            <main className="ConteudoBiblioteca">

                <form className="Brpesquisa" onSubmit={pesquisar}>
                    <input
                        type="text"
                        placeholder="Pesquise algum livro ou manga"
                        value={busca}
                        onChange={event => setBusca(event.target.value)}
                    />

                    <button type="submit">Pesquisar</button>
                </form>

                {categoria && !busca.trim() && (
                    <h2>Categoria: {categoria}</h2>
                )}

                           {(carregando) && (
                <div className="CarregamentoLivros">
                    <p>Procurando suas próximas leituras...</p>

                    <div className="ListaLivros">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div className="CardCarregando" key={index}>
                                <div className="CapaCarregando"></div>
                                <div className="TituloCarregando"></div>
                                <div className="BotaoCarregando"></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

                {erro && <p>{erro}</p>}

                {!carregando && obrasExibidas.length > 0 && (
                <div className="ListaLivros">
                        {obrasExibidas.map(obra => {
                            const favorito = favoritos.some(
                                item =>
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
                                            src={obra.capa || capaIndisponivel}
                                            alt={obra.titulo || obra.title || "Livro"}
                                            onError={substituirCapa}
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

                {!carregando && busca.trim() && obras.length === 0 && !erro && (
                    <p>Nenhuma obra encontrada.</p>
                )}

                {!carregando && categoria && !busca.trim() && obras.length === 0 && !erro && (
                    <p>Nenhuma obra encontrada nesta categoria.</p>
                )}

            </main>
        </div>
    );
}

export default Biblioteca;