const express = require("express");
require("dotenv").config();
const mysql = require("mysql2/promise");
const cors = require("cors");
const axios = require("axios");
const Bully = require("./src/bully");
const https = require("https");

const app = express();
app.use(cors());
app.use(express.json());

// agente https para chamadas internas (AWS com certificados autoassinados)
const agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
axios.defaults.httpsAgent = agent;
axios.defaults.timeout = 5000;

// ===================== CONFIGURAÇÃO BANCO ===================
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
    await criarTabelaReservas();
  } catch (err) {
    console.error("Erro ao conectar com o MySQL:", err);
    process.exit(1);
  }
}

async function criarTabelaReservas() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS reservas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cliente_id INT NOT NULL,
        restaurante_id INT NOT NULL,
        data_reserva DATETIME NOT NULL,
        horario TIME,
        numero_pessoas INT DEFAULT 1
      );
    `);
    console.log("Tabela 'reservas' pronta para uso.");
  } catch (err) {
    console.error("Erro ao criar/verificar tabela 'reservas':", err);
  }
}

connectDatabase();

// ===================== URLs DE SERVIÇOS =====================
const CLIENTES_URL = process.env.CLIENTES_URL || "http://localhost:3001";
const RESTAURANTES_URL =
  process.env.RESTAURANTES_URL || "http://localhost:3002";
const REPLICACAO_URL = process.env.REPLICACAO_URL || "http://localhost:3002";

// ===================== CONFIGURAÇÃO BULLY =====================
const SELF_ID = Number(process.env.NODE_ID) || 3;
const SELF_URL =
  process.env.SELF_URL || `http://localhost:${process.env.PORT || 3003}`;
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

// ===================== LOCK SIMPLES (EXCLUSÃO MÚTUA) =====================
let recursoEmUso = false;
let filaLocks = [];

app.post("/lock", (req, res) => {
  const { recurso } = req.body;
  if (!recurso) return res.status(400).json({ erro: "Recurso não informado" });

  if (!recursoEmUso) {
    recursoEmUso = true;
    return res.json({ lock: true });
  } else {
    filaLocks.push(res);
  }
});

app.post("/unlock", (req, res) => {
  const { recurso } = req.body;
  if (filaLocks.length > 0) {
    const nextRes = filaLocks.shift();
    nextRes.json({ lock: true });
  } else {
    recursoEmUso = false;
  }
  res.json({ ok: true });
});

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

// ===================== ENDPOINTS RESERVAS =====================

// listar reservas
app.get("/reservas", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        r.id, r.data_reserva, r.horario, r.numero_pessoas,
        c.nome AS nome_cliente,
        rest.nome AS nome_restaurante
      FROM reservas r
      LEFT JOIN clientes c ON r.cliente_id = c.id
      LEFT JOIN restaurantes rest ON r.restaurante_id = rest.id
      ORDER BY r.data_reserva DESC;
    `);
    res.json(rows);
  } catch (err) {
    console.error("Erro ao listar reservas:", err.message);
    res.status(500).json({ erro: "Erro ao listar reservas" });
  }
});

// criar reserva com coordenação e replicação
app.post("/reservas", async (req, res) => {
  const { cpf, restaurante_id, data_reserva, horario, numero_pessoas } =
    req.body;

  try {
    // se não for coordenador, encaminha para o coordenador
    if (!bully.coordinator || bully.coordinator.id !== SELF_ID) {
      if (!bully.coordinator)
        return res.status(503).json({ erro: "Nenhum coordenador disponível" });

      console.log(
        `Encaminhando requisição para coordenador ${bully.coordinator.url}`
      );
      const result = await axios.post(
        `${bully.coordinator.url}/reservas`,
        req.body
      );
      return res.status(result.status).json(result.data);
    }

    // coordenador obtém lock local
    const lockResp = await axios.post(`${SELF_URL}/lock`, {
      recurso: "reserva",
    });
    if (!lockResp.data.lock)
      return res
        .status(409)
        .json({ erro: "Recurso ocupado, tente novamente." });

    // busca cliente
    const clienteResp = await axios
      .get(`${CLIENTES_URL}/clientes?cpf=${cpf}`)
      .catch(() => null);

    if (!clienteResp || !clienteResp.data) {
      await axios.post(`${SELF_URL}/unlock`, { recurso: "reserva" });
      return res.status(400).json({ erro: "Cliente não encontrado." });
    }

    const cliente = clienteResp.data;
    const clienteId = cliente.id || cliente[0]?.id;

    // busca restaurante
    const restauranteResp = await axios
      .get(`${RESTAURANTES_URL}/restaurantes/${restaurante_id}`)
      .catch(() => null);

    const restaurante = restauranteResp?.data;
    if (!restaurante || restaurante.mesas_disponiveis <= 0) {
      await axios.post(`${SELF_URL}/unlock`, { recurso: "reserva" });
      return res.status(400).json({ erro: "Sem mesas disponíveis." });
    }

    // cria reserva
    const [result] = await db.query(
      `INSERT INTO reservas (cliente_id, restaurante_id, data_reserva, horario, numero_pessoas)
       VALUES (?, ?, ?, ?, ?)`,
      [clienteId, restaurante_id, data_reserva, horario, numero_pessoas || 1]
    );

    const reservaId = result.insertId;

    // atualiza mesas
    await axios.patch(
      `${RESTAURANTES_URL}/restaurantes/${restaurante_id}/mesas`,
      { mesas_disponiveis: restaurante.mesas_disponiveis - 1 }
    );

    // libera lock
    await axios.post(`${SELF_URL}/unlock`, { recurso: "reserva" });

    // notifica replicação (assíncrono)
    axios
      .post(`${REPLICACAO_URL}/replicacao/reserva/${reservaId}`)
      .then(() =>
        console.log(`📡 Reserva #${reservaId} enviada para replicação`)
      )
      .catch((err) =>
        console.log(
          `⚠️ Falha ao notificar replicação (será replicada via polling):`,
          err.message
        )
      );

    res
      .status(201)
      .json({ mensagem: "Reserva criada com sucesso!", id: reservaId });
  } catch (err) {
    console.error("Erro ao criar reserva:", err.message);
    await axios.post(`${SELF_URL}/unlock`, { recurso: "reserva" });
    res.status(500).json({ erro: "Erro interno ao criar reserva." });
  }
});

// deletar reserva
app.delete("/reservas/:id", async (req, res) => {
  try {
    const [reservas] = await db.query("SELECT * FROM reservas WHERE id = ?", [
      req.params.id,
    ]);
    if (reservas.length === 0)
      return res.status(404).json({ erro: "Reserva não encontrada." });

    const reserva = reservas[0];
    await db.query("DELETE FROM reservas WHERE id = ?", [req.params.id]);

    const restauranteResp = await axios
      .get(`${RESTAURANTES_URL}/restaurantes/${reserva.restaurante_id}`)
      .catch(() => null);

    const restaurante = restauranteResp?.data;
    if (restaurante) {
      await axios.patch(
        `${RESTAURANTES_URL}/restaurantes/${reserva.restaurante_id}/mesas`,
        { mesas_disponiveis: restaurante.mesas_disponiveis + 1 }
      );
    }

    res.json({ mensagem: "Reserva cancelada e mesa liberada." });
  } catch (err) {
    console.error("Erro ao cancelar reserva:", err.message);
    res.status(500).json({ erro: "Erro interno ao cancelar reserva." });
  }
});

// ===================== ENDPOINTS BASE =====================
app.get("/", (req, res) => res.send("Serviço de Reservas ativo e rodando!"));
app.get("/health", (req, res) => res.json({ status: "ok" }));

// ===================== START SERVER =====================
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`Serviço rodando na porta ${PORT} e escutando em 0.0.0.0`);
  await bully.start();
});

// ===== ELEIÇÃO AUTOMÁTICA =====
setTimeout(async () => {
  console.log(`[BULLY:${SELF_ID}] Iniciando eleição automática...`);
  try {
    await bully.startElection();
  } catch (err) {
    console.error(`[BULLY:${SELF_ID}] Erro na eleição inicial:`, err.message);
  }
}, 5000);
