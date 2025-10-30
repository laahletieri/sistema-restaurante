const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Configuração do banco
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
    await criarTabelaRestaurantes();
  } catch (err) {
    console.error("❌ Erro ao conectar com o MySQL:", err);
    process.exit(1);
  }
}

async function criarTabelaRestaurantes() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS restaurantes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        endereco VARCHAR(150) NOT NULL,
        telefone VARCHAR(20),
        tipoCulinaria VARCHAR(50),
        mesas_disponiveis INT NOT NULL DEFAULT 0
      );
    `);
    console.log("✅ Tabela 'restaurantes' pronta para uso.");
  } catch (err) {
    console.error("❌ Erro ao criar tabela 'restaurantes':", err);
  }
}

connectDatabase();

// CRUD de Restaurantes
app.get("/restaurantes", async (req, res) => {
  const [rows] = await db.query("SELECT * FROM restaurantes");
  res.json(rows);
});

app.get("/restaurantes/:id", async (req, res) => {
  const [rows] = await db.query("SELECT * FROM restaurantes WHERE id = ?", [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ erro: "Restaurante não encontrado" });
  res.json(rows[0]);
});

app.post("/restaurantes", async (req, res) => {
  const { nome, endereco, telefone, tipoCulinaria, mesas_disponiveis } = req.body;
  if (!nome || !endereco) return res.status(400).json({ erro: "Nome e endereço são obrigatórios" });

  await db.query(
    "INSERT INTO restaurantes (nome, endereco, telefone, tipoCulinaria, mesas_disponiveis) VALUES (?, ?, ?, ?, ?)",
    [nome, endereco, telefone, tipoCulinaria, mesas_disponiveis || 0]
  );
  res.status(201).json({ mensagem: "Restaurante cadastrado com sucesso" });
});

app.put("/restaurantes/:id", async (req, res) => {
  const { nome, endereco, telefone, tipoCulinaria, mesas_disponiveis } = req.body;
  await db.query(
    "UPDATE restaurantes SET nome=?, endereco=?, telefone=?, tipoCulinaria=?, mesas_disponiveis=? WHERE id=?",
    [nome, endereco, telefone, tipoCulinaria, mesas_disponiveis, req.params.id]
  );
  res.json({ mensagem: "Restaurante atualizado com sucesso" });
});

app.patch("/restaurantes/:id/mesas", async (req, res) => {
  const { mesas_disponiveis } = req.body;
  if (mesas_disponiveis == null) return res.status(400).json({ erro: "Valor de mesas_disponiveis é obrigatório" });

  await db.query("UPDATE restaurantes SET mesas_disponiveis=? WHERE id=?", [mesas_disponiveis, req.params.id]);
  res.json({ mensagem: "Quantidade de mesas atualizada com sucesso" });
});

app.delete("/restaurantes/:id", async (req, res) => {
  await db.query("DELETE FROM restaurantes WHERE id=?", [req.params.id]);
  res.json({ mensagem: "Restaurante removido com sucesso" });
});

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(🚀 Serviço de Restaurantes rodando na porta ${PORT}));