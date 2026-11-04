import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.scss";
import Cabecario from "../../components/Cabecario/cabecario";
import BarraPesquisa from "../../components/BarraPesquisa/BarraPesquisa";

export default function Home() {
    const [ultimoLivro, setUltimoLivro] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        async function buscarUltimoLivro() {
            const token = localStorage.getItem("token");
            if (!token) {
                setCarregando(false);
                return;
            }
            try {
                const resposta = await fetch("http://localhost:3001/usuarios/historico", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!resposta.ok) throw new Error("Erro ao buscar histórico.");
                const dados = await resposta.json();
                console.log("Histórico recebido:", dados);
                const livro = Array.isArray(dados) ? dados[0] : dados;
                setUltimoLivro(livro || null);
            } catch (erro) {
                console.error("Erro ao carregar último livro:", erro);
            } finally {
                setCarregando(false);
            }
        }
        buscarUltimoLivro();
    }, []);

    function continuarLeitura() {
        if (ultimoLivro) navigate(`/Leitor/${ultimoLivro.tipo}/${ultimoLivro.obra_id}`);
    }

    return (
        <div className="home">
            <Cabecario />
            <BarraPesquisa />
            <div className="ContinuarLer">
                {carregando ? <p>Carregando...</p> : ultimoLivro ? (
                    <div className="CardLer" onClick={continuarLeitura}>
                        <img src={ultimoLivro.capa} alt={`Capa de ${ultimoLivro.titulo}`} />
                        <p className="titulo">{ultimoLivro.titulo}</p>
                        <p className="sinopse">{ultimoLivro.sinopse}</p>
                    </div>
                ) : <p>Nenhum livro acessado recentemente.</p>}
            </div>
        </div>
    );
}
