# 015 — API runtime detection

## Status

Accepted

## Context

Hub Run and Setup assumed every API repo is Node: `node_modules` and `npm run dev`. Upwork Manager’s API is a Python FastAPI app (`requirements.txt`, `.venv`, `python main.py`, `GET /health`).

## Decision

The API directory (still stored as `expressDir`, registry `repoType: "express"`) is inspected on disk:

- Python when `pyproject.toml` or `requirements.txt` exists and `package.json` does not.
- Node otherwise.

Python deps are `.venv`. Setup runs `python3 -m venv .venv` and pip. Run starts `python main.py` with `PORT` set. Web waits until health JSON contains `"status": "ok"` or `"success": true`.

Node projects keep `npm install` and `npm run dev`.

## Related

- [008 – Local launcher service](./008-local-launcher-service.md)
- [012 – Project setup into luckee/](./012-project-setup-into-luckee.md)
