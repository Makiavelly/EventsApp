package domain

import (
	"testing"
	"time"
)

func TestEventApplyPatchAllowsOtherChangesAfterMeeting(t *testing.T) {
	t.Parallel()

	past := time.Now().Add(-time.Hour)
	event := NewEvent(1, 1, "Old title", nil, nil, &past)
	newTitle := "Updated title"
	patch := NewEventPatch(
		Nullable[string]{Set: true, Value: &newTitle},
		Nullable[string]{},
		Nullable[EventLocation]{},
		Nullable[time.Time]{},
	)

	if err := event.ApplyPatch(patch); err != nil {
		t.Fatalf("ApplyPatch() error = %v", err)
	}
	if event.Title != newTitle || event.DateMeeting != &past {
		t.Fatalf("ApplyPatch() event = %+v", event)
	}
}

func TestEventAutoDeleteAfterIntervalRequiresDateAndInterval(t *testing.T) {
	t.Parallel()

	event := NewEventUninitializedWithPolicy(
		1,
		"Meetup",
		nil,
		nil,
		nil,
		EventAutoDeleteAfterInterval,
		nil,
	)

	if err := event.Validate(); err == nil {
		t.Fatal("Validate() error = nil, want auto-delete configuration error")
	}

	future := time.Now().Add(time.Hour)
	interval := 7200
	event.DateMeeting = &future
	event.AutoDeleteAfterSeconds = &interval
	if err := event.Validate(); err != nil {
		t.Fatalf("Validate() unexpected error = %v", err)
	}
}
