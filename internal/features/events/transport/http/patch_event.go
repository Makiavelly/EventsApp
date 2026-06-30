package events_transport_http

import (
	"fmt"
	"net/http"
	"time"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_request "github.com/Makiavelly/EventsApp/internal/core/transport/http/request"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
	core_http_types "github.com/Makiavelly/EventsApp/internal/core/transport/http/types"
)

type PatchEventRequest struct {
	Title       core_http_types.Nullable[string]                   `json:"title"`
	Description core_http_types.Nullable[string]                   `json:"description"`
	Location    core_http_types.Nullable[core_http_types.Location] `json:"location"`
	DateMeeting core_http_types.Nullable[time.Time]                `json:"date_meeting"`
}

func (r *PatchEventRequest) Validate() error {
	if r.Title.Set {
		if r.Title.Value == nil {
			return fmt.Errorf("'Title' can't be NULL")
		}

		titleLen := len([]rune(*r.Title.Value))
		if titleLen < 1 || titleLen > 50 {
			return fmt.Errorf("'Title' must be between 1 and 50 symbols")
		}
	}

	if r.Description.Set {
		if r.Description.Value != nil {
			descriptionLen := len([]rune(*r.Description.Value))
			if descriptionLen < 1 || descriptionLen > 300 {
				return fmt.Errorf("'Description' must be between 1 and 300 symbols")
			}
		}
	}

	if r.Location.Set {
		if r.Location.Value != nil {
			if r.Location.Value.Latitude < -90 || r.Location.Value.Latitude > 90 {
				return fmt.Errorf("'Latitude' must be between -90 and 90")
			}

			if r.Location.Value.Longitude < -180 || r.Location.Value.Longitude > 180 {
				return fmt.Errorf("'Longitude' must be between -180 and 180")
			}
		}
	}

	if r.DateMeeting.Set {
		if r.DateMeeting.Value != nil {
			var (
				now     = time.Now()
				maxDate = now.AddDate(1, 0, 0)
			)

			if r.DateMeeting.Value.Before(now) {
				return fmt.Errorf("'DateMeeting' must be in the future")
			}

			if r.DateMeeting.Value.After(maxDate) {
				return fmt.Errorf("'DateMeeting' must not be later than one year from now")
			}
		}
	}

	return nil
}

type PatchEventResponse EventDTOResponse

func (h *EventsHTTPHandler) PatchEvent(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHandler(log, rw)

	eventID, err := core_http_request.GetIntPathValue(r, "id")
	if err != nil {
		responseHandler.ErrorResponse(err, "failed to get eventID path value")

		return
	}

	var request PatchEventRequest
	if err := core_http_request.DecodeAndValidateRequest(r, &request); err != nil {
		responseHandler.ErrorResponse(err, "failed to decode and validate HTTP request")

		return
	}

	eventPatch := eventPatchFromRequest(request)

	eventDomain, err := h.eventsService.PatchEvent(ctx, eventID, eventPatch)
	if err != nil {
		responseHandler.ErrorResponse(err, "failed to patch task")

		return
	}

	response := PatchEventResponse(eventDTOFromDomain(eventDomain))

	responseHandler.JSONResponse(response, http.StatusOK)
}

func eventPatchFromRequest(request PatchEventRequest) domain.EventPatch {
	return domain.NewEventPatch(
		request.Title.ToDomain(),
		request.Description.ToDomain(),
		core_http_types.MapNullable(
			request.Location,
			func(location core_http_types.Location) domain.EventLocation {
				return location.ToDomain()
			},
		),
		request.DateMeeting.ToDomain(),
	)
}
