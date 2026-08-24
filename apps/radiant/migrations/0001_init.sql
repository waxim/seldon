-- Radiant registry: worlds, epochs, forks, layers (docs/10-data-model.md).
-- Migrations are append-only; an applied migration is never edited.

CREATE TABLE worlds (
  world_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  config TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE epochs (
  epoch_id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL REFERENCES worlds (world_id),
  full_hash TEXT NOT NULL,
  data_version TEXT NOT NULL,
  synth_config TEXT NOT NULL,
  seed INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('synthesising', 'validating', 'live', 'superseded', 'failed')
  ),
  snapshot_prefix TEXT,
  validation TEXT,
  published_at TEXT
);

CREATE INDEX epochs_live ON epochs (world_id, status, published_at DESC);

CREATE TABLE forks (
  fork_id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL REFERENCES worlds (world_id),
  epoch_id TEXT NOT NULL REFERENCES epochs (epoch_id),
  name TEXT NOT NULL,
  seed INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  skews TEXT NOT NULL
);

CREATE TABLE layers (
  world_id TEXT NOT NULL REFERENCES worlds (world_id),
  layer_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('base', 'modelled', 'contextual')),
  definition TEXT NOT NULL,
  holdout TEXT,
  PRIMARY KEY (world_id, layer_id)
);

CREATE TABLE epoch_layers (
  epoch_id TEXT NOT NULL REFERENCES epochs (epoch_id),
  layer_id TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  PRIMARY KEY (epoch_id, layer_id)
);

-- The first world. Its config fills out with P1's spine.
INSERT INTO worlds (world_id, name, config, created_at)
VALUES (
  'uk',
  'United Kingdom',
  '{"adminLevels":{"L1":"nation","L2":"region","L3":"constituency","L4":"output-area"},"shardLevel":"L3"}',
  '2026-01-01T00:00:00Z'
);
