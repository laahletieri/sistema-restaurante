const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

// Servir arquivos estáticos do build
app.use(express.static(path.join(__dirname, "dist")));

// Qualquer rota desconhecida redireciona para o index.html (SPA)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Frontend rodando na porta ${PORT}`);
});
