import { useState, useEffect } from "react";
import axios from "axios";

export default function Reservas() {
  const API_RESERVAS =
    "http://reservas-env.eba-x63mbcgh.sa-east-1.elasticbeanstalk.com";
  const API_CLIENTES =
    "http://clientes-env.eba-ytjkzypy.sa-east-1.elasticbeanstalk.com";
  const API_RESTAURANTES =
    "http://restaurantes-env.eba-ji6s7zmy.sa-east-1.elasticbeanstalk.com";

  const [reservas, setReservas] = useState([]);
  const [restaurantes, setRestaurantes] = useState([]);

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [form, setForm] = useState({
    id_restaurante: "",
    data_reserva: "",
    horario: "",
    numero_pessoas: 1,
  });

  // =====================================================
  // 🧩 Funções auxiliares de CPF
  // =====================================================
  function limparCPF(cpf) {
    return (cpf || "").replace(/\D/g, "");
  }

  function validarCPF(cpf) {
    const c = limparCPF(cpf);
    if (!/^\d{11}$/.test(c)) return false;
    if (/^(\d)\1{10}$/.test(c)) return false;

    const calcDig = (t) => {
      let soma = 0;
      for (let i = 0; i < t; i++) soma += parseInt(c.charAt(i)) * (t + 1 - i);
      const d = 11 - (soma % 11);
      return d >= 10 ? 0 : d;
    };

    const d1 = calcDig(9);
    const d2 = calcDig(10);
    return d1 === parseInt(c.charAt(9)) && d2 === parseInt(c.charAt(10));
  }

  // =====================================================
  // 🔹 Carrega dados iniciais
  // =====================================================
  useEffect(() => {
    carregarReservas();
    carregarRestaurantes();
  }, []);

  async function carregarReservas() {
    try {
      const res = await axios.get(`${API_RESERVAS}/reservas`);
      setReservas(res.data);
    } catch (err) {
      console.error("Erro ao carregar reservas:", err);
    }
  }

  async function carregarRestaurantes() {
    try {
      const res = await axios.get(`${API_RESTAURANTES}/restaurantes`);
      setRestaurantes(res.data);
    } catch (err) {
      console.error("Erro ao carregar restaurantes:", err);
    }
  }

  // =====================================================
  // 🟢 Criação de reserva
  // =====================================================
  async function handleSubmit(e) {
    e.preventDefault();

    const cpfLimpo = limparCPF(cpf);

    // 🔍 Validação do CPF
    if (!validarCPF(cpfLimpo)) {
      alert("CPF inválido. Verifique e tente novamente.");
      return;
    }

    try {
      // 🔍 Verifica se o cliente está cadastrado
      const clienteRes = await axios.get(
        `${API_CLIENTES}/clientes?cpf=${cpfLimpo}`
      );
      const cliente = Array.isArray(clienteRes.data)
        ? clienteRes.data[0]
        : clienteRes.data;

      if (!cliente) {
        alert(
          "Cliente não encontrado. Cadastre o cliente antes de fazer a reserva."
        );
        return;
      }

      const novaReserva = {
        id_cliente: cliente.id,
        id_restaurante: form.id_restaurante,
        data_reserva: form.data_reserva,
        horario: form.horario,
        numero_pessoas: form.numero_pessoas,
      };

      await axios.post(`${API_RESERVAS}/reservas`, novaReserva);
      alert("Reserva criada com sucesso!");
      carregarReservas();

      // limpa o form
      setForm({
        id_restaurante: "",
        data_reserva: "",
        horario: "",
        numero_pessoas: 1,
      });
      setNome("");
      setCpf("");
    } catch (err) {
      console.error("Erro ao criar reserva:", err);
      alert("Erro ao criar reserva. Verifique o console.");
    }
  }

  // =====================================================
  // 🔴 Excluir reserva
  // =====================================================
  async function excluirReserva(id) {
    if (!window.confirm("Deseja realmente excluir esta reserva?")) return;

    try {
      await axios.delete(`${API_RESERVAS}/reservas/${id}`);
      alert("Reserva excluída!");
      carregarReservas();
    } catch (err) {
      console.error("Erro ao excluir reserva:", err);
    }
  }

  // =====================================================
  // 🧾 Renderização
  // =====================================================
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">📅 Reservas</h1>

      {/* Formulário de criação */}
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md rounded-lg p-6 mb-8 max-w-xl mx-auto"
      >
        <div className="grid grid-cols-2 gap-3 mb-4">
          <input
            type="text"
            placeholder="Nome do cliente"
            className="border p-2 rounded"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="CPF do cliente"
            className="border p-2 rounded"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            required
          />
        </div>

        <div className="mb-4">
          <select
            className="border p-2 rounded w-full"
            value={form.id_restaurante}
            onChange={(e) =>
              setForm({ ...form, id_restaurante: e.target.value })
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

        <div className="grid grid-cols-2 gap-3 mb-4">
          <input
            type="date"
            className="border p-2 rounded"
            value={form.data_reserva}
            onChange={(e) => setForm({ ...form, data_reserva: e.target.value })}
            required
          />
          <input
            type="time"
            className="border p-2 rounded"
            value={form.horario}
            onChange={(e) => setForm({ ...form, horario: e.target.value })}
            required
          />
        </div>

        <div className="mb-4">
          <input
            type="number"
            min="1"
            className="border p-2 rounded w-full"
            value={form.numero_pessoas}
            onChange={(e) =>
              setForm({ ...form, numero_pessoas: e.target.value })
            }
            required
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full"
        >
          Criar Reserva
        </button>
      </form>

      {/* Lista de reservas */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-lg font-semibold mb-2">Reservas cadastradas</h2>
        <ul className="space-y-3">
          {reservas.map((r) => (
            <li
              key={r.id}
              className="flex justify-between items-center bg-gray-50 border p-3 rounded-lg shadow-sm"
            >
              <span>
                <strong>Cliente:</strong> {r.id_cliente} |{" "}
                <strong>Restaurante:</strong> {r.id_restaurante} |{" "}
                <strong>Data:</strong> {r.data_reserva} | <strong>Hora:</strong>{" "}
                {r.horario}
              </span>
              <button
                onClick={() => excluirReserva(r.id)}
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
