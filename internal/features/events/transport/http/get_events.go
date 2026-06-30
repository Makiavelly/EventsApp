package events_transport_http

import (
	"fmt"
	"net/http"

	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_request "github.com/Makiavelly/EventsApp/internal/core/transport/http/request"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
)

type GetEventsResponse []EventDTOResponse

func (h *EventsHTTPHandler) GetEvents(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHandler(log, rw)

	userLatitude, userLongitude, radius, limit, offset, err := getLocationRadiusLimitOffsetParams(r)
	if err != nil {
		responseHandler.ErrorResponse(
			err,
			"failed to get latitude/longitude/radius/limit/offset query params",
		)

		return
	}

	eventsDomains, err := h.eventsService.GetEvents(
		ctx,
		userLatitude,
		userLongitude,
		radius,
		limit,
		offset,
	)
	if err != nil {
		responseHandler.ErrorResponse(err, "failed to get events")

		return
	}

	response := GetEventsResponse(eventDTOsFromDomains(eventsDomains))

	responseHandler.JSONResponse(response, http.StatusOK)
}

func getLocationRadiusLimitOffsetParams(r *http.Request) (*float64, *float64, *int, *int, *int, error) {
	const (
		latitudeQueryParamKey  = "latitude"
		longitudeQueryParamKey = "longitude"
		radiusQueryParamKey    = "radius"
		limitQueryParamKey     = "limit"
		offsetQueryParamKey    = "offset"
	)

	latitude, err := core_http_request.GetFloatQueryParam(r, latitudeQueryParamKey)
	if err != nil {
		return nil, nil, nil, nil, nil, fmt.Errorf("get 'latitude' query param: %w", err)
	}

	longitude, err := core_http_request.GetFloatQueryParam(r, longitudeQueryParamKey)
	if err != nil {
		return nil, nil, nil, nil, nil, fmt.Errorf("get 'longitude' query param: %w", err)
	}

	radius, err := core_http_request.GetIntQueryParam(r, radiusQueryParamKey)
	if err != nil {
		return nil, nil, nil, nil, nil, fmt.Errorf("get 'radius' query param: %w", err)
	}

	limit, err := core_http_request.GetIntQueryParam(r, limitQueryParamKey)
	if err != nil {
		return nil, nil, nil, nil, nil, fmt.Errorf("get 'limit' query param: %w", err)
	}

	offset, err := core_http_request.GetIntQueryParam(r, offsetQueryParamKey)
	if err != nil {
		return nil, nil, nil, nil, nil, fmt.Errorf("get 'offset' query param: %w", err)
	}

	return latitude, longitude, radius, limit, offset, nil
}
