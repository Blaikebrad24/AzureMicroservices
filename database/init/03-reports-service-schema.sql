-- Reports service schema
-- Connects to reports_service_db

\c reports_service_db;

CREATE TABLE IF NOT EXISTS report (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    type            VARCHAR(50) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    parameters      JSONB DEFAULT '{}',
    result_path     VARCHAR(500),
    error_message   TEXT,
    generated_at    TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_report_status ON report(status);
CREATE INDEX idx_report_type ON report(type);
CREATE INDEX idx_report_created_at ON report(created_at);

-- Constraint to enforce valid status values
ALTER TABLE report ADD CONSTRAINT chk_report_status
    CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'));
