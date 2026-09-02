# Aperta

Piattaforma locale (self-hosted) di analitica di dati aperti. Le specifiche funzionali complete e la guida DevOps dettagliata vivono in `docs/` — cartella locale, non versionata (vedi sotto).

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
- `src/lib/connectors/` — connettori dati (generico REST/JSON/CSV, Eurostat, INE, datos.gob.es, data.europa.eu, upload file)
- `src/lib/profiling/` — query di profilazione qualità dati
- `src/lib/notebook/` — export di grafici/pivot a notebook Jupyter
- `src/theme/` — token di marca e mapping chiaro/scuro
- `db/migrations/` — schema DuckDB, versionato per fase di sviluppo
- `data/` — file `.duckdb` locale (non versionato, vedi `.gitignore`)
- `docs/` — specifiche, note di progetto e la presentazione DevOps finale (`pipeline-devops.html`) — cartella **locale, non versionata**: materiale di lavoro personale, non pensato per essere pubblico sul repository GitHub.

Il file `data/aperta.duckdb` contiene sia i dati importati che tutti i metadati del progetto (dataset, sorgenti, trasformazioni, grafici, pivot, dashboard). Non è versionato in git ma viaggia con il resto della cartella del progetto — è l'intera "base dati" dell'app.

---

## Pipeline DevOps

Obiettivo: portare Aperta da "gira in locale con `npm run dev`" a un ciclo DevOps completo — container, CI/CD automatica, deploy pubblico, gestione dei secret e monitoraggio — mantenendo intatta la premessa architetturale dell'app (un solo file DuckDB, nessuna dipendenza cloud obbligatoria per l'uso locale).

### I 3 ambienti

| Ambiente | Dove gira | Come si aggiorna |
|---|---|---|
| **development** | Locale, `npm run dev` (o `docker compose up` in locale) | Manuale, ad ogni modifica |
| **staging** | Ambiente "staging" dedicato su Railway, stesso progetto | Deploy manuale/da branch dedicato, per validare prima di produzione |
| **production** | Ambiente "production" su Railway, URL pubblico | Automatico, ad ogni push su `main` che supera la CI |

### Strumenti scelti

- **Containerizzazione: Docker + docker-compose.** Un solo servizio (Aperta è un monolite Next.js, non esiste un back end separato) con volume persistente su `data/`.
- **CI/CD: GitHub Actions**, non GitLab CI. Il repository vive già su GitHub — zero attrito nel collegare i secret e nell'attivare la pipeline ad ogni push, senza dover mantenere un mirror su un'altra piattaforma.
- **Deploy pubblico: Railway, non Vercel.** Aperta tiene tutto — dati e metadati — in un unico file DuckDB su disco locale (`docs/aperta-specs.md` §9: "nessuna dipendenza esterna obbligatoria, 100% locale"). Vercel esegue Next.js come funzioni serverless **senza disco persistente**: qualunque dato scritto lì sparirebbe tra un'invocazione e l'altra. Railway offre invece un volume persistente reale attaccato al container, fedele all'architettura single-file di Aperta, mantenendo comunque deploy automatico da GitHub e URL pubblica.
- **Monitoraggio: Sentry** (error tracking) **+ UptimeRobot** (uptime monitor) sull'URL pubblica — entrambi con piano gratuito sufficiente per questo progetto.

### Stato di avanzamento

- [x] Esplorazione e pianificazione (questa sezione)
- [x] Containerizzazione (Dockerfile, docker-compose, verifica avvio locale)
- [ ] Sicurezza e gestione secret (.env, GitHub Secrets)
- [ ] Pipeline CI (lint + build container ad ogni push)
- [ ] Pipeline CD e deploy pubblico su Railway
- [ ] Monitoraggio (Sentry + UptimeRobot)
- [ ] Presentazione finale (`docs/pipeline-devops.html`)

Questa sezione viene aggiornata man mano che ogni fase si completa e si verifica realmente (non solo "dovrebbe funzionare").

### Containerizzazione

Build in due stage: `builder` compila con `next build` (output `standalone`, configurato in `next.config.ts`), `runtime` copia solo l'output necessario su una immagine `node:22-slim` più leggera. Un solo servizio in `docker-compose.yml` — Aperta non ha un back end separato — con `data/` montata come volume, cosicché il database DuckDB sopravviva a rebuild e restart del container.

```bash
docker compose up -d --build   # build immagine + avvio in background
docker compose logs -f aperta  # segue i log
docker compose down            # ferma e rimuove il container (il volume dati resta)
```

Nota tecnica verificata con un run reale (non solo "dovrebbe funzionare"): `@duckdb/node-api` carica un binding nativo (`duckdb.node`) che a sua volta dipende da una libreria dinamica separata (`libduckdb.so`, dynamic linking). Il tracciamento automatico dell'output `standalone` di Next.js copia il primo ma non la seconda — invisibile alla sua analisi statica dei `require()`. Senza una copia esplicita di `node_modules/@duckdb` nel Dockerfile, il container si avvia ma fallisce su ogni richiesta con `libduckdb.so: cannot open shared object file`. Risolto copiando la cartella `@duckdb` completa dal builder nell'immagine runtime.
