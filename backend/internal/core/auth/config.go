package core_auth

import (
	"fmt"
	"os"
	"time"
)

const minimumSecretLength = 32

type Config struct {
	Secret          string
	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration
	Issuer          string
	Audience        string
}

func NewConfig() (Config, error) {
	secret := os.Getenv("AUTH_SECRET")
	if len([]byte(secret)) < minimumSecretLength {
		return Config{}, fmt.Errorf("AUTH_SECRET must contain at least %d bytes", minimumSecretLength)
	}

	accessTokenTTL, err := durationFromEnv("AUTH_ACCESS_TOKEN_TTL", 15*time.Minute)
	if err != nil {
		return Config{}, err
	}

	refreshTokenTTL, err := durationFromEnv("AUTH_REFRESH_TOKEN_TTL", 30*24*time.Hour)
	if err != nil {
		return Config{}, err
	}
	if accessTokenTTL >= refreshTokenTTL {
		return Config{}, fmt.Errorf("AUTH_ACCESS_TOKEN_TTL must be shorter than AUTH_REFRESH_TOKEN_TTL")
	}

	issuer := os.Getenv("AUTH_TOKEN_ISSUER")
	if issuer == "" {
		issuer = "eventsapp"
	}

	audience := os.Getenv("AUTH_TOKEN_AUDIENCE")
	if audience == "" {
		audience = "eventsapp-web"
	}

	return Config{
		Secret:          secret,
		AccessTokenTTL:  accessTokenTTL,
		RefreshTokenTTL: refreshTokenTTL,
		Issuer:          issuer,
		Audience:        audience,
	}, nil
}

func NewConfigMust() Config {
	config, err := NewConfig()
	if err != nil {
		panic(fmt.Errorf("get auth config: %w", err))
	}

	return config
}

func durationFromEnv(name string, defaultValue time.Duration) (time.Duration, error) {
	value := os.Getenv(name)
	if value == "" {
		return defaultValue, nil
	}

	duration, err := time.ParseDuration(value)
	if err != nil || duration <= 0 {
		return 0, fmt.Errorf("%s must be a positive Go duration: %q", name, value)
	}

	return duration, nil
}
