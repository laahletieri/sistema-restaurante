# 1. Use uma imagem oficial do Node.js como base
FROM node:18-alpine

# 2. Defina o diretório de trabalho dentro do contêiner
WORKDIR /usr/src/app

# 3. Copie os arquivos de dependências PRIMEIRO para otimizar o cache
COPY package*.json ./

# 4. Instale as dependências da aplicação
# O '--production' foi removido para garantir que o 'npm start' funcione caso precise de devDependencies
RUN npm install

# 5. Copie o resto do código da sua aplicação
COPY . .

# 6. Exponha a porta que o Elastic Beanstalk espera por padrão
EXPOSE 8080

# 7. O comando para iniciar a sua aplicação (usando o script do package.json)
CMD [ "npm", "start" ]

