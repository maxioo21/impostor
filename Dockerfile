# Obraz do wdrożenia na dowolnym hostingu z Dockerem (Railway, Fly.io, VPS)
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV PORT=3000 NODE_ENV=production
EXPOSE 3000
CMD ["node", "server/index.js"]
