-- Cleanup Script: Remove Sample Data and Fix RLS Policies
-- Run this in your Supabase SQL Editor to ensure only real data

-- 1. Remove any sample sessions and bookmarks
DELETE FROM bookmarks WHERE session_id LIKE '%sample%';
DELETE FROM sessions WHERE session_id LIKE '%sample%';

-- 2. Remove any test articles 
DELETE FROM articles WHERE title LIKE '%sample%' OR title LIKE '%test%';

-- 3. Clean up any other potential test data
DELETE FROM sessions WHERE ip_address = '127.0.0.1'::inet;
DELETE FROM bookmarks WHERE article_id LIKE '%sample%' OR article_id LIKE '%test%';

-- 4. Temporarily disable RLS to allow shared session creation
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks DISABLE ROW LEVEL SECURITY;

-- 5. Create the shared team session
INSERT INTO sessions (session_id, ip_address) 
VALUES ('shared-team-bookmarks', '0.0.0.0'::inet)
ON CONFLICT (session_id) DO NOTHING;

-- 6. Re-enable RLS but with updated policies for shared access
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- 7. Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own session" ON sessions;
DROP POLICY IF EXISTS "Users can create own session" ON sessions;
DROP POLICY IF EXISTS "Users can update own session" ON sessions;
DROP POLICY IF EXISTS "Users can view own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can create own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON bookmarks;

-- 8. Create more permissive policies for shared team environment
CREATE POLICY "Allow all session access" 
ON sessions FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all bookmark access" 
ON bookmarks FOR ALL 
USING (true) 
WITH CHECK (true);

-- 9. Verify clean state
SELECT 'Sessions' as table_name, count(*) as count FROM sessions
UNION ALL
SELECT 'Bookmarks' as table_name, count(*) as count FROM bookmarks  
UNION ALL
SELECT 'Articles' as table_name, count(*) as count FROM articles;

-- 10. Show the shared session
SELECT 'Shared session:' as info, session_id, ip_address, created_at 
FROM sessions 
WHERE session_id = 'shared-team-bookmarks'; 