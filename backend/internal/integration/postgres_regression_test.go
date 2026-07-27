package integration_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	core_auth "github.com/Makiavelly/EventsApp/internal/core/auth"
	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_pgx_pool "github.com/Makiavelly/EventsApp/internal/core/repository/postgres/pool/pgx"
	core_http_middleware "github.com/Makiavelly/EventsApp/internal/core/transport/http/middleware"
	auth_postgres_repository "github.com/Makiavelly/EventsApp/internal/features/auth/repository/postgres"
	auth_service "github.com/Makiavelly/EventsApp/internal/features/auth/service"
	events_postgres_repository "github.com/Makiavelly/EventsApp/internal/features/events/repository/postgres"
	events_service "github.com/Makiavelly/EventsApp/internal/features/events/service"
	users_postgres_repository "github.com/Makiavelly/EventsApp/internal/features/users/repository/postgres"
	users_service "github.com/Makiavelly/EventsApp/internal/features/users/service"
)

const integrationTimeout = 15 * time.Second

type integrationHarness struct {
	pool          *core_pgx_pool.Pool
	users         *users_service.UsersService
	auth          *auth_service.AuthService
	events        *events_service.EventsService
	accessTokens  *core_auth.AccessTokenManager
	refreshTokens *core_auth.RefreshTokenManager
}

type failingSessionRevoker struct {
	err error
}

func (revoker failingSessionRevoker) RevokeUserSessions(
	context.Context,
	int,
) error {
	return revoker.err
}

func newIntegrationHarness(t *testing.T) *integrationHarness {
	t.Helper()

	database := os.Getenv("EVENTSAPP_TEST_POSTGRES_DB")
	if database == "" {
		t.Skip("EVENTSAPP_TEST_POSTGRES_DB is not configured")
	}
	if !strings.HasSuffix(database, "_test") {
		t.Fatalf(
			"refusing integration test against non-disposable database %q",
			database,
		)
	}

	config := core_pgx_pool.Config{
		Host:     envOrDefault("EVENTSAPP_TEST_POSTGRES_HOST", "127.0.0.1"),
		Port:     envOrDefault("EVENTSAPP_TEST_POSTGRES_PORT", "5432"),
		User:     envOrDefault("EVENTSAPP_TEST_POSTGRES_USER", "eventsapp"),
		Password: envOrDefault("EVENTSAPP_TEST_POSTGRES_PASSWORD", "eventsapp"),
		Database: database,
		Timeout:  5 * time.Second,
		SSLMode:  envOrDefault("EVENTSAPP_TEST_POSTGRES_SSL_MODE", "disable"),
	}

	ctx, cancel := context.WithTimeout(context.Background(), integrationTimeout)
	defer cancel()
	pool, err := core_pgx_pool.NewPool(ctx, config)
	if err != nil {
		t.Fatalf("connect disposable PostgreSQL: %v", err)
	}

	var connectedDatabase string
	if err := pool.QueryRow(ctx, "SELECT current_database();").Scan(
		&connectedDatabase,
	); err != nil {
		pool.Close()
		t.Fatalf("read current database: %v", err)
	}
	if connectedDatabase != database ||
		!strings.HasSuffix(connectedDatabase, "_test") {
		pool.Close()
		t.Fatalf("unsafe integration database %q", connectedDatabase)
	}

	resetDatabase(t, pool)
	t.Cleanup(func() {
		resetDatabase(t, pool)
		pool.Close()
	})

	authRepository := auth_postgres_repository.NewAuthRepository(pool)
	usersRepository := users_postgres_repository.NewUsersRepository(pool)
	usersService := users_service.NewUsersService(
		usersRepository,
		authRepository,
		pool,
	)
	accessTokens := core_auth.NewAccessTokenManager(core_auth.Config{
		Secret:          "integration-test-secret-at-least-32-bytes",
		AccessTokenTTL:  5 * time.Minute,
		RefreshTokenTTL: time.Hour,
		Issuer:          "eventsapp-integration",
		Audience:        "eventsapp-integration",
	})
	refreshTokens := core_auth.NewRefreshTokenManager()
	authService := auth_service.NewAuthService(
		usersService,
		authRepository,
		accessTokens,
		refreshTokens,
		time.Hour,
		pool,
	)
	eventsRepository := events_postgres_repository.NewEventsRepository(pool)

	return &integrationHarness{
		pool:          pool,
		users:         usersService,
		auth:          authService,
		events:        events_service.NewEventsService(eventsRepository, pool),
		accessTokens:  accessTokens,
		refreshTokens: refreshTokens,
	}
}

func resetDatabase(t *testing.T, pool *core_pgx_pool.Pool) {
	t.Helper()

	ctx, cancel := context.WithTimeout(context.Background(), integrationTimeout)
	defer cancel()
	if _, err := pool.Exec(ctx, `
		TRUNCATE TABLE
			eventsapp.auth_sessions,
			eventsapp.participants_events,
			eventsapp.events,
			eventsapp.users
		RESTART IDENTITY CASCADE;
	`); err != nil {
		t.Fatalf("reset disposable PostgreSQL: %v", err)
	}
}

func envOrDefault(name string, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}

func registerUser(
	t *testing.T,
	harness *integrationHarness,
	email string,
	password string,
) domain.Authentication {
	t.Helper()

	ctx, cancel := context.WithTimeout(context.Background(), integrationTimeout)
	defer cancel()
	authentication, err := harness.auth.Register(
		ctx,
		domain.NewUserRegistration("Integration user", email, password),
	)
	if err != nil {
		t.Fatalf("register integration user: %v", err)
	}
	return authentication
}

func sessionIdentity(
	t *testing.T,
	harness *integrationHarness,
	accessToken string,
) domain.AuthenticatedUser {
	t.Helper()

	identity, err := harness.accessTokens.Verify(accessToken)
	if err != nil {
		t.Fatalf("verify integration access token: %v", err)
	}
	return identity
}

func TestPasswordChangeRevokesEverySessionAndAllowsOnlyNewPassword(
	t *testing.T,
) {
	harness := newIntegrationHarness(t)
	first := registerUser(
		t,
		harness,
		"sessions@gmail.com",
		"old-secret",
	)

	ctx, cancel := context.WithTimeout(context.Background(), integrationTimeout)
	defer cancel()
	second, err := harness.auth.Login(
		ctx,
		"sessions@gmail.com",
		"old-secret",
	)
	if err != nil {
		t.Fatalf("create second session: %v", err)
	}

	newPassword := "new-secret"
	if _, err := harness.users.PatchUser(
		ctx,
		first.User.ID,
		first.User.ID,
		domain.NewUserPatch(
			domain.Nullable[string]{},
			domain.Nullable[string]{Set: true, Value: &newPassword},
		),
	); err != nil {
		t.Fatalf("patch password: %v", err)
	}

	for number, authentication := range []domain.Authentication{first, second} {
		identity := sessionIdentity(t, harness, authentication.AccessToken)
		if err := harness.auth.ValidateSession(
			ctx,
			identity.SessionID,
			identity.UserID,
		); !errors.Is(err, core_errors.ErrUnauthorized) {
			t.Fatalf(
				"old access session %d error = %v, want ErrUnauthorized",
				number+1,
				err,
			)
		}
		if _, err := harness.auth.Refresh(
			ctx,
			authentication.RefreshToken,
		); !errors.Is(err, core_errors.ErrUnauthorized) {
			t.Fatalf(
				"old refresh session %d error = %v, want ErrUnauthorized",
				number+1,
				err,
			)
		}

		recorder := httptest.NewRecorder()
		request := httptest.NewRequest(
			http.MethodGet,
			"/api/v1/auth/me",
			nil,
		)
		request.Header.Set(
			"Authorization",
			"Bearer "+authentication.AccessToken,
		)
		log, err := core_logger.NewLogger(core_logger.Config{
			Level:  "ERROR",
			Folder: t.TempDir(),
		})
		if err != nil {
			t.Fatalf("create test logger: %v", err)
		}
		handler := core_http_middleware.ChainMiddleware(
			http.HandlerFunc(func(
				responseWriter http.ResponseWriter,
				_ *http.Request,
			) {
				responseWriter.WriteHeader(http.StatusNoContent)
			}),
			core_http_middleware.Logger(log),
			core_http_middleware.Authenticate(
				harness.accessTokens,
				harness.auth,
			),
		)
		handler.ServeHTTP(recorder, request)
		log.Close()
		if recorder.Code != http.StatusUnauthorized {
			t.Fatalf(
				"old access token %d HTTP status = %d, want 401",
				number+1,
				recorder.Code,
			)
		}
	}

	if _, err := harness.auth.Login(
		ctx,
		"sessions@gmail.com",
		"old-secret",
	); !errors.Is(err, core_errors.ErrUnauthorized) {
		t.Fatalf("old password login error = %v, want ErrUnauthorized", err)
	}
	if _, err := harness.auth.Login(
		ctx,
		"sessions@gmail.com",
		newPassword,
	); err != nil {
		t.Fatalf("new password login error = %v", err)
	}
}

func TestNameOnlyPatchKeepsSessionsAndFailedPasswordPatchDoesNotRevoke(
	t *testing.T,
) {
	harness := newIntegrationHarness(t)
	authentication := registerUser(
		t,
		harness,
		"name-only@gmail.com",
		"old-secret",
	)
	identity := sessionIdentity(t, harness, authentication.AccessToken)
	name := "Renamed user"

	ctx, cancel := context.WithTimeout(context.Background(), integrationTimeout)
	defer cancel()
	if _, err := harness.users.PatchUser(
		ctx,
		authentication.User.ID,
		authentication.User.ID,
		domain.NewUserPatch(
			domain.Nullable[string]{Set: true, Value: &name},
			domain.Nullable[string]{},
		),
	); err != nil {
		t.Fatalf("name-only patch: %v", err)
	}
	if err := harness.auth.ValidateSession(
		ctx,
		identity.SessionID,
		identity.UserID,
	); err != nil {
		t.Fatalf("name-only patch revoked session: %v", err)
	}

	cancelledContext, cancelImmediately := context.WithCancel(
		context.Background(),
	)
	cancelImmediately()
	newPassword := "new-secret"
	if _, err := harness.users.PatchUser(
		cancelledContext,
		authentication.User.ID,
		authentication.User.ID,
		domain.NewUserPatch(
			domain.Nullable[string]{},
			domain.Nullable[string]{Set: true, Value: &newPassword},
		),
	); err == nil {
		t.Fatal("cancelled password patch unexpectedly succeeded")
	}
	if err := harness.auth.ValidateSession(
		ctx,
		identity.SessionID,
		identity.UserID,
	); err != nil {
		t.Fatalf("failed password patch revoked session: %v", err)
	}

	revokeError := errors.New("forced session revoke failure")
	rollbackService := users_service.NewUsersService(
		users_postgres_repository.NewUsersRepository(harness.pool),
		failingSessionRevoker{err: revokeError},
		harness.pool,
	)
	rolledBackPassword := "rolled-back-secret"
	if _, err := rollbackService.PatchUser(
		ctx,
		authentication.User.ID,
		authentication.User.ID,
		domain.NewUserPatch(
			domain.Nullable[string]{},
			domain.Nullable[string]{
				Set:   true,
				Value: &rolledBackPassword,
			},
		),
	); !errors.Is(err, revokeError) {
		t.Fatalf("revoke failure patch error = %v, want forced error", err)
	}
	if err := harness.auth.ValidateSession(
		ctx,
		identity.SessionID,
		identity.UserID,
	); err != nil {
		t.Fatalf("revoke failure transaction revoked session: %v", err)
	}
	if _, err := harness.auth.Login(
		ctx,
		"name-only@gmail.com",
		"old-secret",
	); err != nil {
		t.Fatalf("revoke failure transaction changed old password: %v", err)
	}
	if _, err := harness.auth.Login(
		ctx,
		"name-only@gmail.com",
		rolledBackPassword,
	); !errors.Is(err, core_errors.ErrUnauthorized) {
		t.Fatalf(
			"rolled-back password login error = %v, want ErrUnauthorized",
			err,
		)
	}
}

func TestConcurrentEventPatchesPreserveNonOverlappingChanges(t *testing.T) {
	harness := newIntegrationHarness(t)
	authentication := registerUser(
		t,
		harness,
		"events@gmail.com",
		"secret12",
	)
	description := "Original description"
	event, err := harness.events.CreateEvent(
		context.Background(),
		domain.NewEventUninitialized(
			authentication.User.ID,
			"Original title",
			&description,
			nil,
			nil,
		),
	)
	if err != nil {
		t.Fatalf("create event: %v", err)
	}

	title := "Concurrent title"
	updatedDescription := "Concurrent description"
	patches := []domain.EventPatch{
		domain.NewEventPatch(
			domain.Nullable[string]{Set: true, Value: &title},
			domain.Nullable[string]{},
			domain.Nullable[domain.EventLocation]{},
			domain.Nullable[time.Time]{},
		),
		domain.NewEventPatch(
			domain.Nullable[string]{},
			domain.Nullable[string]{
				Set:   true,
				Value: &updatedDescription,
			},
			domain.Nullable[domain.EventLocation]{},
			domain.Nullable[time.Time]{},
		),
	}

	start := make(chan struct{})
	results := make(chan error, len(patches))
	for _, patch := range patches {
		patch := patch
		go func() {
			<-start
			ctx, cancel := context.WithTimeout(
				context.Background(),
				integrationTimeout,
			)
			defer cancel()
			_, patchErr := harness.events.PatchEvent(
				ctx,
				event.ID,
				authentication.User.ID,
				patch,
			)
			results <- patchErr
		}()
	}
	close(start)

	for range patches {
		select {
		case patchErr := <-results:
			if patchErr != nil {
				t.Fatalf("concurrent patch error = %v", patchErr)
			}
		case <-time.After(integrationTimeout):
			t.Fatal("concurrent patch deadlocked")
		}
	}

	finalEvent, err := harness.events.GetEvent(context.Background(), event.ID)
	if err != nil {
		t.Fatalf("get patched event: %v", err)
	}
	if finalEvent.Title != title ||
		finalEvent.Description == nil ||
		*finalEvent.Description != updatedDescription {
		t.Fatalf(
			"concurrent patches lost data: title=%q description=%v",
			finalEvent.Title,
			finalEvent.Description,
		)
	}
}

func TestConcurrentSameFieldPatchAndDeleteCompleteWithoutDeadlock(
	t *testing.T,
) {
	harness := newIntegrationHarness(t)
	authentication := registerUser(
		t,
		harness,
		"event-races@gmail.com",
		"secret12",
	)

	createEvent := func(title string) domain.Event {
		t.Helper()
		event, err := harness.events.CreateEvent(
			context.Background(),
			domain.NewEventUninitialized(
				authentication.User.ID,
				title,
				nil,
				nil,
				nil,
			),
		)
		if err != nil {
			t.Fatalf("create event: %v", err)
		}
		return event
	}

	sameFieldEvent := createEvent("Same field")
	titles := []string{"First writer", "Second writer"}
	start := make(chan struct{})
	results := make(chan error, len(titles))
	for _, title := range titles {
		title := title
		go func() {
			<-start
			_, patchErr := harness.events.PatchEvent(
				context.Background(),
				sameFieldEvent.ID,
				authentication.User.ID,
				domain.NewEventPatch(
					domain.Nullable[string]{Set: true, Value: &title},
					domain.Nullable[string]{},
					domain.Nullable[domain.EventLocation]{},
					domain.Nullable[time.Time]{},
				),
			)
			results <- patchErr
		}()
	}
	close(start)
	awaitResults(t, results, len(titles))
	finalEvent, err := harness.events.GetEvent(
		context.Background(),
		sameFieldEvent.ID,
	)
	if err != nil {
		t.Fatalf("get same-field event: %v", err)
	}
	if finalEvent.Title != titles[0] && finalEvent.Title != titles[1] {
		t.Fatalf("same-field final title = %q", finalEvent.Title)
	}

	deleteRaceEvent := createEvent("Delete race")
	patchTitle := "Patched before delete"
	raceStart := make(chan struct{})
	raceResults := make(chan error, 2)
	go func() {
		<-raceStart
		_, patchErr := harness.events.PatchEvent(
			context.Background(),
			deleteRaceEvent.ID,
			authentication.User.ID,
			domain.NewEventPatch(
				domain.Nullable[string]{Set: true, Value: &patchTitle},
				domain.Nullable[string]{},
				domain.Nullable[domain.EventLocation]{},
				domain.Nullable[time.Time]{},
			),
		)
		raceResults <- patchErr
	}()
	go func() {
		<-raceStart
		raceResults <- harness.events.DeleteEvent(
			context.Background(),
			deleteRaceEvent.ID,
			authentication.User.ID,
		)
	}()
	close(raceStart)

	raceErrors := awaitResults(t, raceResults, 2)
	for _, raceError := range raceErrors {
		if raceError != nil &&
			!errors.Is(raceError, core_errors.ErrNotFound) {
			t.Fatalf("patch/delete race error = %v", raceError)
		}
	}
	if _, err := harness.events.GetEvent(
		context.Background(),
		deleteRaceEvent.ID,
	); !errors.Is(err, core_errors.ErrNotFound) {
		t.Fatalf("event survived delete race: %v", err)
	}

	cancelledContext, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := harness.events.PatchEvent(
		cancelledContext,
		sameFieldEvent.ID,
		authentication.User.ID,
		domain.EventPatch{},
	); err == nil {
		t.Fatal("cancelled event patch unexpectedly succeeded")
	}
}

func awaitResults(
	t *testing.T,
	results <-chan error,
	count int,
) []error {
	t.Helper()

	collected := make([]error, 0, count)
	deadline := time.NewTimer(integrationTimeout)
	defer deadline.Stop()
	for len(collected) < count {
		select {
		case result := <-results:
			collected = append(collected, result)
		case <-deadline.C:
			t.Fatalf(
				"timed out waiting for %d concurrent operations (received %d)",
				count,
				len(collected),
			)
		}
	}
	return collected
}
