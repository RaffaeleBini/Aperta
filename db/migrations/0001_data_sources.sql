CREATE TABLE data_sources (
  id UUID DEFAULT uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  kind VARCHAR NOT NULL CHECK (kind IN ('generic_rest_json', 'generic_csv', 'eurostat')),
  config_json JSON NOT NULL,
  created_at TIMESTAMP DEFAULT current_timestamp,
  updated_at TIMESTAMP DEFAULT current_timestamp
);
