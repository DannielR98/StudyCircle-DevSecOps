# Använd en officiell lättvikts-Node.js-image
FROM node:20-alpine

# Skapa och sätt arbetskatalogen i containern
WORKDIR /app

# Kopiera package.json och package-lock.json först (för effektiv caching)
COPY package*.json ./

# Installera endast produktionsberoenden (eller alla beroenden om tidsresurser inte är ett problem)
RUN npm ci --only=production

# Kopiera över resterande källkod
COPY . .

# Exponera porten som applikationen lyssnar på
EXPOSE 4000

# Starta servern
CMD ["node", "server.js"]