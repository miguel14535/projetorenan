import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Appointment {
  id: string;
  title: string;
  description: string | null;
  appointment_date: string;
  appointment_time: string | null;
  person_id: string | null;
  notify_whatsapp: boolean;
  person: { name: string; phone: string | null } | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { appointments, recipientPhone, callMeBotKey } = await req.json();

    if (!appointments || !Array.isArray(appointments)) {
      return new Response(
        JSON.stringify({ error: "Appointments array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!recipientPhone) {
      return new Response(
        JSON.stringify({ error: "Recipient phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format message
    let message = "*Lembrete de Compromissos - amanha*\n\n";

    appointments.forEach((apt: Appointment, index: number) => {
      message += `${index + 1}. *${apt.title}*\n`;
      if (apt.appointment_time) {
        message += `   Horario: ${apt.appointment_time}\n`;
      }
      if (apt.description) {
        message += `   ${apt.description}\n`;
      }
      if (apt.person) {
        message += `   Pessoa: ${apt.person.name}\n`;
      }
      message += "\n";
    });

    message += "_Enviado via FinanceFlow_";

    let deliveryResult;

    // Option 1: CallMeBot (Free, requires setup)
    // The user needs to add the bot on WhatsApp and get their API key
    // URL format: https://api.callmebot.com/whatsapp.php?phone=[phone]&text=[text]&apikey=[key]
    if (callMeBotKey) {
      const phone = recipientPhone.replace(/\D/g, '');
      const encodedMessage = encodeURIComponent(message);
      const callMeBotUrl = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodedMessage}&apikey=${callMeBotKey}`;

      try {
        const response = await fetch(callMeBotUrl);
        if (response.ok) {
          deliveryResult = { method: "CallMeBot", success: true, message: "WhatsApp message sent via CallMeBot" };
        } else {
          deliveryResult = { method: "CallMeBot", success: false, error: "Failed to send via CallMeBot API" };
        }
      } catch (err) {
        deliveryResult = { method: "CallMeBot", success: false, error: err instanceof Error ? err.message : "API call failed" };
      }
    } else {
      // Option 2: Return the formatted message for manual sending or integration
      // This can be used with other services like Twilio, WhatsApp Business API, etc.
      deliveryResult = {
        method: "preview",
        success: true,
        message: "Message ready for delivery (configure CallMeBot API key for automatic sending)",
        formattedMessage: message,
        recipient: recipientPhone
      };
    }

    return new Response(
      JSON.stringify({
        success: deliveryResult.success,
        delivery: deliveryResult,
        appointmentsNotified: appointments.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error processing WhatsApp notification:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
