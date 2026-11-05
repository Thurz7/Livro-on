import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.scss";
import Cabecario from "../../components/Cabecario/cabecario";
import BarraPesquisa from "../../components/BarraPesquisa/BarraPesquisa";

export default function Home() {
    const [ultimaObra, setUltimaObra] = useState(null);
    const [destaque, setDestaque] = useState(null);
    const navigate = useNavigate();
    
    useEffect(() => {
        async function carregarHistorico() {
            try {
                const token = localStorage.getItem("token");
                if (!token) return;

                const resposta = await fetch("http://localhost:3001/usuarios/historico", {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!resposta.ok) throw new Error("Erro ao buscar histórico.");

                const dados = await resposta.json();
                setUltimaObra(dados);
            } catch (erro) {
                console.error("Erro ao carregar histórico:", erro);
            }
        }

        carregarHistorico();
    }, []);

     async function carregarDestaque() {
        try {
            const resposta = await fetch("http://localhost:3001/usuarios/mais-acessada-semana");
            if (!resposta.ok) throw new Error("Erro ao buscar destaque.");
            const dados = await resposta.json();
            setDestaque(dados);
        } catch (erro) {
            console.error("Erro ao carregar destaque:", erro);
        }
    }
    carregarDestaque();

    return (
        <div className="home">
            <Cabecario />
            <BarraPesquisa />
            {ultimaObra && (
                <div className="ContinuarLer">
                    <div className="CardLer" >
                        <img src={ultimaObra.capa} alt={ultimaObra.titulo} />
                        <div className="textos">
                            <p className="titulo">{ultimaObra.titulo}</p>
                            <p className="sinopse">{ultimaObra.sinopse}</p>
                            <button type="button" onClick={() => navigate(`/Leitor/${ultimaObra.tipo}/${ultimaObra.obra_id}`)}>Continuar lendo</button>
                        </div>
                    </div>
                </div>
            )}

                    {destaque && (
            <section className="DestaqueSemana">
                <div className="ConteudoDestaque">
                    <h2><span>Destaque</span> da semana</h2>
                    <h3>{destaque.titulo}</h3>
                    <p>{destaque.sinopse}</p>
                    <div className="RodapeDestaque">
                        <span className="FavoritarDestaque">▮</span>
                    </div>
                </div>
                <div className="ImagemDestaque">
                    <img src={destaque.capa} alt={destaque.titulo} />
                    <div className="AcessosDestaque">
                        <button onClick={() => navigate(`/Leitor/${destaque.tipo}/${destaque.obra_id}`)}>Ler agora</button>
                        <span>{destaque.acessos}</span>
                    </div>
                </div>
            </section>
        )}
        </div>
    );
}