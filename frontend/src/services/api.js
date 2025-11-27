// frontend/src/services/api.js
import axios from "axios";

// Cria uma instância do axios
const api = axios.create();

// Interceptor de requisição: executa ANTES de cada request sair
api.interceptors.request.use(
  (config) => {
    // pega o token salvo no localStorage
    const token = localStorage.getItem("token");

    if (token) {
      // adiciona o header Authorization em TODAS as requisições
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    // erro antes da requisição sair
    return Promise.reject(error);
  }
);

export default api;
