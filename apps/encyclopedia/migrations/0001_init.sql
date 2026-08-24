-- Encyclopedia catalogue: sources, locks, ingest runs, data versions
-- (docs/10-data-model.md).

CREATE TABLE sources (
  world_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  tier INTEGER NOT NULL CHECK (tier IN (1, 2, 3)),
  manifest TEXT NOT NULL,
  manifest_hash TEXT NOT NULL,
  cadence TEXT,
  PRIMARY KEY (world_id, source_id)
);

CREATE TABLE locks (
  world_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  artefact_key TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  pinned_at TEXT NOT NULL,
  pinned_by TEXT NOT NULL,
  supersedes TEXT,
  PRIMARY KEY (world_id, source_id, content_hash)
);

CREATE TABLE ingest_runs (
  ingest_id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  workflow_id TEXT,
  stage TEXT NOT NULL CHECK (
    stage IN ('fetch', 'verify', 'stage', 'load', 'derive')
  ),
  status TEXT NOT NULL,
  detail TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT
);

CREATE TABLE data_versions (
  data_version TEXT PRIMARY KEY,
  world_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  components TEXT NOT NULL
);
