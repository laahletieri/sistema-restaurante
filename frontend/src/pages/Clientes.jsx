import { useEffect, useState } from "react";
import api from "../services/api";
import { getServiceUrl } from "../services/nameService";

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    nome: "",
    cpf: "",
    email: "",
    telefone: "",
  });

  // Carregar lista ao entrar
  useEffect(() => {
    carregarClientes();
  }, []);

  async function carregarClientes() {
    try {
      const baseUrl = await getServiceUrl("clientes");
      const res = await api.get(`${baseUrl}/clientes`);
      setClientes(res.data);
    } catch (err) {
      console.error("Erro ao carregar clientes:", err);
      alert("❌ Falha ao conectar com o serviço de clientes.");
    }
  }

  // Salvar (novo ou edição)
  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const baseUrl = await getServiceUrl("clientes");

      if (editing) {
        await api.put(`${baseUrl}/clientes/${editing}`, form);
        alert("Cliente atualizado com sucesso!");
      } else {
        await api.post(`${baseUrl}/clientes`, form);
        alert("Cliente cadastrado com sucesso!");
      }

      setForm({ nome: "", cpf: "", email: "", telefone: "" });
      setEditing(null);
      carregarClientes();
    } catch (err) {
      console.error("Erro ao salvar cliente:", err);
      alert(err.response?.data?.erro || "❌ Erro ao salvar cliente.");
    }
  }

  // Iniciar edição
  function iniciarEdicao(cliente) {
    setEditing(cliente.id);
    setForm({
      nome: cliente.nome,
      cpf: cliente.cpf,
      email: cliente.email,
      telefone: cliente.telefone,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelarEdicao() {
    setEditing(null);
    setForm({ nome: "", cpf: "", email: "", telefone: "" });
  }

  // Excluir
  async function excluirCliente(id) {
    if (!window.confirm("Deseja realmente excluir este cliente?")) return;

    try {
      const baseUrl = await getServiceUrl("clientes");
      await api.delete(`${baseUrl}/clientes/${id}`);
      alert("Cliente excluído com sucesso!");
      carregarClientes();
    } catch (err) {
      console.error("Erro ao excluir cliente:", err);
      alert(err.response?.data?.erro || "❌ Falha ao excluir cliente.");
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">👤 Clientes</h1>

      {/* Formulário */}
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md rounded-lg p-6 mb-8 max-w-xl mx-auto"
      >
        <h2 className="text-lg font-semibold mb-4 text-center">
          {editing ? "✏️ Editar Cliente" : "➕ Novo Cliente"}
        </h2>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <input
            type="text"
            placeholder="Nome"
            className="border p-2 rounded"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="CPF (somente números)"
            className="border p-2 rounded"
            value={form.cpf}
            onChange={(e) => setForm({ ...form, cpf: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <input
            type="email"
            placeholder="Email"
            className="border p-2 rounded"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            type="text"
            placeholder="Telefone"
            className="border p-2 rounded"
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded w-full"
          >
            {editing ? "Salvar Alterações" : "Salvar Cliente"}
          </button>

          {editing && (
            <button
              type="button"
              onClick={cancelarEdicao}
              className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded w-full"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Lista */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-lg font-semibold mb-2">Clientes cadastrados</h2>

        <ul className="space-y-3">
          {clientes.map((c) => (
            <li
              key={c.id}
              className="flex justify-between items-center bg-gray-50 border p-3 rounded-lg shadow-sm"
            >
              <span>
                <strong>Nome:</strong> {c.nome} | <strong>CPF:</strong> {c.cpf}{" "}
                | <strong>Email:</strong> {c.email || "—"} |{" "}
                <strong>Telefone:</strong> {c.telefone || "—"}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={() => iniciarEdicao(c)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
                >
                  Editar
                </button>
                <button
                  onClick={() => excluirCliente(c.id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
