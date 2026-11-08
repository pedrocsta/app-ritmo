import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isPublicSupabaseConfigured } from '@/lib/supabase/config';

/** Refresh Auth cookies without turning a temporary Supabase failure into a site-wide HTTP 500. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isPublicSupabaseConfigured()) {
    console.error('[RYVMO] Auth: variaveis publicas do Supabase ausentes ou invalidas.');
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    return response;
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(items: Parameters<SetAllCookies>[0]) {
            items.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      },
    );
    await supabase.auth.getClaims();
  } catch (error) {
    // Fail closed: page/route handlers still verify the owner server-side.
    // Return an HTTP response rather than an uncaught exception from the Proxy.
    console.error('[RYVMO] Auth: nao foi possivel atualizar a sessao.', error instanceof Error ? error.name : 'erro desconhecido');
  }
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|apple-touch-icon.png|sw.js|manifest.webmanifest).*)'],
};
