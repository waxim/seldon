-- Vault: scenarios, questions, runs, outcomes (docs/10-data-model.md).

CREATE TABLE scenarios (
  scenario_hash TEXT PRIMARY KEY,
  world_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  version INTEGER NOT NULL,
  doc TEXT NOT NULL,
  extends TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'retired')),
  created_at TEXT NOT NULL,
  UNIQUE (world_id, slug, version)
);

CREATE TABLE questions (
  world_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  version INTEGER NOT NULL,
  doc TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (world_id, slug, version)
);

CREATE TABLE runs (
  run_id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL,
  population_id TEXT NOT NULL,
  scenario_hash TEXT NOT NULL,
  engine_version TEXT NOT NULL,
  question_slug TEXT NOT NULL,
  question_version INTEGER NOT NULL,
  seed INTEGER NOT NULL,
  iterations INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('queued', 'compiling', 'running', 'aggregating', 'done', 'failed')
  ),
  coordinator_id TEXT,
  artefact_prefix TEXT,
  created_at TEXT NOT NULL,
  finished_at TEXT
);

CREATE INDEX runs_by_question
  ON runs (world_id, question_slug, question_version, run_id DESC);

CREATE TABLE outcomes (
  outcome_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs (run_id),
  headline TEXT NOT NULL,
  caveat_ledger TEXT NOT NULL,
  artefact_keys TEXT NOT NULL,
  revealed_at TEXT NOT NULL
);
