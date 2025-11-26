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

// ===================== CONFIGURAÇÃO GLOBAL AXIOS =====================
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
    console.log("[DB] Conectando ao banco MySQL RDS...");
    db = await mysql.createPool(dbConfig);
    console.log("[DB] Conexão estabelecida com sucesso.");
    await criarTabelaReservas();
  } catch (err) {
    console.error("[DB] Erro ao conectar com o MySQL:", err);
    process.exit(1);
  }
}

async function criarTabelaReservas() {
  try {
    console.log("[DB] Verificando/criando tabela 'reservas'...");
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
    console.log("[DB] Tabela 'reservas' pronta para uso.");
  } catch (err) {
    console.error("[DB] Erro ao criar/verificar tabela 'reservas':", err);
  }
}

connectDatabase();

// ===================== URLs DE OUTROS SERVIÇOS =====================
const CLIENTES_URL = process.env.CLIENTES_URL || "http://localhost:3001";
const RESTAURANTES_URL =
  process.env.RESTAURANTES_URL || "http://localhost:3002";
const REPLICACAO_URL = process.env.REPLICACAO_URL || "http://localhost:3002";

console.log("[CONFIG] CLIENTES_URL:", CLIENTES_URL);
console.log("[CONFIG] RESTAURANTES_URL:", RESTAURANTES_URL);
console.log("[CONFIG] REPLICACAO_URL:", REPLICACAO_URL);

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

console.log("[BULLY] SELF_ID:", SELF_ID);
console.log("[BULLY] SELF_URL:", SELF_URL);
console.log("[BULLY] Lista de nós:", NODES);

const bully = new Bully({
  id: SELF_ID,
  nodes: NODES,
  onCoordinatorChange: (id, url) => {
    console.log(`[BULLY] Novo coordenador eleito: id=${id}, url=${url}`);
  },
});

bully.setSelfUrl(SELF_URL);

// ===================== LOCK SIMPLES (EXCLUSÃO MÚTUA) =====================
let recursoEmUso = false;
let filaLocks = [];

app.post("/lock", (req, res) => {
  const { recurso } = req.body;
  if (!recurso) {
    console.warn("[LOCK] Recurso não informado na requisição de lock.");
    return res.status(400).json({ erro: "Recurso não informado" });
  }

  console.log(
    `[LOCK] Requisição de lock recebida para recurso='${recurso}'. Em uso?`,
    recursoEmUso
  );

  if (!recursoEmUso) {
    recursoEmUso = true;
    console.log("[LOCK] Lock concedido imediatamente.");
    return res.json({ lock: true });
  } else {
    console.log("[LOCK] Recurso ocupado. Colocando requisição na fila.");
    filaLocks.push(res);
  }
});

app.post("/unlock", (req, res) => {
  const { recurso } = req.body;
  console.log(
    `[UNLOCK] Requisição de unlock recebida para recurso='${recurso}'.`
  );

  if (filaLocks.length > 0) {
    console.log("[UNLOCK] Há requisições em fila. Concedendo lock ao próximo.");
    const nextRes = filaLocks.shift();
    nextRes.json({ lock: true });
  } else {
    console.log("[UNLOCK] Nenhuma requisição em fila. Liberando recurso.");
    recursoEmUso = false;
  }
  res.json({ ok: true });
});

// ===================== ENDPOINTS BULLY =====================
app.get("/status", (req, res) => {
  const status = {
    id: SELF_ID,
    coordinatorId: bully.coordinator ? bully.coordinator.id : null,
    isCoordinator: !!(bully.coordinator && bully.coordinator.id === SELF_ID),
  };
  console.log("[STATUS] Consulta de status:", status);
  res.json(status);
});

app.post("/election", async (req, res) => {
  const { id, url } = req.body;
  console.log(
    `[BULLY] Recebida mensagem de eleição de nó id=${id}, url=${url}`
  );
  await bully.handleElectionRequest(id, url);
  res.json({ ok: true });
});

app.post("/coordinator", (req, res) => {
  const { id, url } = req.body;
  console.log(
    `[BULLY] Anúncio de novo coordenador recebido: id=${id}, url=${url}`
  );
  bully.handleCoordinatorAnnouncement(id, url);
  res.json({ ok: true });
});

app.get("/heartbeat", (req, res) => {
  // pode usar isso pra monitoria também
  res.json({ ok: true });
});

// ===================== ENDPOINTS RESERVAS =====================

// listar reservas
app.get("/reservas", async (req, res) => {
  console.log("[RESERVAS][GET] Listando todas as reservas...");
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
    console.log(`[RESERVAS][GET] Total de reservas retornadas: ${rows.length}`);
    res.json(rows);
  } catch (err) {
    console.error("[RESERVAS][GET] Erro ao listar reservas:", err.message);
    res.status(500).json({ erro: "Erro ao listar reservas" });
  }
});

// criar reserva com coordenação e lock apenas quando mesas <= 5
app.post("/reservas", async (req, res) => {
  const { cpf, restaurante_id, data_reserva, horario, numero_pessoas } =
    req.body;

  console.log(
    `[RESERVAS][POST] Nova requisição de reserva recebida no nó ${SELF_ID}. Body:`,
    { cpf, restaurante_id, data_reserva, horario, numero_pessoas }
  );

  try {
    // ============ 0) Verifica se é o coordenador ============
    if (!bully.coordinator || bully.coordinator.id !== SELF_ID) {
      if (!bully.coordinator) {
        console.error(
          "[RESERVAS][POST] Nenhum coordenador disponível no momento."
        );
        return res.status(503).json({ erro: "Nenhum coordenador disponível" });
      }

      console.log(
        `[RESERVAS][POST] Eu (nó ${SELF_ID}) NÃO sou coordenador. Encaminhando requisição para coordenador ${bully.coordinator.id} (${bully.coordinator.url}).`
      );
      const result = await axios.post(
        `${bully.coordinator.url}/reservas`,
        req.body
      );
      console.log(
        "[RESERVAS][POST] Resposta retornada pelo coordenador. Status:",
        result.status
      );
      return res.status(result.status).json(result.data);
    }

    console.log(
      `[RESERVAS][POST] Eu (nó ${SELF_ID}) sou o COORDENADOR. Processando reserva localmente.`
    );

    // ============ 1) Busca cliente (sem lock ainda) ============
    console.log(
      `[RESERVAS][POST] Buscando cliente pelo serviço de clientes. CPF=${cpf}`
    );
    const clienteResp = await axios
      .get(`${CLIENTES_URL}/clientes?cpf=${cpf}`)
      .catch((err) => {
        console.error(
          "[RESERVAS][POST] Erro ao chamar serviço de clientes:",
          err.message
        );
        return null;
      });

    if (!clienteResp || !clienteResp.data) {
      console.warn(
        "[RESERVAS][POST] Cliente não encontrado para o CPF informado."
      );
      return res.status(400).json({ erro: "Cliente não encontrado." });
    }

    const cliente = clienteResp.data;
    const clienteId = cliente.id || cliente[0]?.id;
    console.log(`[RESERVAS][POST] Cliente encontrado. ID=${clienteId}`);

    // ============ 2) Busca restaurante (sem lock ainda) ============
    console.log(
      `[RESERVAS][POST] Buscando restaurante ID=${restaurante_id} pelo serviço de restaurantes.`
    );
    const restauranteResp = await axios
      .get(`${RESTAURANTES_URL}/restaurantes/${restaurante_id}`)
      .catch((err) => {
        console.error(
          "[RESERVAS][POST] Erro ao chamar serviço de restaurantes:",
          err.message
        );
        return null;
      });

    const restaurante = restauranteResp?.data;
    if (!restaurante || restaurante.mesas_disponiveis <= 0) {
      console.warn(
        "[RESERVAS][POST] Restaurante sem mesas disponíveis ou não encontrado."
      );
      return res.status(400).json({ erro: "Sem mesas disponíveis." });
    }

    console.log(
      `[RESERVAS][POST] Restaurante encontrado. ID=${restaurante_id}, mesas_disponiveis=${restaurante.mesas_disponiveis}`
    );

    // decide se precisa de lock forte (coordenação de exclusão mútua)
    const precisaLock = restaurante.mesas_disponiveis <= 5;
    console.log(
      `[RESERVAS][POST] Verificação de coordenação forte: mesas_disponiveis=${restaurante.mesas_disponiveis} → precisaLock=${precisaLock}`
    );

    let temLock = false;

    try {
      // ============ 3) Se precisar, obtém lock ============
      if (precisaLock) {
        console.log(
          "[RESERVAS][POST] Mesas <= 5. Tentando obter LOCK de exclusão mútua..."
        );
        const lockResp = await axios.post(`${SELF_URL}/lock`, {
          recurso: "reserva",
        });
        if (!lockResp.data.lock) {
          console.warn(
            "[RESERVAS][POST] Não foi possível obter lock. Recurso ocupado."
          );
          return res
            .status(409)
            .json({ erro: "Recurso ocupado, tente novamente." });
        }
        temLock = true;
        console.log("[RESERVAS][POST] LOCK adquirido com sucesso.");

        // (opcional, mas mais seguro) rebusca restaurante já com lock
        console.log(
          "[RESERVAS][POST] Re-buscando restaurante após adquirir lock para garantir consistência..."
        );
        const restauranteCheckResp = await axios
          .get(`${RESTAURANTES_URL}/restaurantes/${restaurante_id}`)
          .catch((err) => {
            console.error(
              "[RESERVAS][POST] Erro ao re-buscar restaurante após lock:",
              err.message
            );
            return null;
          });
        const restCheck = restauranteCheckResp?.data;
        if (!restCheck || restCheck.mesas_disponiveis <= 0) {
          console.warn(
            "[RESERVAS][POST] Após lock, restaurante sem mesas disponíveis."
          );
          return res.status(400).json({ erro: "Sem mesas disponíveis." });
        }
        console.log(
          `[RESERVAS][POST] Após lock, restaurante ainda possui mesas_disponiveis=${restCheck.mesas_disponiveis}`
        );
      } else {
        console.log(
          "[RESERVAS][POST] Mesas > 5. Processando reserva SEM lock de exclusão mútua."
        );
      }

      // ============ 4) Cria reserva ============
      console.log("[RESERVAS][POST] Inserindo reserva no banco de dados...");
      const [result] = await db.query(
        `INSERT INTO reservas (cliente_id, restaurante_id, data_reserva, horario, numero_pessoas)
         VALUES (?, ?, ?, ?, ?)`,
        [clienteId, restaurante_id, data_reserva, horario, numero_pessoas || 1]
      );

      const reservaId = result.insertId;
      console.log(
        `[RESERVAS][POST] Reserva criada com sucesso no banco. ID=${reservaId}`
      );

      // ============ 5) Atualiza mesas ============
      const novasMesas = restaurante.mesas_disponiveis - 1;
      console.log(
        `[RESERVAS][POST] Atualizando mesas do restaurante ID=${restaurante_id}: ${restaurante.mesas_disponiveis} → ${novasMesas}`
      );
      await axios.patch(
        `${RESTAURANTES_URL}/restaurantes/${restaurante_id}/mesas`,
        { mesas_disponiveis: novasMesas }
      );

      // ============ 6) Notifica replicação (assíncrono) ============
      console.log(
        `[REPLICAÇÃO] Enviando reserva ID=${reservaId} para serviço de replicação...`
      );
      axios
        .post(`${REPLICACAO_URL}/replicacao/reserva/${reservaId}`)
        .then(() =>
          console.log(
            `[REPLICAÇÃO] Reserva #${reservaId} enviada com sucesso para replicação.`
          )
        )
        .catch((err) =>
          console.log(
            `[REPLICAÇÃO] Falha ao notificar replicação da reserva #${reservaId} (será replicada via polling, se implementado):`,
            err.message
          )
        );

      console.log(
        `[RESERVAS][POST] Fluxo de criação de reserva finalizado com sucesso. ID=${reservaId}`
      );
      return res
        .status(201)
        .json({ mensagem: "Reserva criada com sucesso!", id: reservaId });
    } finally {
      // ============ 7) Libera lock somente se tiver sido obtido ============
      if (temLock) {
        console.log(
          "[RESERVAS][POST] Liberando LOCK de exclusão mútua (unlock)..."
        );
        try {
          await axios.post(`${SELF_URL}/unlock`, { recurso: "reserva" });
          console.log("[RESERVAS][POST] LOCK liberado com sucesso.");
        } catch (err) {
          console.error("[RESERVAS][POST] Erro ao liberar LOCK:", err.message);
        }
      }
    }
  } catch (err) {
    console.error(
      "[RESERVAS][POST] Erro interno ao criar reserva:",
      err.message
    );
    return res.status(500).json({ erro: "Erro interno ao criar reserva." });
  }
});

// deletar reserva
app.delete("/reservas/:id", async (req, res) => {
  const id = req.params.id;
  console.log(`[RESERVAS][DELETE] Requisição para cancelar reserva ID=${id}`);
  try {
    const [reservas] = await db.query("SELECT * FROM reservas WHERE id = ?", [
      id,
    ]);
    if (reservas.length === 0) {
      console.warn(
        `[RESERVAS][DELETE] Reserva ID=${id} não encontrada no banco.`
      );
      return res.status(404).json({ erro: "Reserva não encontrada." });
    }

    const reserva = reservas[0];
    console.log(
      `[RESERVAS][DELETE] Reserva encontrada. Removendo do banco. Restaurante ID=${reserva.restaurante_id}`
    );
    await db.query("DELETE FROM reservas WHERE id = ?", [id]);

    const restauranteResp = await axios
      .get(`${RESTAURANTES_URL}/restaurantes/${reserva.restaurante_id}`)
      .catch((err) => {
        console.error(
          "[RESERVAS][DELETE] Erro ao buscar restaurante para liberar mesa:",
          err.message
        );
        return null;
      });

    const restaurante = restauranteResp?.data;
    if (restaurante) {
      const novasMesas = restaurante.mesas_disponiveis + 1;
      console.log(
        `[RESERVAS][DELETE] Liberando mesa no restaurante ID=${reserva.restaurante_id}: ${restaurante.mesas_disponiveis} → ${novasMesas}`
      );
      await axios.patch(
        `${RESTAURANTES_URL}/restaurantes/${reserva.restaurante_id}/mesas`,
        { mesas_disponiveis: novasMesas }
      );
    } else {
      console.warn(
        "[RESERVAS][DELETE] Restaurante não encontrado ao tentar liberar mesa."
      );
    }

    res.json({ mensagem: "Reserva cancelada e mesa liberada." });
  } catch (err) {
    console.error(
      "[RESERVAS][DELETE] Erro interno ao cancelar reserva:",
      err.message
    );
    res.status(500).json({ erro: "Erro interno ao cancelar reserva." });
  }
});

// ===================== ENDPOINTS BASE =====================
app.get("/", (req, res) => {
  res.send("Serviço de Reservas ativo e rodando!");
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

// ===================== START SERVER =====================
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", async () => {
  console.log(
    `Serviço de Reservas rodando na porta ${PORT} e escutando em 0.0.0.0`
  );
  console.log("[BULLY] Iniciando algoritmo Bully...");
  await bully.start();
});

// ===== ELEIÇÃO AUTOMÁTICA =====
setTimeout(async () => {
  console.log(`[BULLY:${SELF_ID}] Iniciando eleição automática inicial...`);
  try {
    await bully.startElection();
  } catch (err) {
    console.error(`[BULLY:${SELF_ID}] Erro na eleição inicial:`, err.message);
  }
}, 5000);
