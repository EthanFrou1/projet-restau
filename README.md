# Projet Restau

Application de consolidation financiere multi-restaurants.

Objectif: centraliser les chiffres quotidiens, valider, consolider,
et produire un export fiable pour la direction.

---

## Architecture (vue d'ensemble)

- Backend : FastAPI (Python)
- Frontend : React + TypeScript (Vite)
- Base de donnees : PostgreSQL
- ORM : SQLAlchemy + Alembic (migrations)
- Environnement : Docker & Docker Compose

Tout le projet est lance en une seule commande via Docker.

---

## Prerequis

- Docker Desktop
- Git

Aucun Python ou Node requis en local : tout passe par Docker.

---

## Lancer le projet en local

### 1) Cloner le depot
```bash
git clone https://github.com/EthanFrou1/projet-restau.git
cd projet-restau
```

### 2) Creer le fichier d'environnement
```bash
cp .env.example .env
```
Le fichier `.env.example` est deja configure pour un usage local.

### 3) Demarrer tout (DB + API + Front)
```bash
docker compose up --build
```
Le premier lancement peut prendre quelques minutes.

### 4) Acces aux services
- API : http://localhost:8000
- Docs Swagger : http://localhost:8000/docs
- Frontend : http://localhost:5173
- Health check : http://localhost:8000/health

---

## Bonnes pratiques Docker (projet)

### Quand utiliser --build
- Premier lancement
- Changement dans un Dockerfile
- Ajout/suppression de dependances (Python ou Node)

### Lockfile Frontend
- `package-lock.json` reste dans le repo.
- Le container utilise `npm ci` si le lockfile existe.
- Evite `npm install` si tu as deja un lockfile.

---

## Demarrer chaque partie separement (optionnel)

### Base de donnees
```bash
docker compose up -d db
```

### Backend (API)
```bash
docker compose up api
```

### Frontend
```bash
docker compose up front
```

---

## Structure du projet (simplifiee)
```
projet-restau/
├── backend/        # API FastAPI
│   ├── app/
│   │   ├── api/    # routes & dependances
│   │   ├── core/   # securite, auth, config
│   │   ├── db/     # SQLAlchemy (engine, session, base)
│   │   ├── models/ # modeles ORM
│   ├── alembic/    # migrations DB
│   └── Dockerfile
├── frontend/       # React + Vite
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Commandes utiles

Arreter les services :
```bash
docker compose down
```

Rebuild complet :
```bash
docker compose up --build
```

Entrer dans le container API :
```bash
docker compose exec api bash
```

Entrer dans le container DB :
```bash
docker compose exec db bash
```
