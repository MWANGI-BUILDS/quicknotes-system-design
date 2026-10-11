# QuickNotes System Design

QuickNotes is a browser-based API client and a backend design proposal for a notes service intended to support one million users. The client demonstrates loading, creating, and deleting notes with the JSONPlaceholder practice API; the documents describe the production API, relational data model, and scalable service architecture.

## Run the API Client

Open `index.html` in a modern browser while connected to the internet. The client requests `https://jsonplaceholder.typicode.com/posts`; no package installation or backend server is required. JSONPlaceholder simulates create and delete responses but does not persist those changes, so reloads return its original sample data.

## Design Documents

- [API design](docs/api-design.md)
- [Data model](docs/data-model.md)
- [Architecture](docs/architecture.md)

## What I Learned

- A stable REST contract needs clear ownership rules, pagination, validation, and consistent error responses in addition to CRUD routes.
- Relational constraints and indexes express important data guarantees and support the actual access patterns, not just the entity list.
- Replicas and caches improve read capacity but require explicit handling for stale data and read-after-write consistency.
- A transactional outbox makes asynchronous work more reliable when a database write and queue publish must agree.
