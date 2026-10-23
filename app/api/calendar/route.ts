import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { addDays, format, parseISO } from 'date-fns'; // ADD THIS IMPORT

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { action, asset } = await req.json();
    
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar.events'],
    });
    const calendar = google.calendar({ version: 'v3', auth });
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    // Handle Deletion
    if (action === 'delete' && asset.google_event_id) {
      await calendar.events.delete({ calendarId, eventId: asset.google_event_id });
      return NextResponse.json({ success: true, action: 'deleted' });
    }

    // Handle Upsert (Add or Edit)
    if (action === 'upsert') {
      
      if (asset.lease_end) {
        // Calculate the next day for the end date
        const endDate = format(addDays(parseISO(asset.lease_end), 1), 'yyyy-MM-dd');

        const event = {
          summary: `Lease Ending: ${asset.name}`,
          description: `Tenant: ${asset.tenant_name || 'N/A'}\nContact: ${asset.tenant_contact || 'N/A'}\nAddress: ${asset.address}\n\nView Asset: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
          start: { date: asset.lease_end, timeZone: 'UTC' },
          end: { date: endDate, timeZone: 'UTC' }, // Use the next day here
          reminders: { useDefault: false, overrides: [{ method: 'email', minutes: 24 * 60 }] },
        };

        let eventId = asset.google_event_id;

        if (eventId) {
          await calendar.events.update({ calendarId, eventId, requestBody: event });
        } else {
          const res = await calendar.events.insert({ calendarId, requestBody: event });
          eventId = res.data.id;
        }

        await supabaseAdmin.from('assets').update({ google_event_id: eventId }).eq('id', asset.id);
        return NextResponse.json({ success: true, eventId });
      } 
      else if (asset.google_event_id) {
        await calendar.events.delete({ calendarId, eventId: asset.google_event_id });
        await supabaseAdmin.from('assets').update({ google_event_id: null }).eq('id', asset.id);
        return NextResponse.json({ success: true, action: 'removed_no_date' });
      }
    }

    return NextResponse.json({ success: true, action: 'none' });
  } catch (error: any) {
    console.error('Calendar API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}