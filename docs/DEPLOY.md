# Deploy

How `rebuild/v2` goes onto the server. Written before the first v2 deploy from reading the code, so
**correct the steps as you run them** — the roadmap item is not done until this file matches what
actually happened.

Three processes must run, not one: `daphne` (HTTP + WebSockets), `celery worker` (sends the SOS
pushes) and `celery beat` (the 15 s sweeper that re-sends overdue alerts). Miss the worker and
alerts are created but never leave the server; miss beat and you lose the safety net that covers a
worker dying mid-countdown. Ready-made unit files are in `deploy/`.

Paths below assume `/srv/neighbourguard`, user `neighbour`, virtualenv at `venv/`. Change them to
match the box.

## Things that bite, read these first

1. **`SECRET_KEY` must be a fresh 50+ character random value on the server.** SimpleJWT signs every
   access token with it, so a guessable key means forgeable tokens — anyone could act as any user,
   which here means sending and reading alerts. `manage.py check --deploy` warns (W009) if the key
   is weak. Rotating it logs everyone out, which is fine. Generate one:
   `python -c "import secrets; print(secrets.token_urlsafe(64))"`
2. **`collectstatic` is not optional.** Static files use
   `CompressedManifestStaticFilesStorage`, which raises on a missing manifest, and the web app's
   `index.html` is served from `staticfiles/`. Skip it and every page 500s.
3. **Build the web app before `collectstatic`.** `web/dist/` is gitignored and is where the
   email-activation page comes from. No build, no activation page, and sign-up cannot complete.
4. **nginx serves `/media/`.** Django only serves it when `DEBUG=True`. Chat attachments and issue
   photos land there too, so watch the disk: `client_max_body_size` is 10m in the supplied nginx
   config, which is below the 50 MB the API allows for video — raise it if video matters.
5. **The phone build bakes in its server URL.** `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_WS_URL` in
   `neighbour-mobile/.env` are compiled into the app. Point them at the deployed domain and rebuild
   the app, or the phones will keep talking to a laptop. `EXPO_PUBLIC_SOS_SHORTCODE` is compiled in
   too, and must match the Africa's Talking number whose inbound callback points at
   `/api/v2/sms/inbound/` — it is what the SMS fallback texts when there is no data, so it cannot
   be fetched at the moment it is needed.
6. **Redis holds the Celery queue.** Do not give it an eviction policy that drops keys
   (`maxmemory-policy noeviction`), or a queued SOS task can vanish. The beat sweeper is the
   backstop, not the plan.

## First time

```bash
# 1. System packages
sudo apt update
sudo apt install -y python3-venv python3-dev build-essential redis-server nginx \
                    default-libmysqlclient-dev pkg-config git
sudo systemctl enable --now redis-server
redis-cli ping                       # expect PONG

# 2. Code and virtualenv
sudo mkdir -p /srv/neighbourguard && sudo chown neighbour:neighbour /srv/neighbourguard
sudo -u neighbour git clone -b rebuild/v2 <repo-url> /srv/neighbourguard
cd /srv/neighbourguard
sudo -u neighbour python3 -m venv venv
sudo -u neighbour venv/bin/pip install -r requirements.txt

# 3. Secrets. Copy the v1 .env if there is one, then fix the values marked below.
sudo -u neighbour nano .env
sudo chmod 600 .env
```

`.env` on the server, at minimum:

```ini
SECRET_KEY=<fresh 50+ random characters, see "Things that bite" #1>
DEBUG=False
ALLOWED_HOSTS=YOUR_DOMAIN
CSRF_TRUSTED_ORIGINS=https://YOUR_DOMAIN
HTTPS=False                 # flip to True after certbot works, see below

DB_ENGINE=django.db.backends.mysql
DB_NAME=...
DB_USER=...
DB_PASSWORD=...
DB_HOST=127.0.0.1
DB_PORT=3306

# Djoser builds the activation link from these. Wrong values = dead links in the sign-up email.
DOMAIN=YOUR_DOMAIN
PROTOCOL=https

EMAIL_HOST=...              # sign-up cannot finish without working email
EMAIL_HOST_USER=...
EMAIL_HOST_PASSWORD=...

AFRICASTALKING_USERNAME=...
AFRICASTALKING_API_KEY=...
# Inbound SMS. The webhook refuses everything (503) while this is empty, because it can raise an
# alert with no login and Africa's Talking does not sign its callbacks. Generate one the same way as
# SECRET_KEY, then point the Africa's Talking callback at
#   https://YOUR_DOMAIN/api/v2/sms/inbound/?key=<the same value>
SMS_INBOUND_SECRET=
SMS_SHORTCODE=            # the number people text an SOS to when they have no data

# Mobile money for pooled street plans. All empty = the feature reports "not configured" instead of
# pretending to charge anyone, which is the right state until the Vodacom TZ contract is confirmed.
# MPESA_CALLBACK_SECRET guards the only endpoint that can mark a payment paid: generate it like
# SECRET_KEY and put the same value in the gateway's callback URL:
#   https://YOUR_DOMAIN/api/v2/providers/mpesa/callback/?key=<the same value>
MPESA_BASE_URL=
MPESA_KEY=
MPESA_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
MPESA_CALLBACK_URL=
MPESA_CALLBACK_SECRET=

REDIS_URL=redis://127.0.0.1:6379/0
LOG_LEVEL=INFO
```

```bash
# 4. Database
sudo -u neighbour venv/bin/python manage.py migrate
sudo -u neighbour venv/bin/python manage.py createsuperuser

# 5. Copy the existing v1 homes into v2. Dry run first and read the output.
sudo -u neighbour venv/bin/python manage.py import_v1_residences --dry-run
sudo -u neighbour venv/bin/python manage.py import_v1_residences

# 5b. The two demo accounts, with inboxes you can actually open on the day.
sudo -u neighbour venv/bin/python manage.py seed_demo you@gmail.com juma@gmail.com

# 6. Web app, then static files (in this order)
cd web && sudo -u neighbour npm ci && sudo -u neighbour npm run build && cd ..
sudo -u neighbour venv/bin/python manage.py collectstatic --noinput

# 7. Services
sudo cp deploy/neighbourguard-*.service /etc/systemd/system/
sudo nano /etc/systemd/system/neighbourguard-*.service    # check User, Group, paths
sudo systemctl daemon-reload
sudo systemctl enable --now neighbourguard-web neighbourguard-worker neighbourguard-beat
systemctl status neighbourguard-web neighbourguard-worker neighbourguard-beat

# 8. nginx
sudo cp deploy/nginx-neighbourguard.conf /etc/nginx/sites-available/neighbourguard
sudo nano /etc/nginx/sites-available/neighbourguard     # replace YOUR_DOMAIN and the paths
sudo ln -s /etc/nginx/sites-available/neighbourguard /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 9. TLS, then turn on the HTTPS settings
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_DOMAIN
# only once https://YOUR_DOMAIN loads:
sudo -u neighbour sed -i 's/^HTTPS=False/HTTPS=True/' .env
sudo systemctl restart neighbourguard-web
```

## Every deploy after that

```bash
cd /srv/neighbourguard
sudo -u neighbour git pull
sudo -u neighbour venv/bin/pip install -r requirements.txt
sudo -u neighbour venv/bin/python manage.py migrate
cd web && sudo -u neighbour npm ci && sudo -u neighbour npm run build && cd ..
sudo -u neighbour venv/bin/python manage.py collectstatic --noinput
sudo systemctl restart neighbourguard-web neighbourguard-worker neighbourguard-beat
```

Restart the worker and beat too, not just the web process: they hold the old code in memory and
will keep running it.

## Check it actually works

```bash
# Config. With HTTPS=True the only warnings left should be W005 and W021 (HSTS subdomains and
# preload, both deliberately off — they are one-way doors). W009 means the SECRET_KEY is still
# weak; fix that before anything else.
sudo -u neighbour DEBUG=False venv/bin/python manage.py check --deploy

# The API answers and does not reveal accounts
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://YOUR_DOMAIN/api/auth/email-code/ \
     -H 'Content-Type: application/json' -d '{"email":"nobody@example.com"}'   # expect 200

# The web app and the admin load
curl -s -o /dev/null -w '%{http_code}\n' https://YOUR_DOMAIN/                  # expect 200
curl -s -o /dev/null -w '%{http_code}\n' https://YOUR_DOMAIN/api/admin/        # expect 302

# Beat is ticking (every 15 s) and the worker is picking tasks up
journalctl -u neighbourguard-beat -n 20 --no-pager
journalctl -u neighbourguard-worker -n 20 --no-pager
```

Then the parts only a phone can prove, in this order:

1. Sign up in the app with a real email. The activation email arrives, the link opens
   `https://YOUR_DOMAIN/activate/...` and says it worked. (If the page loads but activation fails,
   check `web/dist` was rebuilt from current source — see "Things that bite" #3.)
2. Pin a home, open the Home map: the approximate areas draw.
3. Open the group chat and send a message — that proves the WebSocket path through nginx.
4. The full two-phone table in `docs/PROGRESS.md`.

## Rolling back

```bash
cd /srv/neighbourguard
sudo -u neighbour git log --oneline -5
sudo -u neighbour git checkout <previous-commit>
sudo -u neighbour venv/bin/python manage.py collectstatic --noinput
sudo systemctl restart neighbourguard-web neighbourguard-worker neighbourguard-beat
```

Every v2 migration so far only adds tables (`places`, `alerts`, `chat` are new apps), so rolling the
code back without reversing migrations is safe. That stops being true the first time a migration
changes a v1 column — check `git diff` for `main/migrations/` before relying on it.

## Still to decide

- No backups are configured. Before the pitch, at least a nightly `mysqldump` to somewhere off the
  box, plus `media/`.
- No error reporting. A 500 on the server is currently only visible in `journalctl`.
