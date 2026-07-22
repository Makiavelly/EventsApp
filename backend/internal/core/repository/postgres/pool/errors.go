package core_postgres_pool

import "errors"

var (
	ErrNoRows             = errors.New("no rows")
	ErrViolatesForeignKey = errors.New("violates foreign key")
	ErrViolatesUnique     = errors.New("violates unique constraint")
	ErrViolatesCheck      = errors.New("violates check constraint")
	ErrUnknown            = errors.New("unknown")
)
