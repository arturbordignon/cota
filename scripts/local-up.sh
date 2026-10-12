#!/usr/bin/env sh
set -eu

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

set_env_var() {
  key="$1"
  value="$2"
  tmp_file=".env.tmp.$$"

  awk -v key="$key" -v value="$value" '
    BEGIN { found = 0 }
    $0 ~ "^" key "=" {
      print key "=" value
      found = 1
      next
    }
    { print }
    END {
      if (!found) {
        print key "=" value
      }
    }
  ' .env > "$tmp_file"

  mv "$tmp_file" .env
}

get_env_var() {
  key="$1"
  grep "^$key=" .env | tail -n 1 | cut -d= -f2- | tr -d '"'
}

resolve_port() {
  key="$1"
  default_port="$2"
  service="$3"
  label="$4"

  port="$(get_env_var "$key" || true)"
  if [ -z "$port" ]; then
    port="$default_port"
  fi

  if ! docker compose ps --services --filter "status=running" 2>/dev/null | grep -qx "$service"; then
    available_port="$(find_available_port "$port")"
    if [ "$available_port" != "$port" ]; then
      echo "$label port $port is unavailable; using $available_port instead." >&2
      port="$available_port"
    fi
  fi

  set_env_var "$key" "$port"
  printf '%s\n' "$port"
}

find_available_port() {
  start_port="$1"

  PORT_START="$start_port" node -e '
    const net = require("node:net");
    const start = Number(process.env.PORT_START || 5433);
    const end = start + 100;

    function canListen(port) {
      return new Promise((resolve) => {
        const server = net.createServer();
        server.unref();
        server.on("error", () => resolve(false));
        server.listen({ port, host: "0.0.0.0" }, () => {
          server.close(() => resolve(true));
        });
      });
    }

    (async () => {
      for (let port = start; port <= end; port += 1) {
        if (await canListen(port)) {
          console.log(port);
          return;
        }
      }

      process.exit(1);
    })();
  '
}

postgres_port="$(resolve_port POSTGRES_PORT 5433 postgres Postgres)"
api_port="$(resolve_port API_PORT 3333 api API)"
web_port="$(get_env_var WEB_PORT || true)"
if [ -z "$web_port" ]; then
  web_port="3001"
fi
set_env_var WEB_PORT "$web_port"

set_env_var DATABASE_URL "postgresql://cota:cota@localhost:$postgres_port/cota?schema=public&options=-c%20TimeZone%3DAmerica%2FSao_Paulo"
set_env_var NEXT_PUBLIC_API_URL "http://localhost:$api_port/api/v1"
set_env_var FRONTEND_BASE_URL "http://localhost:$web_port"
set_env_var CDN_BASE_URL "http://localhost:$web_port"

docker compose up -d postgres redis minio mailhog adminer

echo "Waiting for Postgres..."
until docker compose exec -T postgres pg_isready -U cota -d cota >/dev/null 2>&1; do
  sleep 1
done

if [ ! -d node_modules ]; then
  pnpm install
fi

pnpm generate
pnpm migrate:dev

docker compose up -d --build api worker web

echo "Waiting for API..."
attempts=0
until docker compose exec -T api node -e "fetch('http://127.0.0.1:3333/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))" >/dev/null 2>&1; do
  attempts=$((attempts + 1))
  if [ "$attempts" -ge 60 ]; then
    echo "API did not become healthy. Recent logs:" >&2
    docker compose logs --tail=80 api >&2
    exit 1
  fi
  sleep 1
done

docker compose exec -T api pnpm local:seed

if ! curl -fsS "http://127.0.0.1:$api_port/health" >/dev/null 2>&1; then
  echo "Warning: API is healthy inside Docker, but host curl to http://127.0.0.1:$api_port/health failed." >&2
fi

echo "Waiting for the web app..."
web_attempts=0
until curl -fsS "http://127.0.0.1:$web_port" >/dev/null 2>&1; do
  web_attempts=$((web_attempts + 1))
  if [ "$web_attempts" -ge 90 ]; then
    echo "Web app did not become ready. Recent logs:" >&2
    docker compose logs --tail=80 web >&2
    exit 1
  fi
  sleep 2
done

cat <<EOF

Local Docker services are running.

URLs:
  Web:       http://localhost:$web_port
  API docs:  http://localhost:$api_port/docs
  Mailhog:   http://localhost:8025
  MinIO:     http://localhost:9001
  Adminer:   http://localhost:5555
EOF

cat <<'EOF'

Demo login:
  Account slug: cota-demo
  Email:        admin@cota.local
  Password:     password123
EOF
