import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { addDays, format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar.events'],
    });
    const calendar = google.calendar({ version: 'v3', auth });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const targetDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');
    const { data: assets, error } = await supabase
      .from('assets')
      .select('*')
      .eq('lease_end', targetDate);

    if (error) throw error;
    if (!assets || assets.length === 0) return NextResponse.json({ message: 'No leases ending in 30 days' });

    const results = [];
    for (const asset of assets) {
      const event = {
        summary: `Lease Ending in 30 Days: ${asset.name}`,
        description: `Tenant: ${asset.tenant_name}\nContact: ${asset.tenant_contact}\nAddress: ${asset.address}\n\nView Asset: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        start: { date: targetDate, timeZone: 'UTC' },
        end: { date: targetDate, timeZone: 'UTC' },
        reminders: { useDefault: false, overrides: [{ method: 'email', minutes: 24 * 60 }] },
      };

      let eventId = asset.google_event_id;

      if (eventId) {
        // Update existing event instead of creating a duplicate
        await calendar.events.update({ calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary', eventId, requestBody: event });
      } else {
        // Create new event
        const res = await calendar.events.insert({ calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary', requestBody: event });
        eventId = res.data.id;
        await supabase.from('assets').update({ google_event_id: eventId }).eq('id', asset.id);
      }
      results.push(eventId);
    }

    return NextResponse.json({ message: `Synced ${results.length} calendar reminders`, events: results });
  } catch (error: any) {
    console.error('Cron Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}