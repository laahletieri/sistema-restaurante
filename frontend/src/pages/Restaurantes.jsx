import { useState, useEffect } from "react";
import axios from "axios";

export default function Restaurantes() {
  const API_URL = import.meta.env.VITE_RESTAURANTES_API;

  const [restaurantes, setRestaurantes] = useState([]);
  const [form, setForm] = useState({
    nome: "",
    endereco: "",
    telefone: "",
    tipoCulinaria: "",
    mesas_disponiveis: "",
  });
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    carregarRestaurantes();
  }, []);

  const carregarRestaurantes = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/restaurantes`);
      setRestaurantes(data);
    } catch (err) {
      console.error("Erro ao carregar restaurantes:", err);
      alert("Falha ao conectar ao serviço de restaurantes.");
    }
  };

  const salvarRestaurante = async () => {
    if (!form.nome || !form.endereco) {
      alert("Nome e endereço são obrigatórios!");
      return;
    }

    try {
      if (editId) {
        await axios.put(`${API_URL}/restaurantes/${editId}`, form);
        alert("Restaurante atualizado com sucesso!");
      } else {
        await axios.post(`${API_URL}/restaurantes`, form);
        alert("Restaurante cadastrado com sucesso!");
      }

      setForm({
        nome: "",
        endereco: "",
        telefone: "",
        tipoCulinaria: "",
        mesas_disponiveis: "",
      });
      setEditId(null);
      carregarRestaurantes();
    } catch (err) {
      console.error("Erro ao salvar restaurante:", err);
      alert("Erro ao salvar restaurante.");
    }
  };

  const editar = (r) => {
    setForm(r);
    setEditId(r.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelarEdicao = () => {
    setForm({
      nome: "",
      endereco: "",
      telefone: "",
      tipoCulinaria: "",
      mesas_disponiveis: "",
    });
    setEditId(null);
  };

  const excluir = async (id) => {
    if (window.confirm("Deseja excluir este restaurante?")) {
      try {
        await axios.delete(`${API_URL}/restaurantes/${id}`);
        carregarRestaurantes();
      } catch (err) {
        console.error("Erro ao excluir restaurante:", err);
      }
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-green-700 mb-4 text-center">
        🍽️ Restaurantes
      </h1>

      <div className="mb-6 bg-white p-6 rounded-lg shadow-lg max-w-3xl mx-auto">
        <h2 className="text-xl font-semibold mb-4 text-center">
          {editId ? "✏️ Editar Restaurante" : "➕ Novo Restaurante"}
        </h2>

        {/* Campos de formulário com labels explicativas */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block font-medium mb-1">Nome:</label>
            <input
              placeholder="Ex: Pizzaria Bella Napoli"
              className="border p-2 rounded w-full"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Endereço:</label>
            <input
              placeholder="Rua, número, bairro..."
              className="border p-2 rounded w-full"
              value={form.endereco}
              onChange={(e) => setForm({ ...form, endereco: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Telefone:</label>
            <input
              placeholder="(xx) xxxxx-xxxx"
              className="border p-2 rounded w-full"
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Tipo de Culinária:</label>
            <input
              placeholder="Ex: Italiana, Japonesa..."
              className="border p-2 rounded w-full"
              value={form.tipoCulinaria}
              onChange={(e) =>
                setForm({ ...form, tipoCulinaria: e.target.value })
              }
            />
          </div>

          <div className="col-span-2">
            <label className="block font-medium mb-1">
              🪑 Número de Mesas Disponíveis:
            </label>
            <input
              type="number"
              placeholder="Ex: 12"
              className="border p-2 rounded w-full"
              value={form.mesas_disponiveis}
              onChange={(e) =>
                setForm({ ...form, mesas_disponiveis: e.target.value })
              }
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Informe quantas mesas o restaurante possui para reservas.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={salvarRestaurante}
            className="bg-green-600 text-white px-4 py-2 rounded w-full hover:bg-green-700"
          >
            {editId ? "Salvar Alterações" : "Cadastrar Restaurante"}
          </button>

          {editId && (
            <button
              onClick={cancelarEdicao}
              className="bg-gray-400 text-white px-4 py-2 rounded w-full hover:bg-gray-500"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        <table className="w-full border shadow-md rounded-lg">
          <thead className="bg-green-100">
            <tr>
              <th className="p-2 border">ID</th>
              <th className="p-2 border">Nome</th>
              <th className="p-2 border">Endereço</th>
              <th className="p-2 border">Telefone</th>
              <th className="p-2 border">Culinária</th>
              <th className="p-2 border">Mesas</th>
              <th className="p-2 border">Ações</th>
            </tr>
          </thead>
          <tbody>
            {restaurantes.map((r) => (
              <tr key={r.id} className="text-center hover:bg-gray-50">
                <td className="border p-2">{r.id}</td>
                <td className="border p-2">{r.nome}</td>
                <td className="border p-2">{r.endereco}</td>
                <td className="border p-2">{r.telefone}</td>
                <td className="border p-2">{r.tipoCulinaria}</td>
                <td className="border p-2">{r.mesas_disponiveis}</td>
                <td className="border p-2 flex justify-center gap-2">
                  <button
                    className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                    onClick={() => editar(r)}
                  >
                    Editar
                  </button>
                  <button
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    onClick={() => excluir(r.id)}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
