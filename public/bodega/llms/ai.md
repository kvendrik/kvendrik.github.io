# Bodega reference: AI through OpenRouter (optional)

Part of the Bodega guide (https://kvendrik.com/bodega/llms.md). Used in **Runbook step 9**.

**An API key in a static page is a public key.** So a Supabase Edge Function holds it, and the page
only talks to that function.

```
page ──(session token)──► Edge Function "ask" ──(secret key)──► OpenRouter
                              ├─ on the allow-list?
                              └─ ai_take_quota(): one request off today's count
```

| Layer | Guard |
| --- | --- |
| Key | Edge Function secret `OPENROUTER_API_KEY`. Never in the page, the repo or the chat. |
| Who | `verify_jwt: true`; the function resolves the user from the token (401) and checks `allowed_emails` (403 `not_listed`). |
| Where | Only answers `Origin: <site-origin>` (403 `bad_origin`). A script can fake this; it only stops other websites. |
| What | The server picks the models, caps `max_tokens` (400) and the prompt (1000 characters), and owns the system prompt. The page sends `{ prompt }` only. |
| How much | 20 per person per UTC day and 500 for the whole site, counted atomically. Failed calls are refunded. |
| Worst case | A credit limit on the OpenRouter key. This is the real backstop. |

## 1. The quota (SQL)

```sql
create table if not exists public.ai_usage (
  user_id  uuid not null references auth.users (id) on delete cascade,
  day      date not null default ((now() at time zone 'utc')::date),
  requests integer not null default 0 check (requests >= 0),
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
create policy "ai_usage_select_own" on public.ai_usage
  for select to authenticated using (user_id = (select auth.uid()));   -- read own count; no writes

-- New count; null when this user is at p_limit; -1 when the whole site is at p_global_limit.
create or replace function public.ai_take_quota(p_user uuid, p_limit integer, p_global_limit integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_today date := (now() at time zone 'utc')::date; v_count integer;
begin
  if (select coalesce(sum(requests), 0) from public.ai_usage where day = v_today) >= p_global_limit then
    return -1;
  end if;
  insert into public.ai_usage as u (user_id, day, requests) values (p_user, v_today, 1)
  on conflict (user_id, day) do update set requests = u.requests + 1 where u.requests < p_limit
  returning u.requests into v_count;
  return v_count;
end; $$;

create or replace function public.ai_refund_quota(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  update public.ai_usage set requests = greatest(requests - 1, 0)
   where user_id = p_user and day = (now() at time zone 'utc')::date;
$$;

revoke all on function public.ai_take_quota(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.ai_refund_quota(uuid) from public, anon, authenticated;
grant execute on function public.ai_take_quota(uuid, integer, integer) to service_role;
grant execute on function public.ai_refund_quota(uuid) to service_role;
```

`on conflict ... do update ... where u.requests < p_limit` is what holds under parallel requests: at
the limit the update doesn't happen, and `returning` gives null.

## 2. The function

Source: https://raw.githubusercontent.com/kvendrik/kvendrik.github.io/main/bodega/supabase/functions/ask/index.ts

Replace before deploying:
- `ORIGINS` -> `["<site-origin>"]`
- the `HTTP-Referer` header -> `<page-url>`
- `X-Title` -> the app's name
- the `SYSTEM` prompt -> the app's voice

Deploy as `ask` with **`verify_jwt: true`** (`deploy_edge_function`, the Supabase CLI, or the
dashboard's function editor).

**Models.** Last verified 2026-11-18, from secondary sources only (this sandbox couldn't reach
openrouter.ai): `openai/gpt-4o-mini` retires 2027-01-14, and `google/gemini-2.0-flash-001` was shut
down 2026-06-01. The default list is `openai/gpt-4o-mini,meta-llama/llama-3.3-70b-instruct`.
Check https://openrouter.ai/models, and if a model is gone, set the `OPENROUTER_MODELS` secret
(comma-separated, up to 3) instead of editing code. `models` is OpenRouter's fallback list: it tries
the next model when one is down, rate-limited or refuses
(https://openrouter.ai/docs/guides/routing/model-fallbacks).

CORS must allow `authorization, x-client-info, apikey, content-type` (what supabase-js sends). The
function logs OpenRouter errors with `console.error`; it never sends them to the browser.

## 3. Responses

`code` is stable; `error` is display copy and may be reworded.

| Status | `code` | Meaning |
| --- | --- | --- |
| 200 | (none) | `{ answer, model, used, limit }` |
| 400 / 413 | `empty_prompt` / `prompt_too_long` | Bad input |
| 401 | `no_session` | Not signed in, or the session is invalid |
| 403 | `bad_origin` | `Origin` isn't in `ORIGINS`: check it matches `<site-origin>` exactly |
| 403 | `not_listed` | Not on the allow-list |
| 405 | `method_not_allowed` | Not a POST |
| 429 | `user_limit` / `shop_limit` | Person's or site's daily limit reached |
| 500 | `quota_error` | The quota SQL failed: see the function logs |
| 502 | `upstream_error` | OpenRouter refused (model gone, no credit, bad key): see the function logs |
| 503 | `no_key` | `OPENROUTER_API_KEY` isn't set |
| 504 | `upstream_timeout` | OpenRouter took more than 30s |

## 4. The page

```js
const { data, error } = await sb.functions.invoke("ask", { body: { prompt } });   // adds the session
if (error) {
  const body = await error.context.json().catch(() => null);   // { error, code, used?, limit? }
  // show "✕ " + body.error
} else {
  answerEl.textContent = data.answer;   // model output is untrusted: textContent, never innerHTML
}
const { data: row } = await sb.from("ai_usage").select("requests")   // remaining today
  .eq("day", new Date().toISOString().slice(0, 10)).maybeSingle();
```

## 5. The key (human)

Last verified 2026-11-18.
- Create a key at `https://openrouter.ai/workspaces/default/keys` (it starts with `sk-or-`) and give
  it a **credit limit**.
- Store it at `https://supabase.com/dashboard/project/<ref>/functions/secrets`: name
  `OPENROUTER_API_KEY`, then Save. No redeploy is needed.
- `create_edge_function_secret` shows a secure form instead. If it comes back `declined` (Supabase
  can pause it), give the link above in the same message. Never take a key in chat.
- Logs: `https://supabase.com/dashboard/project/<ref>/functions/ask/logs`.
