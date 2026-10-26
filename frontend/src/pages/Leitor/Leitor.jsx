import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./Leitor.scss";
import Carregamento from "../../components/Carregamento/Carregamento";
import logo from "../../assets/images/livroon.png";

function Leitor() {
    const { tipo, id } = useParams();
    const navigate = useNavigate();

    const [paginas, setPaginas] = useState([]);
    const [capitulos, setCapitulos] = useState([]);
    const [capituloAtual, setCapituloAtual] = useState("");
    const [paginaAtual, setPaginaAtual] = useState(0);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");

    const [usuario, setUsuario] = useState(
    JSON.parse(localStorage.getItem("usuario") || "null")
);

useEffect(() => {
    async function buscarPerfil() {
        try {
            const token = localStorage.getItem("token");

            const resposta = await fetch("http://localhost:3001/usuarios/perfil", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!resposta.ok) return;

            const dados = await resposta.json();
            setUsuario(dados);
        } catch (erro) {
            console.error("Erro ao carregar perfil:", erro);
        }
    }

    buscarPerfil();
}, []);

    useEffect(() => {
        async function carregarLeitura() {
            try {
                setCarregando(true);
                setErro("");
                setPaginas([]);
                setCapitulos([]);
                setCapituloAtual("");
                setPaginaAtual(0);

                if (tipo === "livro") {
                    const resposta = await fetch(
                        `http://localhost:3001/livros/${id}/leitura`
                    );

                    const dados = await resposta.json();

                    if (!resposta.ok) {
                        throw new Error(
                            dados.mensagem || "Não foi possível carregar o livro."
                        );
                    }

                    const texto = dados.texto || "";

                    if (!texto) {
                        throw new Error("O conteúdo deste livro não está disponível.");
                    }

                    const palavras = texto.split(/\s+/);
                    const paginasTexto = [];

                    for (let i = 0; i < palavras.length; i += 350) {
                        paginasTexto.push(
                            palavras.slice(i, i + 350).join(" ")
                        );
                    }

                    setPaginas(paginasTexto);
                } else if (tipo === "manga") {
                    const resposta = await fetch(
                        `http://localhost:3001/mangas/${id}/capitulos`
                    );

                    const dados = await resposta.json();

                    if (!resposta.ok) {
                        throw new Error(
                            dados.mensagem || "Não foi possível carregar os capítulos."
                        );
                    }

                    const lista = Array.isArray(dados)
                        ? dados
                        : dados.capitulos || [];

                    if (lista.length === 0) {
                        throw new Error("Nenhum capítulo encontrado.");
                    }

                    const capitulosEmPortugues = lista.filter(
                        (capitulo) => capitulo.idioma === "pt-br"
                    );

                    const capitulosEscolhidos = (
                        capitulosEmPortugues.length > 0
                            ? capitulosEmPortugues
                            : lista.filter((capitulo) => capitulo.idioma === "en")
                    ).sort(
                        (a, b) => Number(a.numero) - Number(b.numero)
                    );

                    setCapitulos(capitulosEscolhidos);

                    if (capitulosEscolhidos.length === 0) {
                        throw new Error("Nenhum capítulo disponível em português ou inglês.");
                    }

                    setCapituloAtual(capitulosEscolhidos[0].id);

                    await carregarPaginasManga(capitulosEscolhidos[0].id);
                } else {
                    throw new Error("Tipo de leitura inválido.");
                }
            } catch (erro) {
                console.error("Erro ao carregar leitura:", erro);
                setErro(erro.message || "Não foi possível carregar a leitura.");
            } finally {
                setCarregando(false);
            }
        }

        async function carregarPaginasManga(idCapitulo) {
            const resposta = await fetch(
                `http://localhost:3001/mangas/capitulos/${idCapitulo}/paginas`
            );

            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    dados.mensagem || "Não foi possível carregar as páginas do mangá."
                );
            }

            if (!Array.isArray(dados.paginas) || dados.paginas.length === 0) {
                throw new Error("As páginas deste capítulo não estão disponíveis.");
            }

            setPaginas(dados.paginas);
            setPaginaAtual(0);
        }

        carregarLeitura();
    }, [tipo, id]);

    async function trocarCapitulo(event) {
        const novoId = event.target.value;

        try {
            setCarregando(true);
            setErro("");
            setCapituloAtual(novoId);

            const resposta = await fetch(
                `http://localhost:3001/mangas/capitulos/${novoId}/paginas`
            );

            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    dados.mensagem || "Não foi possível carregar o capítulo."
                );
            }

            if (!Array.isArray(dados.paginas) || dados.paginas.length === 0) {
                throw new Error("As páginas deste capítulo não estão disponíveis.");
            }

            setPaginas(dados.paginas);
            setPaginaAtual(0);
        } catch (erro) {
            console.error("Erro ao trocar capítulo:", erro);
            setErro(erro.message || "Não foi possível carregar o capítulo.");
        } finally {
            setCarregando(false);
        }
    }

    function avancarPagina() {
        setPaginaAtual((pagina) =>
            Math.min(pagina + 2, Math.max(0, paginas.length - 1))
        );
    }

    function voltarPagina() {
        setPaginaAtual((pagina) => Math.max(pagina - 2, 0));
    }

    
useEffect(() => {
    function controlarTeclas(event) {
        if (event.key === "ArrowRight") {
            setPaginaAtual((pagina) =>
                Math.min(pagina + 2, Math.max(0, paginas.length - 1))
            );
        }

        if (event.key === "ArrowLeft") {
            setPaginaAtual((pagina) => Math.max(pagina - 2, 0));
        }
    }

    window.addEventListener("keydown", controlarTeclas);

    return () => {
        window.removeEventListener("keydown", controlarTeclas);
    };
}, [paginas.length]);



    if (carregando) {
        return (
            <div className="carregamento">
                <Carregamento/>
            </div>
        );
    }

    if (erro) {
        return (
            <main className="Leitor">
                <p>{erro}</p>
                <button type="button" onClick={() => navigate(-1)}>
                    Voltar
                </button>
            </main>
        );
    }

    const totalPaginas = paginas.length;
    const paginasLidas = Math.min(paginaAtual + 2, totalPaginas);
    const progresso = totalPaginas
        ? (paginasLidas / totalPaginas) * 100
        : 0;

    const capituloSelecionado = capitulos.find(
        (capitulo) => capitulo.id === capituloAtual
    );

    return (
        <main className="Leitor">
            <header className="CabecalhoLeitor">
                <div className="voltar">
                <button
                    type="button"
                    className="VoltarDetalhes"
                    onClick={() => navigate(`/DetalhesLivros/${tipo}/${id}`)}
                >
                    Ver detalhes
                </button>
                </div>

                <div className="Livroon">
                <a href="/home"><img src={logo} alt="" /></a>
                <span>Livro-on</span>
                </div>
    <button className="BotaoPerfil" type="button">
        <img src={usuario?.foto_perfil? `http://localhost:3001${usuario.foto_perfil}`: "/ftpadrao.avif"}
        alt="Foto de perfil"/>
    </button>
            </header>

            {tipo === "manga" && (
                <div className="SeletorCapitulo">
                    <label htmlFor="capitulo">Capítulo:</label>

                    <select
                        id="capitulo"
                        value={capituloAtual}
                        onChange={trocarCapitulo}
                    >
                        {capitulos.map((capitulo) => (
                            <option key={capitulo.id} value={capitulo.id}>
                                Capítulo {capitulo.numero}
                                {capitulo.titulo && capitulo.titulo !== "Sem título"
                                    ? ` - ${capitulo.titulo}`
                                    : ""}
                                {" "}
                                ({capitulo.idioma})
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <section className="LivroAberto">
                <button
                    type="button"
                    className="Navegacao"
                    onClick={voltarPagina}
                    disabled={paginaAtual === 0}
                    aria-label="Páginas anteriores"
                >
                    ❮
                </button>

                {tipo === "livro" ? (
                    <>
                        <article className="Pagina">
                            <p>{paginas[paginaAtual]}</p>
                        </article>

                        <div className="Divisoria" />

                        <article className="Pagina">
                            <p>{paginas[paginaAtual + 1] || ""}</p>
                        </article>
                    </>
                ) : (
                    <>
                        <article className="Pagina PaginaManga">
                            {paginas[paginaAtual] && (
                                <img
                                    src={paginas[paginaAtual].imagem}
                                    alt={`Página ${paginas[paginaAtual].numero}`}
                                />
                            )}
                        </article>

                        <div className="Divisoria" />

                        <article className="Pagina PaginaManga">
                            {paginas[paginaAtual + 1] && (
                                <img
                                    src={paginas[paginaAtual + 1].imagem}
                                    alt={`Página ${paginas[paginaAtual + 1].numero}`}
                                />
                            )}
                        </article>
                    </>
                )}

                <button
                    type="button"
                    className="Navegacao"
                    onClick={avancarPagina}
                    disabled={paginaAtual + 2 >= totalPaginas}
                    aria-label="Próximas páginas"
                >
                    ❯
                </button>
            </section>

            <footer className="ProgressoLeitura">
                <strong>
                    {tipo === "manga" && capituloSelecionado
                        ? `Capítulo ${capituloSelecionado.numero}:`
                        : "Você leu:"}
                </strong>

                <div className="BarraProgresso">
                    <div style={{ width: `${progresso}%` }} />
                </div>

                <span>
                    {paginasLidas} / {totalPaginas}
                </span>
            </footer>
        </main>
    );
}

export default Leitor;
