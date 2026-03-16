import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = 'ExtraTaff <notifications@extrataff.fr>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, to, data } = await req.json()

    let subject = ''
    let html = ''

    // ── TYPE 1 : Nouvelle mission matchée (pour talent) ──
    if (type === 'new_mission') {
      subject = data.is_urgent
        ? `🔴 URGENT — Nouvelle mission ${data.position} disponible !`
        : `🎯 Nouvelle mission ${data.position} disponible !`

      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⚡ ExtraTaff</h1>
          </div>
          <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
            ${data.is_urgent ? '<div style="background: #FEE2E2; border: 1px solid #FCA5A5; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; color: #DC2626; font-weight: bold;">🔴 Mission URGENTE</div>' : ''}
            <h2 style="color: #1a1a2e; margin-top: 0;">Bonjour ${data.talent_name} !</h2>
            <p style="color: #4B5563;">Une nouvelle mission correspond à votre profil :</p>
            <div style="background: #F3F4F6; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 4px 0;"><strong>Poste :</strong> ${data.position}</p>
              <p style="margin: 4px 0;"><strong>Établissement :</strong> ${data.establishment_name}</p>
              <p style="margin: 4px 0;"><strong>Date :</strong> ${data.start_date}</p>
              ${data.hourly_rate ? `<p style="margin: 4px 0;"><strong>Tarif :</strong> ${data.hourly_rate}€/h</p>` : ''}
            </div>
            <a href="https://extrataff.fr/talent/missions"
              style="display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 8px;">
              Voir la mission →
            </a>
            <p style="color: #9CA3AF; font-size: 12px; margin-top: 32px;">
              Vous recevez cet email car vous avez activé les notifications email sur ExtraTaff.<br>
              <a href="https://extrataff.fr/talent/profile-edit" style="color: #6B7280;">Gérer mes préférences</a>
            </p>
          </div>
        </div>
      `
    }

    // ── TYPE 2 : Nouvelle candidature reçue (pour établissement) ──
    if (type === 'new_application') {
      subject = `📩 Nouvelle candidature reçue — ${data.position}`
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⚡ ExtraTaff</h1>
          </div>
          <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
            <h2 style="color: #1a1a2e; margin-top: 0;">Nouvelle candidature !</h2>
            <p style="color: #4B5563;">Un talent a postulé à votre mission :</p>
            <div style="background: #F3F4F6; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 4px 0;"><strong>Talent :</strong> ${data.talent_name}</p>
              <p style="margin: 4px 0;"><strong>Poste :</strong> ${data.position}</p>
              <p style="margin: 4px 0;"><strong>Mission du :</strong> ${data.start_date}</p>
              ${data.talent_experience ? `<p style="margin: 4px 0;"><strong>Expérience :</strong> ${data.talent_experience} ans</p>` : ''}
            </div>
            <a href="https://extrataff.fr/establishment/applications"
              style="display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 8px;">
              Voir la candidature →
            </a>
            <p style="color: #9CA3AF; font-size: 12px; margin-top: 32px;">
              Vous recevez cet email car vous avez activé les notifications email sur ExtraTaff.<br>
              <a href="https://extrataff.fr/establishment/profile-edit" style="color: #6B7280;">Gérer mes préférences</a>
            </p>
          </div>
        </div>
      `
    }

    // ── TYPE 3 : Candidature acceptée ou déclinée (pour talent) ──
    if (type === 'application_status') {
      const accepted = data.status === 'accepted'
      subject = accepted
        ? `✅ Votre candidature a été acceptée — ${data.position}`
        : `❌ Votre candidature n'a pas été retenue — ${data.position}`

      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⚡ ExtraTaff</h1>
          </div>
          <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
            <div style="background: ${accepted ? '#D1FAE5' : '#FEE2E2'}; border-radius: 8px; padding: 16px; margin-bottom: 20px; text-align: center;">
              <p style="font-size: 20px; margin: 0;">${accepted ? '✅ Candidature acceptée !' : '❌ Candidature non retenue'}</p>
            </div>
            <h2 style="color: #1a1a2e; margin-top: 0;">Bonjour ${data.talent_name} !</h2>
            <div style="background: #F3F4F6; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 4px 0;"><strong>Poste :</strong> ${data.position}</p>
              <p style="margin: 4px 0;"><strong>Établissement :</strong> ${data.establishment_name}</p>
              <p style="margin: 4px 0;"><strong>Date :</strong> ${data.start_date}</p>
            </div>
            ${accepted ? `
            <div style="background: #ECFDF5; border: 1px solid #6EE7B7; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <p style="color: #065F46; margin: 0;">🎉 Félicitations ! L'établissement va vous contacter prochainement pour confirmer les détails.</p>
            </div>` : ''}
            <a href="https://extrataff.fr/talent/missions"
              style="display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Voir d'autres missions →
            </a>
            <p style="color: #9CA3AF; font-size: 12px; margin-top: 32px;">
              <a href="https://extrataff.fr/talent/profile-edit" style="color: #6B7280;">Gérer mes préférences</a>
            </p>
          </div>
        </div>
      `
    }

    // Envoi via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Erreur Resend')
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})