# @duckdb/node-api carica binding nativi per-piattaforma: builder e runtime
# devono girare sulla stessa immagine base (stesso OS/architettura), altrimenti
# il binding compilato/installato nel builder non è compatibile a runtime.
FROM node:22-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Output "standalone": Next.js traccia ed embedda solo i moduli node
# effettivamente importati. db/migrations viene letto da fs a runtime
# (src/lib/duckdb/migrate.ts), non tracciato dal build — va copiato a mano.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/db ./db

# Il tracer di Next.js copia il binding nativo (duckdb.node) ma non
# libduckdb.so, da cui dipende a runtime via dynamic linking — invisibile
# all'analisi statica dei require(). Verificato con un run reale: senza
# questa copia esplicita l'app si rifiuta di partire ("libduckdb.so: cannot
# open shared object file"). Si sovrascrive l'intera cartella @duckdb con
# quella completa del builder per sicurezza.
COPY --from=builder /app/node_modules/@duckdb ./node_modules/@duckdb

EXPOSE 3000
CMD ["node", "server.js"]
