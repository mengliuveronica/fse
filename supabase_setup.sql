-- Create EXTENSION for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the blocks table
CREATE TABLE blocks (
    id BIGSERIAL PRIMARY KEY,
    conditions JSONB NOT NULL,
    current_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create a single table for all survey data
CREATE TABLE survey_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condition TEXT NOT NULL,
    responses JSONB,
    submitted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Modify the survey_responses table
ALTER TABLE survey_responses
ADD COLUMN common_responses JSONB;

-- Create indexes for faster lookups
CREATE INDEX idx_survey_responses_condition ON survey_responses(condition);
CREATE INDEX idx_survey_responses_submitted ON survey_responses(submitted);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Create policies for blocks table
CREATE POLICY "Allow all access to blocks for all users" 
    ON blocks FOR ALL 
    USING (true)
    WITH CHECK (true);

-- Create policies for survey_responses table
CREATE POLICY "Allow all access to survey_responses for all users" 
    ON survey_responses FOR ALL
    USING (true)
    WITH CHECK (true);

-- Function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_survey_responses_updated_at
    BEFORE UPDATE ON survey_responses
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();