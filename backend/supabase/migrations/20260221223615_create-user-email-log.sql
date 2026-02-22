-- Create user_email_log table to track sent emails and prevent duplicates.
-- ================================
-- 1. CREATE USER_EMAIL_LOG TABLE
-- ================================
CREATE TABLE IF NOT EXISTS public.user_email_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
    email_type VARCHAR(50) NOT NULL,
    email_address VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- 2. INDEXES for database performance. Should make queries easier for db by filtering by user_id, email_type, and status.
-- This is because the email log will grow over time, and we want to ensure that lookups for specific users and email types remain efficient.
-- ================================

CREATE INDEX IF NOT EXISTS idx_user_email_log_user_id
ON public.user_email_log(user_id);

CREATE INDEX IF NOT EXISTS idx_user_email_log_email_type
    ON public.user_email_log(email_type);

CREATE INDEX IF NOT EXISTS idx_user_email_log_status
    ON public.user_email_log(status);

-- need index for invoices, payments, etc later on

-- ================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ================================
ALTER TABLE public.user_email_log ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for API routes)
CREATE POLICY "Service role can manage email logs"
    ON public.user_email_log
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ================================
-- 4. comments for documentation and clarity. To understand the purpose of the table and its columns when querying the database schema.
-- ================================
COMMENT ON TABLE public.user_email_log IS 'Tracks all transactional emails sent to users for auditing and deduplication';
COMMENT ON COLUMN public.user_email_log.email_type IS 'Type of email: welcome, billing_confirmation, cancellation, etc.';
COMMENT ON COLUMN public.user_email_log.status IS 'Status: pending, sent, failed';

-- ================================
-- 5. VERIFY TABLE CREATED
-- ================================
SELECT 
    'user_email_log table created' as status,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_email_log'
ORDER BY ordinal_position;