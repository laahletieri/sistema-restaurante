import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Clientes from "./pages/Clientes";
import Restaurantes from "./pages/Restaurantes";
import Reservas from "./pages/Reservas";

function App() {
  return (
    <Router>
      <Navbar />
      <div className="container mx-auto">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/restaurantes" element={<Restaurantes />} />
          <Route path="/reservas" element={<Reservas />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
