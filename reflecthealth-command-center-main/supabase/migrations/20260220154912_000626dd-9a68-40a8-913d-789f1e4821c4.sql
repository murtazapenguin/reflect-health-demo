
-- Call Recordings: stores uploaded audio files metadata
CREATE TABLE public.call_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER,
  duration_seconds INTEGER,
  storage_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','transcribing','analyzing','complete','error')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Call Analyses: structured output from AI analysis of a call
CREATE TABLE public.call_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recording_id UUID NOT NULL REFERENCES public.call_recordings(id) ON DELETE CASCADE,
  transcript TEXT,
  speakers JSONB,
  call_type TEXT,
  intent TEXT,
  entities JSONB,
  sentiment TEXT,
  resolution_type TEXT,
  automation_feasibility_score INTEGER,
  avg_handle_time_seconds INTEGER,
  escalation_risk TEXT,
  cost_per_call_manual NUMERIC(8,2) DEFAULT 4.50,
  cost_per_call_ai NUMERIC(8,2) DEFAULT 0.65,
  summary TEXT,
  compliance_flags JSONB,
  backend_systems_accessed JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Automation Scenarios: saved scenarios that go into the knowledge base
CREATE TABLE public.automation_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recording_id UUID REFERENCES public.call_recordings(id),
  analysis_id UUID REFERENCES public.call_analyses(id),
  name TEXT NOT NULL,
  call_intent TEXT NOT NULL,
  required_data_inputs JSONB,
  required_system_integrations JSONB,
  decision_tree JSONB,
  escalation_rules JSONB,
  compliance_requirements JSONB,
  expected_resolution TEXT,
  confidence_score INTEGER DEFAULT 85,
  automation_coverage_before INTEGER DEFAULT 64,
  automation_coverage_after INTEGER DEFAULT 71,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Knowledge Base Entries: entries trained from scenarios
CREATE TABLE public.knowledge_base_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID REFERENCES public.automation_scenarios(id) ON DELETE CASCADE,
  intent TEXT NOT NULL,
  entity_patterns JSONB,
  response_template TEXT,
  confidence_score INTEGER DEFAULT 85,
  call_count INTEGER DEFAULT 0,
  success_rate NUMERIC(5,2) DEFAULT 100.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_entries ENABLE ROW LEVEL SECURITY;

-- Public read/insert for demo (no auth required)
CREATE POLICY "Public read call_recordings" ON public.call_recordings FOR SELECT USING (true);
CREATE POLICY "Public insert call_recordings" ON public.call_recordings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update call_recordings" ON public.call_recordings FOR UPDATE USING (true);

CREATE POLICY "Public read call_analyses" ON public.call_analyses FOR SELECT USING (true);
CREATE POLICY "Public insert call_analyses" ON public.call_analyses FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read automation_scenarios" ON public.automation_scenarios FOR SELECT USING (true);
CREATE POLICY "Public insert automation_scenarios" ON public.automation_scenarios FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read knowledge_base_entries" ON public.knowledge_base_entries FOR SELECT USING (true);
CREATE POLICY "Public insert knowledge_base_entries" ON public.knowledge_base_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update knowledge_base_entries" ON public.knowledge_base_entries FOR UPDATE USING (true);

-- Storage bucket for call recordings
INSERT INTO storage.buckets (id, name, public) VALUES ('call-recordings', 'call-recordings', false);

CREATE POLICY "Public upload call recordings" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'call-recordings');
CREATE POLICY "Public read call recordings" ON storage.objects FOR SELECT USING (bucket_id = 'call-recordings');
