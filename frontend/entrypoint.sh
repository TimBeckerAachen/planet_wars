#!/bin/sh
set -e

# Log to stderr to ensure visibility in Render
echo "==> Starting frontend service" >&2
echo "Environment variables:" >&2
echo "  PORT=${PORT:-NOT_SET}" >&2
echo "  BACKEND_HOST=${BACKEND_HOST:-NOT_SET}" >&2
echo "  BACKEND_PORT=${BACKEND_PORT:-NOT_SET}" >&2

# Set defaults if not provided
# Note: Render free tier doesn't support private networking, so we use the public URL
: ${PORT:=10000}
: ${BACKEND_HOST:=planetwars-backend.onrender.com}
: ${BACKEND_PORT:=443}

echo "After defaults:" >&2
echo "  PORT=$PORT" >&2
echo "  BACKEND_HOST=$BACKEND_HOST" >&2
echo "  BACKEND_PORT=$BACKEND_PORT" >&2

# Extract DNS resolver
export RESOLVER=$(awk 'BEGIN{ORS=" "} /^nameserver/{print $2}' /etc/resolv.conf | head -n1)
echo "  RESOLVER=$RESOLVER" >&2

# Substitute environment variables in nginx config
sed -e "s/\${PORT}/$PORT/g" \
    -e "s/\${BACKEND_HOST}/$BACKEND_HOST/g" \
    -e "s/\${BACKEND_PORT}/$BACKEND_PORT/g" \
    -e "s/\${RESOLVER}/$RESOLVER/g" \
    /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

echo "==> Generated nginx configuration:" >&2
cat /etc/nginx/conf.d/default.conf >&2

# Start nginx
echo "==> Starting nginx" >&2
exec nginx -g 'daemon off;'
