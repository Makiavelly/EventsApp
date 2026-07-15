package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	core_auth "github.com/Makiavelly/EventsApp/internal/core/auth"
	core_config "github.com/Makiavelly/EventsApp/internal/core/config"
	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_metrics "github.com/Makiavelly/EventsApp/internal/core/metrics"
	core_pgx_pool "github.com/Makiavelly/EventsApp/internal/core/repository/postgres/pool/pgx"
	core_http_middleware "github.com/Makiavelly/EventsApp/internal/core/transport/http/middleware"
	core_http_server "github.com/Makiavelly/EventsApp/internal/core/transport/http/server"
	auth_postgres_repository "github.com/Makiavelly/EventsApp/internal/features/auth/repository/postgres"
	auth_service "github.com/Makiavelly/EventsApp/internal/features/auth/service"
	auth_transport_http "github.com/Makiavelly/EventsApp/internal/features/auth/transport/http"
	events_postgres_repository "github.com/Makiavelly/EventsApp/internal/features/events/repository/postgres"
	events_service "github.com/Makiavelly/EventsApp/internal/features/events/service"
	events_transport_http "github.com/Makiavelly/EventsApp/internal/features/events/transport/http"
	health_service "github.com/Makiavelly/EventsApp/internal/features/health/service"
	health_transport_http "github.com/Makiavelly/EventsApp/internal/features/health/transport/http"
	participants_postgres_repository "github.com/Makiavelly/EventsApp/internal/features/participants_events/repository/postgres"
	participants_service "github.com/Makiavelly/EventsApp/internal/features/participants_events/service"
	participants_transport_http "github.com/Makiavelly/EventsApp/internal/features/participants_events/transport/http"
	users_postgres_repository "github.com/Makiavelly/EventsApp/internal/features/users/repository/postgres"
	users_service "github.com/Makiavelly/EventsApp/internal/features/users/service"
	users_transport_http "github.com/Makiavelly/EventsApp/internal/features/users/transport/http"
	web_fs_repository "github.com/Makiavelly/EventsApp/internal/features/web/repository/file_system"
	web_service "github.com/Makiavelly/EventsApp/internal/features/web/service"
	web_transport_http "github.com/Makiavelly/EventsApp/internal/features/web/transport/http"
	"go.uber.org/zap"

	_ "github.com/Makiavelly/EventsApp/docs"
)

// @title 		GoLang EventsApp API
// @version 	1.0
// @description Events Application REST-API scheme
// @BasePath 	/api/v1
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
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

	logger.Debug("initializing feature", zap.String("feature", "auth"))
	authConfig := core_auth.NewConfigMust()
	accessTokenManager := core_auth.NewAccessTokenManager(authConfig)
	refreshTokenManager := core_auth.NewRefreshTokenManager()
	authRepository := auth_postgres_repository.NewAuthRepository(pool)
	authService := auth_service.NewAuthService(
		usersService,
		authRepository,
		accessTokenManager,
		refreshTokenManager,
		authConfig.RefreshTokenTTL,
		pool,
	)
	authMiddleware := core_http_middleware.Authenticate(accessTokenManager, authService)
	authTransportHTTP := auth_transport_http.NewAuthHTTPHandler(
		authService,
		auth_transport_http.NewCookieConfigMust(),
	)
	rateLimitConfig := auth_transport_http.NewRateLimitConfigMust()
	authRateLimiter := core_http_middleware.NewRateLimiter(
		rateLimitConfig.Requests,
		rateLimitConfig.Window,
		rateLimitConfig.TrustProxy,
	)
	go runAuthSessionCleanup(ctx, authService, logger)

	logger.Debug("initializing feature", zap.String("feature", "events"))
	eventsRepository := events_postgres_repository.NewEventsRepository(pool)
	eventsService := events_service.NewEventsService(eventsRepository)
	eventsTransportHTTP := events_transport_http.NewEventsHTTPHandler(eventsService)

	logger.Debug("initializing feature", zap.String("feature", "participants_events"))
	participantsRepository := participants_postgres_repository.NewParticipantsRepository(pool)
	participantsService := participants_service.NewParticipantService(participantsRepository)
	participantsTransportHTTP := participants_transport_http.NewParticipantsHTTPHandler(participantsService)

	logger.Debug("initializing feature", zap.String("feature", "web"))
	webRepository := web_fs_repository.NewWebRepository()
	webService := web_service.NewWebService(webRepository)
	webTransportHTTP := web_transport_http.NewWebHTTPHandler(webService)

	logger.Debug("initializing feature", zap.String("feature", "health"))
	metrics := core_metrics.NewMetrics()
	healthService := health_service.NewHealthService(pool)
	healthTransportHTTP := health_transport_http.NewHealthHTTPHandler(
		healthService,
		metrics,
	)

	logger.Debug("initializing HTTP server")
	httpServer := core_http_server.NewHTTPServer(
		core_http_server.NewConfigMust(),
		logger,
		core_http_middleware.CORS(),
		core_http_middleware.RequestID(),
		core_http_middleware.Logger(logger),
		core_http_middleware.Metrics(metrics),
		core_http_middleware.Trace(),
		core_http_middleware.Panic(),
	)
	apiVersionRouter := core_http_server.NewAPIVersionRouter(core_http_server.ApiVersion1)
	apiVersionRouter.RegisterRoutes(usersTransportHTTP.Routes(authMiddleware)...)
	apiVersionRouter.RegisterRoutes(
		authTransportHTTP.Routes(authMiddleware, authRateLimiter.Middleware())...,
	)
	apiVersionRouter.RegisterRoutes(eventsTransportHTTP.Routes(authMiddleware)...)
	apiVersionRouter.RegisterRoutes(participantsTransportHTTP.Routes(authMiddleware)...)

	httpServer.RegisterAPIRouters(
		apiVersionRouter,
	)
	httpServer.RegisterRoutes(webTransportHTTP.Routes()...)
	httpServer.RegisterRoutes(healthTransportHTTP.Routes()...)
	httpServer.RegisterSwagger()

	if err := httpServer.Run(ctx); err != nil {
		logger.Error("HTTP server run error", zap.Error(err))
	}
}

type authSessionCleaner interface {
	CleanupSessions(ctx context.Context) error
}

func runAuthSessionCleanup(
	ctx context.Context,
	cleaner authSessionCleaner,
	logger *core_logger.Logger,
) {
	const interval = 24 * time.Hour

	cleanup := func() {
		if err := cleaner.CleanupSessions(ctx); err != nil {
			logger.Error("failed to cleanup authentication sessions", zap.Error(err))
		}
	}

	cleanup()

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			cleanup()
		}
	}
}
