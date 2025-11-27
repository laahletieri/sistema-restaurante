import { useState } from "react";
import axios from "axios";
import { getServiceUrl } from "../services/nameService";

export default function Cadastro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    if (!nome || !email || !senha || !confirmarSenha) {
      alert("Preencha todos os campos!");
      return;
    }

    if (senha !== confirmarSenha) {
      alert("As senhas não conferem!");
      return;
    }

    try {
      const clientesBaseUrl = await getServiceUrl("clientes");

      await axios.post(`${clientesBaseUrl}/usuarios`, {
        nome,
        email,
        senha,
      });

      alert("Usuário cadastrado com sucesso!");
      window.location.href = "/login"; // redireciona para login
    } catch (err) {
      console.error("Erro ao cadastrar:", err);
      alert(err.response?.data?.erro || "Erro ao cadastrar usuário.");
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto mt-10 bg-white shadow-md rounded-lg">
      <h1 className="text-2xl font-bold mb-4 text-center text-slate-800">
        Criar Conta
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome */}
        <div>
          <label className="block mb-1 font-medium">Nome</label>
          <input
            type="text"
            className="border p-2 rounded w-full"
            placeholder="Seu nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        {/* Email */}
        <div>
          <label className="block mb-1 font-medium">Email</label>
          <input
            type="email"
            className="border p-2 rounded w-full"
            placeholder="email@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Senha */}
        <div>
          <label className="block mb-1 font-medium">Senha</label>
          <input
            type="password"
            className="border p-2 rounded w-full"
            placeholder="Digite uma senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>

        {/* Confirmar senha */}
        <div>
          <label className="block mb-1 font-medium">Confirmar Senha</label>
          <input
            type="password"
            className="border p-2 rounded w-full"
            placeholder="Repita a senha"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
          />
        </div>

        {/* Botão */}
        <button
          type="submit"
          className="bg-green-600 hover:bg-green-700 text-white w-full p-2 rounded"
        >
          Criar Conta
        </button>

        <p className="text-center text-sm mt-4 text-slate-600">
          Já tem conta?{" "}
          <a href="/login" className="text-blue-600 hover:underline">
            Faça login
          </a>
        </p>
      </form>
    </div>
  );
}
