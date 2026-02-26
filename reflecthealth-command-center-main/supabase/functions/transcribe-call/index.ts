const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: 'ELEVENLABS_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return new Response(JSON.stringify({ error: 'No audio file provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiFormData = new FormData();
    apiFormData.append('file', audioFile);
    apiFormData.append('model_id', 'scribe_v2');
    apiFormData.append('tag_audio_events', 'true');
    apiFormData.append('diarize', 'true');

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY },
      body: apiFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`ElevenLabs STT error [${response.status}]:`, errorText);
      return new Response(JSON.stringify({ error: `Transcription failed: ${response.status}` }), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();

    // Build speaker-separated transcript
    const speakers: Record<string, string[]> = {};
    let fullTranscript = '';

    if (result.words && result.words.length > 0) {
      let currentSpeaker = '';
      let currentText = '';

      for (const word of result.words) {
        const speaker = word.speaker || 'Speaker 1';
        if (speaker !== currentSpeaker) {
          if (currentText) {
            const label = currentSpeaker === 'speaker_00' ? 'Caller' : currentSpeaker === 'speaker_01' ? 'Agent' : currentSpeaker;
            fullTranscript += `${label}: ${currentText.trim()}\n`;
            if (!speakers[label]) speakers[label] = [];
            speakers[label].push(currentText.trim());
          }
          currentSpeaker = speaker;
          currentText = word.text || '';
        } else {
          currentText += word.text || '';
        }
      }

      if (currentText) {
        const label = currentSpeaker === 'speaker_00' ? 'Caller' : currentSpeaker === 'speaker_01' ? 'Agent' : currentSpeaker;
        fullTranscript += `${label}: ${currentText.trim()}\n`;
        if (!speakers[label]) speakers[label] = [];
        speakers[label].push(currentText.trim());
      }
    } else {
      fullTranscript = result.text || '';
    }

    // Normalize words: map speaker_id → speaker so the frontend can read w.speaker
    const normalizedWords = (result.words || []).map((w: Record<string, unknown>) => ({
      text: w.text ?? '',
      start: w.start ?? 0,
      end: w.end ?? 0,
      speaker: (w.speaker_id ?? w.speaker ?? 'speaker_0') as string,
    }));

    return new Response(JSON.stringify({
      transcript: fullTranscript || result.text,
      raw_text: result.text,
      words: normalizedWords,
      speakers,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('transcribe-call error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
