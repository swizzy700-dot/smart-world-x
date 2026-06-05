# Email Delivery System

## Flow

```
Operator → POST /api/delivery/send
              ↓
       EmailMessage (PENDING) + EmailActivity (QUEUED)
              ↓
       BullMQ email-delivery queue (or DB poller)
              ↓
       SENDING → SMTP (nodemailer) → SENT | FAILED
              ↓
       EmailActivity log (every state change)
```

## Statuses

| Status | Meaning |
|--------|---------|
| `PENDING` | Queued, awaiting worker |
| `SENDING` | SMTP send in progress |
| `SENT` | Delivered successfully |
| `FAILED` | Max retries exhausted |

## Retry

- **Automatic**: BullMQ exponential backoff (`EMAIL_MAX_ATTEMPTS`, default 3)
- **Manual**: `POST /api/delivery/messages/:id/retry`

## SMTP configuration

| Variable | Description |
|----------|-------------|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | Port (587 TLS, 465 SSL) |
| `SMTP_SECURE` | `true` for port 465 |
| `SMTP_USER` / `SMTP_PASS` | Auth (optional) |
| `SMTP_FROM` | From address |

## Workers

```bash
npm run email-worker   # terminal 3 (requires SMTP + Redis or DB poller)
```

## API

| Method | Path |
|--------|------|
| `POST` | `/api/delivery/send` |
| `GET` | `/api/delivery` |
| `GET` | `/api/delivery/stats` |
| `GET` | `/api/delivery/website/:websiteId` |
| `GET` | `/api/delivery/messages/:id` |
| `POST` | `/api/delivery/messages/:id/retry` |
