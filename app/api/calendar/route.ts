import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { differenceInDays, parseISO } from 'date-fns';

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
      const daysLeft = asset.lease_end ? differenceInDays(parseISO(asset.lease_end), new Date()) : -1;
      
      // Only sync to calendar if lease is ending within 30 days
      if (daysLeft <= 30 && daysLeft >= 0) {
        const event = {
          summary: `Lease Ending: ${asset.name}`,
          description: `Tenant: ${asset.tenant_name}\nContact: ${asset.tenant_contact}\nAddress: ${asset.address}\n\nView Asset: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
          start: { date: asset.lease_end, timeZone: 'UTC' },
          end: { date: asset.lease_end, timeZone: 'UTC' },
          reminders: { useDefault: false, overrides: [{ method: 'email', minutes: 24 * 60 }] },
        };

        let eventId = asset.google_event_id;

        if (eventId) {
          // Update existing event
          await calendar.events.update({ calendarId, eventId, requestBody: event });
        } else {
          // Create new event
          const res = await calendar.events.insert({ calendarId, requestBody: event });
          eventId = res.data.id;
        }

        // Save the event ID back to Supabase
        await supabaseAdmin.from('assets').update({ google_event_id: eventId }).eq('id', asset.id);
        return NextResponse.json({ success: true, eventId });
      } 
      // If lease was changed to be more than 30 days away, remove the old event
      else if (asset.google_event_id) {
        await calendar.events.delete({ calendarId, eventId: asset.google_event_id });
        await supabaseAdmin.from('assets').update({ google_event_id: null }).eq('id', asset.id);
        return NextResponse.json({ success: true, action: 'removed_out_of_range' });
      }
    }

    return NextResponse.json({ success: true, action: 'none' });
  } catch (error: any) {
    console.error('Calendar API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}