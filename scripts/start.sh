#!/bin/sh
set -e

echo "Running database migrations..."
./node_modules/.bin/prisma migrate deploy --config=./prisma.config.ts

echo "Starting application..."
exec node server.js
