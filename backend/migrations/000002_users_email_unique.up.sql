CREATE UNIQUE INDEX users_email_lower_unique
ON eventsapp.users (lower(email));
