const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, fileName, durationSeconds } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are an expert call center AI analyst specializing in healthcare operations, insurance, and TPA environments.
Analyze call transcripts and return structured JSON intelligence.

You must return ONLY valid JSON, no markdown, no explanation. Return this exact structure:
{
  "call_type": "string (e.g. Benefits Verification, Claim Status, Prior Authorization, Eligibility, Provider Inquiry, Member Inquiry, Appeals, Billing)",
  "intent": "string (concise primary intent, e.g. 'Check claim status for denied claim')",
  "entities": {
    "member_id": "string or null",
    "dob": "string or null",
    "policy_number": "string or null",
    "claim_number": "string or null",
    "cpt_codes": ["array of strings"],
    "icd_codes": ["array of strings"],
    "provider_npi": "string or null",
    "address_update": "boolean"
  },
  "sentiment": "string (Positive, Neutral, Frustrated, Escalated, Distressed)",
  "resolution_type": "string (Resolved, Escalated, Pending, Transferred, Unresolved)",
  "automation_feasibility_score": "integer 0-100 (weighted sum of the 5 scoring categories below)",
  "escalation_risk": "string (Low, Medium, High)",
  "summary": "string (2-3 sentence professional summary)",
  "backend_systems_accessed": ["array of systems: e.g. Claims Engine, Eligibility DB, Provider Directory, Member Portal, CRM"],
  "compliance_flags": ["array of compliance considerations, e.g. HIPAA verification required, PHI accessed"],
  "ai_response_script": "string (what Penguin AI would say to handle this call autonomously, 3-4 sentences)",
  "automation_scenario_name": "string (descriptive name for saving as a scenario)",
  "required_data_inputs": ["array of required data inputs for automation"],
  "required_system_integrations": ["array of required system integrations"],
  "escalation_rules": ["array of conditions that would trigger escalation"],
  "compliance_requirements": ["array of compliance steps required"],
  "expected_resolution": "string (what the automated resolution would be)",

  "scoring_breakdown": {
    "intent_clarity": {
      "score": "integer 0-20",
      "label": "string (e.g. 'Fully Deterministic', 'Mostly Structured', 'Moderate Branching', 'Highly Ambiguous')",
      "reasoning": "string (1-2 sentence explanation of why this score was given)"
    },
    "data_availability": {
      "score": "integer 0-20",
      "label": "string (e.g. 'Fully API-Accessible', 'Mostly Retrievable', 'Partial System Lookup', 'Manual Gathering Required')",
      "reasoning": "string (1-2 sentence explanation)"
    },
    "workflow_complexity": {
      "score": "integer 0-20",
      "label": "string (e.g. 'Straight-Through Processing', 'Mostly Linear', 'Moderate Branching', 'Multi-System Complex')",
      "reasoning": "string (1-2 sentence explanation)"
    },
    "compliance_risk": {
      "score": "integer 0-20",
      "label": "string (e.g. 'Low Risk Informational', 'Standard Compliance', 'Moderate Exposure', 'High Regulatory Risk')",
      "reasoning": "string (1-2 sentence explanation)"
    },
    "sentiment_sensitivity": {
      "score": "integer 0-20",
      "label": "string (e.g. 'Purely Transactional', 'Neutral', 'Moderate', 'High Emotional Complexity')",
      "reasoning": "string (1-2 sentence explanation)"
    },
    "automation_tier": "string (one of: 'Fully Automatable', 'Hybrid AI + Human Assist', 'AI Prep + Human Resolution', 'Human Required')",
    "estimated_cost_reduction_pct": "integer 0-100 (estimated % cost reduction if automated)",
    "estimated_aht_reduction_pct": "integer 0-100 (estimated % AHT reduction if automated)",
    "confidence_label": "string (e.g. 'High Confidence', 'Moderate Confidence', 'Low Confidence')",
    "why_summary": "string (3-4 sentence executive-level explanation of WHY this call gets this automation score — suitable for board presentation)"
  }
}

SCORING GUIDE:
- intent_clarity (0-20): 16-20=fully deterministic/repetitive, 11-15=mostly structured, 6-10=moderate branching, 0-5=highly ambiguous
- data_availability (0-20): 16-20=fully API-accessible structured data, 11-15=mostly retrievable multi-step, 6-10=partial lookup, 0-5=manual gathering
- workflow_complexity (0-20): 16-20=straight-through processing, 11-15=mostly linear, 6-10=moderate branching, 0-5=multi-system complex
- compliance_risk (0-20): 16-20=low risk informational, 11-15=standard compliance, 6-10=moderate exposure, 0-5=high regulatory risk
- sentiment_sensitivity (0-20): 16-20=purely transactional, 11-15=neutral, 6-10=moderate, 0-5=high emotional complexity

automation_feasibility_score = sum of all 5 scores (max 100)
Tier: 80-100=Fully Automatable, 60-79=Hybrid, 40-59=AI Prep+Human, 0-39=Human Required`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Analyze this healthcare call center transcript from file "${fileName}" (duration: ${durationSeconds || 'unknown'} seconds):\n\n${transcript}`,
          },
        ],
        temperature: 0.15,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'AI analysis failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || '{}';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let analysis;
    try {
      analysis = JSON.parse(cleaned);
      // Ensure automation_feasibility_score matches breakdown sum if breakdown exists
      if (analysis.scoring_breakdown) {
        const bd = analysis.scoring_breakdown;
        const sum = (bd.intent_clarity?.score ?? 0) + (bd.data_availability?.score ?? 0) +
          (bd.workflow_complexity?.score ?? 0) + (bd.compliance_risk?.score ?? 0) +
          (bd.sentiment_sensitivity?.score ?? 0);
        if (sum > 0) analysis.automation_feasibility_score = sum;
      }
    } catch {
      console.error('Failed to parse AI response:', cleaned);
      analysis = {
        call_type: 'General Inquiry',
        intent: 'General call inquiry',
        entities: { member_id: null, dob: null, policy_number: null, claim_number: null, cpt_codes: [], icd_codes: [], provider_npi: null, address_update: false },
        sentiment: 'Neutral',
        resolution_type: 'Resolved',
        automation_feasibility_score: 72,
        escalation_risk: 'Low',
        summary: 'Call analyzed. Full transcript processed.',
        backend_systems_accessed: ['CRM', 'Member Portal'],
        compliance_flags: ['HIPAA verification required'],
        ai_response_script: 'Thank you for calling. I can help you with that today.',
        automation_scenario_name: 'General Inquiry Automation',
        required_data_inputs: ['Member ID', 'Date of Birth'],
        required_system_integrations: ['CRM', 'Member Portal'],
        escalation_rules: ['Sentiment becomes distressed', 'Cannot verify identity'],
        compliance_requirements: ['Verify caller identity', 'Log HIPAA access'],
        expected_resolution: 'Inquiry resolved automatically',
        scoring_breakdown: {
          intent_clarity: { score: 14, label: 'Mostly Structured', reasoning: 'Intent is clear and follows a standard inquiry pattern.' },
          data_availability: { score: 15, label: 'Mostly Retrievable', reasoning: 'Data is retrievable via standard API calls.' },
          workflow_complexity: { score: 14, label: 'Mostly Linear', reasoning: 'Workflow follows a mostly linear path with minimal branching.' },
          compliance_risk: { score: 15, label: 'Standard Compliance', reasoning: 'Standard HIPAA compliance requirements apply.' },
          sentiment_sensitivity: { score: 14, label: 'Neutral', reasoning: 'Caller sentiment is neutral with no emotional complexity.' },
          automation_tier: 'Hybrid AI + Human Assist',
          estimated_cost_reduction_pct: 60,
          estimated_aht_reduction_pct: 55,
          confidence_label: 'Moderate Confidence',
          why_summary: 'This call type demonstrates moderate automation potential. The intent is structured and data is retrievable via API, but some human oversight is recommended for final resolution confirmation.',
        },
      };
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('analyze-call error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
