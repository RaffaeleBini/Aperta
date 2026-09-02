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
- [x] Sicurezza e gestione secret (RAILWAY_TOKEN come GitHub Secret, verificato mascherato nei log reali della Action)
- [x] Pipeline CI (lint + build container ad ogni push)
- [x] Pipeline CD e deploy pubblico su Railway
- [~] Monitoraggio (Sentry verificato in produzione con un evento reale; UptimeRobot ancora da configurare)
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

### Sicurezza e gestione secret

Oggi l'app non richiede nessuna variabile d'ambiente per funzionare in locale — nessuna chiave API, nessuna credenziale. `.env.example` documenta comunque il formato per quelle che introdurranno i prossimi passi (Sentry). Verificato che nessun file `.env` sia mai stato committato nella storia del repository (`git log --all --diff-filter=A -- .env*`, nessun risultato). I secret legati al deploy/CI (token Railway, credenziali Sentry per l'upload delle sourcemap) non vivono in `.env` ma come **GitHub Actions Secrets** — mai nel repository. Verificato con un run reale: `RAILWAY_TOKEN` appare come `***` nel log della Action, mai in chiaro.

### Pipeline CI

`.github/workflows/ci-cd.yml`, job `ci`: ad ogni push/PR su `main` — checkout, `npm ci`, lint (`--max-warnings=0`: la config di `eslint-config-next` marca la maggior parte delle regole come warning, non error — senza questo flag la pipeline passerebbe in verde anche con problemi di lint reali), build dell'immagine Docker.

Verificato con un run reale, non solo "dovrebbe fallire": rotto di proposito un lint (`unusedTestVar` inutilizzato), push, pipeline fallita in rosso con l'annotazione sulla riga esatta ([run rosso](https://github.com/RaffaeleBini/Aperta/actions/runs/33653865703)); revertito, pipeline tornata verde ([run verde](https://github.com/RaffaeleBini/Aperta/actions/runs/33653945161)).

### Pipeline CD e deploy pubblico

**URL pubblica: https://aperta-production.up.railway.app**

Job `deploy` nello stesso workflow, con `needs: ci` e condizione "push su `main`" (mai su PR) — installa il CLI di Railway e lancia `railway up` autenticato con `RAILWAY_TOKEN`. [Run verde completa CI→CD](https://github.com/RaffaeleBini/Aperta/actions/runs/33661806518).

Due bug reali trovati e corretti verificando il deploy in produzione, non solo in locale:

1. **Next.js standalone bind su hostname sbagliato.** Railway imposta la variabile d'ambiente `HOSTNAME` al nome del container (per identificarlo), ma `server.js` generato da `next build` la legge per decidere su quale indirizzo fare il bind (`process.env.HOSTNAME || '0.0.0.0'`) — risultato, il server ascoltava solo sull'hostname interno del container, irraggiungibile dal proxy pubblico di Railway (502 costante). Risolto impostando esplicitamente `HOSTNAME=0.0.0.0` come variabile del servizio Railway, sovrascrivendo quella automatica.
2. **WAL di DuckDB non riprodotto dopo un riavvio del container.** Osservato dopo aver collegato il volume persistente: un redeploy lasciava un `.wal` che DuckDB rifiutava di rigiocare all'avvio (`Failure while replaying WAL file`, errore interno), mandando l'app in un ciclo di riavvio permanente. Corretto in due parti (`src/lib/duckdb/client.ts`): un handler su `SIGTERM`/`SIGINT` che fa un `CHECKPOINT` pulito prima di uscire (riduce drasticamente quando il problema si presenta), più un recupero automatico che elimina il `.wal` e riapre se capita comunque (si perdono solo le transazioni non ancora checkpointate, mai l'intero database). Verificato importando un dataset di test, forzando un redeploy reale, e confermando che i dati sopravvivono.

Il volume persistente (`aperta-volume`, montato su `/app/data`) mantiene `data/aperta.duckdb` intatto tra un deploy e l'altro — è l'ambiente "production" definito più sopra.

### Monitoraggio

**Error tracking: Sentry** (`@sentry/nextjs`). Setup basato sugli `instrumentation.ts`/`instrumentation-client.ts` di Next.js (il pattern attuale per l'App Router, non i vecchi `sentry.*.config.js`) — vedi `src/instrumentation.ts` e `src/instrumentation-client.ts`. `NEXT_PUBLIC_SENTRY_DSN` va iniettato come **build-arg** del Dockerfile (si inlinea nel bundle client durante `next build`, non basta come variabile a runtime); `SENTRY_DSN` invece è letto dal server a runtime, quindi basta come variabile del servizio Railway.

Verificato con un evento reale, non solo "dovrebbe arrivare": chiamata `GET /api/debug/trigger-error` (ruota di solo-debug che lancia un errore a proposito) sull'URL pubblica, evento apparso nella dashboard di Sentry come issue `APERTA-1`, correttamente taggato "Unhandled" e con la rotta esatta.

**Interpretare gli alert**: un'issue "Unhandled" in Sentry è un'eccezione non gestita da nessun try/catch — indica un bug reale da correggere, non un errore atteso (es. una validazione fallita che l'app già gestisce con una risposta 400 non genera un'issue). Il campo "Events" conta quante volte si è ripetuto; "Users" quanti utenti diversi lo hanno incontrato.

**Uptime: UptimeRobot** — da configurare, monitorando `https://aperta-production.up.railway.app`.
