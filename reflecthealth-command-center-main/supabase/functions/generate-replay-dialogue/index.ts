const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { callerTurns, callType, intent, entities, summary } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const turns = callerTurns as string[];

    // Generate N+1 responses: index 0 = opening greeting, indices 1..N = one response per caller turn
    const totalResponses = turns.length + 1;

    const conversationContext = turns
      .map((t, i) => `Turn ${i + 1} — Caller says: "${t}"`)
      .join('\n');

    const systemPrompt = `You are Penguin AI, a highly efficient AI voice agent for healthcare call centers (TPAs, insurance carriers, provider offices).

The call flow is: Penguin AI greets → Caller speaks → Penguin AI responds → repeat until resolved.

You must generate exactly ${totalResponses} responses:
- INDEX 0: Opening greeting ONLY. Caller has NOT spoken yet. Greet professionally and invite them to state their reason for calling. e.g. "Thank you for calling. This is Penguin AI, your automated healthcare assistant. How can I assist you today?"
- INDEX 1 through ${turns.length}: One direct response per caller turn, in EXACT order.

CRITICAL RULES FOR INDICES 1+:
1. Read the caller's utterance for that turn CAREFULLY. Your response must DIRECTLY acknowledge what they JUST SAID.
2. NEVER ask for information already provided in a prior turn. If caller gave their name → use it. If they gave a phone number → confirm and move on. If they gave an ID → acknowledge it.
3. Each response must logically bridge to the caller's NEXT utterance.
4. Penguin AI resolves efficiently: greet → identify caller → gather minimum needed info → retrieve data → confirm resolution.
5. Max 1-2 sentences per response. Be warm, confident, and concise.
6. The final response must close the call: confirm resolution, offer further assistance, say goodbye.

Return ONLY a valid JSON array of exactly ${totalResponses} strings. No markdown, no extra text.
Format: ["Opening greeting.", "Response to turn 1.", "Response to turn 2.", ..., "Closing response."]`;

    const userPrompt = `Call context:
- Call type: ${callType}
- Intent: ${intent}
- Summary: ${summary}
- Entities extracted: ${JSON.stringify(entities)}

Caller utterances in exact order:
${conversationContext}

Generate exactly ${totalResponses} responses (1 opening + ${turns.length} turn responses).
Index 0 = greeting before caller speaks.
Indices 1–${turns.length} = direct responses to each caller turn above.
Return ONLY a JSON array of ${totalResponses} strings.`;

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
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.15,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('AI gateway error:', response.status, err);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'AI dialogue generation failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || '[]';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let responses: string[];
    try {
      responses = JSON.parse(cleaned);
      if (!Array.isArray(responses)) throw new Error('Not an array');
    } catch {
      const matches = cleaned.match(/"([^"\\]*(\\.[^"\\]*)*)"/g);
      responses = matches
        ? matches.map((m: string) => m.replace(/^"|"$/g, ''))
        : cleaned.split('\n').filter((l: string) => l.trim()).map((l: string) => l.replace(/^\d+\.\s*/, '').trim());
    }

    // Ensure we have exactly totalResponses entries
    if (responses.length < 1 || !responses[0].toLowerCase().includes('thank') && !responses[0].toLowerCase().includes('calling') && !responses[0].toLowerCase().includes('assist')) {
      // If no valid opening, prepend one
      responses.unshift("Thank you for calling. This is Penguin AI, your automated healthcare assistant. How can I assist you today?");
    }

    while (responses.length < totalResponses) {
      responses.push("I've noted that, thank you. Is there anything else I can assist you with?");
    }
    responses = responses.slice(0, totalResponses);

    console.log(`Generated ${responses.length} responses (1 opening + ${turns.length} turn responses) for ${turns.length} caller turns`);

    return new Response(JSON.stringify({ responses }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-replay-dialogue error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
