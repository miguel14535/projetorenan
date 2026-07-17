import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Fetch appointments for tomorrow with WhatsApp notifications enabled
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        title,
        description,
        appointment_date,
        appointment_time,
        notify_whatsapp,
        person:people(name, phone)
      `)
      .eq('appointment_date', tomorrowStr)
      .eq('notify_whatsapp', true);

    if (appointmentsError) {
      throw appointmentsError;
    }

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No appointments for tomorrow with WhatsApp notifications" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch profiles with WhatsApp numbers to notify
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, whatsapp_number');

    if (profilesError) {
      throw profilesError;
    }

    const notificationsSent: any[] = [];

    // Format the message
    let message = `\ud83d\udccc *Lembrete: Compromissos para amanha*\n`;
    message += `\ud83d\udcc5 Data: ${tomorrow.toLocaleDateString('pt-BR')}\n\n`;

    (appointments as any[]).forEach((apt, index) => {
      message += `${index + 1}. *${apt.title}*\n`;
      if (apt.appointment_time) {
        message += `   \u23f0 Horario: ${apt.appointment_time}\n`;
      }
      if (apt.description) {
        message += `   \ud83d\udcdd ${apt.description}\n`;
      }
      if (apt.person) {
        message += `   \ud83d\udc64 ${apt.person.name}\n`;
      }
      message += `\n`;
    });

    message += `_Enviado via FinanceFlow_`;

    // For each profile with WhatsApp, log the notification
    // In production, this would call the actual WhatsApp API
    for (const profile of profiles || []) {
      if (profile.whatsapp_number) {
        notificationsSent.push({
          phoneNumber: profile.whatsapp_number,
          profileName: profile.name,
          messagePreview: message.substring(0, 100) + '...',
        });
      }
    }

    // Log the notifications (in production, actually send via WhatsApp API)
    console.log(`Found ${appointments.length} appointments for tomorrow (${tomorrowStr})`);
    console.log(`Would send notifications to ${notificationsSent.length} users`);
    console.log('Message:', message);

    return new Response(
      JSON.stringify({
        success: true,
        date: tomorrowStr,
        appointmentsFound: appointments.length,
        notificationsPrepared: notificationsSent.length,
        notifications: notificationsSent,
        formattedMessage: message,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error checking appointments:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
