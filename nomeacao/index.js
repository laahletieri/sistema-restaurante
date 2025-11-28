// MICRO SERVIÇO DE NOMEAÇÃO (NAME SERVICE)
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// ------------------------------------------------------------
// LISTA DE SERVIÇOS A MONITORAR
// ------------------------------------------------------------
const SERVICES = [
  { name: "clientes", url: process.env.CLIENTES_URL },
  { name: "restaurantes", url: process.env.RESTAURANTES_URL },
  { name: "reservas", url: process.env.RESERVAS_URL },
  { name: "replicacao", url: process.env.REPLICACAO_URL },
];

// ------------------------------------------------------------
// TABELA DE STATUS EM MEMÓRIA (UP/DOWN)
// ------------------------------------------------------------
const statusServicos = {};

// ------------------------------------------------------------
// MINI DNS INTERNO (RESOLUTION TABLE)
// ------------------------------------------------------------
const services = {
  clientes: process.env.CLIENTES_URL || "http://localhost:3001",
  restaurantes: process.env.RESTAURANTES_URL || "http://localhost:3002",
  reservas: process.env.RESERVAS_URL || "http://localhost:3003",
};

// ------------------------------------------------------------
// FUNÇÃO DO MONITOR DE SAÚDE
// ------------------------------------------------------------
function startHealthMonitor() {
  console.log("[MONITOR] Monitor de saúde iniciado...");

  setInterval(async () => {
    for (const svc of SERVICES) {
      try {
        await axios.get(`${svc.url}/health`);

        if (statusServicos[svc.name] !== "UP") {
          console.log(
            `[MONITOR] Serviço ${svc.name} RECUPEROU. Status: UP`
          );
        }

        statusServicos[svc.name] = "UP";
      } catch (err) {
        if (statusServicos[svc.name] !== "DOWN") {
          console.error(
            `[MONITOR] Serviço ${svc.name} FALHOU. Marcando DOWN. Erro: ${err.message}`
          );
        }

        statusServicos[svc.name] = "DOWN";
      }
    }
  }, 5000); // verifica a cada 5 segundos
}

// ------------------------------------------------------------
// ROTAS
// ------------------------------------------------------------

// ROTA RAIZ
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    services: Object.keys(services),
  });
});

// ROTA DE RESOLUÇÃO DE NOME
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

// ===================== ENDPOINT HEALTH PADRONIZADO =====================
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "nomeacao",
    timestamp: Date.now(),
  });
});

// ------------------------------------------------------------
// INICIALIZA SERVIDOR + MONITOR DE SAÚDE
// ------------------------------------------------------------
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Serviço de Nomeação rodando na porta ${PORT}`);
  startHealthMonitor(); // <-- CHAMANDO O MONITOR AQUI
});
