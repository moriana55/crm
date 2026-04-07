import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.https://jjepqeltkmudjawsmpm.supabase.co process.env.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqZXBxZWx0a211ZGphd3NtcG1sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTUwNjE3NywiZXhwIjoyMDkxMDgyMTc3fQ.0jdttl2EAhFofHPViCYx7UFSXgR_ie59LzbhPXHx1LU

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 50)
}

export async function POST(request: NextRequest) {
  try {
    const { userId, email, fullName, firmName } = await request.json()
    if (!userId || !email || !fullName || !firmName) {
      return NextResponse.json({ error: 'Eksik bilgi.' }, { status: 400 })
    }
    let slug = slugify(firmName)
    const { data: existing } = await supabase.schema('crm').from('tenants').select('slug').eq('slug', slug).single()
    if (existing) slug = `${slug}-${Date.now().toString(36)}`
    const { data: tenant, error: tenantError } = await supabase.schema('crm').from('tenants').insert({ name: firmName, slug, plan: 'free', is_active: true }).select().single()
    if (tenantError || !tenant) return NextResponse.json({ error: 'Firma olusturulamadi.' }, { status: 500 })
    const { error: userError } = await supabase.schema('crm').from('users').insert({ id: userId, tenant_id: tenant.id, full_name: fullName, email, role: 'owner', is_active: true })
    if (userError) {
      await supabase.schema('crm').from('tenants').delete().eq('id', tenant.id)
      return NextResponse.json({ error: 'Kullanici olusturulamadi.' }, { status: 500 })
    }
    await supabase.schema('crm').from('tenant_settings').insert({ tenant_id: tenant.id, slot_duration_min: 60, timezone: 'Europe/Istanbul' })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Sunucu hatasi.' }, { status: 500 })
  }
}
