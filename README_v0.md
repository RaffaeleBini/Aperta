# Aperta

Piattaforma locale (self-hosted) di analitica di dati aperti. Specifiche complete in [`docs/aperta-specs.md`](docs/aperta-specs.md).

## Sviluppo

```bash
npm install
npm run db:migrate   # crea/aggiorna data/aperta.duckdb applicando le migrazioni in db/migrations
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## Script

- `npm run dev` — server di sviluppo (Turbopack)
- `npm run build` / `npm run start` — build e avvio in produzione
- `npm run lint` — ESLint
- `npm run db:migrate` — applica le migrazioni SQL pendenti in `db/migrations/`
- `npm run db:reset` — cancella `data/aperta.duckdb` e riapplica tutte le migrazioni da zero

## Struttura

- `src/app/[locale]/` — pagine (routing i18n con next-intl: es/gl/it)
- `src/app/api/` — Route Handlers (ingest, connettori, profiling)
- `src/lib/duckdb/` — client DuckDB, migrazioni, motore di ingest condiviso
- `src/lib/connectors/` — connettori dati (generico REST/JSON/CSV, Eurostat, upload file)
- `src/lib/profiling/` — query di profilazione qualità dati
- `src/theme/` — token di marca e mapping chiaro/scuro
- `db/migrations/` — schema DuckDB, versionato per fase di sviluppo
- `data/` — file `.duckdb` locale (non versionato, vedi `.gitignore`)

Il file `data/aperta.duckdb` contiene sia i dati importati che i metadati del progetto (dataset, sorgenti, in futuro trasformazioni/grafici/dashboard). Non è versionato in git ma viaggia con il resto della cartella del progetto.
