#!/bin/bash
# ── VolleyUp GCP VM Setup Script ─────────────────────────────────────────────
# Run this on your GCP VM (34.175.152.148)
# Usage: bash setup-server.sh

set -e

echo "=== Updating system ==="
sudo apt update && sudo apt upgrade -y

echo "=== Installing dependencies ==="
sudo apt install -y python3 python3-pip python3-venv postgresql postgresql-contrib nginx

echo "=== Setting up PostgreSQL ==="
sudo -u postgres psql -c "CREATE USER volleyup WITH PASSWORD 'YOUR_DB_PASSWORD_HERE';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "CREATE DATABASE volleyup_db OWNER volleyup;" 2>/dev/null || echo "DB already exists"

echo "=== Creating app directory ==="
sudo mkdir -p /opt/volleyup/backend
sudo mkdir -p /opt/volleyup/backend/uploads/profiles
sudo mkdir -p /opt/volleyup/shared
sudo chown -R $USER:$USER /opt/volleyup

echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "1. Copy the backend code:  scp -r backend/* user@34.175.152.148:/opt/volleyup/backend/"
echo "2. Copy shared config:     scp shared/config.json user@34.175.152.148:/opt/volleyup/shared/"
echo "3. Then run: bash deploy/deploy.sh on the VM"
