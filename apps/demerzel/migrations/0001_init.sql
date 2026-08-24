-- Demerzel's audit log: append-only, never updated
-- (docs/10-data-model.md). A Second Foundation cron exports closed months
-- to R2 and prunes, keeping D1 small and the history permanent.

CREATE TABLE audit_log (
  audit_id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'operator', 'viewer')),
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  service TEXT NOT NULL,
  status INTEGER NOT NULL,
  latency_ms INTEGER,
  request_id TEXT NOT NULL
);

CREATE INDEX audit_by_actor ON audit_log (actor, audit_id DESC);
