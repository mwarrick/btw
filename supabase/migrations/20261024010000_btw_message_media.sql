-- MMS: the links voip.ms sends for a text's attachments ({MEDIA} in the
-- callback URL), kept with the message and shown in /admin. Null for a
-- plain text.
alter table btw_messages add column media text[];
