ALTER TABLE eventsapp.events
    ADD COLUMN auto_delete_policy TEXT NOT NULL DEFAULT 'never',
    ADD COLUMN auto_delete_after_seconds INTEGER;

ALTER TABLE eventsapp.events
    ADD CONSTRAINT events_auto_delete_policy_valid
        CHECK (auto_delete_policy IN ('at_start', 'after_interval', 'never')),
    ADD CONSTRAINT events_auto_delete_configuration_valid
        CHECK (
            (auto_delete_policy = 'never' AND auto_delete_after_seconds IS NULL)
            OR (
                auto_delete_policy = 'at_start'
                AND date_meeting IS NOT NULL
                AND auto_delete_after_seconds IS NULL
            )
            OR (
                auto_delete_policy = 'after_interval'
                AND date_meeting IS NOT NULL
                AND auto_delete_after_seconds IS NOT NULL
                AND auto_delete_after_seconds BETWEEN 60 AND 31536000
            )
        );

CREATE INDEX events_auto_delete_due_idx
ON eventsapp.events (date_meeting)
WHERE auto_delete_policy <> 'never';

INSERT INTO eventsapp.participants_events (event_id, participant_id, status)
SELECT id, creator_id, 'planned'
FROM eventsapp.events
ON CONFLICT (event_id, participant_id) DO NOTHING;
