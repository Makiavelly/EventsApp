.PHONY: env-up env-down env-cleanup env-port-forward env-port-close
.PHONY: migrate-create migrate-up migrate-down migrate-action
.PHONY: eventsapp-run eventsapp-deploy eventsapp-undeploy swagger-gen ps
.PHONY: frontend-install frontend-dev frontend-build frontend-lint frontend-preview

env-up env-down env-cleanup env-port-forward env-port-close:
	@$(MAKE) --no-print-directory -C backend $@

migrate-create migrate-up migrate-down migrate-action:
	@$(MAKE) --no-print-directory -C backend $@

eventsapp-run eventsapp-deploy eventsapp-undeploy swagger-gen ps:
	@$(MAKE) --no-print-directory -C backend $@

frontend-install:
	@npm --prefix frontend install

frontend-dev:
	@npm --prefix frontend run dev

frontend-build:
	@npm --prefix frontend run build

frontend-lint:
	@npm --prefix frontend run lint

frontend-preview:
	@npm --prefix frontend run preview
