# UrbanTrack CRM Web

## Architecture

- `app`: router, route guards and global providers.
- `features`: API contracts, services, state and pages grouped by business feature.
- `components`: visual components shared by multiple features.
- `lib/api`: shared HTTP client, token lifecycle and API error normalization.
- `config`: validated environment configuration.
- `hooks` and `types`: genuinely shared hooks and types.

Pages and visual components must not call Axios directly. Feature API modules own endpoint calls. Environment values are read only through `config/env.ts`. Create a folder only when it contains working code; avoid speculative abstractions.

## Quality

Before completing changes, run `npm run lint`, `npm test`, and `npm run build`. Keep user-facing text in Spanish and identifiers in English.
