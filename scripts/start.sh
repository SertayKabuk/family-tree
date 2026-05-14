#!/bin/sh
set -e

echo "Running database migrations..."
prisma migrate deploy --schema=./prisma/schema.prisma

echo "Starting application..."
exec node server.js
