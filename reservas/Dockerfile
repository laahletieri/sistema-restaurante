# 1. Imagem base
FROM node:18-alpine

# 2. Diretório de trabalho
WORKDIR /usr/src/app

# 3. Copiar e instalar dependências
COPY package*.json ./
RUN npm install

# 4. Copiar o restante do código
COPY . .

# 5. Expor a porta padrão
EXPOSE 8080

# 6. Comando de inicialização
CMD ["npm", "start"]
