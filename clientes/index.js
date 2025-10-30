const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Configuração do banco (vem das variáveis do ambiente na AWS)
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
};

let db;

async function connectDatabase() {
  try {
    db = await mysql.createPool(dbConfig);
    console.log("✅ Conectado ao banco de dados RDS MySQL.");
    await criarTabelaClientes();
  } catch (err) {
    console.error("❌ Erro ao conectar com o MySQL:", err);
    process.exit(1);
  }
}

async function criarTabelaClientes() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        telefone VARCHAR(20)
      );
    `);
    console.log("✅ Tabela 'clientes' pronta para uso.");
  } catch (err) {
    console.error("❌ Erro ao criar tabela 'clientes':", err);
  }
}

connectDatabase();

// CRUD de Clientes
app.get("/clientes", async (req, res) => {
  const [rows] = await db.query("SELECT * FROM clientes");
  res.json(rows);
});

app.get("/clientes/:id", async (req, res) => {
  const [rows] = await db.query("SELECT * FROM clientes WHERE id = ?", [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ erro: "Cliente não encontrado" });
  res.json(rows[0]);
});

app.post("/clientes", async (req, res) => {
  const { nome, email, telefone } = req.body;
  if (!nome || !email) return res.status(400).json({ erro: "Nome e email são obrigatórios" });
  await db.query("INSERT INTO clientes (nome, email, telefone) VALUES (?, ?, ?)", [nome, email, telefone]);
  res.status(201).json({ mensagem: "Cliente cadastrado com sucesso" });
});

app.put("/clientes/:id", async (req, res) => {
  const { nome, email, telefone } = req.body;
  await db.query("UPDATE clientes SET nome=?, email=?, telefone=? WHERE id=?", [nome, email, telefone, req.params.id]);
  res.json({ mensagem: "Cliente atualizado com sucesso" });
});

app.delete("/clientes/:id", async (req, res) => {
  await db.query("DELETE FROM clientes WHERE id=?", [req.params.id]);
  res.json({ mensagem: "Cliente removido com sucesso" });
});

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(🚀 Serviço de Clientes rodando na porta ${PORT}));