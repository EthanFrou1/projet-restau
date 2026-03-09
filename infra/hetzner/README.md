# Deploiement Hetzner

Cette base de prod est preparee sans modifier le setup de dev existant.

## Fichiers

- `docker-compose.prod.yml`
- `.env.prod.example`
- `backend/Dockerfile.prod`
- `frontend/Dockerfile.prod`
- `infra/hetzner/frontend.nginx.conf`
- `infra/hetzner/app.example.com.conf`

## Principe

- `db` : PostgreSQL
- `api` : FastAPI + Alembic
- `front` : build Vite servi par Nginx
- `Nginx hote` : reverse proxy public vers `127.0.0.1:8080` et `127.0.0.1:8000`

## Mise en place minimale

1. Copier `.env.prod.example` vers `.env.prod`
2. Remplir les vraies valeurs
3. Lancer :

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

4. Installer Nginx sur le VPS
5. Adapter `infra/hetzner/app.example.com.conf`
6. Activer le site puis ajouter SSL avec Let's Encrypt

## Notes

- Le backend n'est pas expose publiquement sauf sur `127.0.0.1:8000`
- Le frontend n'est pas expose publiquement sauf sur `127.0.0.1:8080`
- Le reverse proxy hote est le point d'entree public
- `VITE_API_URL` est prevu pour un sous-domaine `api.example.com`
