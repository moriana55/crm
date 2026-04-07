'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const [step, setStep] = useState<'form' | 'loading' | 'done'>('form')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    firmName: '',
    fullName: '',
    email: '',
    password: '',
    passwordConfirm: '',
  })
  const router = useRouter()
  const supabase = createClient()

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleRegister() {
    setError('')
    if (!form.firmName || !form.fullName || !form.email || !form.password) {
      setError('Tüm alanları doldurunuz.')
      return
    }
    if (form.password.length < 6) {
      setError('Şifre en az 6 karakter olmalı.')
      return
    }
    if (form.password !== form.passwordConfirm) {
      setError('Şifreler eşleşmiyor.')
      return
    }
    setStep('loading')
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      })
      if (authError) { setError(authError.message); setStep('form'); return }
      const userId = authData.user?.id
      if (!userId) { setError('Kullanıcı oluşturulamadı.'); setStep('form'); return }
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email: form.email, fullName: form.fullName, firmName: form.firmName }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Hata oluştu.'); setStep('form'); return }
      setStep('done')
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch { setError('Beklenmeyen hata.'); setStep('form') }
  }

  if (step === 'done') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Hesabınız oluşturuldu!</h2>
        <p className="text-gray-500 text-sm">Dashboard'a yönlendiriliyorsunuz...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Hesap Oluştur</h1>
          <p className="text-gray-500 text-sm mt-1">CRM panelinizi ücretsiz kurun</p>
        </div>
        <div className="space-y-4">
          {[
            { label: 'Firma Adı', field: 'firmName', type: 'text', placeholder: 'Hırdavatpro' },
            { label: 'Ad Soyad', field: 'fullName', type: 'text', placeholder: 'Yiğit Ertürk' },
            { label: 'E-posta', field: 'email', type: 'email', placeholder: 'ornek@firma.com' },
            { label: 'Şifre', field: 'password', type: 'password', placeholder: '••••••••' },
            { label: 'Şifre Tekrar', field: 'passwordConfirm', type: 'password', placeholder: '••••••••' },
          ].map(({ label, field, type, placeholder }) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type={type}
                value={form[field as keyof typeof form]}
                onChange={e => update(field, e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={placeholder}
              />
            </div>
          ))}
          {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg">{error}</p>}
          <button onClick={handleRegister} disabled={step === 'loading'}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
            {step === 'loading' ? 'Hesap oluşturuluyor...' : 'Hesap Oluştur'}
          </button>
          <p className="text-center text-sm text-gray-500">
            Zaten hesabınız var mı?{' '}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">Giriş Yap</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
