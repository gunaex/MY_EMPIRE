FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages ./packages
COPY tsconfig.json ./

RUN npm ci
RUN npm run build --workspace=packages/ui

FROM nginx:1.27-alpine

COPY packages/ui/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/ui/dist /usr/share/nginx/html

EXPOSE 5173
