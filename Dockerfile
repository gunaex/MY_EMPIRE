FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages ./packages
COPY tsconfig.json ./

RUN npm ci

EXPOSE 3000

CMD ["npm", "run", "dev:server"]
