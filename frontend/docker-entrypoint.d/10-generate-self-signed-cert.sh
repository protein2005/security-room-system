#!/bin/sh
set -eu

CERT_DIR="/etc/nginx/certs"
CERT_FILE="$CERT_DIR/server.crt"
KEY_FILE="$CERT_DIR/server.key"
CERT_CN="${TLS_CERT_COMMON_NAME:-security-room-system.local}"
CERT_SAN="${TLS_CERT_SUBJECT_ALT_NAME:-DNS:localhost,DNS:security-room-system.local,IP:127.0.0.1}"

mkdir -p "$CERT_DIR"

if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
  exit 0
fi

openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
  -keyout "$KEY_FILE" \
  -out "$CERT_FILE" \
  -subj "/CN=$CERT_CN" \
  -addext "subjectAltName=$CERT_SAN"

chmod 600 "$KEY_FILE"
