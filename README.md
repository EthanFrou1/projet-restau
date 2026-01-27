# Projet Restau 🍽️

Application de consolidation financière multi-restaurants.

L’objectif est de centraliser les chiffres quotidiens de plusieurs restaurants,
de les valider, les consolider, et de produire un export Excel fiable destiné à la direction.

---

## 🧱 Architecture (vue d’ensemble)

- **Backend** : FastAPI (Python)
- **Frontend** : React + TypeScript (Vite)
- **Base de données** : PostgreSQL
- **ORM** : SQLAlchemy + Alembic (migrations)
- **Environnement** : Docker & Docker Compose

👉 L’ensemble du projet est conçu pour être lancé **en une seule commande** via Docker.

---

## 📦 Prérequis

Avant de commencer, assure-toi d’avoir installé :

- Docker Desktop (Windows / macOS / Linux)
- Git

👉 Aucun Python ou Node n’est requis en local : **tout passe par Docker**.

---

## 🚀 Lancer le projet en local

### 1️⃣ Cloner le dépôt
```bash
git clone https://github.com/EthanFrou1/projet-restau.git
cd projet-restau

2️⃣ Créer le fichier d’environnement
cp .env.example .env
Le fichier .env.example est déjà configuré pour un usage local.
Tu peux l’éditer si besoin (ports, credentials, etc.).

3️⃣ Démarrer l’application
docker compose up --build
⏳ Le premier lancement peut prendre quelques minutes (build des images).

🌍 Accès aux services
Une fois le projet démarré :

API (FastAPI)
http://localhost:8000
http://localhost:8000/docs (Swagger)

Frontend (React)
http://localhost:5173

Health check API
http://localhost:8000/health

Si ces URLs répondent, le projet est correctement lancé ✅

📁 Structure du projet (simplifiée)
bash
Copier le code
projet-restau/
├── backend/        # API FastAPI
│   ├── app/
│   │   ├── api/    # routes & dépendances
│   │   ├── core/   # sécurité, auth, config
│   │   ├── db/     # SQLAlchemy (engine, session, base)
│   │   ├── models/ # modèles ORM
│   ├── alembic/    # migrations DB
│   └── Dockerfile
├── frontend/       # React + Vite
├── docker-compose.yml
├── .env.example
└── README.md

🛠️ Commandes utiles
Arrêter les services :
docker compose down

Rebuild complet :
docker compose up --build

Entrer dans le container API :
docker compose exec api bash

Entrer dans le container DB :
docker compose exec db bash