const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
app.use(cors());
app.use(express.json());

// Configuração do RDS
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
};

let db;

// Conectar ao banco e garantir tabela criada
async function connectDatabase() {
  try {
    db = await mysql.createPool(dbConfig);
    console.log("✅ Conectado ao banco de dados RDS MySQL.");

    // Criar tabela se não existir
    await db.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE
      );
    `);
    console.log("✅ Tabela 'clientes' pronta para uso.");
  } catch (err) {
    console.error("❌ Erro ao conectar com o MySQL:", err);
    process.exit(1);
  }
}

connectDatabase();

// --------------------- ROTAS ---------------------

// Criar novo cliente
app.post("/clientes", async (req, res) => {
  const { nome, email } = req.body;

  if (!nome || !email) {
    return res.status(400).json({ erro: "Nome e email obrigatórios" });
  }

  try {
    const [result] = await db.query(
      "INSERT INTO clientes (nome, email) VALUES (?, ?)",
      [nome, email]
    );
    res.status(201).json({ id: result.insertId, nome, email });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ erro: "Email já cadastrado" });
    }
    console.error("Erro ao criar cliente:", error);
    res.status(500).json({ erro: "Erro ao criar cliente" });
  }
});

// Listar todos os clientes
app.get("/clientes", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM clientes");
    res.json(rows);
  } catch (error) {
    console.error("Erro ao listar clientes:", error);
    res.status(500).json({ erro: "Erro ao buscar clientes" });
  }
});

// Buscar cliente por ID
app.get("/clientes/:id", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM clientes WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ erro: "Cliente não encontrado" });
    res.json(rows[0]);
  } catch (error) {
    console.error("Erro ao buscar cliente:", error);
    res.status(500).json({ erro: "Erro ao buscar cliente" });
  }
});

// Atualizar cliente
app.put("/clientes/:id", async (req, res) => {
  const { nome, email } = req.body;
  if (!nome || !email)
    return res.status(400).json({ erro: "Nome e email obrigatórios" });

  try {
    const [result] = await db.query(
      "UPDATE clientes SET nome = ?, email = ? WHERE id = ?",
      [nome, email, req.params.id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ erro: "Cliente não encontrado" });

    res.json({ id: req.params.id, nome, email });
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error);
    res.status(500).json({ erro: "Erro ao atualizar cliente" });
  }
});

// Excluir cliente
app.delete("/clientes/:id", async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM clientes WHERE id = ?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0)
      return res.status(404).json({ erro: "Cliente não encontrado" });

    res.json({ mensagem: "Cliente excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir cliente:", error);
    res.status(500).json({ erro: "Erro ao excluir cliente" });
  }
});

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// --------------------- SERVIDOR ---------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log(`🚀 Serviço de Clientes rodando na porta ${PORT}`)
);
