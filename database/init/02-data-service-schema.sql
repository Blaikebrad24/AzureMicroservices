-- Data service schema
-- Connects to data_service_db

\c data_service_db;

CREATE TABLE IF NOT EXISTS data_entity (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    category        VARCHAR(100),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_data_entity_category ON data_entity(category);
CREATE INDEX idx_data_entity_name ON data_entity(name);
CREATE INDEX idx_data_entity_created_at ON data_entity(created_at);
