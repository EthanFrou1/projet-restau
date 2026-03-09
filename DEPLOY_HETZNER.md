# Déploiement Hetzner

Procédure de déploiement prévue pour ce projet sur un VPS Hetzner.

Ce document est volontairement opérationnel, pour pouvoir être relu par une autre IA ou suivi pas à pas le jour du go-live.

## Objectif

Déployer :

- le frontend sur `app.ton-domaine.fr`
- l'API sur `api.ton-domaine.fr`
- PostgreSQL sur le même VPS
- le tout via Docker Compose
- avec Nginx comme reverse proxy
- avec HTTPS via Let's Encrypt

## Fichiers déjà préparés dans le repo

- `docker-compose.prod.yml`
- `.env.prod.example`
- `backend/Dockerfile.prod`
- `frontend/Dockerfile.prod`
- `infra/hetzner/frontend.nginx.conf`
- `infra/hetzner/app.example.com.conf`
- `infra/hetzner/README.md`

## Vue d'ensemble de l'architecture

Sur le VPS Hetzner :

- `db` : PostgreSQL
- `api` : FastAPI + Alembic
- `front` : build Vite servi par Nginx dans un conteneur
- `nginx` hôte : reverse proxy public

Ports exposés localement sur le VPS :

- `127.0.0.1:8000` -> API
- `127.0.0.1:8080` -> Frontend

Ports publics :

- `80`
- `443`

## Étape 1 - Acheter le minimum

Prendre :

- 1 VPS Hetzner
- 1 nom de domaine

Prévoir :

- `app.ton-domaine.fr`
- `api.ton-domaine.fr`

## Étape 2 - Configurer le DNS

Créer les enregistrements `A` :

- `app` -> IP du VPS
- `api` -> IP du VPS

## Étape 3 - Préparer le serveur

Installer :

- Docker
- Docker Compose
- Nginx
- Certbot

Ouvrir le firewall :

- `22`
- `80`
- `443`

## Étape 4 - Déployer le repo

Sur le VPS :

```bash
git clone <URL_DU_REPO>
cd projet-restau
```

## Étape 5 - Préparer les variables de prod

Copier le fichier exemple :

```bash
cp .env.prod.example .env.prod
```

Remplir ensuite les vraies valeurs.

## Variables à renseigner dans `.env.prod`

### App

```env
ENV=prod
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

### Sécurité

```env
SECRET_KEY=<clé longue et aléatoire>
```

### Base de données

```env
POSTGRES_DB=restau
POSTGRES_USER=restau
POSTGRES_PASSWORD=<mot-de-passe-fort>
DATABASE_URL=postgresql+psycopg://restau:<mot-de-passe-fort>@db:5432/restau
```

### Stockage

```env
STORAGE_PATH=/app/storage
```

### URLs publiques

```env
APP_BASE_URL=https://app.ton-domaine.fr
VITE_API_URL=https://api.ton-domaine.fr
```

### CORS

```env
CORS_ORIGINS=https://app.ton-domaine.fr
```

### Mail

```env
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM=...
SMTP_STARTTLS=true
```

### MyRHIS

```env
MYRHIS_BASE_URL=...
MYRHIS_API_KEY=...
MYRHIS_USERNAME=...
MYRHIS_PASSWORD=...
MYRHIS_TIMEOUT_SECONDS=10
MYRHIS_MAX_RESTAURANT_PAGES=25
```

## Étape 6 - Lancer l'application

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

## Étape 7 - Vérifier les conteneurs

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
```

Logs :

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f
```

## Étape 8 - Configurer Nginx sur le VPS

Prendre comme base :

- `infra/hetzner/app.example.com.conf`

Remplacer :

- `app.example.com` -> `app.ton-domaine.fr`
- `api.example.com` -> `api.ton-domaine.fr`

Le principe attendu :

- `app.ton-domaine.fr` -> proxy vers `127.0.0.1:8080`
- `api.ton-domaine.fr` -> proxy vers `127.0.0.1:8000`

## Étape 9 - Activer Nginx

Exemple classique :

```bash
sudo cp infra/hetzner/app.example.com.conf /etc/nginx/sites-available/projet-restau
sudo ln -s /etc/nginx/sites-available/projet-restau /etc/nginx/sites-enabled/projet-restau
sudo nginx -t
sudo systemctl reload nginx
```

Adapter au système de fichiers réel du serveur si besoin.

## Étape 10 - Ajouter le SSL

Avec Certbot :

```bash
sudo certbot --nginx -d app.ton-domaine.fr -d api.ton-domaine.fr
```

Puis vérifier :

```bash
sudo systemctl status certbot.timer
```

## Étape 11 - Vérifications fonctionnelles après déploiement

Tester :

- ouverture du frontend
- login
- logout
- expiration session
- dashboard
- imports J-1
- réimport
- création restaurant MyRHIS
- association utilisateur / restaurant
- données globales
- budget

## Étape 12 - Vérifier l'API

Tester au minimum :

- healthcheck
- login
- chargement dashboard
- appel MyRHIS
- upload d'import

## Étape 13 - Sauvegardes

Mettre en place au minimum :

- dump Postgres quotidien
- copie du dossier `storage/`

Idéalement :

- sauvegarde vers un autre stockage que le VPS

## Étape 14 - Commandes utiles

Lancer :

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Voir les logs :

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f
```

Redémarrer :

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod restart
```

Arrêter :

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod down
```

## Étape 15 - Checklist finale avant go-live

- domaine configuré
- DNS propagé
- `.env.prod` rempli
- `SECRET_KEY` fort
- mot de passe PostgreSQL fort
- variables MyRHIS correctes
- frontend accessible en HTTPS
- API accessible en HTTPS
- migrations passées
- imports testés
- sauvegardes prévues

## Remarques

- Le fichier `.env` actuel de dev ne doit pas être utilisé pour la prod
- Le déploiement prod s'appuie sur `.env.prod`
- Le setup dev actuel ne doit pas être modifié
- Cette procédure est prévue pour être exécutée uniquement une fois le go client validé
