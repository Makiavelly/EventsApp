package domain

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"regexp"
	"strings"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

const (
	EventMarkerEmojiMaxLength    = 64
	EventMarkerImageMaxBytes     = 256 * 1024
	EventMarkerImageMaxDimension = 512
)

type EventMarkerKind string
type EventMarkerSize string

const (
	EventMarkerEmoji EventMarkerKind = "emoji"
	EventMarkerColor EventMarkerKind = "color"
	EventMarkerImage EventMarkerKind = "image"

	EventMarkerNormal EventMarkerSize = "normal"
	EventMarkerLarge  EventMarkerSize = "large"
)

type EventMarker struct {
	Kind  EventMarkerKind
	Value string
}

var eventMarkerColorPattern = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)

func ValidateEventMarkerSize(size EventMarkerSize) error {
	if size != EventMarkerNormal && size != EventMarkerLarge {
		return fmt.Errorf("invalid event marker size: %w", core_errors.ErrInvalidArgument)
	}

	return nil
}

func ValidateEventMarker(marker *EventMarker) error {
	if marker == nil {
		return nil
	}

	switch marker.Kind {
	case EventMarkerEmoji:
		valueLength := len([]rune(marker.Value))
		if strings.TrimSpace(marker.Value) == "" ||
			valueLength > EventMarkerEmojiMaxLength {
			return fmt.Errorf(
				"invalid event marker emoji length: %d: %w",
				valueLength,
				core_errors.ErrInvalidArgument,
			)
		}
	case EventMarkerColor:
		if !eventMarkerColorPattern.MatchString(marker.Value) {
			return fmt.Errorf("invalid event marker color: %w", core_errors.ErrInvalidArgument)
		}
	case EventMarkerImage:
		if err := validateEventMarkerImage(marker.Value); err != nil {
			return err
		}
	default:
		return fmt.Errorf("invalid event marker kind: %w", core_errors.ErrInvalidArgument)
	}

	return nil
}

func validateEventMarkerImage(value string) error {
	mediaType, encoded, ok := strings.Cut(value, ";base64,")
	if !ok || (mediaType != "data:image/png" &&
		mediaType != "data:image/jpeg" &&
		mediaType != "data:image/gif") {
		return fmt.Errorf("invalid event marker image media type: %w", core_errors.ErrInvalidArgument)
	}

	maxEncodedLength := base64.StdEncoding.EncodedLen(EventMarkerImageMaxBytes)
	if encoded == "" || len(encoded) > maxEncodedLength {
		return fmt.Errorf("event marker image is too large: %w", core_errors.ErrInvalidArgument)
	}

	decoded, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil || len(decoded) > EventMarkerImageMaxBytes {
		return fmt.Errorf("invalid event marker image encoding: %w", core_errors.ErrInvalidArgument)
	}

	config, format, err := image.DecodeConfig(bytes.NewReader(decoded))
	if err != nil || "data:image/"+format != mediaType {
		return fmt.Errorf("invalid event marker image contents: %w", core_errors.ErrInvalidArgument)
	}
	if config.Width < 1 || config.Height < 1 ||
		config.Width > EventMarkerImageMaxDimension ||
		config.Height > EventMarkerImageMaxDimension {
		return fmt.Errorf("invalid event marker image dimensions: %w", core_errors.ErrInvalidArgument)
	}

	return nil
}
