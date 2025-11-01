const express = require("express");
require("dotenv").config();
const mysql = require("mysql2/promise");
const cors = require("cors");
const Bully = require("./src/bully");
const https = require("https");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// Configurações HTTPS internas (para AWS)
const agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
axios.defaults.httpsAgent = agent;
axios.defaults.timeout = 5000;

// ===================== CONFIG BULLY =====================
const SELF_ID = Number(process.env.NODE_ID) || 1;
const SELF_URL =
  process.env.SELF_URL || `http://localhost:${process.env.PORT || 3001}`;
const NODES_RAW =
  process.env.NODES ||
  "1|http://localhost:3001,2|http://localhost:3002,3|http://localhost:3003";

const NODES = NODES_RAW.split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((pair) => {
    const [idStr, url] = pair.split("|");
    return { id: Number(idStr), url };
  });

console.log("[DEBUG] Lista de nós:", NODES);

const bully = new Bully({
  id: SELF_ID,
  nodes: NODES,
  onCoordinatorChange: (id, url) => {
    console.log(`Novo coordenador eleito: ${id} (${url})`);
  },
});

bully.setSelfUrl(SELF_URL);

// ===================== ENDPOINTS BULLY =====================
app.get("/status", (req, res) => {
  res.json({
    id: SELF_ID,
    coordinatorId: bully.coordinator ? bully.coordinator.id : null,
    isCoordinator: !!(bully.coordinator && bully.coordinator.id === SELF_ID),
  });
});

app.post("/election", async (req, res) => {
  const { id, url } = req.body;
  await bully.handleElectionRequest(id, url);
  res.json({ ok: true });
});

app.post("/coordinator", (req, res) => {
  const { id, url } = req.body;
  bully.handleCoordinatorAnnouncement(id, url);
  res.json({ ok: true });
});

app.get("/heartbeat", (req, res) => res.json({ ok: true }));

// ===================== CONFIG BANCO =====================
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
};

let db;

async function connectDatabase() {
  try {
    db = await mysql.createPool(dbConfig);
    console.log("Conectado ao banco de dados RDS MySQL.");
    await criarTabelaClientes();
  } catch (err) {
    console.error("Erro ao conectar com o MySQL:", err);
    process.exit(1);
  }
}

async function criarTabelaClientes() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        cpf VARCHAR(14) UNIQUE,
        email VARCHAR(100),
        telefone VARCHAR(20)
      );
    `);
    console.log("Tabela 'clientes' pronta para uso.");
  } catch (err) {
    console.error("Erro ao criar/verificar tabela 'clientes':", err);
  }
}

connectDatabase();

// ===================== ROTAS CLIENTES =====================
app.get("/clientes", async (req, res) => {
  try {
    const { cpf } = req.query;
    if (cpf) {
      const [rows] = await db.query("SELECT * FROM clientes WHERE cpf = ?", [
        cpf,
      ]);
      if (rows.length === 0)
        return res.status(404).json({ erro: "Cliente não encontrado" });
      return res.json(rows[0]);
    }
    const [rows] = await db.query("SELECT * FROM clientes");
    res.json(rows);
  } catch (err) {
    console.error("Erro ao listar clientes:", err.message);
    res.status(500).json({ erro: "Erro ao listar clientes" });
  }
});

app.get("/clientes/:id", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM clientes WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ erro: "Cliente não encontrado" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Erro ao buscar cliente:", err.message);
    res.status(500).json({ erro: "Erro ao buscar cliente" });
  }
});

app.post("/clientes", async (req, res) => {
  try {
    const { nome, cpf, email, telefone } = req.body;
    if (!nome || !cpf)
      return res.status(400).json({ erro: "Nome e CPF são obrigatórios" });
    const [existe] = await db.query("SELECT * FROM clientes WHERE cpf = ?", [
      cpf,
    ]);
    if (existe.length > 0)
      return res.status(400).json({ erro: "CPF já cadastrado" });
    await db.query(
      "INSERT INTO clientes (nome, cpf, email, telefone) VALUES (?, ?, ?, ?)",
      [nome, cpf, email || null, telefone || null]
    );
    res.status(201).json({ mensagem: "Cliente cadastrado com sucesso" });
  } catch (err) {
    console.error("Erro ao cadastrar cliente:", err.message);
    res.status(500).json({ erro: "Erro ao cadastrar cliente" });
  }
});

app.put("/clientes/:id", async (req, res) => {
  try {
    const { nome, cpf, email, telefone } = req.body;
    await db.query(
      "UPDATE clientes SET nome=?, cpf=?, email=?, telefone=? WHERE id=?",
      [nome, cpf, email, telefone, req.params.id]
    );
    res.json({ mensagem: "Cliente atualizado com sucesso" });
  } catch (err) {
    console.error("Erro ao atualizar cliente:", err.message);
    res.status(500).json({ erro: "Erro ao atualizar cliente" });
  }
});

app.delete("/clientes/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM clientes WHERE id=?", [req.params.id]);
    res.json({ mensagem: "Cliente removido com sucesso" });
  } catch (err) {
    console.error("Erro ao remover cliente:", err.message);
    res.status(500).json({ erro: "Erro ao remover cliente" });
  }
});

// ===================== BASE =====================
app.get("/", (req, res) => res.send("Serviço de Clientes ativo e rodando!"));
app.get("/health", (req, res) => res.json({ status: "ok" }));

// ===================== START =====================
const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Serviço de Clientes rodando na porta ${PORT}`);
  // Inicia o Bully de forma assíncrona, mas fora do listen
  bully
    .start()
    .then(() => {
      console.log(`[BULLY:${SELF_ID}] Loop de verificação iniciado.`);
    })
    .catch((err) => {
      console.error(`[BULLY:${SELF_ID}] Erro ao iniciar Bully:`, err.message);
    });
});

// Eleição automática (garante coordenação na AWS)
setTimeout(async () => {
  console.log(`[BULLY:${SELF_ID}] Iniciando eleição automática...`);
  try {
    await bully.startElection();
  } catch (err) {
    console.error(`[BULLY:${SELF_ID}] Erro na eleição inicial:`, err.message);
  }
}, 10000);
