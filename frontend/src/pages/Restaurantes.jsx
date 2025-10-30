import { useState, useEffect } from "react";
import axios from "axios";

const API_URL =
  "http://restaurantes-env.eba-ji6s7zmy.sa-east-1.elasticbeanstalk.com";

export default function Restaurantes() {
  const [restaurantes, setRestaurantes] = useState([]);
  const [form, setForm] = useState({
    nome: "",
    endereco: "",
    telefone: "",
    tipoCulinaria: "",
    mesas_disponiveis: 0,
  });
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    carregarRestaurantes();
  }, []);

  const carregarRestaurantes = async () => {
    const { data } = await axios.get(`${API_URL}/restaurantes`);
    setRestaurantes(data);
  };

  const salvarRestaurante = async () => {
    if (!form.nome || !form.endereco) {
      alert("Nome e endereço são obrigatórios!");
      return;
    }

    if (editId) {
      await axios.put(`${API_URL}/restaurantes/${editId}`, form);
    } else {
      await axios.post(`${API_URL}/restaurantes`, form);
    }

    setForm({
      nome: "",
      endereco: "",
      telefone: "",
      tipoCulinaria: "",
      mesas_disponiveis: 0,
    });
    setEditId(null);
    carregarRestaurantes();
  };

  const editar = (r) => {
    setForm(r);
    setEditId(r.id);
  };

  const excluir = async (id) => {
    if (window.confirm("Deseja excluir este restaurante?")) {
      await axios.delete(`${API_URL}/restaurantes/${id}`);
      carregarRestaurantes();
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-green-700 mb-4">
        🍽️ Restaurantes
      </h1>

      <div className="mb-6 bg-gray-100 p-4 rounded-lg shadow-md">
        <h2 className="text-xl mb-2">
          {editId ? "Editar Restaurante" : "Novo Restaurante"}
        </h2>
        <div className="flex gap-3 mb-3 flex-wrap">
          <input
            placeholder="Nome"
            className="border p-2 rounded w-1/4"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
          <input
            placeholder="Endereço"
            className="border p-2 rounded w-1/4"
            value={form.endereco}
            onChange={(e) => setForm({ ...form, endereco: e.target.value })}
          />
          <input
            placeholder="Telefone"
            className="border p-2 rounded w-1/4"
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
          />
          <input
            placeholder="Tipo de Culinária"
            className="border p-2 rounded w-1/4"
            value={form.tipoCulinaria}
            onChange={(e) =>
              setForm({ ...form, tipoCulinaria: e.target.value })
            }
          />
          <input
            type="number"
            placeholder="Mesas disponíveis"
            className="border p-2 rounded w-1/4"
            value={form.mesas_disponiveis}
            onChange={(e) =>
              setForm({ ...form, mesas_disponiveis: e.target.value })
            }
          />
          <button
            onClick={salvarRestaurante}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            {editId ? "Atualizar" : "Cadastrar"}
          </button>
        </div>
      </div>

      <table className="w-full border shadow-md">
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
            <tr key={r.id} className="text-center">
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
  );
}
