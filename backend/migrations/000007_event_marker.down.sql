ALTER TABLE eventsapp.events
DROP CONSTRAINT events_marker_valid,
DROP COLUMN marker_value,
DROP COLUMN marker_kind;
