"""Admin section, RBAC, data sources, dynamic schedules, and OpenRouter AI config.

Revision ID: 0012_admin_system_control
Revises: 0011_user_chart_data
"""
from alembic import op

revision = "0012_admin_system_control"
down_revision = "0011_user_chart_data"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Extend Users table for Role-Based Access Control (RBAC) - single statements
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ")

    # 2. Data Sources Registry & Connector Settings
    op.execute("""
        CREATE TABLE IF NOT EXISTS data_sources (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(128) NOT NULL,
            category VARCHAR(64) NOT NULL,
            priority INT NOT NULL DEFAULT 1,
            is_enabled BOOLEAN NOT NULL DEFAULT true,
            rate_limit_delay_ms INT DEFAULT 500,
            timeout_sec INT DEFAULT 30,
            health_status VARCHAR(32) DEFAULT 'HEALTHY',
            last_success_at TIMESTAMPTZ,
            last_error_at TIMESTAMPTZ,
            last_error_msg TEXT,
            config JSONB DEFAULT '{}'::jsonb,
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)

    # Seed default data sources
    op.execute("""
        INSERT INTO data_sources (id, name, category, priority, is_enabled, config) VALUES
        ('nepse_official', 'NEPSE Official Client & Token Solver', 'market', 1, true, '{"description": "Official NEPSE live quotes, floorsheet, EOD bars via WASM token solver"}'::jsonb),
        ('sharesansar', 'ShareSansar Financial Gateway', 'fundamentals', 1, true, '{"description": "EOD crosscheck, company profiles, mutual funds NAVs, and BFI reports"}'::jsonb),
        ('merolagani', 'MeroLagani Financials', 'fundamentals', 2, true, '{"description": "Company quarterly fundamentals and balance sheet reports"}'::jsonb),
        ('nepalipaisa', 'NepaliPaisa Portal', 'corporate_actions', 1, true, '{"description": "Corporate dividends, AGM notices, and mutual funds"}'::jsonb),
        ('sebon', 'SEBON Regulatory Filings', 'macro', 1, true, '{"description": "Securities Board of Nepal IPO, Right Share, and Debenture pipeline"}'::jsonb),
        ('nrb', 'Nepal Rastra Bank Macro Data', 'macro', 1, true, '{"description": "Macroeconomic bulletins, policy rates, liquidity, and inflation"}'::jsonb),
        ('news_sources', 'Multi-Source Financial News Aggregator', 'news', 1, true, '{"description": "Aggregator for Bizshala, OnlineKhabar, ShareSansar, and Abhiyan"}'::jsonb)
        ON CONFLICT (id) DO NOTHING
    """)

    # 3. Dynamic Schedules (Admin Editable)
    op.execute("""
        CREATE TABLE IF NOT EXISTS scheduled_jobs (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(128) NOT NULL,
            description TEXT,
            cron_expr VARCHAR(64) NOT NULL,
            schedule_time_npt VARCHAR(8) NOT NULL DEFAULT '16:00',
            days_of_week VARCHAR(32) NOT NULL DEFAULT 'sun,mon,tue,wed,thu',
            is_enabled BOOLEAN NOT NULL DEFAULT true,
            last_run_at TIMESTAMPTZ,
            next_run_at TIMESTAMPTZ,
            last_status VARCHAR(32) DEFAULT 'IDLE',
            last_duration_sec NUMERIC(8, 2) DEFAULT 0,
            parameters JSONB DEFAULT '{}'::jsonb,
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)

    # Seed scheduled jobs
    op.execute("""
        INSERT INTO scheduled_jobs (id, name, description, cron_expr, schedule_time_npt, days_of_week, is_enabled) VALUES
        ('daily_evening_ai_master', 'Daily 4:00 PM Master AI & Market Wrap Pipeline', 'Unified evening run: EOD Sync + Macro Read + AI Trade Setup + AI Watchlists for all users', '0 16 * * 0-4', '16:00', 'sun,mon,tue,wed,thu', true),
        ('eod_market_sync', 'NEPSE EOD Market Data Ingestion', 'Pulls official closing prices, volume, index bars, and floorsheet', '15 15 * * 0-4', '15:15', 'sun,mon,tue,wed,thu', true),
        ('news_macro_sync', 'Financial News & Macro Pulse Sync', 'Ingests latest news, circulars, and recalculates market impacts', '30 15 * * 0-4', '15:30', 'sun,mon,tue,wed,thu', true),
        ('sebon_pipeline_sync', 'SEBON Regulatory Filings Sync', 'Parses SEBON pipeline for IPO and Right share updates', '45 15 * * 0-4', '15:45', 'sun,mon,tue,wed,thu', true)
        ON CONFLICT (id) DO NOTHING
    """)

    # 4. Job Execution & Audit Logs (each command in separate op.execute)
    op.execute("""
        CREATE TABLE IF NOT EXISTS job_execution_logs (
            id BIGSERIAL PRIMARY KEY,
            job_id VARCHAR(64) REFERENCES scheduled_jobs(id) ON DELETE CASCADE,
            triggered_by VARCHAR(64) NOT NULL,
            status VARCHAR(32) NOT NULL,
            started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            finished_at TIMESTAMPTZ,
            duration_sec NUMERIC(8, 2),
            prompt_tokens INT DEFAULT 0,
            completion_tokens INT DEFAULT 0,
            cost_usd NUMERIC(10, 6) DEFAULT 0,
            summary JSONB DEFAULT '{}'::jsonb,
            error_details TEXT
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_job_execution_logs_job_id ON job_execution_logs(job_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_job_execution_logs_started_at ON job_execution_logs(started_at DESC)")

    # 5. AI Agent Configurations & Prompt Templates
    op.execute("""
        CREATE TABLE IF NOT EXISTS ai_agent_configs (
            agent_id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(128) NOT NULL,
            model_provider VARCHAR(64) NOT NULL DEFAULT 'openrouter',
            model_slug VARCHAR(128) NOT NULL DEFAULT 'deepseek/deepseek-chat',
            is_enabled BOOLEAN NOT NULL DEFAULT true,
            temperature NUMERIC(3, 2) DEFAULT 0.1,
            max_tokens INT DEFAULT 2048,
            system_prompt TEXT NOT NULL,
            user_prompt_template TEXT NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)

    op.execute("""
        INSERT INTO ai_agent_configs (agent_id, name, model_provider, model_slug, is_enabled, temperature, max_tokens, system_prompt, user_prompt_template) VALUES
        ('market_dynamic_macro', 'AI Market Dynamic & Macro Read Agent', 'openrouter', 'deepseek/deepseek-chat', true, 0.1, 1500, 
        'You are the Chief Quantitative Strategist covering the Nepal Stock Exchange (NEPSE). Provide high-precision macroeconomic synthesis in strict JSON. Zero fluff.',
        'MACRO: {macro_vector}\nEvaluate market regime, confidence (0-100), key drivers, liquidity climate, and actionable guidance for tomorrow in JSON: {"market_status": "BULLISH|MODERATELY BULLISH|SIDEWAYS / NEUTRAL|BEARISH", "confidence_score": 75, "confidence_level": "HIGH|MODERATE|LOW", "sentiment": "string", "breadth_evaluation": "string", "turnover_evaluation": "string", "key_drivers": ["string"], "risks": ["string"], "actionable_advice": "string", "summary": "string"}'),
        
        ('ai_trade', 'AI Trade Setup & Execution Agent', 'openrouter', 'deepseek/deepseek-chat', true, 0.1, 2048,
        'You are the Head Algorithmic Swing Trader for NEPSE. You identify high-probability risk-reward trade setups from screened candidates. Strict JSON only.',
        'MKT REGIME: {regime}\nCANDIDATES:\n{candidates_csv}\nProvide high conviction trade setups with exact entry, stop loss, targets, and urgency in JSON: {"setups": [{"symbol": "string", "action": "BUY|WATCHLIST|SELL", "confidenceScore": 85, "urgency": "IMMEDIATE|ON_CONFIRMATION|MONITOR", "headlineReason": "string", "tradePlan": {"entryMin": 0, "entryMax": 0, "stopLoss": 0, "target1": 0, "target2": 0, "riskReward": "1:2.5", "timeframe": "1-3 weeks"}}]}'),

        ('ai_watchlist', 'AI Watchlist & Conviction Picks Agent', 'openrouter', 'deepseek/deepseek-chat', true, 0.1, 2048,
        'You are the Institutional Portfolio Strategist for NEPSE equities. Classify screened stocks into 4 strategic baskets: Breakouts, Smart Money Accumulation, Dividend/Valuation Plays, and Oversold Rebounds. Strict JSON.',
        'CANDIDATES:\n{candidates_csv}\nReturn top classified picks in JSON: {"topBuys": ["SYM"], "topWatchlist": ["SYM"], "topSells": ["SYM"], "executiveBrief": "string", "topSectorPick": "string", "tacticalStrategy": "string"}')
        ON CONFLICT (agent_id) DO NOTHING
    """)

    # 6. Global System Settings (Key-Value)
    op.execute("""
        CREATE TABLE IF NOT EXISTS system_settings (
            key VARCHAR(64) PRIMARY KEY,
            value JSONB NOT NULL,
            description TEXT,
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)

    op.execute("""
        INSERT INTO system_settings (key, value, description) VALUES
        ('openrouter_api_key', '{"key": ""}'::jsonb, 'OpenRouter API key for high-efficiency LLM queries'),
        ('openrouter_default_model', '{"model": "deepseek/deepseek-chat"}'::jsonb, 'Default OpenRouter model slug'),
        ('ai_token_budget_monthly', '{"limit_usd": 10.0, "current_month_cost": 0.0}'::jsonb, 'Monthly USD safety spend cap for AI'),
        ('ai_auto_evening_time', '{"time_npt": "16:00", "enabled": true}'::jsonb, 'Automated evening pipeline execution time in NPT')
        ON CONFLICT (key) DO NOTHING
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS system_settings")
    op.execute("DROP TABLE IF EXISTS ai_agent_configs")
    op.execute("DROP TABLE IF EXISTS job_execution_logs")
    op.execute("DROP TABLE IF EXISTS scheduled_jobs")
    op.execute("DROP TABLE IF EXISTS data_sources")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS last_login_at")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS is_active")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS role")
