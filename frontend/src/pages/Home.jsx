export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center text-center h-[80vh] bg-gradient-to-b from-blue-50 to-white">
      <h1 className="text-4xl font-bold text-blue-700 mb-4">
        🏢 Sistema de Reservas de Restaurantes
      </h1>

      <p className="text-lg text-gray-700 max-w-xl">
        Bem-vindo ao sistema distribuído de reservas! Aqui você pode gerenciar
        **clientes**, **restaurantes** e **reservas** de forma simples e
        integrada.
      </p>

      <div className="mt-8 flex gap-6">
        <a
          href="/clientes"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 transition"
        >
          Gerenciar Clientes
        </a>
        <a
          href="/restaurantes"
          className="bg-green-600 text-white px-6 py-3 rounded-lg shadow hover:bg-green-700 transition"
        >
          Ver Restaurantes
        </a>
        <a
          href="/reservas"
          className="bg-purple-600 text-white px-6 py-3 rounded-lg shadow hover:bg-purple-700 transition"
        >
          Consultar Reservas
        </a>
      </div>

      <footer className="mt-12 text-gray-500 text-sm">
        Desenvolvido por{" "}
        <strong>Laís Rios, Maria Clara e Maurício Adriano</strong> — Sistemas
        Distribuídos 🖥️
      </footer>
    </div>
  );
}
