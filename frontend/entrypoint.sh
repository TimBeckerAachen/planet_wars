#!/bin/sh
set -e

echo "==> Starting frontend service"
echo "Environment variables:"
echo "  PORT=$PORT"
echo "  BACKEND_HOST=$BACKEND_HOST"
echo "  BACKEND_PORT=$BACKEND_PORT"

# Extract DNS resolver
export RESOLVER=$(awk 'BEGIN{ORS=" "} /^nameserver/{print $2}' /etc/resolv.conf | head -n1)
echo "  RESOLVER=$RESOLVER"

# Substitute environment variables in nginx config
sed -e "s/\${PORT}/$PORT/g" \
    -e "s/\${BACKEND_HOST}/$BACKEND_HOST/g" \
    -e "s/\${BACKEND_PORT}/$BACKEND_PORT/g" \
    -e "s/\${RESOLVER}/$RESOLVER/g" \
    /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

echo "==> Generated nginx configuration:"
cat /etc/nginx/conf.d/default.conf

# Start nginx
echo "==> Starting nginx"
exec nginx -g 'daemon off;'
