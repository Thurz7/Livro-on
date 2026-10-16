import "./Home.scss";
import Cabecario from "../../components/Cabecario/cabecario";
import BarraPesquisa from "../../components/BarraPesquisa/BarraPesquisa";

export default function Home() {
return (
    
    <div className="home">
        <Cabecario />
        <BarraPesquisa /> 
    </div>
);
}
