CREATE TABLE dashboards (
  id UUID DEFAULT uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT current_timestamp,
  updated_at TIMESTAMP DEFAULT current_timestamp
);

CREATE TABLE dashboard_items (
  id UUID DEFAULT uuid() PRIMARY KEY,
  dashboard_id UUID NOT NULL REFERENCES dashboards(id),
  item_type VARCHAR NOT NULL CHECK (item_type IN ('chart', 'pivot')),
  item_id UUID NOT NULL,
  size VARCHAR NOT NULL DEFAULT 'medium' CHECK (size IN ('small', 'medium', 'large')),
  position INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT current_timestamp
);
