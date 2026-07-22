ALTER TABLE eventsapp.participants_events
    ADD COLUMN status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'underway', 'over'));
