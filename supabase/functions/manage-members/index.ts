import { makeHandler } from './handler.mjs';
const handler = makeHandler({
 base: (Deno.env.get('SUPABASE_URL') || '').replace(/\/$/, ''),
 serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
 allowedOrigins: (Deno.env.get('ALLOWED_ORIGINS') || '').split(',')
});
Deno.serve(handler);
