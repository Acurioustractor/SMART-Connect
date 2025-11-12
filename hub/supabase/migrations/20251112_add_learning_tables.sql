-- Migration: Add Learning and Continuous Improvement Tables
-- Created: 2025-11-12
-- Purpose: Enable the AI system to learn from user engagement and improve over time

-- =================================================================
-- 1. LEARNED PATTERNS TABLE
-- Stores insights from engagement analysis and success pattern detection
-- =================================================================

CREATE TABLE IF NOT EXISTS learned_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Pattern identification
  pattern_type VARCHAR(50) NOT NULL, -- engagement_analysis, success_patterns, failure_patterns
  analysis JSONB NOT NULL, -- GPT-4 analysis results

  -- Confidence and sample size
  confidence FLOAT CHECK (confidence BETWEEN 0 AND 1),
  sample_size INT NOT NULL DEFAULT 0,
  high_performers_count INT DEFAULT 0,
  low_performers_count INT DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Status tracking
  applied BOOLEAN DEFAULT FALSE, -- Has this pattern been applied to recommendations?
  applied_at TIMESTAMPTZ,

  -- Performance tracking
  impact_score FLOAT, -- How much did applying this pattern improve metrics?
  validation_status VARCHAR(20) DEFAULT 'pending' -- pending, validated, rejected
);

CREATE INDEX idx_learned_patterns_type ON learned_patterns(pattern_type);
CREATE INDEX idx_learned_patterns_created ON learned_patterns(created_at DESC);
CREATE INDEX idx_learned_patterns_applied ON learned_patterns(applied);

-- =================================================================
-- 2. FACILITATOR FEEDBACK TABLE
-- Explicit feedback from facilitators on recommendations and content
-- =================================================================

CREATE TABLE IF NOT EXISTS facilitator_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recommendation_id UUID REFERENCES content_recommendations(id) ON DELETE SET NULL,
  content_id UUID REFERENCES scraped_content(id) ON DELETE SET NULL,

  -- Ratings (1-5 scale)
  relevance_rating INT CHECK (relevance_rating BETWEEN 1 AND 5),
  usefulness_rating INT CHECK (usefulness_rating BETWEEN 1 AND 5),
  accuracy_rating INT CHECK (accuracy_rating BETWEEN 1 AND 5),

  -- Text feedback
  feedback_text TEXT,
  suggested_improvements TEXT,

  -- Context - what was the facilitator trying to do?
  context TEXT,
  challenge_category VARCHAR(100), -- burnout, cultural_safety, tool_gaps, etc.

  -- AI Analysis (populated by GPT-4)
  sentiment VARCHAR(20), -- positive, neutral, negative, mixed
  key_themes TEXT[], -- Extracted themes from feedback
  actionable_insights TEXT[], -- Specific actions derived from feedback
  analyzed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Follow-up tracking
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_completed_at TIMESTAMPTZ
);

CREATE INDEX idx_facilitator_feedback_user ON facilitator_feedback(user_id);
CREATE INDEX idx_facilitator_feedback_recommendation ON facilitator_feedback(recommendation_id);
CREATE INDEX idx_facilitator_feedback_content ON facilitator_feedback(content_id);
CREATE INDEX idx_facilitator_feedback_sentiment ON facilitator_feedback(sentiment);
CREATE INDEX idx_facilitator_feedback_category ON facilitator_feedback(challenge_category);

-- =================================================================
-- 3. SYSTEM IMPROVEMENTS TABLE
-- Tracks identified issues and improvement opportunities
-- =================================================================

CREATE TABLE IF NOT EXISTS system_improvements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Issue identification
  improvement_type VARCHAR(50) NOT NULL, -- recommendation_failure, quality_issue, gap_detected
  diagnosis TEXT NOT NULL, -- What's wrong?

  -- Priority and impact
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
  estimated_impact VARCHAR(50), -- Expected improvement if fixed

  -- References
  related_feedback_ids UUID[], -- Links to facilitator_feedback entries
  related_content_ids UUID[], -- Links to scraped_content entries

  -- Status tracking
  status VARCHAR(20) DEFAULT 'identified', -- identified, reviewing, in_progress, completed, rejected
  assigned_to VARCHAR(100), -- Who's working on this?

  -- Resolution
  resolution_notes TEXT,
  completed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_improvements_type ON system_improvements(improvement_type);
CREATE INDEX idx_system_improvements_status ON system_improvements(status);
CREATE INDEX idx_system_improvements_priority ON system_improvements(priority);

-- =================================================================
-- 4. CONTENT QUALITY AUDIT LOG
-- Tracks automated quality audits and their results
-- =================================================================

CREATE TABLE IF NOT EXISTS content_quality_audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Audit details
  audit_type VARCHAR(50) NOT NULL, -- stale_content, quality_check, coverage_analysis

  -- Metrics
  total_content_checked INT,
  issues_found INT,
  avg_quality_score FLOAT,

  -- Results
  findings JSONB NOT NULL, -- Detailed audit results
  stale_content_ids UUID[], -- Content that needs updating
  low_quality_ids UUID[], -- Content below quality threshold

  -- Actions taken
  actions_taken TEXT[],

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  duration_ms INT -- How long the audit took
);

CREATE INDEX idx_content_quality_audits_type ON content_quality_audits(audit_type);
CREATE INDEX idx_content_quality_audits_created ON content_quality_audits(created_at DESC);

-- =================================================================
-- 5. SQL FUNCTION: Update Recommendation Weights
-- Automatically adjusts confidence scores based on engagement
-- =================================================================

CREATE OR REPLACE FUNCTION update_recommendation_weights()
RETURNS TABLE(boosted INT, reduced INT) AS $$
DECLARE
  v_boosted INT := 0;
  v_reduced INT := 0;
  rec RECORD;
  ctr FLOAT;
  new_confidence FLOAT;
BEGIN
  -- Loop through recommendations with engagement data
  FOR rec IN
    SELECT id, view_count, click_count, save_count, dismissal_count, confidence_score
    FROM content_recommendations
    WHERE view_count > 0
      AND updated_at > NOW() - INTERVAL '7 days'
  LOOP
    -- Calculate click-through rate
    ctr := rec.click_count::FLOAT / NULLIF(rec.view_count, 0);
    new_confidence := rec.confidence_score;

    -- High performer - boost confidence
    IF ctr > 0.2 THEN
      new_confidence := LEAST(1.0, rec.confidence_score * 1.1);
      v_boosted := v_boosted + 1;

    -- Low performer with significant views - reduce confidence
    ELSIF ctr < 0.05 AND rec.view_count > 10 THEN
      new_confidence := GREATEST(0.1, rec.confidence_score * 0.9);
      v_reduced := v_reduced + 1;

    -- Dismissed frequently - penalize more
    ELSIF rec.dismissal_count > 3 THEN
      new_confidence := GREATEST(0.05, rec.confidence_score * 0.8);
      v_reduced := v_reduced + 1;
    END IF;

    -- Update if changed
    IF new_confidence != rec.confidence_score THEN
      UPDATE content_recommendations
      SET confidence_score = new_confidence,
          updated_at = NOW()
      WHERE id = rec.id;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_boosted, v_reduced;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- 6. VIEW: System Health Metrics
-- Quick overview of system performance
-- =================================================================

CREATE OR REPLACE VIEW system_health_metrics AS
SELECT
  -- Content metrics
  (SELECT COUNT(*) FROM scraped_content) AS total_content,
  (SELECT AVG(quality_score) FROM scraped_content) AS avg_quality_score,
  (SELECT COUNT(*) FROM scraped_content
   WHERE last_scraped < NOW() - INTERVAL '6 months'
   AND view_count > 5) AS stale_content_count,

  -- Recommendation metrics
  (SELECT COUNT(*) FROM content_recommendations) AS total_recommendations,
  (SELECT AVG(click_count::FLOAT / NULLIF(view_count, 0))
   FROM content_recommendations
   WHERE view_count > 0) AS avg_ctr,
  (SELECT AVG(save_count::FLOAT / NULLIF(view_count, 0))
   FROM content_recommendations
   WHERE view_count > 0) AS avg_save_rate,

  -- Feedback metrics
  (SELECT COUNT(*) FROM facilitator_feedback) AS total_feedback,
  (SELECT AVG(relevance_rating) FROM facilitator_feedback) AS avg_relevance_rating,
  (SELECT COUNT(*) FROM facilitator_feedback WHERE sentiment = 'negative') AS negative_feedback_count,

  -- Improvement tracking
  (SELECT COUNT(*) FROM system_improvements WHERE status = 'identified') AS open_issues,
  (SELECT COUNT(*) FROM system_improvements WHERE status = 'completed') AS completed_improvements,

  -- Last update
  NOW() AS snapshot_time;

-- =================================================================
-- 7. VIEW: Recommendation Effectiveness Summary
-- Performance breakdown by recommendation type
-- =================================================================

CREATE OR REPLACE VIEW recommendation_effectiveness_summary AS
SELECT
  type,
  COUNT(*) AS total_recommendations,
  SUM(view_count) AS total_views,
  SUM(click_count) AS total_clicks,
  SUM(save_count) AS total_saves,
  SUM(dismissal_count) AS total_dismissals,
  AVG(click_count::FLOAT / NULLIF(view_count, 0)) AS avg_ctr,
  AVG(save_count::FLOAT / NULLIF(view_count, 0)) AS avg_save_rate,
  AVG(dismissal_count::FLOAT / NULLIF(view_count, 0)) AS avg_dismissal_rate,
  AVG(confidence_score) AS avg_confidence
FROM content_recommendations
WHERE view_count > 0
GROUP BY type
ORDER BY avg_ctr DESC;

-- =================================================================
-- 8. FUNCTION: Get Learning Insights Summary
-- Returns a JSON summary of all learned patterns and their impact
-- =================================================================

CREATE OR REPLACE FUNCTION get_learning_insights_summary()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_patterns', COUNT(*),
    'applied_patterns', COUNT(*) FILTER (WHERE applied = true),
    'pending_patterns', COUNT(*) FILTER (WHERE applied = false),
    'avg_confidence', AVG(confidence),
    'patterns_by_type', jsonb_agg(DISTINCT pattern_type),
    'recent_insights', (
      SELECT jsonb_agg(jsonb_build_object(
        'type', pattern_type,
        'confidence', confidence,
        'sample_size', sample_size,
        'created_at', created_at
      ))
      FROM learned_patterns
      ORDER BY created_at DESC
      LIMIT 10
    )
  )
  INTO result
  FROM learned_patterns;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- 9. RLS Policies (if needed)
-- Restrict access to sensitive learning data
-- =================================================================

-- Enable RLS on new tables
ALTER TABLE learned_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilitator_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_improvements ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_quality_audits ENABLE ROW LEVEL SECURITY;

-- Admins can see everything
CREATE POLICY "Admins can view learned_patterns"
  ON learned_patterns FOR SELECT
  USING (auth.jwt()->>'role' = 'admin' OR auth.jwt()->>'role' = 'service_role');

-- Users can only see their own feedback
CREATE POLICY "Users can view their own feedback"
  ON facilitator_feedback FOR SELECT
  USING (auth.uid() = user_id OR auth.jwt()->>'role' = 'admin');

-- Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback"
  ON facilitator_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =================================================================
-- 10. COMMENTS
-- Document the schema for future developers
-- =================================================================

COMMENT ON TABLE learned_patterns IS 'Stores patterns learned from engagement analysis and success detection';
COMMENT ON TABLE facilitator_feedback IS 'Explicit feedback from facilitators on recommendations and content';
COMMENT ON TABLE system_improvements IS 'Tracks identified issues and improvement opportunities';
COMMENT ON TABLE content_quality_audits IS 'Logs automated quality audits and their results';

COMMENT ON FUNCTION update_recommendation_weights() IS 'Adjusts confidence scores based on engagement (run weekly)';
COMMENT ON FUNCTION get_learning_insights_summary() IS 'Returns JSON summary of all learned patterns';

COMMENT ON VIEW system_health_metrics IS 'Quick snapshot of overall system health and performance';
COMMENT ON VIEW recommendation_effectiveness_summary IS 'Recommendation performance breakdown by type';
