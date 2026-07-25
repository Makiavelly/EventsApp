package domain

import (
	"encoding/base64"
	"errors"
	"testing"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

func TestValidateEventMarkerAcceptsSupportedVariants(t *testing.T) {
	t.Parallel()

	onePixelPNG := "data:image/png;base64," + base64.StdEncoding.EncodeToString([]byte{
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
		0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
		0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
		0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
		0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41,
		0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0xf0,
		0x1f, 0x00, 0x05, 0x00, 0x01, 0xff, 0x89, 0x99,
		0x3d, 0x1d, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
		0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
	})

	tests := []EventMarker{
		{Kind: EventMarkerEmoji, Value: "🔥"},
		{Kind: EventMarkerEmoji, Value: "👨‍👩‍👧‍👦"},
		{Kind: EventMarkerColor, Value: "#B15B3E"},
		{Kind: EventMarkerImage, Value: onePixelPNG},
	}
	for _, marker := range tests {
		marker := marker
		t.Run(string(marker.Kind), func(t *testing.T) {
			t.Parallel()
			if err := ValidateEventMarker(&marker); err != nil {
				t.Fatalf("ValidateEventMarker() error = %v", err)
			}
		})
	}
}

func TestValidateEventMarkerRejectsInvalidValues(t *testing.T) {
	t.Parallel()

	tests := []EventMarker{
		{Kind: EventMarkerEmoji, Value: "  "},
		{Kind: EventMarkerColor, Value: "red"},
		{Kind: EventMarkerImage, Value: "data:image/svg+xml;base64,PHN2Zz4="},
		{Kind: EventMarkerKind("other"), Value: "x"},
	}
	for _, marker := range tests {
		if err := ValidateEventMarker(&marker); !errors.Is(err, core_errors.ErrInvalidArgument) {
			t.Fatalf("ValidateEventMarker(%+v) error = %v, want ErrInvalidArgument", marker, err)
		}
	}
}

func TestEventApplyPatchCanClearMarker(t *testing.T) {
	t.Parallel()

	event := NewEvent(1, 1, "Meetup", nil, nil, nil)
	event.Marker = &EventMarker{Kind: EventMarkerEmoji, Value: "⚽"}
	patch := EventPatch{Marker: Nullable[EventMarker]{Set: true}}

	if err := event.ApplyPatch(patch); err != nil {
		t.Fatalf("ApplyPatch() error = %v", err)
	}
	if event.Marker != nil {
		t.Fatalf("ApplyPatch() marker = %+v, want nil", event.Marker)
	}
}
