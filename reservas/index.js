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
  database: process.env.DB_NAME,
};

let db;

// Conexão com o banco e criação automática da tabela reservas
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
    console.log("✅ Tabela 'reservas' pronta para uso.");
  } catch (err) {
    console.error("❌ Erro ao criar tabela 'reservas':", err);
  }
}

connectDatabase();

// URLs dos outros serviços
const CLIENTES_URL =
  process.env.CLIENTES_URL ||
  "http://clientes-env.eba-ytjkzypy.sa-east-1.elasticbeanstalk.com";
const RESTAURANTES_URL =
  process.env.RESTAURANTES_URL ||
  "http://restaurantes-env.eba-ji6s7zmy.sa-east-1.elasticbeanstalk.com";

// ENDPOINTS DE RESERVAS

// Listar todas as reservas
app.get("/reservas", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM reservas ORDER BY data_reserva DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Erro ao listar reservas:", err.message);
    res.status(500).json({ erro: "Erro ao listar reservas" });
  }
});

// Criar nova reserva com CPF e nome do cliente
app.post("/reservas", async (req, res) => {
  try {
    const { nome, cpf, restaurante_id, data_reserva, horario, numero_pessoas } =
      req.body;

    if (!cpf || !nome || !restaurante_id || !data_reserva || !horario) {
      return res.status(400).json({ erro: "Campos obrigatórios ausentes." });
    }

    // Verifica se o cliente existe via CPF
    const clienteResp = await axios
      .get(`${CLIENTES_URL}/clientes?cpf=${cpf}`)
      .catch(() => null);

    if (!clienteResp || !clienteResp.data || clienteResp.data.length === 0) {
      return res.status(400).json({
        erro: "Cliente não encontrado. Cadastre o cliente antes de realizar a reserva.",
      });
    }

    const cliente = clienteResp.data[0];

    // Verifica restaurante e mesas disponíveis
    const restauranteResp = await axios
      .get(`${RESTAURANTES_URL}/restaurantes/${restaurante_id}`)
      .catch(() => null);

    const restaurante = restauranteResp?.data;

    if (!restaurante || restaurante.mesas_disponiveis <= 0) {
      return res
        .status(400)
        .json({ erro: "Restaurante sem mesas disponíveis." });
    }

    // Cria a reserva
    await db.query(
      `INSERT INTO reservas (cliente_id, restaurante_id, data_reserva, horario, numero_pessoas)
       VALUES (?, ?, ?, ?, ?)`,
      [cliente.id, restaurante_id, data_reserva, horario, numero_pessoas || 1]
    );

    // Atualiza mesas do restaurante
    await axios.patch(
      `${RESTAURANTES_URL}/restaurantes/${restaurante_id}/mesas`,
      { mesas_disponiveis: restaurante.mesas_disponiveis - 1 }
    );

    res.status(201).json({ mensagem: "Reserva criada com sucesso!" });
  } catch (err) {
    console.error("❌ Erro ao criar reserva:", err.message);
    res.status(500).json({ erro: "Erro interno ao criar reserva." });
  }
});

// Cancelar reserva (libera mesa)
app.delete("/reservas/:id", async (req, res) => {
  try {
    const reservaId = req.params.id;

    // Busca reserva existente
    const [reservas] = await db.query("SELECT * FROM reservas WHERE id = ?", [
      reservaId,
    ]);
    if (reservas.length === 0)
      return res.status(404).json({ erro: "Reserva não encontrada." });

    const reserva = reservas[0];

    // Exclui reserva
    await db.query("DELETE FROM reservas WHERE id = ?", [reservaId]);

    // Libera mesa no restaurante
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
    console.error("❌ Erro ao cancelar reserva:", err.message);
    res.status(500).json({ erro: "Erro interno ao cancelar reserva." });
  }
});

// Rota raiz e health check

app.get("/", (req, res) => res.send("✅ Serviço de Reservas ativo e rodando!"));

app.get("/health", (req, res) => res.json({ status: "ok" }));

// Inicialização do servidor
const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log(`Serviço de Reservas rodando na porta ${PORT}`)
);
