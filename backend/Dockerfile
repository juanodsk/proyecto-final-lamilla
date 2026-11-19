FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN ./node_modules/.bin/prisma generate
COPY --chown=node:node src ./src
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
