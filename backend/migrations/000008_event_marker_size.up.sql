ALTER TABLE eventsapp.events
ADD COLUMN marker_size TEXT NOT NULL DEFAULT 'normal',
ADD CONSTRAINT events_marker_size_valid CHECK (marker_size IN ('normal', 'large'));
