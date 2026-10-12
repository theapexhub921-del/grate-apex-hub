import { withSupabase } from 'npm:@supabase/server@1';

const OPENAI_REALTIME_URL = 'https://api.openai.com/v1/realtime/client_secrets';
const REALTIME_MODEL = 'gpt-realtime-2.1';

const tutorInstructions = [
  'You are the GrAte Apex voice tutor for learners studying health and biomedical subjects.',
  'Teach clearly and warmly. Ask one short question at a time, encourage recall before giving an answer,',
  'explain difficult ideas in plain language, and check understanding before moving on.',
  'Keep the session educational. Do not diagnose, prescribe, or replace advice from a qualified clinician.',
].join(' ');

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function safetyIdentifier(userId: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(userId));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  // OpenAI limits safety identifiers to 64 characters. Keep a stable prefix
  // and truncate the one-way hash to fit that limit.
  return `grateapex_${hex.slice(0, 54)}`;
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (request, context) => {
    if (request.method !== 'POST') return jsonError('Use POST to start a tutor session.', 405);

    const userClaims = context.userClaims as { id?: unknown; sub?: unknown } | undefined;
    const userId = typeof userClaims?.sub === 'string'
      ? userClaims.sub
      : typeof userClaims?.id === 'string'
        ? userClaims.id
        : null;
    if (!userId) return jsonError('A signed-in user is required.', 401);

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return jsonError('The AI tutor provider has not been configured yet.', 503);

    let upstream: Response;
    try {
      upstream = await fetch(OPENAI_REALTIME_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Safety-Identifier': await safetyIdentifier(userId),
        },
        body: JSON.stringify({
          session: {
            type: 'realtime',
            model: REALTIME_MODEL,
            instructions: tutorInstructions,
            audio: { output: { voice: 'marin' } },
          },
        }),
      });
    } catch {
      return jsonError('Could not reach the AI tutor provider. Try again shortly.', 502);
    }

    const result = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      const providerError = result?.error as { type?: unknown; code?: unknown; param?: unknown } | undefined;
      const errorType = typeof providerError?.type === 'string' ? providerError.type : 'unknown_error';
      const errorCode = typeof providerError?.code === 'string' ? providerError.code : 'no_code';
      const errorParam = typeof providerError?.param === 'string' ? providerError.param : null;
      const requestId = upstream.headers.get('x-request-id');
      console.error('OpenAI Realtime session request failed', {
        status: upstream.status,
        type: errorType,
        code: errorCode,
        param: errorParam,
        requestId,
      });
      return jsonError(
        `The AI tutor provider rejected the request (${upstream.status}, ${errorCode}). Check the Edge Function logs in Supabase.`,
        502,
      );
    }
    // Realtime client_secrets currently returns {value, expires_at, session}.
    // Normalize it to the nested shape already consumed by the app.
    if (typeof result?.value !== 'string' || typeof result?.expires_at !== 'number') {
      console.error('OpenAI Realtime session response did not include a client secret', {
        requestId: upstream.headers.get('x-request-id'),
      });
      return jsonError('The AI tutor provider returned an unexpected response. Check the Edge Function logs in Supabase.', 502);
    }

    return Response.json({
      client_secret: {
        value: result.value,
        expires_at: result.expires_at,
      },
      model: REALTIME_MODEL,
    });
  }),
};
