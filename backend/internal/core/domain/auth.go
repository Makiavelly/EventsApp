package domain

import "time"

type RefreshSession struct {
	ID        string
	UserID    int
	TokenHash []byte
	ExpiresAt time.Time
}

type Authentication struct {
	User             User
	AccessToken      string
	RefreshToken     string
	RefreshExpiresAt time.Time
}
