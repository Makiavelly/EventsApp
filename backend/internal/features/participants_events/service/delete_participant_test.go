package participants_service

import (
	"context"
	"errors"
	"testing"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

type participantsRepositoryStub struct {
	deleteCalls int
}

func (*participantsRepositoryStub) CreateParticipant(context.Context, domain.Participant) (domain.Participant, error) {
	return domain.Participant{}, nil
}
func (r *participantsRepositoryStub) DeleteParticipant(context.Context, int, int) error {
	r.deleteCalls++
	return nil
}
func (*participantsRepositoryStub) GetParticipants(context.Context, *int, *int, *int) ([]domain.EventParticipant, error) {
	return nil, nil
}

type eventReaderStub struct{ event domain.Event }

func (s eventReaderStub) GetEvent(context.Context, int) (domain.Event, error) { return s.event, nil }

func TestDeleteParticipantRejectsEventCreator(t *testing.T) {
	t.Parallel()

	repository := &participantsRepositoryStub{}
	service := NewParticipantService(repository, eventReaderStub{event: domain.NewEvent(1, 42, "Meetup", nil, nil, nil)})

	err := service.DeleteParticipant(context.Background(), 1, 42)
	if !errors.Is(err, core_errors.ErrForbidden) {
		t.Fatalf("DeleteParticipant() error = %v, want ErrForbidden", err)
	}
	if repository.deleteCalls != 0 {
		t.Fatalf("DeleteParticipant() repository calls = %d, want 0", repository.deleteCalls)
	}
}
