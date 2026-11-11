# dashboard-web: build React dengan Bun, sajikan dengan Nginx
FROM oven/bun:1.3-alpine AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM nginx:1.27-alpine
# Alamat backend untuk proxy /api; bisa diganti saat `docker run -e API_UPSTREAM=...`
ENV API_UPSTREAM=http://dashboard-api:3000
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1
