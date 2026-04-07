import { createClient } from '@/lib/supabase/server'
import { Customer } from '@/lib/types'

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: crmUser } = await supabase
    .schema('crm')
    .from('users')
    .select('tenant_id')
    .eq('id', user?.id)
    .single()

  const { data: customers } = await supabase
    .schema('crm')
    .from('customers')
    .select('*')
    .eq('tenant_id', crmUser?.tenant_id)
    .order('created_at', { ascending: false })

  const statusColors: Record<string, string> = {
    active: 'bg-green-50 text-green-700',
    passive: 'bg-gray-100 text-gray-600',
    blocked: 'bg-red-50 text-red-600',
  }

  const statusLabels: Record<string, string> = {
    active: 'Aktif',
    passive: 'Pasif',
    blocked: 'Engelli',
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Müşteriler</h1>
          <p className="text-gray-500 text-sm mt-1">{customers?.length ?? 0} müşteri</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Müşteri Ekle
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Ad Soyad</th>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Telefon</th>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">E-posta</th>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Durum</th>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Kayıt Tarihi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {customers && customers.length > 0 ? (
              customers.map((c: Customer) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-medium">
                        {c.full_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{c.full_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{c.phone}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{c.email ?? '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[c.status]}`}>
                      {statusLabels[c.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(c.created_at).toLocaleDateString('tr-TR')}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                  Henüz müşteri yok. WhatsApp üzerinden ilk mesaj geldiğinde otomatik eklenecek.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
