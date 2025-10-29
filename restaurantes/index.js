const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Banco de dados em memória (Entrega 2)
let restaurantes = [];
let nextId = 1;

/*
// Configuração futura para MySQL (quando for subir na AWS)
const mysql = require("mysql2/promise");

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

// -----------------------------
// ROTAS CRUD DE RESTAURANTES
// -----------------------------

// CREATE
app.post("/restaurantes", (req, res) => {
  const { nome, endereco, telefone, tipoCulinaria } = req.body;

  if (!nome || !endereco || !telefone) {
    return res.status(400).json({ erro: "Nome, endereço e telefone são obrigatórios" });
  }

  const restaurante = {
    id: nextId++,
    nome,
    endereco,
    telefone,
    tipoCulinaria: tipoCulinaria || "Não informado"
  };

  restaurantes.push(restaurante);
  res.status(201).json(restaurante);
});

// READ - listar todos
app.get("/restaurantes", (req, res) => {
  res.json(restaurantes);
});

// READ - buscar por ID
app.get("/restaurantes/:id", (req, res) => {
  const restaurante = restaurantes.find((r) => r.id === parseInt(req.params.id));

  if (!restaurante) {
    return res.status(404).json({ erro: "Restaurante não encontrado" });
  }

  res.json(restaurante);
});

// UPDATE
app.put("/restaurantes/:id", (req, res) => {
  const { id } = req.params;
  const { nome, endereco, telefone, tipoCulinaria } = req.body;

  const restaurante = restaurantes.find((r) => r.id === parseInt(id));

  if (!restaurante) {
    return res.status(404).json({ erro: "Restaurante não encontrado" });
  }

  restaurante.nome = nome || restaurante.nome;
  restaurante.endereco = endereco || restaurante.endereco;
  restaurante.telefone = telefone || restaurante.telefone;
  restaurante.tipoCulinaria = tipoCulinaria || restaurante.tipoCulinaria;

  res.json(restaurante);
});

// DELETE
app.delete("/restaurantes/:id", (req, res) => {
  const { id } = req.params;
  const index = restaurantes.findIndex((r) => r.id === parseInt(id));

  if (index === -1) {
    return res.status(404).json({ erro: "Restaurante não encontrado" });
  }

  restaurantes.splice(index, 1);
  res.status(200).json({ mensagem: "Restaurante excluído com sucesso." });
});

// Health Check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Inicia o servidor
const PORT = process.env.PORT || 3003; // Porta diferente do serviço de clientes
app.listen(PORT, () =>
  console.log(`Serviço de Restaurantes rodando na porta ${PORT}`)
);
