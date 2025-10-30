import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="bg-blue-600 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="font-bold text-xl">Sistema de Reservas</h1>
        <div className="space-x-4">
          <Link to="/" className="hover:underline">
            Início
          </Link>
          <Link to="/clientes" className="hover:underline">
            Clientes
          </Link>
          <Link to="/restaurantes" className="hover:underline">
            Restaurantes
          </Link>
          <Link to="/reservas" className="hover:underline">
            Reservas
          </Link>
        </div>
      </div>
    </nav>
  );
}
