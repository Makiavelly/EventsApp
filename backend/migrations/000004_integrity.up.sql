ALTER TABLE eventsapp.events
    DROP CONSTRAINT events_creator_id_fkey,
    ADD CONSTRAINT events_creator_id_fkey
        FOREIGN KEY (creator_id)
        REFERENCES eventsapp.users(id)
        ON DELETE CASCADE;

ALTER TABLE eventsapp.participants_events
    DROP CONSTRAINT participants_events_event_id_fkey,
    ADD CONSTRAINT participants_events_event_id_fkey
        FOREIGN KEY (event_id)
        REFERENCES eventsapp.events(id)
        ON DELETE CASCADE,
    DROP CONSTRAINT participants_events_participant_id_fkey,
    ADD CONSTRAINT participants_events_participant_id_fkey
        FOREIGN KEY (participant_id)
        REFERENCES eventsapp.users(id)
        ON DELETE CASCADE;

ALTER TABLE eventsapp.users
    DROP CONSTRAINT users_email_key;

CREATE INDEX events_creator_id_idx
ON eventsapp.events (creator_id);

CREATE INDEX participants_events_participant_id_idx
ON eventsapp.participants_events (participant_id);

CREATE OR REPLACE FUNCTION eventsapp.validate_event_date_meeting()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'UPDATE'
        AND NEW.date_meeting IS NOT DISTINCT FROM OLD.date_meeting
    THEN
        RETURN NEW;
    END IF;

    IF NEW.date_meeting IS NOT NULL
        AND (
            NEW.date_meeting <= CURRENT_TIMESTAMP
            OR NEW.date_meeting > CURRENT_TIMESTAMP + INTERVAL '1 year'
        )
    THEN
        RAISE EXCEPTION 'date_meeting must be in the future and no later than one year'
            USING ERRCODE = '23514',
                  CONSTRAINT = 'events_date_meeting_valid';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER events_date_meeting_valid
BEFORE INSERT OR UPDATE OF date_meeting
ON eventsapp.events
FOR EACH ROW
EXECUTE FUNCTION eventsapp.validate_event_date_meeting();
