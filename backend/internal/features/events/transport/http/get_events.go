package events_transport_http

import (
	"fmt"
	"net/http"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
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
// @Param 		west query number false "Западная граница видимой области"
// @Param 		south query number false "Южная граница видимой области"
// @Param 		east query number false "Восточная граница видимой области"
// @Param 		north query number false "Северная граница видимой области"
// @Param 		limit query int false "Лимит событий"
// @Param 		offset query int false "Смещение событий"
// @Success 	200 {array} EventDTOResponse "Успешно полученный список событий"
// @Failure 	400 {object} core_http_response.ErrorResponse "Bad request"
// @Failure 	500 {object} core_http_response.ErrorResponse "Internal server error"
// @Router 		/events [get]
func (h *EventsHTTPHandler) GetEvents(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHandler(log, rw)

	userLatitude, userLongitude, radius, bounds, limit, offset, err := getEventsParams(r)
	if err != nil {
		responseHandler.ErrorResponse(
			err,
			"failed to get event query params",
		)

		return
	}

	eventsDomains, err := h.eventsService.GetEvents(
		ctx,
		userLatitude,
		userLongitude,
		radius,
		bounds,
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

func getEventsParams(
	r *http.Request,
) (*float64, *float64, *int, *domain.EventBounds, *int, *int, error) {
	const (
		latitudeQueryParamKey  = "latitude"
		longitudeQueryParamKey = "longitude"
		radiusQueryParamKey    = "radius"
		westQueryParamKey      = "west"
		southQueryParamKey     = "south"
		eastQueryParamKey      = "east"
		northQueryParamKey     = "north"
		limitQueryParamKey     = "limit"
		offsetQueryParamKey    = "offset"
	)

	latitude, err := core_http_request.GetFloatQueryParam(r, latitudeQueryParamKey)
	if err != nil {
		return nil, nil, nil, nil, nil, nil, fmt.Errorf("get 'latitude' query param: %w", err)
	}

	longitude, err := core_http_request.GetFloatQueryParam(r, longitudeQueryParamKey)
	if err != nil {
		return nil, nil, nil, nil, nil, nil, fmt.Errorf("get 'longitude' query param: %w", err)
	}

	radius, err := core_http_request.GetIntQueryParam(r, radiusQueryParamKey)
	if err != nil {
		return nil, nil, nil, nil, nil, nil, fmt.Errorf("get 'radius' query param: %w", err)
	}

	west, err := core_http_request.GetFloatQueryParam(r, westQueryParamKey)
	if err != nil {
		return nil, nil, nil, nil, nil, nil, fmt.Errorf("get 'west' query param: %w", err)
	}

	south, err := core_http_request.GetFloatQueryParam(r, southQueryParamKey)
	if err != nil {
		return nil, nil, nil, nil, nil, nil, fmt.Errorf("get 'south' query param: %w", err)
	}

	east, err := core_http_request.GetFloatQueryParam(r, eastQueryParamKey)
	if err != nil {
		return nil, nil, nil, nil, nil, nil, fmt.Errorf("get 'east' query param: %w", err)
	}

	north, err := core_http_request.GetFloatQueryParam(r, northQueryParamKey)
	if err != nil {
		return nil, nil, nil, nil, nil, nil, fmt.Errorf("get 'north' query param: %w", err)
	}

	hasAnyBound := west != nil || south != nil || east != nil || north != nil
	hasAllBounds := west != nil && south != nil && east != nil && north != nil
	if hasAnyBound && !hasAllBounds {
		return nil, nil, nil, nil, nil, nil, fmt.Errorf(
			"west, south, east and north must be either all set or all unset: %w",
			core_errors.ErrInvalidArgument,
		)
	}

	var bounds *domain.EventBounds
	if hasAllBounds {
		bounds = &domain.EventBounds{
			West:  *west,
			South: *south,
			East:  *east,
			North: *north,
		}
	}

	limit, err := core_http_request.GetIntQueryParam(r, limitQueryParamKey)
	if err != nil {
		return nil, nil, nil, nil, nil, nil, fmt.Errorf("get 'limit' query param: %w", err)
	}

	offset, err := core_http_request.GetIntQueryParam(r, offsetQueryParamKey)
	if err != nil {
		return nil, nil, nil, nil, nil, nil, fmt.Errorf("get 'offset' query param: %w", err)
	}

	return latitude, longitude, radius, bounds, limit, offset, nil
}
