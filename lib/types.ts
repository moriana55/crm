export type Plan = 'free' | 'starter' | 'pro' | 'enterprise'
export type UserRole = 'owner' | 'admin' | 'staff'
export type CustomerStatus = 'active' | 'passive' | 'blocked'
export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
export type MessageDirection = 'inbound' | 'outbound'
export type MessageType = 'text' | 'image' | 'audio' | 'document'
export type NotificationChannel = 'whatsapp' | 'email' | 'sms'
export type NotificationStatus = 'pending' | 'sent' | 'failed'

export interface Tenant {
  id: string
  name: string
  slug: string
  wa_phone: string | null
  wa_instance_id: string | null
  plan: Plan
  is_active: boolean
  created_at: string
}

export interface CrmUser {
  id: string
  tenant_id: string
  full_name: string
  email: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface Customer {
  id: string
  tenant_id: string
  full_name: string
  phone: string
  email: string | null
  wa_jid: string | null
  notes: string | null
  status: CustomerStatus
  last_contact_at: string | null
  created_at: string
}

export interface Appointment {
  id: string
  tenant_id: string
  customer_id: string
  assigned_to: string | null
  title: string
  start_at: string
  end_at: string
  status: AppointmentStatus
  cancel_reason: string | null
  gcal_event_id: string | null
  created_at: string
  customer?: Customer
  assigned_user?: CrmUser
}

export interface Message {
  id: string
  tenant_id: string
  customer_id: string
  direction: MessageDirection
  content: string
  wa_message_id: string | null
  message_type: MessageType
  is_bot: boolean
  sent_at: string
}

export interface BotSession {
  id: string
  tenant_id: string
  customer_id: string
  state: string
  context: Record<string, unknown>
  expires_at: string
  updated_at: string
}

export interface TenantSettings {
  id: string
  tenant_id: string
  working_hours: Record<string, { open: string; close: string } | null>
  auto_replies: Record<string, string>
  slot_duration_min: number
  gcal_token: string | null
  timezone: string
}

export interface WorkingHours {
  mon: { open: string; close: string } | null
  tue: { open: string; close: string } | null
  wed: { open: string; close: string } | null
  thu: { open: string; close: string } | null
  fri: { open: string; close: string } | null
  sat: { open: string; close: string } | null
  sun: { open: string; close: string } | null
}
