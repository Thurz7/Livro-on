import "./Home.scss";
import Cabecario from "../../components/Cabecario/cabecario";
import BarraPesquisa from "../../components/BarraPesquisa/BarraPesquisa";

export default function Home() {
return (
    
    <div className="home">
        <Cabecario />
        <BarraPesquisa /> 

        <div className="ContinuarLer">
            <div className="CardLer">
                <img src="" alt="" />
                <p className="titulo"></p>
                <p className="sinopse"></p>
            </div>
        </div>
    </div>
);
}
