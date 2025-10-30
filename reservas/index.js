const express = require("express");
const axios = require("axios");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
app.use(cors());
app.use(express.json());

// Configuração do banco de dados (RDS)
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
};

let db;

// Conecta e cria tabela
async function connectDatabase() {
  try {
    db = await mysql.createPool(dbConfig);
    console.log("✅ Conectado ao banco de dados RDS MySQL.");

    await db.query(`
      CREATE TABLE IF NOT EXISTS reservas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        clienteId INT NOT NULL,
        restaurante VARCHAR(100) NOT NULL,
        data DATETIME NOT NULL,
        FOREIGN KEY (clienteId) REFERENCES clientes(id)
      );
    `);

    console.log("✅ Tabela 'reservas' pronta para uso.");
  } catch (err) {
    console.error("❌ Erro ao conectar com o MySQL:", err);
    process.exit(1);
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

// Cria nova reserva
app.post("/reservas", async (req, res) => {
  const { clienteId, restaurante, data } = req.body;

  if (!clienteId || !restaurante || !data)
    return res
      .status(400)
      .json({ erro: "clienteId, restaurante e data obrigatórios" });

  try {
    // Valida cliente
    await axios.get(`${CLIENTES_URL}/clientes/${clienteId}`);

    // Verifica se o restaurante existe
    const respRest = await axios.get(`${RESTAURANTES_URL}/restaurantes`);
    const restauranteValido = respRest.data.find((r) => r.nome === restaurante);
    if (!restauranteValido)
      return res.status(400).json({ erro: "Restaurante não encontrado." });

    // Cria a reserva no banco
    const [result] = await db.query(
      "INSERT INTO reservas (clienteId, restaurante, data) VALUES (?, ?, ?)",
      [clienteId, restaurante, data]
    );

    res.status(201).json({
      id: result.insertId,
      clienteId,
      restaurante,
      data,
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ erro: "Erro ao criar reserva." });
  }
});

// Lista todas as reservas
app.get("/reservas", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM reservas ORDER BY data DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar reservas" });
  }
});

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Inicia servidor
const PORT = process.env.PORT || 8080;
app.get("/", (req, res) => {
  res.send("Serviço de Reservas está no ar!");
});
app.listen(PORT, () =>
  console.log(`🚀 Serviço de Reservas rodando na porta ${PORT}`)
);
