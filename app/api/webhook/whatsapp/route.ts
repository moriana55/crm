import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event, data } = body

    if (event !== 'messages.upsert') {
      return NextResponse.json({ ok: true })
    }

    const message = data?.messages?.[0]
    if (!message || message.key?.fromMe) return NextResponse.json({ ok: true })

    const waInstanceId = data?.instance
    const phone = message.key?.remoteJid?.replace('@s.whatsapp.net', '')
    const content = message.message?.conversation ||
                    message.message?.extendedTextMessage?.text || ''

    if (!phone || !content) return NextResponse.json({ ok: true })

    // Tenant'ı bul
    const { data: tenant } = await supabase
      .schema('crm')
      .from('tenants')
      .select('id')
      .eq('wa_instance_id', waInstanceId)
      .single()

    if (!tenant) return NextResponse.json({ ok: true })

    const tenantId = tenant.id
    const waJid = message.key.remoteJid

    // Müşteriyi bul veya oluştur
    let { data: customer } = await supabase
      .schema('crm')
      .from('customers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('phone', phone)
      .single()

    if (!customer) {
      const { data: newCustomer } = await supabase
        .schema('crm')
        .from('customers')
        .insert({
          tenant_id: tenantId,
          full_name: message.pushName || phone,
          phone,
          wa_jid: waJid,
        })
        .select()
        .single()

      customer = newCustomer
    } else {
      // Son iletişim zamanını güncelle
      await supabase
        .schema('crm')
        .from('customers')
        .update({ last_contact_at: new Date().toISOString(), wa_jid: waJid })
        .eq('id', customer.id)
    }

    // Mesajı kaydet
    await supabase.schema('crm').from('messages').insert({
      tenant_id: tenantId,
      customer_id: customer!.id,
      direction: 'inbound',
      content,
      wa_message_id: message.key?.id,
      message_type: 'text',
      is_bot: false,
    })

    // Bot session'ı kontrol et
    const { data: session } = await supabase
      .schema('crm')
      .from('bot_sessions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('customer_id', customer!.id)
      .single()

    await handleBotFlow({
      tenantId,
      customer: customer!,
      session,
      content,
      waJid,
      waInstanceId,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function handleBotFlow({ tenantId, customer, session, content, waJid, waInstanceId }: {
  tenantId: string
  customer: Record<string, unknown>
  session: Record<string, unknown> | null
  content: string
  waJid: string
  waInstanceId: string
}) {
  const state = session?.state ?? 'idle'
  const lower = content.toLowerCase().trim()

  // Tenant ayarlarını al
  const { data: settings } = await supabase
    .schema('crm')
    .from('tenant_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  // Auto reply kontrolü
  if (settings?.auto_replies) {
    for (const [trigger, reply] of Object.entries(settings.auto_replies)) {
      if (lower.includes(trigger.toLowerCase())) {
        await sendWhatsApp(waInstanceId, waJid, reply as string, tenantId)
        return
      }
    }
  }

  if (state === 'idle') {
    if (lower.includes('randevu') || lower.includes('appointment')) {
      await updateSession(tenantId, customer.id as string, 'awaiting_date', {})
      await sendWhatsApp(
        waInstanceId, waJid,
        `Merhaba ${customer.full_name}! 😊 Randevu almak istediğiniz tarihi yazabilir misiniz? (Örn: 15 Nisan, yarın, Pazartesi)`,
        tenantId
      )
    } else if (lower.includes('iptal')) {
      await updateSession(tenantId, customer.id as string, 'cancelling', {})
      await sendWhatsApp(
        waInstanceId, waJid,
        'Hangi randevunuzu iptal etmek istiyorsunuz? Randevu tarihini yazar mısınız?',
        tenantId
      )
    } else {
      await sendWhatsApp(
        waInstanceId, waJid,
        'Merhaba! Size nasıl yardımcı olabilirim?\n\n📅 *Randevu* almak için "randevu" yazın\n❌ *İptal* için "iptal" yazın',
        tenantId
      )
    }
  } else if (state === 'awaiting_date') {
    await updateSession(tenantId, customer.id as string, 'awaiting_time', { date: content })
    await sendWhatsApp(
      waInstanceId, waJid,
      `${content} tarihi için hangi saati tercih edersiniz? (Örn: 10:00, 14:30)`,
      tenantId
    )
  } else if (state === 'awaiting_time') {
    const ctx = (session?.context as Record<string, string>) ?? {}
    await updateSession(tenantId, customer.id as string, 'awaiting_confirm', {
      ...ctx,
      time: content,
    })
    await sendWhatsApp(
      waInstanceId, waJid,
      `📋 Randevu özeti:\n📅 Tarih: ${ctx.date}\n🕐 Saat: ${content}\n\nOnaylıyor musunuz? (evet/hayır)`,
      tenantId
    )
  } else if (state === 'awaiting_confirm') {
    const ctx = (session?.context as Record<string, string>) ?? {}
    if (lower === 'evet' || lower === 'e') {
      // Randevuyu oluştur
      const startAt = new Date().toISOString() // gerçekte tarih parse edilecek
      const endAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

      const { data: appointment } = await supabase.schema('crm').from('appointments').insert({
        tenant_id: tenantId,
        customer_id: customer.id,
        title: `Randevu - ${customer.full_name}`,
        start_at: startAt,
        end_at: endAt,
        status: 'confirmed',
      }).select().single()

      // Bildirim kaydı oluştur
      if (appointment) {
        await supabase.schema('crm').from('notifications').insert({
          tenant_id: tenantId,
          appointment_id: appointment.id,
          channel: 'whatsapp',
          recipient: customer.phone as string,
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
      }

      await updateSession(tenantId, customer.id as string, 'idle', {})
      await sendWhatsApp(
        waInstanceId, waJid,
        `✅ Randevunuz onaylandı!\n📅 ${ctx.date} - ${ctx.time}\n\nGörüşmek üzere! 🙏`,
        tenantId
      )
    } else {
      await updateSession(tenantId, customer.id as string, 'idle', {})
      await sendWhatsApp(waInstanceId, waJid, 'Randevu iptal edildi. Başka bir konuda yardımcı olabilir miyim?', tenantId)
    }
  } else if (state === 'cancelling') {
    await updateSession(tenantId, customer.id as string, 'idle', {})
    await sendWhatsApp(
      waInstanceId, waJid,
      '❌ Randevunuz iptal edildi. Yeni bir randevu almak ister misiniz?',
      tenantId
    )
  }
}

async function updateSession(tenantId: string, customerId: string, state: string, context: Record<string, unknown>) {
  await supabase.schema('crm').from('bot_sessions').upsert({
    tenant_id: tenantId,
    customer_id: customerId,
    state,
    context,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'tenant_id,customer_id' })
}

async function sendWhatsApp(instanceId: string, to: string, message: string, tenantId: string) {
  try {
    const evolutionUrl = process.env.EVOLUTION_API_URL
    const apiKey = process.env.EVOLUTION_API_KEY

    await fetch(`${evolutionUrl}/message/sendText/${instanceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey!,
      },
      body: JSON.stringify({ number: to, text: message }),
    })

    // Giden mesajı kaydet
    const { data: customer } = await supabase
      .schema('crm')
      .from('customers')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('wa_jid', to)
      .single()

    if (customer) {
      await supabase.schema('crm').from('messages').insert({
        tenant_id: tenantId,
        customer_id: customer.id,
        direction: 'outbound',
        content: message,
        message_type: 'text',
        is_bot: true,
      })
    }
  } catch (err) {
    console.error('WhatsApp send error:', err)
  }
}
