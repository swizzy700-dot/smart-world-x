# Website Analysis Engine

## Flow

```
Queue Worker → processPipelineJob()
                    ↓
              runWebsiteAnalysis(websiteId, url)
                    ↓
              Headless Chrome + Lighthouse
                    ↓
              Scores + Business Findings → PostgreSQL
```

## Lighthouse categories

| Category | Stored field |
|----------|----------------|
| Performance | `performanceScore` |
| Accessibility | `accessibilityScore` |
| SEO | `seoScore` |
| Best Practices | `bestPracticesScore` |
| Overall | Average of the four (0–100) |

## Requirements

- **Google Chrome** installed (used by `chrome-launcher`)
- Analysis runs in **`npm run worker`** only (not in Next.js request handlers)

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ANALYSIS_TIMEOUT_MS` | `120000` | Max Lighthouse run time |
| `LIGHTHOUSE_FORM_FACTOR` | `mobile` | `mobile` or `desktop` |
| `CHROME_FLAGS` | headless flags | Chrome launch flags |
| `MAX_FINDINGS_PER_CATEGORY` | `5` | Failed audits per category |

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/analysis` | List analyses |
| `GET` | `/api/analysis/:websiteId` | Full report + findings |
