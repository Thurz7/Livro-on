import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.scss";
import Cabecario from "../../components/Cabecario/cabecario";
import BarraPesquisa from "../../components/BarraPesquisa/BarraPesquisa";
import favoritos from "../../assets/images/favoritos.svg";
import stonks from "../../assets/images/stonks.png";
import capaIndisponivel from "../../assets/images/capai.png";
import logo from "../../assets/images/livroon.png";
import Facebook from "../../assets/images/Facebook.svg";
import Instagram from "../../assets/images/Instagram.svg";
import Bloco from "../../assets/images/empilhado.svg";


function substituirCapa(e) {
    e.currentTarget.onerror = null;
    e.currentTarget.src = capaIndisponivel;
}

export default function Home() {
    const [ultimaObra, setUltimaObra] = useState(null);
    const [destaque, setDestaque] = useState(null);
    const [favorito, setFavorito] = useState(null);
    const [obrasEmAlta, setObrasEmAlta] = useState([]);
    const [carregandoFavorito, setCarregandoFavorito] = useState(false);

    const navigate = useNavigate();

    const categorias = [
        "Romance",
        "Fantasia",
        "Suspense",
        "Terror",
        "Ficção",
        "HQ",
        "Ação",
        "Comédia"
    ];

    function selecionarCategoria(categoria) {
        navigate(`/biblioteca?categoria=${encodeURIComponent(categoria)}`);
    }

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
                        <img
                            src={ultimaObra.capa || capaIndisponivel}
                            alt={ultimaObra.titulo}
                            onError={substituirCapa}
                        />

                        <div className="textos">
                            <p className="titulo">{ultimaObra.titulo}</p>
                            <p className="sinopse">{ultimaObra.sinopse}</p>

                            <button
                                type="button"
                                onClick={() => navigate(`/Leitor/${ultimaObra.tipo}/${ultimaObra.obra_id}`)}
                            >
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
                        <img
                            src={destaque.capa || capaIndisponivel}
                            alt={destaque.titulo}
                            onError={substituirCapa}
                        />

                        <div className="AcessosDestaque">
                            <button
                                onClick={() => navigate(`/Leitor/${destaque.tipo}/${destaque.obra_id}`)}
                            >
                                Ler agora
                            </button>

                            <span>{destaque.acessos}</span>
                        </div>
                    </div>
                </section>
            )}

            <section className="CategoriasHome">
                <section id="categoria"></section>

                <div className="TituloCategorias">
                    <img src={Bloco} alt="" />
                    <h2>Categoria</h2>
                </div>

                <div className="ListaCategorias">
                    {categorias.map((categoria, index) => (
                        <button
                            key={categoria}
                            className={`Categoria Categoria${index + 1}`}
                            onClick={() => selecionarCategoria(categoria)}
                        >
                            {categoria}
                        </button>
                    ))}
                </div>
            </section>

            {obrasEmAlta.length > 0 && (
                <section className="EmAlta">
                    <section id="destaques">
                        <div className="Stonks">
                            <img src={stonks} alt="" />
                            <h2>Em alta</h2>
                        </div>

                        <div className="ListaEmAlta">
                            {obrasEmAlta.map(obra => (
                                <img
                                    key={`${obra.tipo}-${obra.obra_id}`}
                                    src={obra.capa || capaIndisponivel}
                                    alt={obra.titulo}
                                    title={obra.titulo}
                                    onClick={() => navigate(`/Leitor/${obra.tipo}/${obra.obra_id}`)}
                                    onError={substituirCapa}
                                />
                            ))}
                        </div>
                    </section>
                </section>
            )}

            <footer className="footer-container">
      <div className="footer-content">
        {/* Logo / Ilustração da Cegonha */}
        <div className="footer-logo">
          <img src={logo} alt="Logo Cegonha carregando livros" />
        </div>

        {/* Coluna 1: Início */}
        <div className="footer-column">
          <h3>Início</h3>
          <ul>
            <li><a href="/Home">Home</a></li>
            <li><a href="/Biblioteca">Biblioteca</a></li>
            <li><a href="">Doações</a></li>
          </ul>
        </div>

        {/* Coluna 2: Sobre nós */}
        <div className="footer-column">
          <h3>Sobre nós</h3>
          <ul>
            <li><a href="">Informações da empresa</a></li>
            <li><a href="">Contato</a></li>
          </ul>
        </div>

        {/* Coluna 3: API */}
        <div className="footer-column">
          <h3>API</h3>
          <ul>
            <li><a href="https://www.gutenberg.org/" target="_blank" rel="noopener noreferrer" className="seu-botao-class">Gunteberg</a></li>
            <li><a href="https://www.mangadex.org/" target="_blank" rel="noopener noreferrer" className="seu-botao-class">Mangadex</a></li>
          </ul>
        </div>

        {/* Redes Sociais */}
        <div className="footer-social">
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
           <img src={Facebook} alt="" />
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
           <img src={Instagram} alt="" />
          </a>
        </div>
      </div>
    </footer>
        </div>
    );
}
