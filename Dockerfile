FROM node:20-alpine
RUN apk update && apk upgrade --no-cache

# Sätt arbetskatalog i containern
WORKDIR /app

# Kopiera package.json och package-lock.json först för effektiv caching
COPY package*.json ./

# Installera endast produktionsberoenden (eller alla om testerna körs i containern)
RUN npm ci --only=production

# Kopiera resten av koden
COPY . .

# Sätt port och starta applikationen
ENV PORT=4000
EXPOSE 4000

CMD ["node", "server.js"]