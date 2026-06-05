# Processing Queue Architecture

## Overview

SMART WORLD X uses a **dual-mode queue**: BullMQ + Redis when available, or a **PostgreSQL poller** as fallback. Website and job status stay synchronized in PostgreSQL.

```
┌─────────────┐     ingest      ┌──────────────┐
│   Intake    │ ──────────────► │  PostgreSQL  │
│   Module    │                 │ Website+Job  │
└─────────────┘                 └──────┬───────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
             ┌──────────┐       ┌──────────┐       ┌──────────┐
             │  Redis   │       │  Worker  │       │ Queue API│
             │  BullMQ  │◄──────│ Process  │       │ retry/   │
             └──────────┘       └──────────┘       │ cancel   │
                    │                  │           └──────────┘
                    └──────────────────┘
```

## Status model

### Website

| Status | Meaning |
|--------|---------|
| `NEW` | Created, not yet queued |
| `QUEUED` | Waiting for worker |
| `PROCESSING` | Worker active |
| `COMPLETED` | Pipeline finished |
| `FAILED` | Terminal failure |

### ProcessingJob

| Status | Meaning |
|--------|---------|
| `PENDING` | Awaiting worker |
| `ACTIVE` | Running |
| `COMPLETED` | Success |
| `FAILED` | Terminal failure |

## Components

| Module | Role |
|--------|------|
| `lib/queue/producer.ts` | Enqueue to BullMQ |
| `lib/queue/worker-runner.ts` | Redis worker (concurrent) |
| `lib/queue/db-poller.ts` | DB fallback poller |
| `lib/queue/processor.ts` | Job execution stub |
| `lib/queue/status-sync.ts` | Atomic status updates |
| `lib/queue/queue-service.ts` | Retry, cancel, reconcile, list |

## Concurrency

- **Redis mode**: `QUEUE_WORKER_CONCURRENCY` (default 5) BullMQ workers
- **DB mode**: Poller claims jobs with `lockToken` + `SKIP` stale locks; same concurrency cap
- **Rate limit**: BullMQ limiter on queue (50 jobs/sec default)

## Retries

1. **Automatic (Redis)**: BullMQ exponential backoff, 3 attempts; DB `attempts` synced
2. **Automatic (DB)**: `markJobFailed` requeues if `attempts < maxAttempts`
3. **Manual**: `POST /api/queue/jobs/:id/retry` resets and re-enqueues

## Operations

```bash
# Terminal 1 — app
npm run dev

# Terminal 2 — worker
npm run worker

# Reconcile DB pending → Redis
curl -X POST http://localhost:3000/api/queue/reconcile
```

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/queue/stats` | Queue metrics |
| `GET` | `/api/queue/jobs` | List jobs (filterable) |
| `POST` | `/api/queue/jobs/:id/retry` | Manual retry |
| `POST` | `/api/queue/jobs/:id/cancel` | Cancel job |
| `POST` | `/api/queue/reconcile` | Sync pending → Redis |
| `POST` | `/api/queue/websites/:id/queue` | Re-queue website |
