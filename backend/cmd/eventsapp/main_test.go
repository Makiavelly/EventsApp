package main

import (
	"context"
	"testing"

	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
)

type expiredEventCleanerStub struct {
	calls int
}

func (stub *expiredEventCleanerStub) CleanupExpiredEvents(
	context.Context,
) (int64, error) {
	stub.calls++
	return 0, nil
}

func TestExpiredEventCleanupRunsImmediatelyAndStopsOnCancellation(
	t *testing.T,
) {
	logger, err := core_logger.NewLogger(core_logger.Config{
		Level:  "ERROR",
		Folder: t.TempDir(),
	})
	if err != nil {
		t.Fatalf("create logger: %v", err)
	}
	t.Cleanup(logger.Close)

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	cleaner := &expiredEventCleanerStub{}

	runExpiredEventCleanup(ctx, cleaner, logger)

	if cleaner.calls != 1 {
		t.Fatalf("cleanup calls = %d, want 1", cleaner.calls)
	}
}
