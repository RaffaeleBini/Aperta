ALTER TABLE datasets ADD COLUMN working_table_name VARCHAR;

CREATE TABLE transformations (
  id UUID DEFAULT uuid() PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES datasets(id),
  step_type VARCHAR NOT NULL CHECK (step_type IN (
    'rename_column', 'drop_column', 'change_type', 'filter_rows',
    'calculated_column', 'group_by', 'join', 'split_column',
    'combine_columns', 'fill_nulls', 'drop_nulls'
  )),
  params_json JSON NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT current_timestamp,
  updated_at TIMESTAMP DEFAULT current_timestamp
);
