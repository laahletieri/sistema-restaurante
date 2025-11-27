const express = require("express");
require("dotenv").config();
const mysql = require("mysql2/promise");
const cors = require("cors");
const Bully = require("./src/bully");
const https = require("https");
const axios = require("axios");
const {
  MetricsCollector,
  createLoggingMiddleware,
  createMetricsEndpoint,
} = require("./src/metrics");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "segredo_super_secreto";

function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ erro: "Token não informado" });
  }

  const [tipo, token] = authHeader.split(" ");
  if (tipo !== "Bearer" || !token) {
    return res.status(401).json({ erro: "Formato de token inválido" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ erro: "Token inválido ou expirado" });
    }
    req.user = decoded;
    next();
  });
}

const app = express();

// ===================== CONFIGURAÇÃO DE MÉTRICAS E LOGGING =====================
const metricsCollector = new MetricsCollector("restaurantes");
app.use(createLoggingMiddleware(metricsCollector));

app.use(cors());
app.use(express.json());

// agente https para chamadas internas (AWS com certificados autoassinados)
const agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
axios.defaults.httpsAgent = agent;
axios.defaults.timeout = 5000;

// Bully config
const SELF_ID = Number(process.env.NODE_ID) || 2;
const SELF_URL =
  process.env.SELF_URL || `http://localhost:${process.env.PORT || 3002}`;
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

console.log("[DEBUG] Lista de nós conhecida por este serviço:", NODES);

const bully = new Bully({
  id: SELF_ID,
  nodes: NODES,
  onCoordinatorChange: (id, url) => {
    console.log(`Novo coordenador eleito: ${id} (${url})`);
  },
});
bully.setSelfUrl(SELF_URL);

// Bully endpoints
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

// DB config
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
    await criarTabelaRestaurantes();
  } catch (err) {
    console.error("Erro ao conectar com o MySQL:", err);
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
    console.log("Tabela 'restaurantes' pronta para uso.");
  } catch (err) {
    console.error("Erro ao criar/verificar tabela 'restaurantes':", err);
  }
}

connectDatabase();

// Rotas do serviço
app.get("/restaurantes", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM restaurantes");
    res.json(rows);
  } catch (err) {
    console.error("Erro ao listar restaurantes:", err.message);
    res.status(500).json({ erro: "Erro ao listar restaurantes" });
  }
});

app.get("/restaurantes/:id", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM restaurantes WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ erro: "Restaurante não encontrado" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Erro ao buscar restaurante:", err.message);
    res.status(500).json({ erro: "Erro ao buscar restaurante" });
  }
});

app.post("/restaurantes", autenticar, async (req, res) => {
  try {
    const { nome, endereco, telefone, tipoCulinaria, mesas_disponiveis } =
      req.body;
    if (!nome || !endereco)
      return res.status(400).json({ erro: "Nome e endereço são obrigatórios" });

    await db.query(
      "INSERT INTO restaurantes (nome, endereco, telefone, tipoCulinaria, mesas_disponiveis) VALUES (?, ?, ?, ?, ?)",
      [nome, endereco, telefone, tipoCulinaria, mesas_disponiveis || 0]
    );
    res.status(201).json({ mensagem: "Restaurante cadastrado com sucesso" });
  } catch (err) {
    console.error("Erro ao cadastrar restaurante:", err.message);
    res.status(500).json({ erro: "Erro ao cadastrar restaurante" });
  }
});

app.put("/restaurantes/:id", autenticar, async (req, res) => {
  try {
    const { nome, endereco, telefone, tipoCulinaria, mesas_disponiveis } =
      req.body;
    await db.query(
      "UPDATE restaurantes SET nome=?, endereco=?, telefone=?, tipoCulinaria=?, mesas_disponiveis=? WHERE id=?",
      [
        nome,
        endereco,
        telefone,
        tipoCulinaria,
        mesas_disponiveis,
        req.params.id,
      ]
    );
    res.json({ mensagem: "Restaurante atualizado com sucesso" });
  } catch (err) {
    console.error("Erro ao atualizar restaurante:", err.message);
    res.status(500).json({ erro: "Erro ao atualizar restaurante" });
  }
});

app.patch("/restaurantes/:id/mesas", async (req, res) => {
  try {
    const { mesas_disponiveis } = req.body;
    if (mesas_disponiveis == null)
      return res
        .status(400)
        .json({ erro: "Valor de mesas_disponiveis é obrigatório" });
    await db.query("UPDATE restaurantes SET mesas_disponiveis=? WHERE id=?", [
      mesas_disponiveis,
      req.params.id,
    ]);
    res.json({ mensagem: "Quantidade de mesas atualizada com sucesso" });
  } catch (err) {
    console.error("Erro ao atualizar mesas:", err.message);
    res.status(500).json({ erro: "Erro ao atualizar mesas" });
  }
});

app.delete("/restaurantes/:id", autenticar, async (req, res) => {
  try {
    await db.query("DELETE FROM restaurantes WHERE id=?", [req.params.id]);
    res.json({ mensagem: "Restaurante removido com sucesso" });
  } catch (err) {
    console.error("Erro ao remover restaurante:", err.message);
    res.status(500).json({ erro: "Erro ao remover restaurante" });
  }
});

// Base endpoints
app.get("/", (req, res) =>
  res.send("Serviço de Restaurantes ativo e rodando!")
);
app.get("/health", (req, res) => res.json({ status: "ok" }));

// ===================== ENDPOINT DE MÉTRICAS =====================
app.get("/metrics", createMetricsEndpoint(metricsCollector));

// Start server
const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Serviço de Restaurantes rodando na porta ${PORT}`);
  setTimeout(() => {
    console.log(`[BULLY:${SELF_ID}] Iniciando eleição automática...`);
    bully
      .start()
      .catch((err) =>
        console.error(
          `[BULLY:${SELF_ID}] Erro ao iniciar eleição:`,
          err.message
        )
      );
  }, 10000);
});
