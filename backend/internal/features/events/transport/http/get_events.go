package events_transport_http

import (
	"fmt"
	"net/http"

	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_request "github.com/Makiavelly/EventsApp/internal/core/transport/http/request"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
)

type GetEventsResponse []EventDTOResponse

// GetEvents 	godoc
// @Summary 	Получить события
// @Description Получить список событий с опциональным поиском по локации и пагинацией
// @Tags 		events
// @Produce 	json
// @Param 		latitude query number false "Широта пользователя"
// @Param 		longitude query number false "Долгота пользователя"
// @Param 		radius query int false "Радиус поиска событий"
// @Param 		limit query int false "Лимит событий"
// @Param 		offset query int false "Смещение событий"
// @Success 	200 {array} GetEventsResponse "Успешно полученный список событий"
// @Failure 	400 {object} core_http_response.ErrorResponse "Bad request"
// @Failure 	404 {object} core_http_response.ErrorResponse "Event not found"
// @Failure 	500 {object} core_http_response.ErrorResponse "Internal server error"
// @Router 		/events [get]
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
