package core_http_middleware

import (
	"testing"
	"time"
)

func TestRateLimiterAllow(t *testing.T) {
	t.Parallel()

	limiter := NewRateLimiter(2, time.Minute)
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
