# QuickNotes Data Model

QuickNotes uses four core entities. PostgreSQL stores one row per user, note, and tag; `note_tags` records the many-to-many association. IDs are UUIDs, and timestamps use UTC `timestamptz`.

## Entities and Relationships

- `users`: one user owns zero or more notes and creates zero or more personal tags (one-to-many).
- `notes`: each note belongs to exactly one user; `user_id` is a foreign key to `users.id`.
- `tags`: each tag belongs to exactly one user so private labels cannot leak across accounts.
- `note_tags`: each row connects one note and one tag; notes and tags have a many-to-many relationship through this join table. The composite primary key prevents duplicate assignments.

## Schema

```sql
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title varchar(100) NOT NULL,
    body text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name varchar(50) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, name)
);

CREATE TABLE note_tags (
    note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);

CREATE INDEX notes_user_updated_idx ON notes (user_id, updated_at DESC, id);
CREATE INDEX note_tags_tag_note_idx ON note_tags (tag_id, note_id);
```

The `notes_user_updated_idx` supports the common per-user, newest-first listing and its stable ID tie-breaker. The reverse `note_tags` index supports looking up notes by tag; the primary key already supports looking up tags for a note. Tag ownership must also be checked in the application or enforced through a composite ownership constraint when linking tags.

## Example Queries

List the newest notes for one user:

```sql
SELECT id, title, body, created_at, updated_at
FROM notes
WHERE user_id = $1
ORDER BY updated_at DESC, id
LIMIT $2;
```

Fetch a note and its tags with a JOIN:

```sql
SELECT n.id, n.title, n.body, t.id AS tag_id, t.name AS tag_name
FROM notes AS n
LEFT JOIN note_tags AS nt ON nt.note_id = n.id
LEFT JOIN tags AS t ON t.id = nt.tag_id AND t.user_id = n.user_id
WHERE n.id = $1 AND n.user_id = $2
ORDER BY t.name;
```

Create a note and return its generated identifiers and timestamps:

```sql
INSERT INTO notes (user_id, title, body)
VALUES ($1, $2, COALESCE($3, ''))
RETURNING id, title, body, created_at, updated_at;
```

Find notes carrying a named tag for a user:

```sql
SELECT n.id, n.title, n.updated_at
FROM notes AS n
JOIN note_tags AS nt ON nt.note_id = n.id
JOIN tags AS t ON t.id = nt.tag_id
WHERE n.user_id = $1 AND t.user_id = $1 AND t.name = $2
ORDER BY n.updated_at DESC, n.id;
```

## SQL vs. NoSQL

I would use PostgreSQL because users, notes, tags, and note-tag assignments have clear relational constraints, transactional mutations, and ownership rules. Foreign keys and unique constraints prevent orphaned or duplicated relationships, while indexes support the expected access patterns. Note bodies are modest text fields and the data does not require a schema-flexible document store at this scale; PostgreSQL can scale reads with replicas and can partition or shard later if measured growth requires it.