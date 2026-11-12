import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./Leitor.scss";
import Carregamento from "../../components/Carregamento/Carregamento";
import logo from "../../assets/images/livroon.png";

const API = "http://localhost:3001";

// Busca as páginas de um capítulo.
async function buscarPaginasManga(idCapitulo) {
    const resposta = await fetch(
        `${API}/mangas/capitulos/${idCapitulo}/paginas`
    );
    const dados = await resposta.json();

    if (!resposta.ok || !dados.paginas?.length) {
        throw new Error(
            dados.mensagem || "Não foi possível carregar as páginas."
        );
    }

    return dados.paginas;
}

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

    // Carrega o perfil.
    useEffect(() => {
        async function buscarPerfil() {
            const token = localStorage.getItem("token");
            if (!token) return;

            try {
                const resposta = await fetch(`${API}/usuarios/perfil`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (resposta.ok) setUsuario(await resposta.json());
            } catch (erro) {
                console.error("Erro ao carregar perfil:", erro);
            }
        }

        buscarPerfil();
    }, []);

    // Carrega o conteúdo e recupera o progresso.
    useEffect(() => {
        async function carregarLeitura() {
            try {
                setCarregando(true);
                setErro("");
                setPaginas([]);
                setCapitulos([]);
                setCapituloAtual("");
                setPaginaAtual(0);

                const token = localStorage.getItem("token");
                let totalPaginas = 0;

                // Registra o histórico.
                if (token) {
                    fetch(`${API}/usuarios/historico`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify({ obra_id: id, tipo })
                    }).catch(erro =>
                        console.error("Erro ao registrar histórico:", erro)
                    );
                }

                if (tipo === "livro") {
                    const resposta = await fetch(`${API}/livros/${id}/leitura`);
                    const dados = await resposta.json();

                    if (!resposta.ok || !dados.texto) {
                        throw new Error(
                            dados.mensagem || "Conteúdo do livro indisponível."
                        );
                    }

                    const palavras = dados.texto.split(/\s+/);
                    const paginasTexto = [];

                    for (let i = 0; i < palavras.length; i += 350) {
                        paginasTexto.push(palavras.slice(i, i + 350).join(" "));
                    }

                    totalPaginas = paginasTexto.length;
                    setPaginas(paginasTexto);

                } else if (tipo === "manga") {
                    const resposta = await fetch(`${API}/mangas/${id}/capitulos`);
                    const dados = await resposta.json();

                    if (!resposta.ok) {
                        throw new Error(
                            dados.mensagem || "Não foi possível carregar os capítulos."
                        );
                    }

                    const lista = Array.isArray(dados)
                        ? dados
                        : dados.capitulos || [];

                    const portugues = lista.filter(
                        capitulo => capitulo.idioma === "pt-br"
                    );

                    const selecionados = (
                        portugues.length
                            ? portugues
                            : lista.filter(capitulo => capitulo.idioma === "en")
                    ).sort((a, b) => Number(a.numero) - Number(b.numero));

                    if (!selecionados.length) {
                        throw new Error("Nenhum capítulo disponível.");
                    }

                    setCapitulos(selecionados);
                    setCapituloAtual(selecionados[0].id);

                    const paginasManga = await buscarPaginasManga(
                        selecionados[0].id
                    );

                    totalPaginas = paginasManga.length;
                    setPaginas(paginasManga);

                } else {
                    throw new Error("Tipo de leitura inválido.");
                }

                // Recupera a posição salva.
                if (token) {
                    const resposta = await fetch(
                        `${API}/progresso?obra_id=${encodeURIComponent(id)}&tipo=${tipo}`,
                        {
                            headers: { Authorization: `Bearer ${token}` }
                        }
                    );

                    if (resposta.ok) {
                        const dados = await resposta.json();
                        const posicao = Math.max(
                            0,
                            Number(dados.posicao_leitura) - 1
                        );

                        setPaginaAtual(
                            Math.min(
                                Math.floor(posicao / 2) * 2,
                                Math.max(0, totalPaginas - 1)
                            )
                        );
                    }
                }

            } catch (erro) {
                console.error("Erro ao carregar leitura:", erro);
                setErro(erro.message || "Não foi possível carregar a leitura.");
            } finally {
                setCarregando(false);
            }
        }

        carregarLeitura();
    }, [tipo, id]);

    // Salva o progresso automaticamente.
    useEffect(() => {
        if (carregando || erro || !paginas.length) return;

        const token = localStorage.getItem("token");
        if (!token) return;

        const tempo = setTimeout(async () => {
            try {
                const resposta = await fetch(`${API}/progresso`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        obra_id: id,
                        tipo,
                        posicao_leitura: paginaAtual + 1
                    })
                });

                if (!resposta.ok) {
                    console.error("Erro ao salvar progresso:", await resposta.text());
                }
            } catch (erro) {
                console.error("Erro ao salvar progresso:", erro);
            }
        }, 700);

        return () => clearTimeout(tempo);
    }, [paginaAtual, paginas.length, carregando, erro, tipo, id, capituloAtual]);

    // Troca o capítulo.
    async function trocarCapitulo(event) {
        try {
            setCarregando(true);
            setErro("");
            setCapituloAtual(event.target.value);
            setPaginaAtual(0);
            setPaginas(await buscarPaginasManga(event.target.value));
        } catch (erro) {
            setErro(erro.message || "Erro ao trocar capítulo.");
        } finally {
            setCarregando(false);
        }
    }

    // Navegação entre páginas.
    function avancarPagina() {
        setPaginaAtual(pagina =>
            Math.min(pagina + 2, Math.max(0, paginas.length - 1))
        );
    }

    function voltarPagina() {
        setPaginaAtual(pagina => Math.max(pagina - 2, 0));
    }

    // Navegação pelo teclado.
    useEffect(() => {
        function controlarTeclas(event) {
            if (event.key === "ArrowRight") avancarPagina();
            if (event.key === "ArrowLeft") voltarPagina();
        }

        window.addEventListener("keydown", controlarTeclas);
        return () => window.removeEventListener("keydown", controlarTeclas);
    }, [paginas.length]);

    if (carregando) {
        return (
            <div className="carregamento">
                <Carregamento />
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
        capitulo => capitulo.id === capituloAtual
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
                    <a href="/home">
                        <img src={logo} alt="" />
                    </a>
                    <span>Livro-on</span>
                </div>

                <button className="BotaoPerfil" type="button">
                    <img
                        src={
                            usuario?.foto_perfil
                                ? `${API}${usuario.foto_perfil}`
                                : "/ftpadrao.avif"
                        }
                        alt="Foto de perfil"
                    />
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
                        {capitulos.map(capitulo => (
                            <option key={capitulo.id} value={capitulo.id}>
                                Capítulo {capitulo.numero}
                                {capitulo.titulo && capitulo.titulo !== "Sem título"
                                    ? ` - ${capitulo.titulo}`
                                    : ""}
                                {" "}({capitulo.idioma})
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

                <span>{paginasLidas} / {totalPaginas}</span>
            </footer>
        </main>
    );
}

export default Leitor;
