up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f --tail=200

api-logs:
	docker compose logs -f --tail=200 api

db-logs:
	docker compose logs -f --tail=200 db

psql:
	docker compose exec db psql -U $$POSTGRES_USER -d $$POSTGRES_DB

api-shell:
	docker compose exec api bash

front-shell:
	docker compose exec front sh

test:
	docker compose exec api pytest -q
