import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: crmUser } = await supabase
    .schema('crm')
    .from('users')
    .select('*, tenants(*)')
    .eq('id', user?.id)
    .single()

  const tenantId = crmUser?.tenant_id

  const [{ count: customerCount }, { count: appointmentCount }, { count: messageCount }] = await Promise.all([
    supabase.schema('crm').from('customers').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.schema('crm').from('appointments').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'confirmed'),
    supabase.schema('crm').from('messages').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
  ])

  const stats = [
    { label: 'Toplam Müşteri', value: customerCount ?? 0, color: 'bg-blue-50 text-blue-700' },
    { label: 'Aktif Randevu', value: appointmentCount ?? 0, color: 'bg-green-50 text-green-700' },
    { label: 'Toplam Mesaj', value: messageCount ?? 0, color: 'bg-purple-50 text-purple-700' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Hoş geldiniz, {crmUser?.full_name ?? 'Kullanıcı'}
        </h1>
        <p className="text-gray-500 text-sm mt-1">{crmUser?.tenants?.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-6">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className={`text-3xl font-semibold mt-2 ${stat.color} rounded-lg px-3 py-1 inline-block`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-base font-medium text-gray-900 mb-4">Hızlı Erişim</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: '/dashboard/customers', label: 'Müşteriler' },
            { href: '/dashboard/appointments', label: 'Randevular' },
            { href: '/dashboard/whatsapp', label: 'WhatsApp' },
            { href: '/dashboard/settings', label: 'Ayarlar' },
          ].map(item => (
            <a
              key={item.href}
              href={item.href}
              className="border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-center"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
