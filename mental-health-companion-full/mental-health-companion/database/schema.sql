-- =====================================================================
-- Mental Health Companion and Stress Sentiment Tracker
-- PostgreSQL 15 schema (single source of truth; Alembic 0001 applies it)
-- Conventions: UUID PKs, created_at/updated_at, soft delete (deleted_at)
-- where needed. *_encrypted columns hold AES-256-GCM ciphertext
-- (base64 text: nonce || ciphertext || tag) produced by the app layer.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";

-- Generic updated_at trigger ------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- Identity and access
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         CITEXT NOT NULL UNIQUE,
  phone         VARCHAR(32),
  password_hash TEXT NOT NULL,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('client','staff','psychologist','admin')),
  approval_status VARCHAR(20) NOT NULL DEFAULT 'approved'
                CHECK (approval_status IN ('pending','approved','rejected')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  two_fa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  two_fa_secret TEXT,
  failed_logins INT NOT NULL DEFAULT 0,
  locked_until  TIMESTAMPTZ,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);
CREATE INDEX ix_users_role ON users(role) WHERE deleted_at IS NULL;

CREATE TABLE profiles (
  user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name  VARCHAR(150) NOT NULL,
  age        SMALLINT CHECK (age BETWEEN 5 AND 120),
  gender     VARCHAR(30),
  language   VARCHAR(5) NOT NULL DEFAULT 'en',
  timezone   VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
  avatar_url TEXT,
  theme      VARCHAR(10) NOT NULL DEFAULT 'light',
  font_size  VARCHAR(10) NOT NULL DEFAULT 'medium',
  high_contrast BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  device     VARCHAR(200),
  ip         VARCHAR(64),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_refresh_user ON refresh_tokens(user_id);

CREATE TABLE emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  relationship VARCHAR(60),
  phone VARCHAR(32) NOT NULL,
  email VARCHAR(255),
  notify_in_crisis BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_ec_user ON emergency_contacts(user_id);

CREATE TABLE consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(40) NOT NULL CHECK (type IN
     ('data_use','share_with_professionals','research_anonymized','emergency_notify','disclaimer')),
  granted BOOLEAN NOT NULL,
  version VARCHAR(20) NOT NULL DEFAULT '1.0',
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  withdrawn_at TIMESTAMPTZ
);
CREATE INDEX ix_consents_user_type ON consents(user_id, type);

CREATE TABLE psychologist_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  license_no VARCHAR(80) NOT NULL,
  specialization VARCHAR(150),
  experience_years SMALLINT,
  qualifications TEXT,
  bio TEXT,
  languages TEXT[] NOT NULL DEFAULT '{en}',
  fee_placeholder NUMERIC(10,2),
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
     CHECK (verification_status IN ('pending','approved','rejected')),
  rejection_reason TEXT,
  documents_url TEXT,
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  psychologist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  is_booked BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (end_at > start_at)
);
CREATE INDEX ix_slots_psy_start ON availability_slots(psychologist_id, start_at);

CREATE TABLE patient_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  psychologist_id UUID REFERENCES users(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended','referred')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);
CREATE INDEX ix_pa_patient ON patient_assignments(patient_id);
CREATE INDEX ix_pa_psy ON patient_assignments(psychologist_id, status);

-- ---------------------------------------------------------------------
-- Model registry, datasets (defined early: analysis_results references)
-- ---------------------------------------------------------------------
CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  source VARCHAR(300),
  rows INT NOT NULL DEFAULT 0,
  class_distribution JSONB,
  ethics_approval_ref VARCHAR(200),
  column_mapping JSONB,
  file_path TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  anonymized BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(20) NOT NULL CHECK (name IN ('tfidf_lr','distilbert','roberta')),
  version VARCHAR(30) NOT NULL,
  path TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  trained_on_dataset_id UUID REFERENCES datasets(id) ON DELETE SET NULL,
  hyperparameters JSONB,
  training_seconds NUMERIC(10,2),
  inference_ms NUMERIC(10,2),
  status VARCHAR(20) NOT NULL DEFAULT 'ready'
     CHECK (status IN ('queued','training','ready','failed')),
  progress SMALLINT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, version)
);
-- at most one active model
CREATE UNIQUE INDEX ux_model_one_active ON model_versions(is_active) WHERE is_active;

CREATE TABLE model_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version_id UUID NOT NULL REFERENCES model_versions(id) ON DELETE CASCADE,
  task VARCHAR(20) NOT NULL CHECK (task IN ('sentiment','emotion','stress','crisis')),
  accuracy NUMERIC(6,4),
  precision_macro NUMERIC(6,4),
  recall_macro NUMERIC(6,4),
  f1_macro NUMERIC(6,4),
  f1_weighted NUMERIC(6,4),
  roc_auc NUMERIC(6,4),
  confusion_matrix JSONB,
  report JSONB,
  UNIQUE (model_version_id, task)
);

-- ---------------------------------------------------------------------
-- Journal, analysis, alerts, chat
-- ---------------------------------------------------------------------
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text_encrypted TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  mood_emoji SMALLINT CHECK (mood_emoji BETWEEN 1 AND 5),
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  shared_with_psychologist BOOLEAN NOT NULL DEFAULT FALSE,
  source VARCHAR(10) NOT NULL DEFAULT 'journal' CHECK (source IN ('journal','chat','voice')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX ix_entries_user_created ON journal_entries(user_id, created_at DESC);

CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- denormalized for fast trend queries
  cleaned_text_encrypted TEXT,
  sentiment VARCHAR(10) NOT NULL CHECK (sentiment IN ('positive','neutral','negative')),
  sentiment_conf NUMERIC(5,4) NOT NULL,
  emotion_scores JSONB NOT NULL,
  top_emotion VARCHAR(10) NOT NULL CHECK (top_emotion IN
     ('anxiety','sadness','anger','fear','joy','stress','neutral')),
  stress_level VARCHAR(10) NOT NULL CHECK (stress_level IN ('low','moderate','high')),
  stress_score NUMERIC(5,2) NOT NULL CHECK (stress_score BETWEEN 0 AND 100),
  stress_conf NUMERIC(5,4) NOT NULL,
  risk_level VARCHAR(10) NOT NULL DEFAULT 'none' CHECK (risk_level IN ('none','elevated','critical')),
  keywords JSONB,
  model_version_id UUID REFERENCES model_versions(id) ON DELETE SET NULL,
  latency_ms INT,
  helpful BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_analysis_user_created ON analysis_results(user_id, created_at DESC);
CREATE INDEX ix_analysis_stress_level ON analysis_results(stress_level);
CREATE INDEX ix_analysis_risk ON analysis_results(risk_level) WHERE risk_level <> 'none';
CREATE INDEX ix_analysis_entry ON analysis_results(entry_id);

CREATE TABLE crisis_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  risk_level VARCHAR(10) NOT NULL CHECK (risk_level IN ('elevated','critical')),
  matched_terms TEXT[] NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'created'
     CHECK (status IN ('created','notified','acknowledged','in_progress','resolved')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  notified_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  sla_due_at TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ,
  outcome_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_alerts_status ON crisis_alerts(status, created_at DESC);
CREATE INDEX ix_alerts_risk ON crisis_alerts(risk_level);
CREATE INDEX ix_alerts_user ON crisis_alerts(user_id, created_at DESC);

CREATE TABLE alert_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES crisis_alerts(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(30) NOT NULL,   -- acknowledge|assign|escalate|call_logged|resolve|note
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_alert_actions_alert ON alert_actions(alert_id, created_at);

CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);
CREATE INDEX ix_chat_sessions_user ON chat_sessions(user_id, started_at DESC);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender VARCHAR(4) NOT NULL CHECK (sender IN ('user','bot')),
  text_encrypted TEXT NOT NULL,
  analysis_id UUID REFERENCES analysis_results(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_chat_msgs_session ON chat_messages(session_id, created_at);

CREATE TABLE trend_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('daily','weekly','monthly')),
  period_start DATE NOT NULL,
  avg_stress NUMERIC(5,2),
  dominant_emotion VARCHAR(10),
  direction VARCHAR(10) CHECK (direction IN ('increasing','decreasing','stable')),
  pct_change NUMERIC(7,2),
  entries_count INT NOT NULL DEFAULT 0,
  UNIQUE (user_id, period_type, period_start)
);
CREATE INDEX ix_trend_user_period ON trend_summaries(user_id, period_type, period_start DESC);

-- ---------------------------------------------------------------------
-- Content: recommendations, helplines, articles, questionnaires
-- ---------------------------------------------------------------------
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(30) NOT NULL CHECK (category IN
     ('breathing','sleep','exercise','social','professional_help','article','grounding','journaling','tip')),
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  target_emotion VARCHAR(10),          -- NULL = any
  target_stress VARCHAR(10),
  target_trend VARCHAR(10),
  language VARCHAR(5) NOT NULL DEFAULT 'en',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_reco_targets ON recommendations(target_emotion, target_stress, target_trend) WHERE is_active;

CREATE TABLE response_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('empathy','nudge','chat_reply','crisis_intro')),
  target_emotion VARCHAR(10),
  target_stress VARCHAR(10),
  language VARCHAR(5) NOT NULL DEFAULT 'en',
  body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE recommendation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recommendation_id UUID NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  status VARCHAR(10) NOT NULL DEFAULT 'shown' CHECK (status IN ('shown','done','saved')),
  feedback SMALLINT CHECK (feedback IN (-1,1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_reco_hist_user ON recommendation_history(user_id, created_at DESC);

CREATE TABLE resources_helplines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country VARCHAR(80) NOT NULL,
  region VARCHAR(80),
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(40),
  website TEXT,
  hours VARCHAR(80),
  language VARCHAR(80),
  type VARCHAR(20) NOT NULL DEFAULT 'helpline' CHECK (type IN ('emergency','helpline','clinic','hospital')),
  verified BOOLEAN NOT NULL DEFAULT FALSE,   -- "verify before production"
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX ix_helplines_country ON resources_helplines(country) WHERE is_active;

CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(250) NOT NULL,
  body TEXT NOT NULL,
  category VARCHAR(40),
  language VARCHAR(5) NOT NULL DEFAULT 'en',
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  language VARCHAR(5) NOT NULL DEFAULT 'en',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) NOT NULL UNIQUE CHECK (code IN ('PHQ9','GAD7','PSS10')),
  title VARCHAR(200) NOT NULL,
  questions JSONB NOT NULL,
  scoring_rules JSONB NOT NULL
);

CREATE TABLE questionnaire_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  questionnaire_id UUID NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  total_score SMALLINT NOT NULL,
  band VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_qr_user ON questionnaire_responses(user_id, created_at DESC);

-- ---------------------------------------------------------------------
-- Care delivery
-- ---------------------------------------------------------------------
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  psychologist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot_id UUID REFERENCES availability_slots(id) ON DELETE SET NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'requested'
     CHECK (status IN ('requested','confirmed','declined','rescheduled','completed','cancelled','no_show')),
  mode VARCHAR(10) NOT NULL DEFAULT 'video' CHECK (mode IN ('video','in_person','chat')),
  video_link TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_appt_psy_start ON appointments(psychologist_id, start_at);
CREATE INDEX ix_appt_patient_start ON appointments(patient_id, start_at);

CREATE TABLE clinical_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  psychologist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  note_encrypted TEXT NOT NULL,
  plan_encrypted TEXT,
  follow_up_date DATE,
  version INT NOT NULL DEFAULT 1,
  parent_note_id UUID REFERENCES clinical_notes(id) ON DELETE SET NULL,  -- version history chain
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_notes_patient ON clinical_notes(patient_id, created_at DESC);

CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  psychologist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  due_date DATE,
  status VARCHAR(15) NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','in_progress','done','overdue')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_assign_patient ON assignments(patient_id, status);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body_encrypted TEXT NOT NULL,
  attachment_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_msgs_pair ON messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX ix_msgs_receiver_unread ON messages(receiver_id) WHERE read_at IS NULL;

CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  audience VARCHAR(20) NOT NULL DEFAULT 'all' CHECK (audience IN ('all','clients','psychologists','staff','single')),
  target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel VARCHAR(10) NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app','email','sms')),
  kind VARCHAR(30),
  title VARCHAR(200) NOT NULL,
  body TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_notif_user ON notifications(user_id, is_read, sent_at DESC);

CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  journal_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_time TIME DEFAULT '20:00',
  appointment_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  weekly_summary BOOLEAN NOT NULL DEFAULT TRUE,
  high_stress_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sms_enabled BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE goals_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('sleep','exercise','hydration','meditation','social')),
  target NUMERIC(8,2) NOT NULL,
  unit VARCHAR(20),
  frequency VARCHAR(10) NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily','weekly')),
  streak INT NOT NULL DEFAULT 0,
  best_streak INT NOT NULL DEFAULT 0,
  reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_goals_user ON goals_habits(user_id);

CREATE TABLE habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals_habits(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  value NUMERIC(8,2) NOT NULL,
  UNIQUE (goal_id, log_date)
);

CREATE TABLE safety_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  warning_signs TEXT[] NOT NULL DEFAULT '{}',
  coping_steps TEXT[] NOT NULL DEFAULT '{}',
  safe_places TEXT[] NOT NULL DEFAULT '{}',
  contacts JSONB NOT NULL DEFAULT '[]',
  professional_contacts JSONB NOT NULL DEFAULT '[]',
  environment_safety TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('app','analysis','recommendation','psychologist','issue')),
  target_id UUID,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE prediction_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analysis_results(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_correct BOOLEAN NOT NULL,
  corrected_sentiment VARCHAR(10),
  corrected_emotion VARCHAR(10),
  corrected_stress VARCHAR(10),
  comment TEXT,
  used_in_training BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_pr_analysis ON prediction_reviews(analysis_id);

-- ---------------------------------------------------------------------
-- Admin / governance
-- ---------------------------------------------------------------------
CREATE TABLE crisis_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phrase TEXT NOT NULL,
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('elevated','critical')),
  language VARCHAR(5) NOT NULL DEFAULT 'en',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (phrase, language)
);

-- append-only: UPDATE/DELETE blocked by trigger below
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,                        -- no FK so history survives user deletion
  action VARCHAR(60) NOT NULL,
  target_type VARCHAR(40),
  target_id UUID,
  ip VARCHAR(64),
  metadata JSONB,                       -- NEVER contains raw user text
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_audit_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX ix_audit_action ON audit_logs(action, created_at DESC);
CREATE INDEX ix_audit_target ON audit_logs(target_type, target_id);

CREATE OR REPLACE FUNCTION audit_logs_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_audit_no_update BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_immutable();

CREATE TABLE data_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('export','delete')),
  status VARCHAR(12) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX ix_dr_status ON data_requests(status);

CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  subject VARCHAR(250) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(15) NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_tickets_status ON support_tickets(status, priority);

CREATE TABLE role_permissions (
  role VARCHAR(20) NOT NULL CHECK (role IN ('client','staff','psychologist','admin')),
  permission VARCHAR(80) NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (role, permission)
);

CREATE TABLE settings (
  key VARCHAR(80) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at triggers -------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.columns
           WHERE table_schema = 'public' AND column_name = 'updated_at'
  LOOP
    EXECUTE 'CREATE TRIGGER ' || quote_ident('trg_' || t || '_updated')
         || ' BEFORE UPDATE ON ' || quote_ident(t)
         || ' FOR EACH ROW EXECUTE FUNCTION set_updated_at()';
  END LOOP;
END $$;
