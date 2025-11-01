import { useEffect, useState } from "react";
import axios from "axios";

export default function Reservas() {
  const API_RESERVAS = import.meta.env.VITE_RESERVAS_API;
  const API_CLIENTES = import.meta.env.VITE_CLIENTES_API;
  const API_RESTAURANTES = import.meta.env.VITE_RESTAURANTES_API;

  const [reservas, setReservas] = useState([]);
  const [restaurantes, setRestaurantes] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    nome: "",
    cpf: "",
    restaurante_id: "",
    data_reserva: "",
    horario: "",
    numero_pessoas: 1,
  });

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const [resReservas, resRestaurantes] = await Promise.all([
        axios.get(`${API_RESERVAS}/reservas`),
        axios.get(`${API_RESTAURANTES}/restaurantes`),
      ]);

      setReservas(resReservas.data);
      setRestaurantes(resRestaurantes.data);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      alert("Falha ao carregar dados das reservas.");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (
      !form.cpf ||
      !form.restaurante_id ||
      !form.data_reserva ||
      !form.horario
    ) {
      alert("Preencha todos os campos obrigatórios!");
      return;
    }

    try {
      if (editing) {
        await axios.put(`${API_RESERVAS}/reservas/${editing}`, form);
        alert("Reserva atualizada com sucesso!");
      } else {
        await axios.post(`${API_RESERVAS}/reservas`, form);
        alert("Reserva cadastrada com sucesso!");
      }

      setEditing(null);
      setForm({
        nome: "",
        cpf: "",
        restaurante_id: "",
        data_reserva: "",
        horario: "",
        numero_pessoas: 1,
      });
      carregarDados();
    } catch (err) {
      console.error("Erro ao salvar reserva:", err);
      alert(
        err.response?.data?.erro ||
          "Erro ao salvar reserva. Verifique se o cliente existe."
      );
    }
  }

  function iniciarEdicao(reserva) {
    setEditing(reserva.id);
    setForm({
      nome: reserva.nome_cliente || "",
      cpf: reserva.cpf || "",
      restaurante_id: reserva.restaurante_id,
      data_reserva: reserva.data_reserva
        ? reserva.data_reserva.split("T")[0]
        : "",
      horario: reserva.horario || "",
      numero_pessoas: reserva.numero_pessoas || 1,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelarEdicao() {
    setEditing(null);
    setForm({
      nome: "",
      cpf: "",
      restaurante_id: "",
      data_reserva: "",
      horario: "",
      numero_pessoas: 1,
    });
  }

  async function excluirReserva(id) {
    if (!window.confirm("Deseja realmente excluir esta reserva?")) return;
    try {
      await axios.delete(`${API_RESERVAS}/reservas/${id}`);
      alert("Reserva excluída com sucesso!");
      carregarDados();
    } catch (err) {
      console.error("Erro ao excluir reserva:", err);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-blue-700 mb-4 text-center">
        🗓️ Reservas
      </h1>

      {/* Formulário */}
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md rounded-lg p-6 mb-8 max-w-3xl mx-auto"
      >
        <h2 className="text-xl font-semibold mb-4 text-center">
          {editing ? "✏️ Editar Reserva" : "➕ Nova Reserva"}
        </h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block font-medium mb-1">Nome do Cliente:</label>
            <input
              type="text"
              placeholder="Digite o nome do cliente"
              className="border p-2 rounded w-full"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">CPF do Cliente:</label>
            <input
              type="text"
              placeholder="Digite o CPF (somente números)"
              className="border p-2 rounded w-full"
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Restaurante:</label>
            <select
              className="border p-2 rounded w-full"
              value={form.restaurante_id}
              onChange={(e) =>
                setForm({ ...form, restaurante_id: e.target.value })
              }
              required
            >
              <option value="">Selecione um restaurante</option>
              {restaurantes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1">Número de Pessoas:</label>
            <input
              type="number"
              min="1"
              className="border p-2 rounded w-full"
              value={form.numero_pessoas}
              onChange={(e) =>
                setForm({ ...form, numero_pessoas: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Data:</label>
            <input
              type="date"
              className="border p-2 rounded w-full"
              value={form.data_reserva}
              onChange={(e) =>
                setForm({ ...form, data_reserva: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Hora:</label>
            <input
              type="time"
              className="border p-2 rounded w-full"
              value={form.horario}
              onChange={(e) => setForm({ ...form, horario: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded w-full"
          >
            {editing ? "Salvar Alterações" : "Cadastrar Reserva"}
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
      <div className="max-w-5xl mx-auto">
        <h2 className="text-lg font-semibold mb-3">Reservas cadastradas</h2>
        <ul className="space-y-3">
          {reservas.map((r) => (
            <li
              key={r.id}
              className="flex justify-between items-center bg-gray-50 border p-3 rounded-lg shadow-sm"
            >
              <span>
                <strong>Cliente:</strong> {r.nome_cliente} |{" "}
                <strong>Restaurante:</strong> {r.nome_restaurante} |{" "}
                <strong>Data:</strong>{" "}
                {r.data_reserva
                  ? new Date(r.data_reserva).toLocaleDateString("pt-BR")
                  : "—"}{" "}
                | <strong>Hora:</strong> {r.horario || "—"} |{" "}
                <strong>Pessoas:</strong> {r.numero_pessoas || 1}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={() => iniciarEdicao(r)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
                >
                  Editar
                </button>
                <button
                  onClick={() => excluirReserva(r.id)}
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
