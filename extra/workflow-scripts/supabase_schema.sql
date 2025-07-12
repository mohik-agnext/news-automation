-- AgNext News Intelligence Database Schema for Supabase
-- Run this script in your Supabase SQL Editor to create all necessary tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create sessions table for anonymous IP-based sessions
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on session_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON public.sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_ip_address ON public.sessions(ip_address);

-- Create bookmarks table
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL REFERENCES public.sessions(session_id) ON DELETE CASCADE,
    article_id VARCHAR(255) NOT NULL,
    article_url TEXT NOT NULL,
    article_title TEXT NOT NULL,
    article_source VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate bookmarks
ALTER TABLE public.bookmarks ADD CONSTRAINT unique_session_article 
    UNIQUE (session_id, article_id);

-- Create indexes for bookmarks
CREATE INDEX IF NOT EXISTS idx_bookmarks_session_id ON public.bookmarks(session_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_article_id ON public.bookmarks(article_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON public.bookmarks(created_at DESC);

-- Create articles table for persistent article storage (optional)
CREATE TABLE IF NOT EXISTS public.articles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    article_id VARCHAR(255) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    source VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    content TEXT,
    relevance_score DECIMAL(3,1) CHECK (relevance_score >= 0 AND relevance_score <= 10),
    quality_score DECIMAL(3,1) CHECK (quality_score >= 0 AND quality_score <= 10),
    display_score INTEGER CHECK (display_score >= 0 AND display_score <= 100),
    is_highly_relevant BOOLEAN DEFAULT FALSE,
    is_recent_news BOOLEAN DEFAULT FALSE,
    has_india_focus BOOLEAN DEFAULT FALSE,
    has_agnext_keywords BOOLEAN DEFAULT FALSE,
    has_client_mention BOOLEAN DEFAULT FALSE,
    word_count INTEGER,
    source_reliability VARCHAR(50),
    published_days_ago INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for articles
CREATE INDEX IF NOT EXISTS idx_articles_article_id ON public.articles(article_id);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON public.articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_display_score ON public.articles(display_score DESC);
CREATE INDEX IF NOT EXISTS idx_articles_source ON public.articles(source);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON public.articles(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON public.articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update session last_accessed
CREATE OR REPLACE FUNCTION update_session_accessed()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.sessions 
    SET last_accessed = NOW() 
    WHERE session_id = NEW.session_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update session access time when bookmarks are created
CREATE TRIGGER update_session_on_bookmark AFTER INSERT ON public.bookmarks
    FOR EACH ROW EXECUTE FUNCTION update_session_accessed();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Sessions: Allow access based on session_id match
CREATE POLICY "Users can access their own sessions" ON public.sessions
    FOR ALL USING (session_id = current_setting('app.current_session_id', true));

-- Bookmarks: Allow access based on session_id match
CREATE POLICY "Users can access their own bookmarks" ON public.bookmarks
    FOR ALL USING (session_id = current_setting('app.current_session_id', true));

-- Articles: Allow read access to all articles
CREATE POLICY "Anyone can read articles" ON public.articles
    FOR SELECT USING (true);

-- Articles: Allow insert/update for service role only
CREATE POLICY "Service role can manage articles" ON public.articles
    FOR ALL USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.sessions TO anon, authenticated;
GRANT ALL ON public.bookmarks TO anon, authenticated;
GRANT SELECT ON public.articles TO anon, authenticated;
GRANT ALL ON public.articles TO service_role;

-- Insert some sample data for testing (optional)
-- You can remove this section if you don't want sample data

-- Sample session
INSERT INTO public.sessions (session_id, ip_address) 
VALUES ('sample-session-127-0-0-1', '127.0.0.1'::inet) 
ON CONFLICT (session_id) DO NOTHING;

-- Sample bookmark
INSERT INTO public.bookmarks (session_id, article_id, article_url, article_title, article_source)
VALUES (
    'sample-session-127-0-0-1',
    'sample-article-1',
    'https://example.com/sample-article',
    'Sample AgNext Technology Article',
    'TechCrunch'
) ON CONFLICT (session_id, article_id) DO NOTHING;

COMMENT ON TABLE public.sessions IS 'Stores anonymous IP-based user sessions';
COMMENT ON TABLE public.bookmarks IS 'Stores user bookmarks linked to sessions';
COMMENT ON TABLE public.articles IS 'Stores articles with AgNext scoring and metadata';

COMMENT ON COLUMN public.sessions.session_id IS 'Unique session identifier generated from IP';
COMMENT ON COLUMN public.sessions.ip_address IS 'User IP address for session creation';
COMMENT ON COLUMN public.bookmarks.article_id IS 'Unique identifier for the article';
COMMENT ON COLUMN public.articles.display_score IS 'Combined score: (relevance + quality) * 10, capped at 100';
COMMENT ON COLUMN public.articles.relevance_score IS 'AgNext relevance score (0-10)';
COMMENT ON COLUMN public.articles.quality_score IS 'Article quality score (0-10)';

-- Create view for bookmark statistics
CREATE OR REPLACE VIEW public.bookmark_stats AS
SELECT 
    s.session_id,
    s.ip_address,
    COUNT(b.id) as total_bookmarks,
    MAX(b.created_at) as last_bookmark_created,
    s.created_at as session_created,
    s.last_accessed as session_last_accessed
FROM public.sessions s
LEFT JOIN public.bookmarks b ON s.session_id = b.session_id
GROUP BY s.session_id, s.ip_address, s.created_at, s.last_accessed;

COMMENT ON VIEW public.bookmark_stats IS 'Statistics view for session bookmark counts';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'AgNext News Intelligence database schema created successfully!';
    RAISE NOTICE 'Tables created: sessions, bookmarks, articles';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Add your Supabase URL and keys to .env.local';
    RAISE NOTICE '2. Update your application to use Supabase instead of file storage';
    RAISE NOTICE '3. Test the integration with the provided sample data';
END $$; 