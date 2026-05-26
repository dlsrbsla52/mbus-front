#!/usr/bin/env bash
# Generate TypeScript types from backend OpenAPI specs.
# Requires backend services running locally (8181/8182/8183).
set -euo pipefail

OUT_DIR="lib/api/generated"
mkdir -p "$OUT_DIR"

services=(
  "iam:8181"
  "stop:8182"
  "reservation:8183"
)

for entry in "${services[@]}"; do
  name="${entry%%:*}"
  port="${entry##*:}"
  url="http://localhost:${port}/api-docs"
  echo "→ ${name} (${url})"
  npx --yes openapi-typescript "$url" -o "${OUT_DIR}/${name}.ts"
done

echo "Done. Output: ${OUT_DIR}"
