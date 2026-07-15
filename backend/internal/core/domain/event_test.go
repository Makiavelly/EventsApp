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
