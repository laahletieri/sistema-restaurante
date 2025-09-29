const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

let clientes = [];
let nextId = 1;

// Criar novo cliente
app.post("/clientes", (req, res) => {
  const { nome, email } = req.body;
  if (!nome || !email) {
    return res.status(400).json({ erro: "Nome e email obrigatórios" });
  }
  const cliente = { id: nextId++, nome, email };
  clientes.push(cliente);
  res.status(201).json(cliente);
});

// Listar todos os clientes
app.get("/clientes", (req, res) => res.json(clientes));

// Buscar cliente por ID
app.get("/clientes/:id", (req, res) => {
  const cliente = clientes.find(c => c.id === parseInt(req.params.id));
  if (!cliente) return res.status(404).json({ erro: "Cliente não encontrado" });
  res.json(cliente);
});

// Atualizar cliente
app.put("/clientes/:id", (req, res) => {
  const { nome, email } = req.body;
  const clienteIndex = clientes.findIndex(c => c.id === parseInt(req.params.id));
  
  if (clienteIndex === -1) {
    return res.status(404).json({ erro: "Cliente não encontrado" });
  }
  
  if (!nome || !email) {
    return res.status(400).json({ erro: "Nome e email obrigatórios" });
  }
  
  clientes[clienteIndex] = { ...clientes[clienteIndex], nome, email };
  res.json(clientes[clienteIndex]);
});

// Excluir cliente
app.delete("/clientes/:id", (req, res) => {
  const clienteIndex = clientes.findIndex(c => c.id === parseInt(req.params.id));
  
  if (clienteIndex === -1) {
    return res.status(404).json({ erro: "Cliente não encontrado" });
  }
  
  const clienteRemovido = clientes.splice(clienteIndex, 1)[0];
  res.json({ mensagem: "Cliente excluído com sucesso", cliente: clienteRemovido });
});

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Serviço de Clientes rodando na porta ${PORT}`)
);
