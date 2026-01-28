-- Create databases for each service
-- The default database (POSTGRES_DB or 'postgres') is created automatically.
-- Keycloak, data-service, and reports-service each get their own database.

CREATE DATABASE keycloak_db;
CREATE DATABASE data_service_db;
CREATE DATABASE reports_service_db;
