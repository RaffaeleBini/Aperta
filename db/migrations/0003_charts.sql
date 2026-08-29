CREATE TABLE charts (
  id UUID DEFAULT uuid() PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES datasets(id),
  name VARCHAR NOT NULL,
  chart_type VARCHAR NOT NULL CHECK (chart_type IN ('bar', 'line', 'area', 'scatter', 'pie', 'heatmap')),
  config_json JSON NOT NULL,
  created_at TIMESTAMP DEFAULT current_timestamp,
  updated_at TIMESTAMP DEFAULT current_timestamp
);
