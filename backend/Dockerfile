# dashboard-api: Bun + Elysia + SQLite (read-only)
FROM oven/bun:1.3-alpine

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY tsconfig.json ./
COPY src ./src
# Hasil notebook (weather.db + model.json) ikut dibundel ke image
COPY data ./data

USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:3000/api/metrics > /dev/null || exit 1

CMD ["bun", "src/index.ts"]
