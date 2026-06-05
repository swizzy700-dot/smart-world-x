# Outreach Engine

## Inputs

| Source | Data used |
|--------|-----------|
| Website | domain, URL, page title |
| Contacts | primary email, all emails, phone |
| Analysis | scores, executive summary, top findings |

## Outputs

| Field | Description |
|-------|-------------|
| `subject` | Email subject line |
| `body` | Full outreach message (plain text) |
| `recipientEmail` | Primary contact from extraction |

## Provider architecture

```typescript
interface OutreachProvider {
  generate(context: OutreachContext): Promise<OutreachGenerationResult>;
}
```

| Provider | Env | Notes |
|----------|-----|-------|
| `template` | `OUTREACH_PROVIDER=template` (default) | Rule-based, no API key |
| `openai` | `OUTREACH_PROVIDER=openai` + `OPENAI_API_KEY` | JSON-mode chat completion |
| `anthropic` | Planned | Registry falls back to template |

Add a provider: implement `OutreachProvider`, register in `lib/outreach/providers/registry.ts`.

## Storage

`OutreachDraft` — versioned per website (`websiteId` + `version`).

- `inputSnapshot` — context used for generation (audit trail)
- `generationMeta` — tokens, engine metadata
- `promptVersion` — template/ prompt version string

## Pipeline

```
extract_contacts → generate_outreach → complete
```

## API

| Method | Path |
|--------|------|
| `GET` | `/api/outreach` |
| `GET` | `/api/outreach/:websiteId` |
| `POST` | `/api/outreach/:websiteId/generate` |

UI: `/outreach/:websiteId`
