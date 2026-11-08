#!/usr/bin/env sh
set -eu

# Adminer sits in the "tools" profile; local:up starts it by name, and a plain
# "docker compose down" would leave it (and the network) running.
docker compose --profile tools down
