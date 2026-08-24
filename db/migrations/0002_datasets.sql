CREATE TABLE datasets (
  id UUID DEFAULT uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  description VARCHAR,
  source_type VARCHAR NOT NULL CHECK (source_type IN ('file_csv', 'file_json', 'file_excel', 'api_generic', 'api_eurostat')),
  data_source_id UUID REFERENCES data_sources(id),
  table_name VARCHAR NOT NULL UNIQUE,
  row_count BIGINT,
  column_count INTEGER,
  schema_json JSON,
  raw_origin_json JSON,
  imported_at TIMESTAMP DEFAULT current_timestamp,
  updated_at TIMESTAMP DEFAULT current_timestamp
);
