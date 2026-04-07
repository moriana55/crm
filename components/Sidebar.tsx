'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import clsx from 'clsx'

const navItems = [
  { href: '/dashboard', label: 'Ana Panel', icon: '▦' },
  { href: '/dashboard/customers', label: 'Müşteriler', icon: '👥' },
  { href: '/dashboard/appointments', label: 'Randevular', icon: '📅' },
  { href: '/dashboard/whatsapp', label: 'WhatsApp', icon: '💬' },
  { href: '/dashboard/templates', label: 'Şablonlar', icon: '📄' },
  { href: '/dashboard/settings', label: 'Ayarlar', icon: '⚙️' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-56 bg-white border-r border-gray-100 flex flex-col h-full">
      <div className="px-6 py-5 border-b border-gray-100">
        <span className="text-base font-semibold text-gray-900">CRM Panel</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname === item.href
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <span>↩</span>
          Çıkış Yap
        </button>
      </div>
    </aside>
  )
}
