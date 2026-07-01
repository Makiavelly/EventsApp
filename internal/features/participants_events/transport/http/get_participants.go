package participants_transport_http

import (
	"fmt"
	"net/http"

	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_request "github.com/Makiavelly/EventsApp/internal/core/transport/http/request"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
)

type GetParticipantsResponse []EventParticipantsDTOResponse

func (h *ParticipantsHTTPHandler) GetParticipantsEvents(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHandler(log, rw)

	eventID, limit, offset, err := getEventIDLimitOffsetParams(r)
	if err != nil {
		responseHandler.ErrorResponse(err, "failed to get 'event_id'/'limit'/'offset' query param")

		return
	}

	participantsDomains, err := h.participantsService.GetParticipants(
		ctx,
		eventID,
		limit,
		offset,
	)
	if err != nil {
		responseHandler.ErrorResponse(err, "failed to get participants")

		return
	}

	response := GetParticipantsResponse(eventParticipantsDTOsFromDomains(participantsDomains))

	responseHandler.JSONResponse(response, http.StatusOK)
}

func getEventIDLimitOffsetParams(r *http.Request) (*int, *int, *int, error) {
	const (
		eventIDQueryParamKey = "event_id"
		limitQueryParamKey   = "limit"
		offsetQueryParamKey  = "offset"
	)

	eventID, err := core_http_request.GetIntQueryParam(r, eventIDQueryParamKey)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("get 'event_id' query param: %w", err)
	}

	limit, err := core_http_request.GetIntQueryParam(r, limitQueryParamKey)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("get 'limit' query param: %w", err)
	}

	offset, err := core_http_request.GetIntQueryParam(r, offsetQueryParamKey)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("get 'offset' query param: %w", err)
	}

	return eventID, limit, offset, nil
}
