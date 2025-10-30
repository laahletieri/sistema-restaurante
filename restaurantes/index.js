const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
app.use(cors());
app.use(express.json());

// --------------------- CONFIGURAÇÃO DO BANCO ---------------------
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
};

let db;

// Conecta ao banco e garante que a tabela exista
async function connectDatabase() {
  try {
    db = await mysql.createPool(dbConfig);
    console.log("✅ Conectado ao banco de dados RDS MySQL.");

    await db.query(`
      CREATE TABLE IF NOT EXISTS restaurantes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        endereco VARCHAR(150) NOT NULL,
        telefone VARCHAR(20) NOT NULL,
        tipoCulinaria VARCHAR(100)
      );
    `);
    console.log("✅ Tabela 'restaurantes' pronta para uso.");
  } catch (err) {
    console.error("❌ Erro ao conectar com o MySQL:", err);
    process.exit(1);
  }
}

connectDatabase();

// --------------------- ROTAS ---------------------

// rota raiz (para o EB não marcar como “Severe”)
app.get("/", (req, res) => {
  res.send("Serviço de Restaurantes está no ar!");
});

// Health check do EB
app.get("/health", (req, res) => res.json({ status: "ok" }));

// CREATE
app.post("/restaurantes", async (req, res) => {
  const { nome, endereco, telefone, tipoCulinaria } = req.body;
  if (!nome || !endereco || !telefone)
    return res
      .status(400)
      .json({ erro: "Nome, endereço e telefone são obrigatórios" });

  try {
    const [result] = await db.query(
      "INSERT INTO restaurantes (nome, endereco, telefone, tipoCulinaria) VALUES (?, ?, ?, ?)",
      [nome, endereco, telefone, tipoCulinaria || "Não informado"]
    );
    res
      .status(201)
      .json({ id: result.insertId, nome, endereco, telefone, tipoCulinaria });
  } catch (error) {
    console.error("Erro ao criar restaurante:", error);
    res.status(500).json({ erro: "Erro ao criar restaurante" });
  }
});

// READ - todos
app.get("/restaurantes", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM restaurantes");
    res.json(rows);
  } catch (error) {
    console.error("Erro ao listar restaurantes:", error);
    res.status(500).json({ erro: "Erro ao buscar restaurantes" });
  }
});

// READ - por ID
app.get("/restaurantes/:id", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM restaurantes WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ erro: "Restaurante não encontrado" });
    res.json(rows[0]);
  } catch (error) {
    console.error("Erro ao buscar restaurante:", error);
    res.status(500).json({ erro: "Erro ao buscar restaurante" });
  }
});

// UPDATE
app.put("/restaurantes/:id", async (req, res) => {
  const { nome, endereco, telefone, tipoCulinaria } = req.body;
  try {
    const [result] = await db.query(
      "UPDATE restaurantes SET nome=?, endereco=?, telefone=?, tipoCulinaria=? WHERE id=?",
      [nome, endereco, telefone, tipoCulinaria, req.params.id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ erro: "Restaurante não encontrado" });

    res.json({ id: req.params.id, nome, endereco, telefone, tipoCulinaria });
  } catch (error) {
    console.error("Erro ao atualizar restaurante:", error);
    res.status(500).json({ erro: "Erro ao atualizar restaurante" });
  }
});

// DELETE
app.delete("/restaurantes/:id", async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM restaurantes WHERE id = ?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0)
      return res.status(404).json({ erro: "Restaurante não encontrado" });

    res.json({ mensagem: "Restaurante excluído com sucesso." });
  } catch (error) {
    console.error("Erro ao excluir restaurante:", error);
    res.status(500).json({ erro: "Erro ao excluir restaurante" });
  }
});

// --------------------- SERVIDOR ---------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log(`🚀 Serviço de Restaurantes rodando na porta ${PORT}`)
);
