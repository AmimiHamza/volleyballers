#!/bin/bash
# ── VolleyUp Deploy Script ───────────────────────────────────────────────────
# Run this on the GCP VM after copying files
# Usage: bash deploy.sh

set -e
APP_DIR="/opt/volleyup"

echo "=== Setting up Python venv ==="
cd $APP_DIR/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "=== Setting environment variables ==="
cat > $APP_DIR/.env << 'EOF'
DATABASE_URL=postgresql://volleyup:YOUR_DB_PASSWORD_HERE@localhost:5432/volleyup_db
SECRET_KEY=CHANGE-THIS-TO-A-RANDOM-STRING-$(openssl rand -hex 32)
JWT_SECRET=CHANGE-THIS-TO-ANOTHER-RANDOM-STRING-$(openssl rand -hex 32)
EOF

echo "=== Running database migrations ==="
cd $APP_DIR/backend
set -a; source $APP_DIR/.env; set +a
export FLASK_APP=app:create_app
flask db upgrade

echo "=== Creating systemd service ==="
sudo tee /etc/systemd/system/volleyup.service > /dev/null << EOF
[Unit]
Description=VolleyUp Flask API
After=network.target postgresql.service

[Service]
User=$USER
WorkingDirectory=$APP_DIR/backend
EnvironmentFile=$APP_DIR/.env
ExecStart=$APP_DIR/backend/venv/bin/gunicorn --bind 127.0.0.1:5000 --workers 3 "app:create_app()"
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

echo "=== Configuring Nginx ==="
sudo tee /etc/nginx/sites-available/volleyup > /dev/null << 'EOF'
server {
    listen 80;
    server_name 34.175.152.148;

    client_max_body_size 5M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /uploads/ {
        alias /opt/volleyup/backend/uploads/;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/volleyup /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo "=== Starting VolleyUp service ==="
sudo systemctl daemon-reload
sudo systemctl enable volleyup
sudo systemctl restart volleyup

echo ""
echo "=== Deployment complete! ==="
echo "API is live at: http://34.175.152.148/api"
echo ""
echo "Useful commands:"
echo "  sudo systemctl status volleyup    # check status"
echo "  sudo journalctl -u volleyup -f    # view logs"
echo "  sudo systemctl restart volleyup   # restart"
