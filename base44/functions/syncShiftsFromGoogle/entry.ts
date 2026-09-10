import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    const now = new Date().toISOString();
    const future = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${future}&singleEvents=true&orderBy=startTime&q=Turno&maxResults=100`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    const items = (data.items || []).map(e => {
      // Parse shift ID from description
      const shiftIdMatch = e.description?.match(/ID Turno: (\w+)/);
      
      return {
        id: e.id,
        title: e.summary || '(Sin título)',
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
        location: e.location || '',
        description: e.description || '',
        htmlLink: e.htmlLink,
        shift_id: shiftIdMatch ? shiftIdMatch[1] : null,
        source: 'google',
      };
    });

    return Response.json({ events: items });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});