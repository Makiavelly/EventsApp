package core_http_middleware

import (
	"fmt"
	"net"
	"net/http"
	"net/netip"
	"strconv"
	"strings"
	"sync"
	"time"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
)

type rateLimitEntry struct {
	windowStarted time.Time
	requests      int
}

type RateLimiter struct {
	mu             sync.Mutex
	entries        map[string]rateLimitEntry
	maxRequests    int
	window         time.Duration
	now            func() time.Time
	trustedProxies []netip.Prefix
}

const maxRateLimitEntries = 10_000

func NewRateLimiter(
	maxRequests int,
	window time.Duration,
	trustedProxies []netip.Prefix,
) *RateLimiter {
	if maxRequests <= 0 {
		panic("rate limit max requests must be positive")
	}
	if window <= 0 {
		panic("rate limit window must be positive")
	}

	limiter := &RateLimiter{
		entries:        make(map[string]rateLimitEntry),
		maxRequests:    maxRequests,
		window:         window,
		now:            time.Now,
		trustedProxies: append([]netip.Prefix(nil), trustedProxies...),
	}

	return limiter
}

func (l *RateLimiter) Middleware() Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {
			allowed, retryAfter := l.allow(
				rateLimitKey(r, l.trustedProxies),
				l.now(),
			)
			if !allowed {
				retryAfterSeconds := int(
					(retryAfter + time.Second - 1) / time.Second,
				)
				rw.Header().Set(
					"Retry-After",
					strconv.Itoa(max(1, retryAfterSeconds)),
				)
				handler := core_http_response.NewHTTPResponseHandler(
					core_logger.FromContext(r.Context()),
					rw,
				)
				handler.ErrorResponse(
					fmt.Errorf("rate limit exceeded: %w", core_errors.ErrTooManyRequests),
					"too many authentication attempts",
				)

				return
			}

			next.ServeHTTP(rw, r)
		})
	}
}

func (l *RateLimiter) allow(key string, now time.Time) (bool, time.Duration) {
	l.mu.Lock()
	defer l.mu.Unlock()

	entry, exists := l.entries[key]
	if !exists || now.Sub(entry.windowStarted) >= l.window {
		if !exists && len(l.entries) >= maxRateLimitEntries {
			l.removeExpired(now)
			if len(l.entries) >= maxRateLimitEntries {
				l.removeOldest()
			}
		}
		l.entries[key] = rateLimitEntry{
			windowStarted: now,
			requests:      1,
		}
		l.removeExpired(now)

		return true, 0
	}

	if entry.requests >= l.maxRequests {
		return false, l.window - now.Sub(entry.windowStarted)
	}

	entry.requests++
	l.entries[key] = entry

	return true, 0
}

func (l *RateLimiter) removeOldest() {
	var (
		oldestKey     string
		oldestStarted time.Time
	)
	for key, entry := range l.entries {
		if oldestKey == "" || entry.windowStarted.Before(oldestStarted) {
			oldestKey = key
			oldestStarted = entry.windowStarted
		}
	}
	if oldestKey != "" {
		delete(l.entries, oldestKey)
	}
}

func (l *RateLimiter) removeExpired(now time.Time) {
	for key, entry := range l.entries {
		if now.Sub(entry.windowStarted) >= l.window {
			delete(l.entries, key)
		}
	}
}

func rateLimitKey(r *http.Request, trustedProxies []netip.Prefix) string {
	peerAddress := remoteIP(r.RemoteAddr)
	address := peerAddress

	if isTrustedProxy(peerAddress, trustedProxies) {
		if forwardedAddress, err := netip.ParseAddr(
			strings.TrimSpace(r.Header.Get("X-Real-IP")),
		); err == nil {
			address = forwardedAddress.Unmap().String()
		}
	}

	if address == "" {
		address = r.RemoteAddr
	}

	return address + ":" + r.URL.Path
}

func remoteIP(remoteAddress string) string {
	address, _, err := net.SplitHostPort(remoteAddress)
	if err != nil {
		address = remoteAddress
	}

	parsed, err := netip.ParseAddr(strings.TrimSpace(address))
	if err != nil {
		return ""
	}

	return parsed.Unmap().String()
}

func isTrustedProxy(address string, trustedProxies []netip.Prefix) bool {
	parsed, err := netip.ParseAddr(address)
	if err != nil {
		return false
	}
	parsed = parsed.Unmap()

	for _, trustedProxy := range trustedProxies {
		if trustedProxy.Contains(parsed) {
			return true
		}
	}

	return false
}
