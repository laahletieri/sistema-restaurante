const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// Configuração do banco RDS
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
};

let db;

// Função de conexão
async function connectDatabase() {
  try {
    db = await mysql.createPool(dbConfig);
    console.log("✅ Conectado ao banco de dados RDS MySQL.");
    await criarTabelaReservas();
  } catch (err) {
    console.error("❌ Erro ao conectar com o MySQL:", err);
    process.exit(1);
  }
}

// Criação automática da tabela
async function criarTabelaReservas() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS reservas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cliente_id INT NOT NULL,
        restaurante_id INT NOT NULL,
        data_reserva DATETIME NOT NULL
      );
    `);
    console.log("✅ Tabela 'reservas' pronta para uso.");
  } catch (err) {
    console.error("❌ Erro ao criar tabela 'reservas':", err);
  }
}

connectDatabase();

// ===============================================================
// 🌐 URLs dos outros serviços
// ===============================================================
const CLIENTES_URL = process.env.CLIENTES_URL || "http://clientes-env.eba-ytjkzypy.sa-east-1.elasticbeanstalk.com";
const RESTAURANTES_URL = process.env.RESTAURANTES_URL || "http://restaurantes-env.eba-ji6s7zmy.sa-east-1.elasticbeanstalk.com";

// ===============================================================
// 💡 Endpoints de RESERVAS com integração entre serviços
// ===============================================================

// Listar reservas
app.get("/reservas", async (req, res) => {
  const [rows] = await db.query("SELECT * FROM reservas");
  res.json(rows);
});

// Criar reserva
app.post("/reservas", async (req, res) => {
  try {
    const { cliente_id, restaurante_id, data_reserva } = req.body;

    if (!cliente_id || !restaurante_id || !data_reserva)
      return res.status(400).json({ erro: "Campos obrigatórios ausentes" });

    // ⿡ Verifica se o cliente existe
    const clienteResp = await axios.get(${CLIENTES_URL}/clientes/${cliente_id}).catch(() => null);
    if (!clienteResp || !clienteResp.data) {
      return res.status(400).json({ erro: "Cliente inválido ou não encontrado" });
    }

    // ⿢ Verifica disponibilidade no serviço de restaurantes
    const restauranteResp = await axios.get(${RESTAURANTES_URL}/restaurantes/${restaurante_id}).catch(() => null);
    const restaurante = restauranteResp?.data;

    if (!restaurante || restaurante.mesas_disponiveis <= 0) {
      return res.status(400).json({ erro: "Restaurante sem mesas disponíveis" });
    }

    // ⿣ Cria a reserva no banco local
    await db.query(
      "INSERT INTO reservas (cliente_id, restaurante_id, data_reserva) VALUES (?, ?, ?)",
      [cliente_id, restaurante_id, data_reserva]
    );

    // ⿤ Atualiza o número de mesas (-1)
    await axios.patch(${RESTAURANTES_URL}/restaurantes/${restaurante_id}/mesas, {
      mesas_disponiveis: restaurante.mesas_disponiveis - 1
    });

    res.status(201).json({ mensagem: "Reserva criada com sucesso" });

  } catch (err) {
    console.error("❌ Erro ao criar reserva:", err.message);
    res.status(500).json({ erro: "Erro interno ao criar reserva" });
  }
});

// Cancelar reserva (libera mesa)
app.delete("/reservas/:id", async (req, res) => {
  try {
    const reservaId = req.params.id;

    // Busca a reserva para saber o restaurante
    const [reservas] = await db.query("SELECT * FROM reservas WHERE id=?", [reservaId]);
    if (reservas.length === 0) return res.status(404).json({ erro: "Reserva não encontrada" });

    const reserva = reservas[0];

    // Exclui a reserva
    await db.query("DELETE FROM reservas WHERE id=?", [reservaId]);

    // Recupera o restaurante
    const restauranteResp = await axios.get(${RESTAURANTES_URL}/restaurantes/${reserva.restaurante_id}).catch(() => null);
    const restaurante = restauranteResp?.data;

    if (restaurante) {
      // Atualiza o número de mesas (+1)
      await axios.patch(${RESTAURANTES_URL}/restaurantes/${reserva.restaurante_id}/mesas, {
        mesas_disponiveis: restaurante.mesas_disponiveis + 1
      });
    }

    res.json({ mensagem: "Reserva cancelada e mesa liberada" });

  } catch (err) {
    console.error("❌ Erro ao cancelar reserva:", err.message);
    res.status(500).json({ erro: "Erro interno ao cancelar reserva" });
  }
});

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(🚀 Serviço de Reservas rodando na porta ${PORT}));