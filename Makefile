# Makefile (project root)

CLIENT := client
SERVER := server

.PHONY: help install install-client install-server \
        dev dev-client dev-server \
        start build build-client build-server \
        db-up db-down db-reset db-clear db-logs db-shell db-studio \
        db-migrate db-seed db-status import-questions \
        test-api test-auth test-match test-websocket test-scoring \
		test-profile clean setup

help:
	@echo "Available commands:"
	@echo "  make setup            - Full setup (DB + deps + migrations + seed)"
	@echo "  make install          - Install dependencies"
	@echo "  make dev-client       - Start client"
	@echo "  make dev-server       - Start server"
	@echo ""
	@echo "Database:"
	@echo "  make db-up            - Start PostgreSQL"
	@echo "  make db-down          - Stop PostgreSQL"
	@echo "  make db-reset         - Reset database (drop + recreate)"
	@echo "  make db-clear         - Clear all data (keep structure)"
	@echo "  make db-migrate       - Run migrations"
	@echo "  make db-seed          - Seed database (users + categories)"
	@echo "  make db-studio        - Open Prisma Studio (GUI)"
	@echo "  make import-questions - Import questions from OpenTDB"
	@echo ""
	@echo "Testing:"
	@echo "  make test-api         - Test all API endpoints"
	@echo "  make test-auth        - Test authentication system"
	@echo "  make test-match       - Test match system"
	@echo "  make test-websocket   - Test WebSocket real-time functionality"
	@echo "  make test-scoring     - Test scoring system (unit tests)"
	@echo "  make test-profile     - Test profile API endpoints"
	@echo ""
	@echo "Other:"
	@echo "  make build            - Build for production"
	@echo "  make clean            - Remove build outputs"

setup: db-up install db-migrate db-seed

install: install-client install-server

install-client:
	cd $(CLIENT) && npm ci || npm install

install-server:
	cd $(SERVER) && npm ci || npm install

dev-client:
	cd $(CLIENT) && npm run dev

dev-server:
	cd $(SERVER) && npm run dev

build: build-client build-server

build-client:
	cd $(CLIENT) && npm run build

build-server:

start:
	cd $(SERVER) && npm run start

db-up:
	@docker-compose up -d postgres
	@until docker-compose exec -T postgres pg_isready -U trivia_user -d trivia_db > /dev/null 2>&1; do \
		sleep 1; \
	done

db-down:
	@docker-compose down

db-reset:
	@echo "Resetting database..."
	cd server && npm run db:reset

db-clear:
	@echo "Clearing all data from database..."
	cd server && npm run clear-data

db-migrate:
	@echo "Running migrations..."
	cd server && npm run db:migrate

db-seed:
	@echo "Seeding database..."
	cd server && npm run db:seed

import-questions:
	@echo "Importing questions from OpenTDB..."
	cd server && npm run import-questions

db-studio:
	@echo "Opening Prisma Studio..."
	cd server && npm run db:studio

db-logs:
	docker-compose logs -f postgres

db-shell:
	docker-compose exec postgres psql -U trivia_user -d trivia_db

db-status:
	@docker-compose ps
	@docker-compose exec -T postgres pg_isready -U trivia_user -d trivia_db

test-api:
	@bash tests/test-apis.sh

test-auth:
	@bash tests/test-auth.sh

test-match:
	@bash tests/test-match.sh

test-websocket:
	@bash tests/test-websocket.sh

test-scoring:
	@cd server && node ../tests/test-scoring.js

test-profile:
	@bash tests/test-profile.sh

clean:
	rm -rf $(CLIENT)/dist $(SERVER)/dist
