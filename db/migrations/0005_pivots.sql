CREATE TABLE pivots (
  id UUID DEFAULT uuid() PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES datasets(id),
  name VARCHAR NOT NULL,
  config_json JSON NOT NULL,
  created_at TIMESTAMP DEFAULT current_timestamp,
  updated_at TIMESTAMP DEFAULT current_timestamp
);
