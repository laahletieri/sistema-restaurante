const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Configuração do banco (variáveis de ambiente da AWS)
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
};

let db;

// Conexão com o banco e criação da tabela
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
    // Cria tabela se não existir
    await db.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        cpf VARCHAR(14) UNIQUE,
        email VARCHAR(100),
        telefone VARCHAR(20)
      );
    `);
    console.log("✅ Tabela 'clientes' pronta para uso.");

    // Garante que o campo CPF exista (caso tabela antiga)
    const [columns] = await db.query("SHOW COLUMNS FROM clientes LIKE 'cpf'");
    if (columns.length === 0) {
      await db.query("ALTER TABLE clientes ADD COLUMN cpf VARCHAR(14) UNIQUE;");
      console.log("🧩 Coluna 'cpf' adicionada à tabela clientes.");
    }
  } catch (err) {
    console.error("❌ Erro ao criar/verificar tabela 'clientes':", err);
  }
}

connectDatabase();

// Listar todos os clientes
app.get("/clientes", async (req, res) => {
  try {
    // 🔍 Se houver ?cpf= no parâmetro, busca apenas esse cliente
    const { cpf } = req.query;

    if (cpf) {
      const [rows] = await db.query("SELECT * FROM clientes WHERE cpf = ?", [
        cpf,
      ]);
      if (rows.length === 0)
        return res.status(404).json({ erro: "Cliente não encontrado" });
      return res.json(rows);
    }

    const [rows] = await db.query("SELECT * FROM clientes");
    res.json(rows);
  } catch (err) {
    console.error("❌ Erro ao listar clientes:", err.message);
    res.status(500).json({ erro: "Erro ao listar clientes" });
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
  } catch (err) {
    console.error("❌ Erro ao buscar cliente:", err.message);
    res.status(500).json({ erro: "Erro ao buscar cliente" });
  }
});

// Cadastrar novo cliente
app.post("/clientes", async (req, res) => {
  try {
    const { nome, cpf, email, telefone } = req.body;

    if (!nome || !cpf)
      return res.status(400).json({ erro: "Nome e CPF são obrigatórios" });

    // Evita duplicação de CPF
    const [existe] = await db.query("SELECT id FROM clientes WHERE cpf = ?", [
      cpf,
    ]);
    if (existe.length > 0)
      return res.status(400).json({ erro: "CPF já cadastrado" });

    await db.query(
      "INSERT INTO clientes (nome, cpf, email, telefone) VALUES (?, ?, ?, ?)",
      [nome, cpf, email, telefone]
    );
    res.status(201).json({ mensagem: "Cliente cadastrado com sucesso" });
  } catch (err) {
    console.error("❌ Erro ao cadastrar cliente:", err.message);
    res.status(500).json({ erro: "Erro ao cadastrar cliente" });
  }
});

// Atualizar cliente existente
app.put("/clientes/:id", async (req, res) => {
  try {
    const { nome, cpf, email, telefone } = req.body;
    await db.query(
      "UPDATE clientes SET nome=?, cpf=?, email=?, telefone=? WHERE id=?",
      [nome, cpf, email, telefone, req.params.id]
    );
    res.json({ mensagem: "Cliente atualizado com sucesso" });
  } catch (err) {
    console.error("❌ Erro ao atualizar cliente:", err.message);
    res.status(500).json({ erro: "Erro ao atualizar cliente" });
  }
});

// Remover cliente
app.delete("/clientes/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM clientes WHERE id=?", [req.params.id]);
    res.json({ mensagem: "Cliente removido com sucesso" });
  } catch (err) {
    console.error("❌ Erro ao remover cliente:", err.message);
    res.status(500).json({ erro: "Erro ao remover cliente" });
  }
});

// Rotas de status e health check
app.get("/", (req, res) => res.send("✅ Serviço de Clientes ativo e rodando!"));

app.get("/health", (req, res) => res.json({ status: "ok" }));

// Inicialização do servidor
const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log(`Serviço de Clientes rodando na porta ${PORT}`)
);
