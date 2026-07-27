package core_http_middleware

import (
	"net/http/httptest"
	"net/netip"
	"testing"
	"time"
)

func TestRateLimiterAllow(t *testing.T) {
	t.Parallel()

	limiter := NewRateLimiter(2, time.Minute, nil)
	now := time.Date(2026, time.July, 15, 12, 0, 0, 0, time.UTC)

	if allowed, _ := limiter.allow("client", now); !allowed {
		t.Fatal("first request was rejected")
	}
	if allowed, _ := limiter.allow("client", now.Add(time.Second)); !allowed {
		t.Fatal("second request was rejected")
	}
	if allowed, retryAfter := limiter.allow("client", now.Add(2*time.Second)); allowed || retryAfter != 58*time.Second {
		t.Fatalf("third request = (%v, %v), want rejected with 58s retry", allowed, retryAfter)
	}
	if allowed, _ := limiter.allow("other-client", now.Add(2*time.Second)); !allowed {
		t.Fatal("independent client was rejected")
	}
	if allowed, _ := limiter.allow("client", now.Add(time.Minute)); !allowed {
		t.Fatal("request after window reset was rejected")
	}
}

func TestRateLimitKeyIgnoresSpoofedHeadersFromDirectClient(t *testing.T) {
	t.Parallel()

	request := httptest.NewRequest("POST", "/api/v1/auth/login", nil)
	request.RemoteAddr = "203.0.113.7:43210"
	request.Header.Set("X-Forwarded-For", "198.51.100.90")
	request.Header.Set("X-Real-IP", "198.51.100.91")

	got := rateLimitKey(request, nil)
	want := "203.0.113.7:/api/v1/auth/login"
	if got != want {
		t.Fatalf("rateLimitKey() = %q, want %q", got, want)
	}
}

func TestRateLimitKeyUsesRealIPOnlyFromTrustedProxy(t *testing.T) {
	t.Parallel()

	request := httptest.NewRequest("POST", "/api/v1/auth/login", nil)
	request.RemoteAddr = "172.31.254.2:43210"
	request.Header.Set("X-Real-IP", "198.51.100.91")
	trusted := []netip.Prefix{
		netip.MustParsePrefix("172.31.254.2/32"),
	}

	got := rateLimitKey(request, trusted)
	want := "198.51.100.91:/api/v1/auth/login"
	if got != want {
		t.Fatalf("rateLimitKey() = %q, want %q", got, want)
	}
}

func TestRateLimitKeyIgnoresForwardedHeadersFromUntrustedPeer(t *testing.T) {
	t.Parallel()

	request := httptest.NewRequest("POST", "/api/v1/auth/login", nil)
	request.RemoteAddr = "172.31.254.9:43210"
	request.Header.Set("X-Forwarded-For", "198.51.100.90")
	request.Header.Set("X-Real-IP", "198.51.100.91")
	trusted := []netip.Prefix{
		netip.MustParsePrefix("172.31.254.2/32"),
	}

	got := rateLimitKey(request, trusted)
	want := "172.31.254.9:/api/v1/auth/login"
	if got != want {
		t.Fatalf("rateLimitKey() = %q, want %q", got, want)
	}
}

func TestRateLimitCannotBeBypassedByChangingForwardedHeaders(t *testing.T) {
	t.Parallel()

	limiter := NewRateLimiter(2, time.Minute, nil)
	now := time.Date(2026, time.July, 26, 12, 0, 0, 0, time.UTC)
	request := httptest.NewRequest("POST", "/api/v1/auth/login", nil)
	request.RemoteAddr = "203.0.113.7:43210"

	for attempt, spoofedAddress := range []string{
		"198.51.100.1",
		"198.51.100.2",
		"198.51.100.3",
	} {
		request.Header.Set("X-Forwarded-For", spoofedAddress)
		request.Header.Set("X-Real-IP", spoofedAddress)
		allowed, _ := limiter.allow(
			rateLimitKey(request, nil),
			now.Add(time.Duration(attempt)*time.Second),
		)
		if attempt < 2 && !allowed {
			t.Fatalf("attempt %d was unexpectedly rejected", attempt+1)
		}
		if attempt == 2 && allowed {
			t.Fatal("third attempt bypassed the accumulated rate limit")
		}
	}
}
