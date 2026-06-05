# SMART WORLD X

Outreach intelligence platform. Operators manually submit websites; the platform processes them through analysis, outreach, and reply tracking.

## Website Intake Module

Bulk URL submission with validation, deduplication, database storage, and processing job creation.

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL and Redis)

### Setup

```bash
# Start infrastructure
docker compose up -d

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Run migrations
npm run db:migrate

# Start dev server
npm run dev
```

Open [http://localhost:3000/intake](http://localhost:3000/intake).

### API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/intake/preview` | Validate input without persisting |
| `POST` | `/api/intake` | Execute ingest (store + queue jobs) |
| `GET` | `/api/intake/batches` | List recent intake batches |

### Website statuses

`NEW` → `QUEUED` (when auto-queue enabled) → `PROCESSING` → `COMPLETED` / `FAILED`

### Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `REDIS_URL` | — | Optional; enables BullMQ job queue |
| `INTAKE_MAX_BATCH_SIZE` | `10000` | Max URLs per batch |
| `INTAKE_DB_CHUNK_SIZE` | `500` | Insert chunk size |

Without `REDIS_URL`, websites and jobs are still created in the database with `QUEUED` status; run `npm run worker` to process via the DB poller.

## Processing Queue

Concurrent job processing with BullMQ (Redis) or PostgreSQL polling fallback.

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run worker
```

Open [http://localhost:3000/queue](http://localhost:3000/queue).

See [docs/architecture/queue.md](docs/architecture/queue.md) for architecture details.

## Website Analysis Engine

Lighthouse-powered audits (Performance, Accessibility, SEO, Best Practices) with business-friendly findings.

- Runs automatically in the **worker** after intake
- Requires **Google Chrome** on the worker machine
- Reports at [http://localhost:3000/analysis](http://localhost:3000/analysis)

See [docs/architecture/analysis.md](docs/architecture/analysis.md).

## Contact Extraction Engine

Extracts public emails and phones from mailto links, header, footer, and contact pages.

- Runs in the **worker** after Lighthouse analysis
- Reports at `/contacts/[websiteId]`

See [docs/architecture/contacts.md](docs/architecture/contacts.md).

## Outreach Engine

Generates subject line and message from website, contacts, and analysis report.

- Default: **template** provider (no API key)
- Optional: **OpenAI** (`OUTREACH_PROVIDER=openai`)
- Pluggable provider interface for future AI backends
- UI: `/outreach/[websiteId]`

See [docs/architecture/outreach.md](docs/architecture/outreach.md).

## Email Delivery

SMTP outbound email with queue, retries, and activity logging.

```bash
npm run email-worker
```

Configure `SMTP_*` in `.env`. Queue send from outreach page or `POST /api/delivery/send`.

See [docs/architecture/delivery.md](docs/architecture/delivery.md).

### Queue API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/queue/stats` | Queue and worker metrics |
| `GET` | `/api/queue/jobs` | List jobs (filter by status, domain) |
| `POST` | `/api/queue/jobs/:id/retry` | Retry failed/pending job |
| `POST` | `/api/queue/jobs/:id/cancel` | Cancel job |
| `POST` | `/api/queue/reconcile` | Enqueue pending DB jobs to Redis |
| `POST` | `/api/queue/websites/:id/queue` | Re-queue a website |

### Queue environment

| Variable | Default | Description |
|----------|---------|-------------|
| `QUEUE_WORKER_CONCURRENCY` | `5` | Parallel jobs per worker |
| `QUEUE_MAX_ATTEMPTS` | `3` | Max attempts per job |
| `QUEUE_LOCK_TTL_MS` | `300000` | Stale lock recovery (DB mode) |
| `QUEUE_POLL_INTERVAL_MS` | `2000` | DB poller interval |
