
const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

let restaurantes = [];
let nextId = 1;


app.post("/restaurantes", (req, res) => {
  const { nome, endereco, mesas, horarios } = req.body;
  if (!nome || !endereco) {
    return res.status(400).json({ erro: "Nome e endereço obrigatórios" });
  }
  const restaurante = { id: nextId++, nome, endereco, mesas: mesas || [], horarios: horarios || [] };
  restaurantes.push(restaurante);
  res.status(201).json(restaurante);
});


app.get("/restaurantes", (req, res) => res.json(restaurantes));


app.get("/restaurantes/:id", (req, res) => {
  const restaurante = restaurantes.find(r => r.id === parseInt(req.params.id));
  if (!restaurante) return res.status(404).json({ erro: "Restaurante não encontrado" });
  res.json(restaurante);
});



