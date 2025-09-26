// reservas/index.js
const express = require("express");
const axios = require("axios");
const cors = require("cors"); // <-- 1. Adicione esta linha
const app = express();

app.use(cors()); // <-- 2. Adicione esta linha para habilitar o CORS
app.use(express.json());

let reservas = [];
let nextId = 1;

const CLIENTES_URL = process.env.CLIENTES_URL || "http://localhost:3000";

// cria reserva (valida cliente chamando serviço de clientes)
app.post("/reservas", async (req, res) => {
  const { clienteId, restaurante, data } = req.body;
  if (!clienteId || !restaurante || !data)
    return res
      .status(400)
      .json({ erro: "clienteId, restaurante e data obrigatórios" });

  try {
    const resp = await axios.get(`${CLIENTES_URL}/clientes/${clienteId}`);
    const cliente = resp.data;
    const reserva = { id: nextId++, cliente, restaurante, data };
    reservas.push(reserva);
    res.status(201).json(reserva);
  } catch (err) {
    return res.status(400).json({ erro: "cliente inválido" });
  }
});

app.get("/reservas", (req, res) => res.json(reservas));
app.get("/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`Serviço de Reservas rodando na porta ${PORT}`)
);
