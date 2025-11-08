-- Enable required PostgreSQL extensions
-- This migration enables pgvector for embeddings and PostGIS for geospatial queries

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create comment
COMMENT ON EXTENSION vector IS 'Vector similarity search for embeddings';
COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';
