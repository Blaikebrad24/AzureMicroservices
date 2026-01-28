#!/usr/bin/env bash
# wait-for-it.sh -- Wait for a host:port to become available
# Usage: ./wait-for-it.sh host:port [-t timeout] [-- command args]

set -e

WAITFORIT_HOST=""
WAITFORIT_PORT=""
WAITFORIT_TIMEOUT=30
WAITFORIT_CMD=""

usage() {
  echo "Usage: $0 host:port [-t timeout] [-- command args]"
  exit 1
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      *:*)
        WAITFORIT_HOST=$(echo "$1" | cut -d: -f1)
        WAITFORIT_PORT=$(echo "$1" | cut -d: -f2)
        shift
        ;;
      -t)
        WAITFORIT_TIMEOUT="$2"
        shift 2
        ;;
      --)
        shift
        WAITFORIT_CMD="$*"
        break
        ;;
      *)
        usage
        ;;
    esac
  done

  if [[ -z "$WAITFORIT_HOST" || -z "$WAITFORIT_PORT" ]]; then
    usage
  fi
}

wait_for() {
  local start_ts=$(date +%s)
  while :; do
    (echo -n > /dev/tcp/$WAITFORIT_HOST/$WAITFORIT_PORT) >/dev/null 2>&1 && break
    local now_ts=$(date +%s)
    local elapsed=$(( now_ts - start_ts ))
    if [[ $elapsed -ge $WAITFORIT_TIMEOUT ]]; then
      echo "Timeout after ${WAITFORIT_TIMEOUT}s waiting for ${WAITFORIT_HOST}:${WAITFORIT_PORT}"
      exit 1
    fi
    sleep 1
  done
  echo "${WAITFORIT_HOST}:${WAITFORIT_PORT} is available"
}

parse_args "$@"
wait_for

if [[ -n "$WAITFORIT_CMD" ]]; then
  exec $WAITFORIT_CMD
fi
