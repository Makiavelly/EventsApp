DROP TRIGGER IF EXISTS events_date_meeting_valid
ON eventsapp.events;

DROP FUNCTION IF EXISTS eventsapp.validate_event_date_meeting();

DROP INDEX IF EXISTS eventsapp.participants_events_participant_id_idx;
DROP INDEX IF EXISTS eventsapp.events_creator_id_idx;

ALTER TABLE eventsapp.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE eventsapp.participants_events
    DROP CONSTRAINT participants_events_event_id_fkey,
    ADD CONSTRAINT participants_events_event_id_fkey
        FOREIGN KEY (event_id)
        REFERENCES eventsapp.events(id),
    DROP CONSTRAINT participants_events_participant_id_fkey,
    ADD CONSTRAINT participants_events_participant_id_fkey
        FOREIGN KEY (participant_id)
        REFERENCES eventsapp.users(id);

ALTER TABLE eventsapp.events
    DROP CONSTRAINT events_creator_id_fkey,
    ADD CONSTRAINT events_creator_id_fkey
        FOREIGN KEY (creator_id)
        REFERENCES eventsapp.users(id);
