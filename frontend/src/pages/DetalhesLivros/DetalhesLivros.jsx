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

useEffect(() => {
async function buscarObra() {
    try {
        setCarregando(true);
        setErro("");

        const resposta = await fetch(
        `http://localhost:3001/${tipo === "manga" ? "mangas" : "livros"}/${id}`);

        if (!resposta.ok) {
        throw new Error("Não foi possível carregar a obra.");
        }

        const dados = await resposta.json();
        setObra(dados);
        } catch (erro) {
        console.error("Erro ao buscar obra:", erro);
        setErro("Não foi possível carregar os detalhes da obra.");
        } finally {
        setCarregando(false);
        }
}
buscarObra();}, [tipo, id]);

    if (carregando) {
        return <div className="carregamento">
               <Carregamento/>
            </div>;
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
                        obra.autores?.map((autor) => autor.name || autor).join(", ") ||
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
                <button type="button">
                    Adicionar aos favoritos
                </button>
               <button type="button" onClick={() => navigate(`/Leitor/${tipo}/${id}`)} > Ler agora </button>
                </div>
            </section>
        </div>
    );
}

export default DetalhesLivros;