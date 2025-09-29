const express = require("express");
const cors = require("cors");
// const mysql = require("mysql2/promise");

const app = express();
app.use(cors());
app.use(express.json());

// Banco de dados em memória (Entrega 2)
let clientes = [];
let nextId = 1;

/* 
 // Configuração do MySQL (para usar depois que subir o banco)
const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "restaurantes_db",
};

let db;

async function connectDatabase() {
  try {
    db = await mysql.createPool(dbConfig);
    console.log("Conectado ao banco de dados MySQL.");
  } catch (err) {
    console.error("Erro ao conectar com o MySQL:", err);
    process.exit(1);
  }
}

connectDatabase();
*/

// --- Rotas da API (versão simplificada em memória) ---

// [C] CREATE: Cria um novo cliente
app.post("/clientes", (req, res) => {
  const { nome, email } = req.body;
  if (!nome || !email) {
    return res.status(400).json({ erro: "Nome e email são obrigatórios" });
  }

  const cliente = { id: nextId++, nome, email };
  clientes.push(cliente);
  res.status(201).json(cliente);
});

// [R] READ: Listar todos os clientes
app.get("/clientes", (req, res) => {
  res.json(clientes);
});

// [R] READ: Consultar um cliente por ID
app.get("/clientes/:id", (req, res) => {
  const cliente = clientes.find((c) => c.id === parseInt(req.params.id));
  if (!cliente) {
    return res.status(404).json({ erro: "Cliente não encontrado" });
  }
  res.json(cliente);
});

// [U] UPDATE: Atualizar um cliente por ID
app.put("/clientes/:id", (req, res) => {
  const { id } = req.params;
  const { nome, email } = req.body;

  const cliente = clientes.find((c) => c.id === parseInt(id));
  if (!cliente) {
    return res.status(404).json({ erro: "Cliente não encontrado" });
  }

  if (!nome || !email) {
    return res.status(400).json({ erro: "Nome e email são obrigatórios" });
  }

  cliente.nome = nome;
  cliente.email = email;

  res.json(cliente);
});

// [D] DELETE: Excluir um cliente por ID
app.delete("/clientes/:id", (req, res) => {
  const { id } = req.params;
  const index = clientes.findIndex((c) => c.id === parseInt(id));

  if (index === -1) {
    return res.status(404).json({ erro: "Cliente não encontrado" });
  }

  clientes.splice(index, 1);
  res.status(200).json({ mensagem: "Cliente excluído com sucesso." });
});

// Rota de Health Check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Inicia o servidor
const PORT = process.env.PORT || 3002;
app.listen(PORT, () =>
  console.log(`Serviço de Clientes rodando na porta ${PORT}`)
);
