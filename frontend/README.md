# MEMORA frontend

React, TypeScript, and Vite interface for the MEMORA virtual memory simulator.

## Run locally

Start the FastAPI backend from the repository root (see the root README), then:

```bash
cd frontend
npm install
npm run dev
```

Vite serves the application at `http://localhost:5173`. The frontend expects
the API at `http://localhost:8000/api` unless `VITE_API_URL` is configured.

## Checks

```bash
npm test       # Vitest unit tests
npm run build  # TypeScript check and production build
npm run lint   # ESLint
npm run test:e2e # Playwright browser smoke test
```

Playwright starts its own Vite server on port 4173 and stubs the backend health
check. Install a browser once with `npx playwright install chromium` if the
Playwright browser is not already available.
