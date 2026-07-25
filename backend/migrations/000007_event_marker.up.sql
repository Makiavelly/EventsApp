ALTER TABLE eventsapp.events
ADD COLUMN marker_kind TEXT,
ADD COLUMN marker_value TEXT,
ADD CONSTRAINT events_marker_valid CHECK (
    (marker_kind IS NULL AND marker_value IS NULL)
    OR (
        marker_kind IS NOT NULL
        AND marker_value IS NOT NULL
        AND (
            (
                marker_kind = 'emoji'
                AND char_length(marker_value) BETWEEN 1 AND 64
                AND marker_value ~ '[^[:space:]]'
            )
            OR (
                marker_kind = 'color'
                AND marker_value ~ '^#[0-9A-Fa-f]{6}$'
            )
            OR (
                marker_kind = 'image'
                AND octet_length(marker_value) <= 349552
                AND marker_value ~ '^data:image/(png|jpeg|gif);base64,'
            )
        )
    )
);
