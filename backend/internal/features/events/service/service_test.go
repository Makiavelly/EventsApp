package events_service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

type eventsRepositoryStub struct {
	event          domain.Event
	getEventsCalls int
	lockCalls      int
	patchCalls     int
}

func (*eventsRepositoryStub) CreateEvent(_ context.Context, event domain.Event) (domain.Event, error) {
	return event, nil
}
func (r *eventsRepositoryStub) GetEvents(context.Context, *float64, *float64, *int, *domain.EventBounds, *int, *int, bool, *int, *int) ([]domain.Event, error) {
	r.getEventsCalls++
	return nil, nil
}
func (*eventsRepositoryStub) DeleteExpiredEvents(context.Context) (int64, error) { return 0, nil }
func (r *eventsRepositoryStub) GetEvent(context.Context, int) (domain.Event, error) {
	return r.event, nil
}
func (r *eventsRepositoryStub) GetEventForUpdate(context.Context, int) (domain.Event, error) {
	r.lockCalls++
	return r.event, nil
}
func (*eventsRepositoryStub) DeleteEvent(context.Context, int) error { return nil }
func (r *eventsRepositoryStub) PatchEvent(_ context.Context, _ int, event domain.Event) (domain.Event, error) {
	r.patchCalls++
	return event, nil
}

type eventsTransactionManagerStub struct {
	calls int
}

func (s *eventsTransactionManagerStub) WithTransaction(
	ctx context.Context,
	operation func(context.Context) error,
) error {
	s.calls++
	return operation(ctx)
}

func TestPatchEventRejectsNonCreator(t *testing.T) {
	t.Parallel()

	repository := &eventsRepositoryStub{event: domain.NewEvent(1, 10, "Meetup", nil, nil, nil)}
	transactions := &eventsTransactionManagerStub{}
	service := NewEventsService(repository, transactions)
	title := "Updated"
	patch := domain.NewEventPatch(
		domain.Nullable[string]{Set: true, Value: &title},
		domain.Nullable[string]{},
		domain.Nullable[domain.EventLocation]{},
		domain.Nullable[time.Time]{},
	)

	_, err := service.PatchEvent(context.Background(), 1, 11, patch)
	if !errors.Is(err, core_errors.ErrForbidden) {
		t.Fatalf("PatchEvent() error = %v, want ErrForbidden", err)
	}
	if repository.patchCalls != 0 {
		t.Fatalf("PatchEvent() repository calls = %d", repository.patchCalls)
	}
	if transactions.calls != 1 || repository.lockCalls != 1 {
		t.Fatalf(
			"PatchEvent() transaction calls = %d, lock calls = %d; want 1, 1",
			transactions.calls,
			repository.lockCalls,
		)
	}
}

func TestGetEventsRejectsOversizedPageBeforeRepository(t *testing.T) {
	t.Parallel()

	repository := &eventsRepositoryStub{}
	service := NewEventsService(repository, &eventsTransactionManagerStub{})
	limit := domain.MaxPageLimit + 1

	_, err := service.GetEvents(context.Background(), nil, nil, nil, nil, nil, nil, false, &limit, nil)
	if !errors.Is(err, core_errors.ErrInvalidArgument) {
		t.Fatalf("GetEvents() error = %v, want ErrInvalidArgument", err)
	}
	if repository.getEventsCalls != 0 {
		t.Fatalf("GetEvents() repository calls = %d", repository.getEventsCalls)
	}
}
