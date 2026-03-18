FROM node:20-alpine as build
WORKDIR /app

# Copia dependências e instala de forma limpa
COPY package*.json ./
RUN npm ci

# Copia o código fonte
COPY . .

# Recebe a Variável de Ambiente do Easypanel e aplica
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Constrói o site estático usando todo o cache e memória
RUN npm run build -- --clearScreen false

# Etapa 2: Servidor Leve (Cortando 90% da memória de execução)
FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist /app/dist

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000", "--no-clipboard"]
