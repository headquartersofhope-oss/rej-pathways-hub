/**
 * sendNotification — unified notification orchestrator.
 *
 * Single entry point for all outbound notifications across HOH/Pathways.
 * Supports email (live via Core.SendEmail), SMS (live via Twilio if configured),
 * and in-app (always logged to Notification entity).
 *
 * Call as:
 *   base44.functions.invoke('sendNotification', {
 *     channel: ['email', 'sms', 'in_app'],     // string or array of strings
 *     type: 'case_manager_assigned',
 *     recipient_user_id: 'user_123',           // optional
 *     recipient_email: 'cm@example.com',       // required for email channel
 *     recipient_phone: '+15551234567',         // required for SMS channel
 *     recipient_name: 'Jane Doe',
 *     subject: 'New participant assigned',
 *     body: 'Tanya Brooks has been assigned to your caseload.',
 *     link_url: '/residents/abc123',           // optional deep link
 *     resident_id: 'res_abc',                  // optional context
 *     global_resident_id: 'GRI-00001',
 *     sent_by: 'system',                       // user id or 'system'
 *   });
 *
 * Env vars (optional, for SMS):
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const {
      channel = ['in_app'],
      type = 'custom',
      recipient_user_id,
      recipient_email,
      recipient_phone,
      recipient_name,
      subject = '',
      body: messageBody = '',
      link_url,
      resident_id,
      global_resident_id,
      sent_by = 'system',
    } = body;

    const channels = Array.isArray(channel) ? channel : [channel];
    const results: Record<string, any> = {};
    let primaryStatus = 'queued';

    // === Email channel ===
    if (channels.includes('email') && recipient_email) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: recipient_email,
          subject: subject || 'Notification from Pathways',
          body: messageBody,
        });
        results.email = { success: true };
        primaryStatus = 'sent';
      } catch (e) {
        results.email = { success: false, error: e.message };
      }
    } else if (channels.includes('email')) {
      results.email = { success: false, error: 'No recipient_email provided' };
    }

    // === SMS channel (Twilio) ===
    if (channels.includes('sms') && recipient_phone) {
      const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      const twilioFromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

      if (twilioSid && twilioToken && twilioFromNumber) {
        try {
          const auth = btoa(`${twilioSid}:${twilioToken}`);
          const params = new URLSearchParams({
            To: recipient_phone,
            From: twilioFromNumber,
            Body: `${subject ? subject + '\n\n' : ''}${messageBody}`.slice(0, 1600),
          });
          const twilioResp = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: params.toString(),
            }
          );
          if (twilioResp.ok) {
            const data = await twilioResp.json();
            results.sms = { success: true, twilio_sid: data.sid };
            primaryStatus = 'sent';
          } else {
            const error = await twilioResp.text();
            results.sms = { success: false, error };
          }
        } catch (e) {
          results.sms = { success: false, error: e.message };
        }
      } else {
        results.sms = {
          success: false,
          stub: true,
          message: 'Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER in Base44 env.',
        };
      }
    } else if (channels.includes('sms')) {
      results.sms = { success: false, error: 'No recipient_phone provided' };
    }

    // === In-app channel — always create Notification record (also logs email + sms attempts) ===
    let notificationRecord = null;
    try {
      notificationRecord = await base44.asServiceRole.entities.Notification.create({
        resident_id,
        global_resident_id,
        recipient_user_id,
        recipient_email,
        recipient_phone,
        recipient_name,
        channel: channels[0] || 'in_app',
        type,
        subject,
        body: messageBody,
        link_url,
        sent_by,
        status: results.email?.success || results.sms?.success ? 'sent' : primaryStatus,
        error_message:
          results.email?.error || results.sms?.error || null,
      });
      results.in_app = { success: true, notification_id: notificationRecord.id };
    } catch (e) {
      results.in_app = { success: false, error: e.message };
    }

    return Response.json({
      success: true,
      channels,
      results,
      notification_id: notificationRecord?.id,
    });

  } catch (error) {
    console.error('[sendNotification] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
