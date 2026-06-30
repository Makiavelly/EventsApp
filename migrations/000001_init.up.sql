CREATE SCHEMA eventsapp;
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE eventsapp.users (
    id              SERIAL                      PRIMARY KEY,
    name            TEXT            NOT NULL    CHECK (char_length(name) BETWEEN 1 AND 100),
    email           TEXT            NOT NULL    CHECK (lower(email) ~ '^[^@\s]+@(mail\.ru|gmail\.com)$' AND char_length(email) BETWEEN 9 AND 100),
    password        TEXT            NOT NULL    CHECK (char_length(password) BETWEEN 6 AND 100)
);


CREATE TABLE eventsapp.events (
    id              SERIAL                      PRIMARY KEY,
    creator_id      BIGINT          NOT NULL    REFERENCES eventsapp.users(id),
    title           TEXT            NOT NULL    CHECK (char_length(title) BETWEEN 1 AND 50),
    description     VARCHAR(300),               CHECK (char_length(description) BETWEEN 1 AND 300),
    location        GEOGRAPHY(POINT, 4326),
    date_meeting    TIMESTAMPTZ
);

CREATE INDEX events_location_gix
ON eventsapp.events
USING GIST (location);

CREATE TABLE eventsapp.participants_events (
    event_id        BIGINT          NOT NULL    REFERENCES eventsapp.events(id),
    participant_id  BIGINT          NOT NULL    REFERENCES eventsapp.users(id),

    PRIMARY KEY (event_id, participant_id),

    status          TEXT            NOT NULL    DEFAULT 'planned'   CHECK (status IN ('planned', 'underway', 'over'))
);