import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Clientes from "./pages/Clientes";
import Restaurantes from "./pages/Restaurantes";
import Reservas from "./pages/Reservas";

import Login from "./pages/Login"; // <-- Import novo
import Cadastro from "./pages/Cadastro"; // <-- Import novo

function App() {
  return (
    <Router>
      <Navbar />
      <div className="container mx-auto">
        <Routes>
          {/* Páginas principais */}
          <Route path="/" element={<Home />} />

          {/* Login e Cadastro */}
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />

          {/* CRUDs existentes */}
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/restaurantes" element={<Restaurantes />} />
          <Route path="/reservas" element={<Reservas />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
