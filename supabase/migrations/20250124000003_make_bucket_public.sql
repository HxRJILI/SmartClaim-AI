-- Make ticket_attachments bucket public to allow downloads via publicUrl
update storage.buckets
set public = true
where id = 'ticket_attachments';
