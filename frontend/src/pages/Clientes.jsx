import { useEffect, useState } from "react";
import axios from "axios";

export default function Clientes() {
  const API_CLIENTES =
    "http://clientes-env.eba-ytjkzypy.sa-east-1.elasticbeanstalk.com";
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState({
    nome: "",
    cpf: "",
    email: "",
    telefone: "",
  });

  // =====================================================
  // 🔹 Carregar lista de clientes ao iniciar
  // =====================================================
  useEffect(() => {
    carregarClientes();
  }, []);

  async function carregarClientes() {
    try {
      const res = await axios.get(`${API_CLIENTES}/clientes`);
      setClientes(res.data);
    } catch (err) {
      console.error("Erro ao carregar clientes:", err);
    }
  }

  // =====================================================
  // 🟢 Cadastrar cliente
  // =====================================================
  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await axios.post(`${API_CLIENTES}/clientes`, form);
      alert("Cliente cadastrado com sucesso!");
      setForm({ nome: "", cpf: "", email: "", telefone: "" });
      carregarClientes();
    } catch (err) {
      console.error("Erro ao cadastrar cliente:", err);
      alert("Erro ao cadastrar cliente");
    }
  }

  // =====================================================
  // 🔴 Excluir cliente
  // =====================================================
  async function excluirCliente(id) {
    if (!window.confirm("Deseja realmente excluir este cliente?")) return;
    try {
      await axios.delete(`${API_CLIENTES}/clientes/${id}`);
      alert("Cliente excluído com sucesso!");
      carregarClientes();
    } catch (err) {
      console.error("Erro ao excluir cliente:", err);
    }
  }

  // =====================================================
  // 🧾 Renderização
  // =====================================================
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">👤 Clientes</h1>

      {/* Formulário */}
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md rounded-lg p-6 mb-8 max-w-xl mx-auto"
      >
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

        <button
          type="submit"
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded w-full"
        >
          Salvar Cliente
        </button>
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
              <button
                onClick={() => excluirCliente(c.id)}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
              >
                Excluir
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
