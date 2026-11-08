import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.scss";
import Cabecario from "../../components/Cabecario/cabecario";
import BarraPesquisa from "../../components/BarraPesquisa/BarraPesquisa";
import favoritos from "../../assets/images/favoritos.svg";

export default function Home() {
    const [ultimaObra, setUltimaObra] = useState(null);
    const [destaque, setDestaque] = useState(null);
    const [favorito, setFavorito] = useState(null);
    const [obrasEmAlta, setObrasEmAlta] = useState([]);
    const [carregandoFavorito, setCarregandoFavorito] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        async function carregarDados() {
            try {
                const token = localStorage.getItem("token");

                if (token) {
                    const resposta = await fetch("http://localhost:3001/usuarios/historico", {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (!resposta.ok) throw new Error("Erro ao buscar histórico.");

                    const dados = await resposta.json();
                    setUltimaObra(dados);
                }

                const respostaDestaque = await fetch("http://localhost:3001/usuarios/mais-acessada-semana");

                if (!respostaDestaque.ok) throw new Error("Erro ao buscar destaque.");

                const dadosDestaque = await respostaDestaque.json();
                setDestaque(dadosDestaque);

                if (token && dadosDestaque) {
                    const respostaFavoritos = await fetch("http://localhost:3001/favoritos", {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (!respostaFavoritos.ok) throw new Error("Erro ao buscar favoritos.");

                    const dadosFavoritos = await respostaFavoritos.json();

                    const encontrado = dadosFavoritos.find(item =>
                        String(item.obra_id) === String(dadosDestaque.obra_id) &&
                        item.tipo === dadosDestaque.tipo
                    );

                    setFavorito(encontrado || null);
                }

                const respostaEmAlta = await fetch("http://localhost:3001/usuarios/em-alta");
                if (!respostaEmAlta.ok) throw new Error("Erro ao buscar obras em alta.");
                const dadosEmAlta = await respostaEmAlta.json();
                setObrasEmAlta(dadosEmAlta);
            } catch (erro) {
                console.error("Erro ao carregar Home:", erro);
            }
        }

        carregarDados();
    }, []);

    async function alternarFavorito() {
        const token = localStorage.getItem("token");

        if (!token) {
            navigate("/Cadastro");
            return;
        }

        if (!destaque || carregandoFavorito) return;

        setCarregandoFavorito(true);

        try {
            if (favorito) {
                const resposta = await fetch(`http://localhost:3001/favoritos/${favorito.id}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!resposta.ok) throw new Error("Erro ao remover favorito.");

                setFavorito(null);
            } else {
                const resposta = await fetch("http://localhost:3001/favoritos", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        obra_id: destaque.obra_id,
                        tipo: destaque.tipo
                    })
                });

                if (!resposta.ok) throw new Error("Erro ao adicionar favorito.");

                const dados = await resposta.json();

                setFavorito({
                    id: dados.id,
                    obra_id: destaque.obra_id,
                    tipo: destaque.tipo
                });
            }
        } catch (erro) {
            console.error("Erro ao alterar favorito:", erro);
        } finally {
            setCarregandoFavorito(false);
        }
    }

    return (
        <div className="home">
            <Cabecario />
            <BarraPesquisa />

            {ultimaObra && (
                <div className="ContinuarLer">
                    <div className="CardLer">
                        <img src={ultimaObra.capa} alt={ultimaObra.titulo} />
                        <div className="textos">
                            <p className="titulo">{ultimaObra.titulo}</p>
                            <p className="sinopse">{ultimaObra.sinopse}</p>
                            <button type="button" onClick={() => navigate(`/Leitor/${ultimaObra.tipo}/${ultimaObra.obra_id}`)}>
                                Continuar lendo
                            </button>
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
                        <button
                            type="button"
                            className={`FavoritarDestaque ${favorito ? "Ativo" : ""}`}
                            onClick={alternarFavorito}
                            disabled={carregandoFavorito}
                            aria-label={favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                        >
                          <img src={favoritos} alt="Favoritar" />
                        </button>
                    </div>
                    </div>

                    <div className="ImagemDestaque">
                        <img src={destaque.capa} alt={destaque.titulo} />
                        <div className="AcessosDestaque">
                            <button onClick={() => navigate(`/Leitor/${destaque.tipo}/${destaque.obra_id}`)}>
                                Ler agora
                            </button>
                            <span>{destaque.acessos}</span>
                        </div>
                    </div>
                </section>
            )}

                    {obrasEmAlta.length > 0 && (
            <section className="EmAlta">
                <h2>Em alta</h2>
                <div className="ListaEmAlta">
                    {obrasEmAlta.map(obra => (
                      <img
                    src={obra.capa}
                    alt={obra.titulo}
                    title={obra.titulo}
                    onClick={() => navigate(`/Leitor/${obra.tipo}/${obra.obra_id}`)}
                    onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300'%3E%3Crect width='100%25' height='100%25' fill='%232b2b2b'/%3E%3Ctext x='50%25' y='50%25' fill='white' font-size='16' text-anchor='middle' dominant-baseline='middle'%3ESem capa%3C/text%3E%3C/svg%3E";
                    }}
                />
                    ))}
                </div>
            </section>
        )}
        </div>
    );
}