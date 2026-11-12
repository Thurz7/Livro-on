import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./DetalhesLivros.scss";
import Carregamento from "../../components/Carregamento/Carregamento";

function DetalhesLivros() {
    const { tipo, id } = useParams();
    const navigate = useNavigate();

    const [obra, setObra] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [salvando, setSalvando] = useState(false);
    const [mensagem, setMensagem] = useState("");

    // Busca os detalhes da obra.
    useEffect(() => {
        async function buscarObra() {
            try {
                setCarregando(true);
                setErro("");

                const rota = tipo === "manga" ? "mangas" : "livros";

                const resposta = await fetch(
                    `http://localhost:3001/${rota}/${id}`
                );

                if (!resposta.ok) {
                    throw new Error("Não foi possível carregar a obra.");
                }

                setObra(await resposta.json());

            } catch (erro) {
                console.error("Erro ao buscar obra:", erro);
                setErro("Não foi possível carregar os detalhes da obra.");
            } finally {
                setCarregando(false);
            }
        }

        buscarObra();
    }, [tipo, id]);

    useEffect(() => {
    if (!mensagem) return;

    const temporizador = setTimeout(() => {
        setMensagem("");
    }, 3000);

    return () => clearTimeout(temporizador);
}, [mensagem]);

    // Adiciona a obra aos favoritos.
    async function adicionarFavorito() {
        const token = localStorage.getItem("token");

        if (!token) {
            setMensagem("Entre na sua conta para adicionar favoritos.");
            return;
        }

        try {
            setSalvando(true);
            setMensagem("");

            const resposta = await fetch(
                "http://localhost:3001/favoritos",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        obra_id: String(id),
                        tipo
                    })
                }
            );

            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    dados.mensagem || "Não foi possível adicionar aos favoritos."
                );
            }

            setMensagem("Obra adicionada aos favoritos!");

        } catch (erro) {
            setMensagem(erro.message);
            console.error("Erro ao adicionar favorito:", erro);
        } finally {
            setSalvando(false);
        }
    }

    if (carregando) {
        return (
            <div className="carregamento">
                <Carregamento />
            </div>
        );
    }

    if (erro || !obra) {
        return <p>{erro || "Obra não encontrada."}</p>;
    }

    return (
        <div className="DetalhesLivros">
            <img
                className="Capa"
                src={obra.capa || ""}
                alt={`Capa de ${obra.titulo}`}
            />

            <section className="Informacoes">
                <h1>{obra.titulo}</h1>

                <p>
                    <strong>Autor:</strong>{" "}
                    {obra.autor ||
                        obra.autores?.map(autor => autor.name || autor).join(", ") ||
                        "Não informado"}
                </p>

                <p>
                    <strong>Ano de lançamento:</strong>{" "}
                    {obra.ano || "Não informado"}
                </p>

                <p>
                    <strong>Sinopse:</strong>{" "}
                    {obra.descricao || "Descrição indisponível."}
                </p>

                <div className="bt">
                    <button
                        type="button"
                        onClick={adicionarFavorito}
                        disabled={salvando}
                    >
                        {salvando ? "Adicionando..." : "Adicionar aos favoritos"}
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate(`/Leitor/${tipo}/${id}`)}
                    >
                        Ler agora
                    </button>
                </div>

                {mensagem && (
    <p className="MensagemFavorito">
        {mensagem}
    </p>
)}
            </section>
        </div>
    );
}

export default DetalhesLivros;
