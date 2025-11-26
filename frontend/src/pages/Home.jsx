export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[80vh] bg-slate-50">
      <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 mb-4">
        MesaFácil
      </h1>

      <p className="text-lg md:text-xl text-slate-600 max-w-xl">
        Bem-vindo ao sistema distribuído de reservas de restaurantes! Aqui você
        pode gerenciar clientes, restaurantes e reservas de forma simples,
        integrada e confiável.
      </p>

      <div className="mt-8 flex flex-wrap gap-4 justify-center">
        <a
          href="/clientes"
          className="bg-slate-800 text-white px-6 py-3 rounded-lg shadow hover:bg-slate-900 transition"
        >
          Gerenciar Clientes
        </a>
        <a
          href="/restaurantes"
          className="bg-emerald-600 text-white px-6 py-3 rounded-lg shadow hover:bg-emerald-700 transition"
        >
          Ver Restaurantes
        </a>
        <a
          href="/reservas"
          className="bg-violet-600 text-white px-6 py-3 rounded-lg shadow hover:bg-violet-700 transition"
        >
          Consultar Reservas
        </a>
      </div>

      <footer className="mt-12 text-slate-500 text-sm">
        Desenvolvido por{" "}
        <strong>Laís Rios, Maria Clara e Maurício Adriano</strong> — Sistemas
        Distribuídos 🖥️
      </footer>
    </div>
  );
}
