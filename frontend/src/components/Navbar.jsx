import { Link, NavLink } from "react-router-dom";

export default function Navbar() {
  const baseLink = "px-3 py-2 rounded-md text-sm font-medium transition";
  const inactive =
    baseLink + " text-slate-200 hover:bg-slate-700 hover:text-white";
  const active = baseLink + " bg-white text-slate-900 shadow-sm";

  return (
    <nav className="bg-slate-800 text-white shadow">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo / título */}
          <Link
            to="/"
            className="flex flex-col sm:flex-row sm:items-baseline gap-0.5"
          >
            <span className="text-xl font-bold">MesaFácil</span>
            <span className="sm:ml-2 text-xs text-slate-300">
              Sistema de Reservas de Restaurantes
            </span>
          </Link>

          {/* Links */}
          <div className="flex gap-2">
            <NavLink
              to="/"
              className={({ isActive }) => (isActive ? active : inactive)}
            >
              Início
            </NavLink>
            <NavLink
              to="/clientes"
              className={({ isActive }) => (isActive ? active : inactive)}
            >
              Clientes
            </NavLink>
            <NavLink
              to="/restaurantes"
              className={({ isActive }) => (isActive ? active : inactive)}
            >
              Restaurantes
            </NavLink>
            <NavLink
              to="/reservas"
              className={({ isActive }) => (isActive ? active : inactive)}
            >
              Reservas
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
}
