DROP INDEX IF EXISTS eventsapp.events_auto_delete_due_idx;

ALTER TABLE eventsapp.events
    DROP CONSTRAINT IF EXISTS events_auto_delete_configuration_valid,
    DROP CONSTRAINT IF EXISTS events_auto_delete_policy_valid,
    DROP COLUMN IF EXISTS auto_delete_after_seconds,
    DROP COLUMN IF EXISTS auto_delete_policy;
