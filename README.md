# 🛡️ NeighbourGuard

> A mobile-first neighbourhood security and incident reporting platform that empowers communities to stay safe and
> informed.

![Status](https://img.shields.io/badge/status-early%20development-orange)
![Django](https://img.shields.io/badge/backend-Django%206-green)
![Expo](https://img.shields.io/badge/mobile-Expo%20%2F%20React%20Native-blue)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## 📱 About

NeighbourGuard is a community-driven security app that allows residents to report incidents, receive alerts, and stay
connected with their neighbourhood. Built with a Django REST backend and a React Native mobile frontend.

---

## ✨ Features

- 📋 Incident reporting by community members
- 🔔 Real-time neighbourhood alerts
- 🔐 Secure JWT-based authentication
- 📧 Email verification on registration
- 👤 User account management via Djoser

---

## 🏗️ Tech Stack

| Layer    | Technology                       |
|----------|----------------------------------|
| Mobile   | React Native + Expo              |
| Backend  | Django 6 + Django REST Framework |
| Auth     | Djoser + JWT                     |
| Database | MySQL                            |
| Email    | Zoho SMTP via django-decouple    |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- MySQL
- Expo CLI (`npm install -g expo-cli`)

---

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/your-username/neighbour-guard.git
cd neighbour-guard/backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Fill in your environment variables (see Environment Variables below)

# Run migrations
python manage.py migrate

# Start the server
python manage.py runserver
```

---

### Mobile Setup

```bash
cd neighbour-guard/mobile

# Install dependencies
npm install

# Start Expo
npx expo start
```

- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go for physical device

---

## ⚙️ Environment Variables

Create a `.env` file in the `/backend` directory:

```env
SECRET_KEY=your-django-secret-key

DEBUG=True

DB_NAME=neighbour_guard
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_HOST=localhost
DB_PORT=3306

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.zoho.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@example.com
EMAIL_HOST_PASSWORD=your-app-password
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=your-email@example.com

DOMAIN=localhost:8000
SITE_NAME=NeighbourGuard
```

---

## 📁 Project Structure

```
neighbour-guard/
├── backend/
│   ├── backend/          # Django project settings
│   ├── api/              # REST API apps
│   ├── templates/
│   │   └── email/
│   │       ├── activation.html
│   │       └── activation_subject.txt
│   ├── manage.py
│   └── requirements.txt
│
└── mobile/
    ├── app/
    │   └── authentication/
    │       ├── login.tsx
    │       ├── register.tsx
    │       └── verifyEmail.tsx
    ├── api/
    │   └── auth.ts
    ├── components/
    └── assets/
```

---

## 🔑 API Endpoints

| Method | Endpoint                      | Description        |
|--------|-------------------------------|--------------------|
| POST   | `/api/auth/users/`            | Register new user  |
| POST   | `/api/auth/users/activation/` | Activate account   |
| POST   | `/api/auth/jwt/create/`       | Login / obtain JWT |
| POST   | `/api/auth/jwt/refresh/`      | Refresh JWT token  |
| GET    | `/api/auth/users/me/`         | Get current user   |

---

## 🤝 Contributing

This project is in early development. Contributions, ideas, and feedback are welcome.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👤 Author

**Erick Luoga**

- GitHub: [@your-username](https://github.com/your-username)