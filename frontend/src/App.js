import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home/Home";
import Cadastro from "./pages/Cadastro/Cadastro";
import Customizar from "./pages/Customizar/Customizar";
import DetalhesLivros from "./pages/DetalhesLivros/DetalhesLivros";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/Home" element={<Home />} />
        <Route path="/Cadastro" element={<Cadastro />} />
        <Route path="/Customizar" element={<Customizar />} />
        <Route path="/DetalhesLivros/:tipo/:id" element={<DetalhesLivros />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;