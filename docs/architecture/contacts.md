# Contact Extraction Engine

## Flow

```
Queue Worker → extract_contacts stage
                    ↓
         Fetch homepage HTML
                    ↓
    Extract: mailto, tel, header, footer
                    ↓
    Discover contact page URLs (same domain)
                    ↓
    Fetch up to 3 contact pages → extract
                    ↓
    Dedupe + rank by source confidence → PostgreSQL
```

## Sources searched

| Source | Method |
|--------|--------|
| Mailto | `href="mailto:..."` |
| Tel | `href="tel:..."` |
| Header | `<header>`, `nav`, `[role=banner]` |
| Footer | `<footer>`, `[role=contentinfo]` |
| Contact page | Discovered `/contact`, `/contact-us`, etc. |

## Stored fields

| Model | Fields |
|-------|--------|
| `Contact` | email/phone value, source, sourceUrl, contactPageUrl, confidence |
| `ContactExtraction` | status, contactPageUrl, counts, pagesScanned |

## Extraction status

`PENDING` → `RUNNING` → `COMPLETED` | `NO_CONTACTS_FOUND` | `FAILED`

## API

| Method | Path |
|--------|------|
| `GET` | `/api/contacts` |
| `GET` | `/api/contacts/:websiteId` |

UI: `/contacts/:websiteId`
