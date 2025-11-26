const express = require("express");
const mysql = require("mysql2/promise");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================
// CONFIGURAÇÃO DOS BANCOS DE DADOS
// ============================================================

// Banco PRINCIPAL (origem)
const dbPrincipalConfig = {
  host: process.env.DB_PRINCIPAL_HOST || process.env.DB_HOST,
  user: process.env.DB_PRINCIPAL_USER || process.env.DB_USER,
  password: process.env.DB_PRINCIPAL_PASS || process.env.DB_PASS,
  database: process.env.DB_PRINCIPAL_NAME || process.env.DB_NAME,
};

// Banco RÉPLICA (destino)
const dbReplicaConfig = {
  host: process.env.DB_REPLICA_HOST || process.env.DB_HOST,
  user: process.env.DB_REPLICA_USER || process.env.DB_USER,
  password: process.env.DB_REPLICA_PASS || process.env.DB_PASS,
  database: process.env.DB_REPLICA_NAME || process.env.DB_NAME,
};

let dbPrincipal;
let dbReplica;

// URL do serviço de reservas principal
const RESERVAS_PRINCIPAL_URL =
  process.env.RESERVAS_PRINCIPAL_URL || "http://localhost:3001";

// ============================================================
// CONEXÃO COM OS BANCOS
// ============================================================

async function connectDatabases() {
  try {
    // Conecta ao banco principal
    dbPrincipal = await mysql.createPool(dbPrincipalConfig);
    console.log("✅ Conectado ao banco de dados PRINCIPAL.");

    // Conecta ao banco réplica
    dbReplica = await mysql.createPool(dbReplicaConfig);
    console.log("✅ Conectado ao banco de dados RÉPLICA.");

    // Cria tabela de reservas na réplica
    await criarTabelaReservasReplica();

    // Cria tabela de controle de sincronização
    await criarTabelaControleReplicacao();

    console.log("✅ Bancos configurados e prontos para replicação.");
  } catch (err) {
    console.error("❌ Erro ao conectar aos bancos:", err);
    process.exit(1);
  }
}

async function criarTabelaReservasReplica() {
  try {
    await dbReplica.query(`
      CREATE TABLE IF NOT EXISTS reservas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cliente_id INT NOT NULL,
        restaurante_id INT NOT NULL,
        data_reserva DATETIME NOT NULL,
        horario TIME,
        numero_pessoas INT DEFAULT 1,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sincronizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Tabela 'reservas' criada na RÉPLICA.");
  } catch (err) {
    console.error("❌ Erro ao criar tabela 'reservas' na réplica:", err);
  }
}

async function criarTabelaControleReplicacao() {
  try {
    await dbReplica.query(`
      CREATE TABLE IF NOT EXISTS controle_replicacao (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ultima_reserva_id INT NOT NULL,
        ultima_sincronizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_replicadas INT DEFAULT 0
      );
    `);

    // Inicializa registro de controle se não existir
    const [rows] = await dbReplica.query(
      "SELECT * FROM controle_replicacao ORDER BY id DESC LIMIT 1"
    );
    if (rows.length === 0) {
      await dbReplica.query(
        "INSERT INTO controle_replicacao (ultima_reserva_id, total_replicadas) VALUES (0, 0)"
      );
    }
    console.log("✅ Tabela 'controle_replicacao' criada.");
  } catch (err) {
    console.error("❌ Erro ao criar tabela 'controle_replicacao':", err);
  }
}

// ============================================================
// FUNÇÕES DE REPLICAÇÃO
// ============================================================

/**
 * Busca novas reservas do banco principal que ainda não foram replicadas
 */
async function buscarNovasReservas() {
  try {
    // Busca último ID replicado
    const [controle] = await dbReplica.query(
      "SELECT ultima_reserva_id FROM controle_replicacao ORDER BY id DESC LIMIT 1"
    );
    const ultimoIdReplicado =
      controle.length > 0 ? controle[0].ultima_reserva_id : 0;

    // Busca reservas novas no banco principal
    const [reservas] = await dbPrincipal.query(
      "SELECT * FROM reservas WHERE id > ? ORDER BY id ASC",
      [ultimoIdReplicado]
    );

    return reservas;
  } catch (err) {
    console.error("❌ Erro ao buscar novas reservas:", err);
    return [];
  }
}

/**
 * Replica uma reserva para o banco réplica
 */
async function replicarReserva(reserva) {
  try {
    // Verifica se a reserva já existe na réplica
    const [existentes] = await dbReplica.query(
      "SELECT id FROM reservas WHERE id = ?",
      [reserva.id]
    );

    if (existentes.length > 0) {
      // Atualiza reserva existente
      await dbReplica.query(
        `UPDATE reservas 
         SET cliente_id=?, restaurante_id=?, data_reserva=?, horario=?, numero_pessoas=?
         WHERE id=?`,
        [
          reserva.cliente_id,
          reserva.restaurante_id,
          reserva.data_reserva,
          reserva.horario,
          reserva.numero_pessoas || 1,
          reserva.id,
        ]
      );
      console.log(`🔄 Reserva #${reserva.id} atualizada na réplica.`);
    } else {
      // Insere nova reserva
      await dbReplica.query(
        `INSERT INTO reservas (id, cliente_id, restaurante_id, data_reserva, horario, numero_pessoas)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          reserva.id,
          reserva.cliente_id,
          reserva.restaurante_id,
          reserva.data_reserva,
          reserva.horario,
          reserva.numero_pessoas || 1,
        ]
      );
      console.log(`✅ Reserva #${reserva.id} replicada com sucesso.`);
    }

    // Atualiza controle de replicação
    const [controleAtual] = await dbReplica.query(
      "SELECT id FROM controle_replicacao ORDER BY id DESC LIMIT 1"
    );
    if (controleAtual.length > 0) {
      await dbReplica.query(
        `UPDATE controle_replicacao 
         SET ultima_reserva_id=?, ultima_sincronizacao=NOW(), total_replicadas=total_replicadas+1
         WHERE id=?`,
        [reserva.id, controleAtual[0].id]
      );
    }

    return true;
  } catch (err) {
    console.error(`❌ Erro ao replicar reserva #${reserva.id}:`, err.message);
    return false;
  }
}

/**
 * Processa e replica todas as novas reservas
 */
async function processarReplicacao() {
  try {
    const novasReservas = await buscarNovasReservas();

    if (novasReservas.length === 0) {
      console.log("📊 Nenhuma nova reserva para replicar.");
      return { replicadas: 0, total: 0 };
    }

    console.log(
      `🔄 Encontradas ${novasReservas.length} nova(s) reserva(s) para replicar...`
    );

    let replicadas = 0;
    for (const reserva of novasReservas) {
      const sucesso = await replicarReserva(reserva);
      if (sucesso) {
        replicadas++;
      }
    }

    console.log(
      `✅ Replicação concluída: ${replicadas}/${novasReservas.length} reserva(s) replicada(s).`
    );

    return { replicadas, total: novasReservas.length };
  } catch (err) {
    console.error("❌ Erro ao processar replicação:", err);
    return { replicadas: 0, total: 0 };
  }
}

/**
 * Replica uma reserva específica por ID (usado para replicação em tempo real)
 */
async function replicarReservaPorId(reservaId) {
  try {
    const [reservas] = await dbPrincipal.query(
      "SELECT * FROM reservas WHERE id = ?",
      [reservaId]
    );

    if (reservas.length === 0) {
      console.log(
        `⚠️ Reserva #${reservaId} não encontrada no banco principal.`
      );
      return false;
    }

    return await replicarReserva(reservas[0]);
  } catch (err) {
    console.error(`❌ Erro ao replicar reserva #${reservaId}:`, err);
    return false;
  }
}

// ============================================================
// API ENDPOINTS
// ============================================================

// Endpoint para forçar sincronização manual (aceita GET, POST, etc.)
app.all("/replicacao/sincronizar", async (req, res) => {
  try {
    const resultado = await processarReplicacao();
    res.json({
      mensagem: "Sincronização concluída",
      metodo: req.method,
      replicadas: resultado.replicadas,
      total: resultado.total,
    });
  } catch (err) {
    console.error("❌ Erro na sincronização:", err);
    res.status(500).json({ erro: "Erro ao sincronizar" });
  }
});

// Endpoint para replicar uma reserva específica (usado por webhook)
app.post("/replicacao/reserva/:id", async (req, res) => {
  try {
    const reservaId = parseInt(req.params.id);
    const sucesso = await replicarReservaPorId(reservaId);

    if (sucesso) {
      res.json({ mensagem: `Reserva #${reservaId} replicada com sucesso` });
    } else {
      res
        .status(404)
        .json({ erro: "Reserva não encontrada ou erro na replicação" });
    }
  } catch (err) {
    console.error("❌ Erro ao replicar reserva:", err);
    res.status(500).json({ erro: "Erro ao replicar reserva" });
  }
});

// Endpoint para verificar status da replicação
app.get("/replicacao/status", async (req, res) => {
  try {
    const [controle] = await dbReplica.query(
      "SELECT * FROM controle_replicacao ORDER BY id DESC LIMIT 1"
    );

    const [totalPrincipal] = await dbPrincipal.query(
      "SELECT COUNT(*) as total FROM reservas"
    );
    const [totalReplica] = await dbReplica.query(
      "SELECT COUNT(*) as total FROM reservas"
    );

    res.json({
      ultima_sincronizacao: controle[0]?.ultima_sincronizacao || null,
      ultima_reserva_id: controle[0]?.ultima_reserva_id || 0,
      total_replicadas: controle[0]?.total_replicadas || 0,
      total_principal: totalPrincipal[0].total,
      total_replica: totalReplica[0].total,
      diferenca: totalPrincipal[0].total - totalReplica[0].total,
    });
  } catch (err) {
    console.error("❌ Erro ao buscar status:", err);
    res.status(500).json({ erro: "Erro ao buscar status" });
  }
});

// Listar reservas da réplica
app.get("/replicacao/reservas", async (req, res) => {
  try {
    const [reservas] = await dbReplica.query(
      "SELECT * FROM reservas ORDER BY id DESC"
    );
    res.json(reservas);
  } catch (err) {
    console.error("❌ Erro ao listar reservas da réplica:", err);
    res.status(500).json({ erro: "Erro ao listar reservas" });
  }
});

app.get("/", (req, res) => {
  res.send("✅ Serviço de Replicação ativo e rodando!");
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

// ============================================================
// INICIALIZAÇÃO E POLLING AUTOMÁTICO
// ============================================================

connectDatabases();

// Intervalo de sincronização automática (padrão: 30 segundos)
const INTERVALO_REPLICACAO = parseInt(
  process.env.INTERVALO_REPLICACAO || "30000"
);

// Inicia sincronização automática periódica
setInterval(async () => {
  await processarReplicacao();
}, INTERVALO_REPLICACAO);

console.log(
  `🔄 Replicação automática iniciada (intervalo: ${INTERVALO_REPLICACAO}ms)`
);

// Primeira sincronização ao iniciar
setTimeout(async () => {
  console.log("🔄 Executando primeira sincronização...");
  await processarReplicacao();
}, 5000);

// Inicialização do servidor
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 Serviço de Replicação rodando na porta ${PORT}`);
  console.log(`📡 Monitorando reservas do banco principal...`);
  console.log(
    `🔄 Sincronização automática a cada ${INTERVALO_REPLICACAO / 1000}s`
  );
});
