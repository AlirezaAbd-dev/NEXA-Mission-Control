-- Rename the former display branding without changing historical migration checksums.
UPDATE projects SET description = REPLACE(description, 'TaskFlow', 'Mission Control') WHERE description LIKE '%TaskFlow%';
UPDATE cards SET title = REPLACE(title, 'TaskFlow', 'Mission Control'), description = REPLACE(description, 'TaskFlow', 'Mission Control') WHERE title LIKE '%TaskFlow%' OR description LIKE '%TaskFlow%';
