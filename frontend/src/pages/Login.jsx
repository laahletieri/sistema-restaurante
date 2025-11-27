import { useState } from "react";
import axios from "axios";
import { getServiceUrl } from "../services/nameService";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const clientesBaseUrl = await getServiceUrl("clientes");
      const resp = await axios.post(`${clientesBaseUrl}/login`, {
        email,
        senha,
      });
      localStorage.setItem("token", resp.data.token);
      alert("Login realizado com sucesso!");
      window.location.href = "/"; // ou use navigate se tiver react-router
    } catch (err) {
      console.error("Erro no login:", err);
      alert("Falha no login. Verifique as credenciais.");
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-center">Login</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="border p-2 rounded w-full"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="border p-2 rounded w-full"
          placeholder="Senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white w-full py-2 rounded"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
