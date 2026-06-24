include .env
export

export PROJECT_ROOT=${shell pwd}

env-up:
	@docker compose up -d eventsapp-postgres
	@until docker compose exec -T eventsapp-postgres \
    	pg_isready -U "$(POSTGRES_USER)" -d "$(POSTGRES_DB)" \
    	>/dev/null 2>&1; do \
    	    sleep 1; \
    	done
	@sudo chown "${USER}":"${USER}" out
	@sudo chmod -R a+rX out/pgdata

env-down:
	@docker compose down eventsapp-postgres

env-cleanup:
	@read -p "Очистить все volume-файлы окружения? ОПАСНОСТЬ УТЕРИ ДАННЫХ. [y/N]: " ans; \
	if [ "$$ans" = "y" ]; then \
		docker compose down eventsapp-postgres port-forwarder && \
		sudo rm -rf out/pgdata && \
		echo "Файлы окружения очищены"; \
	else \
		echo "Очистка окружения отменена"; \
	fi

env-port-forward:
	@docker compose up -d port-forwarder

env-port-close:
	@docker compose down port-forwarder

migrate-create:
	@if [ -z "$(seq)" ]; then \
		echo "Отсутствует необходимый параметр 'seq'. Пример: make migrate-create seq=init"; \
		exit 1; \
	fi; \
	docker compose run --rm eventsapp-postgres-migrate \
		create \
		-ext sql \
		-dir /migrations \
		-seq "$(seq)"
	sudo chown -R "${USER}":"${USER}" migrations

migrate-up:
	@make migrate-action action=up

migrate-down:
	@make migrate-action action=down

migrate-action:
	@if [ -z "$(action)" ]; then \
		echo "Отсутствует необходимый параметр 'action'. Пример: make migrate-action action=up"; \
		exit 1; \
	fi; \
	docker compose run --rm eventsapp-postgres-migrate \
		-path /migrations \
		-database postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@eventsapp-postgres:5432/${POSTGRES_DB}?sslmode=disable \
		"$(action)"

eventsapp-run:
	@export LOGGER_FOLDER=${PROJECT_ROOT}/out/logs && \
	export POSTGRES_HOST=localhost && \
	go mod tidy && \
	go run cmd/eventsapp/main.go