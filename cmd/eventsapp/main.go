package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	core_config "github.com/Makiavelly/EventsApp/internal/core/config"
	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_pgx_pool "github.com/Makiavelly/EventsApp/internal/core/repository/postgres/pool/pgx"
	core_http_middleware "github.com/Makiavelly/EventsApp/internal/core/transport/http/middleware"
	core_http_server "github.com/Makiavelly/EventsApp/internal/core/transport/http/server"
	events_postgres_repository "github.com/Makiavelly/EventsApp/internal/features/events/repository/postgres"
	events_service "github.com/Makiavelly/EventsApp/internal/features/events/service"
	events_transport_http "github.com/Makiavelly/EventsApp/internal/features/events/transport/http"
	participants_postgres_repository "github.com/Makiavelly/EventsApp/internal/features/participants_events/repository/postgres"
	participants_service "github.com/Makiavelly/EventsApp/internal/features/participants_events/service"
	participants_transport_http "github.com/Makiavelly/EventsApp/internal/features/participants_events/transport/http"
	users_postgres_repository "github.com/Makiavelly/EventsApp/internal/features/users/repository/postgres"
	users_service "github.com/Makiavelly/EventsApp/internal/features/users/service"
	users_transport_http "github.com/Makiavelly/EventsApp/internal/features/users/transport/http"
	"go.uber.org/zap"

	_ "github.com/Makiavelly/EventsApp/docs"
)

// @title 		GoLang EventsApp API
// @version 	1.0
// @description Events Application REST-API scheme
// @host 		172.20.247.149:5050
// @BasePath 	/api/v1
func main() {
	cfg := core_config.NewConfigMust()
	time.Local = cfg.TimeZone

	ctx, cancel := signal.NotifyContext(
		context.Background(),
		syscall.SIGINT, syscall.SIGTERM,
	)
	defer cancel()

	logger, err := core_logger.NewLogger(core_logger.NewConfigMust())
	if err != nil {
		fmt.Println("failed to init application logger:", err)
		os.Exit(1)
	}
	defer logger.Close()

	logger.Debug("application time zone", zap.Any("zone", time.Local))

	logger.Debug("initializing postgres connection pool")
	pool, err := core_pgx_pool.NewPool(ctx, core_pgx_pool.NewConfigMust())
	if err != nil {
		logger.Fatal("failed to init postgres connection pool", zap.Error(err))
	}
	defer pool.Close()

	logger.Debug("initializing feature", zap.String("feature", "users"))
	usersRepository := users_postgres_repository.NewUsersRepository(pool)
	usersService := users_service.NewUsersService(usersRepository)
	usersTransportHTTP := users_transport_http.NewUsersHTTPHandler(usersService)

	logger.Debug("initializing feature", zap.String("feature", "events"))
	eventsRepository := events_postgres_repository.NewEventsRepository(pool)
	eventsService := events_service.NewEventsService(eventsRepository)
	eventsTransportHTTP := events_transport_http.NewEventsHTTPHandler(eventsService)

	logger.Debug("initializing feature", zap.String("feature", "participants_events"))
	participantsRepository := participants_postgres_repository.NewParticipantsRepository(pool)
	participantsService := participants_service.NewParticipantService(participantsRepository)
	participantsTransportHTTP := participants_transport_http.NewParticipantsHTTPHandler(participantsService)

	logger.Debug("initializing HTTP server")
	httpServer := core_http_server.NewHTTPServer(
		core_http_server.NewConfigMust(),
		logger,
		core_http_middleware.CORS(),
		core_http_middleware.RequestID(),
		core_http_middleware.Logger(logger),
		core_http_middleware.Trace(),
		core_http_middleware.Panic(),
	)
	apiVersionRouter := core_http_server.NewAPIVersionRouter(core_http_server.ApiVersion1)
	apiVersionRouter.RegisterRoutes(usersTransportHTTP.Routes()...)
	apiVersionRouter.RegisterRoutes(eventsTransportHTTP.Routes()...)
	apiVersionRouter.RegisterRoutes(participantsTransportHTTP.Routes()...)

	httpServer.RegisterAPIRouters(
		apiVersionRouter,
	)
	httpServer.RegisterSwagger()

	if err := httpServer.Run(ctx); err != nil {
		logger.Error("HTTP server run error", zap.Error(err))
	}
}
