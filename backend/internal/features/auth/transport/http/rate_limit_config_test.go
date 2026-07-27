package auth_transport_http

import "testing"

func TestParseTrustedProxies(t *testing.T) {
	t.Parallel()

	proxies, err := parseTrustedProxies(
		"172.31.254.2, 2001:db8::1/128",
	)
	if err != nil {
		t.Fatalf("parseTrustedProxies() error = %v", err)
	}
	if len(proxies) != 2 {
		t.Fatalf("parseTrustedProxies() length = %d, want 2", len(proxies))
	}
	if got := proxies[0].String(); got != "172.31.254.2/32" {
		t.Fatalf("first proxy = %q, want exact IPv4 prefix", got)
	}
}

func TestParseTrustedProxiesRejectsInvalidEntry(t *testing.T) {
	t.Parallel()

	if _, err := parseTrustedProxies("172.31.254.2,not-an-ip"); err == nil {
		t.Fatal("parseTrustedProxies() accepted an invalid entry")
	}
}
