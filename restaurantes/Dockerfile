# 1. Imagem base
FROM node:18-alpine

# 2. Diretório de trabalho
WORKDIR /usr/src/app

# 3. Copia os arquivos de dependência
COPY package*.json ./

# 4. Instala as dependências
RUN npm install

# 5. Copia o restante do código
COPY . .

# 6. Expõe a porta padrão do Elastic Beanstalk
EXPOSE 8080

# 7. Comando para iniciar o app
CMD ["npm", "start"]
