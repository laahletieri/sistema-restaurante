// MICRO SERVIÇO DE NOMEAÇÃO (NAME SERVICE)
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Tabela simples de resolução — mini DNS interno
const services = {
  clientes: process.env.CLIENTES_URL || "http://localhost:3001",
  restaurantes: process.env.RESTAURANTES_URL || "http://localhost:3002",
  reservas: process.env.RESERVAS_URL || "http://localhost:3003",
};

// Rota raiz (para health check padrão do EB)
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    services: Object.keys(services),
  });
});

// Rota para resolver o nome do serviço
app.get("/resolve/:serviceName", (req, res) => {
  const serviceName = req.params.serviceName;

  if (!services[serviceName]) {
    return res.status(404).json({
      erro: "Serviço não encontrado",
      disponiveis: Object.keys(services),
    });
  }

  res.json({
    service: serviceName,
    url: services[serviceName],
  });
});

// Health check explícito (p/ você testar)
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Inicia o servidor
const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log(`Serviço de Nomeação rodando na porta ${PORT}`)
);
