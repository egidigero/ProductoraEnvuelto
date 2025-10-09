// ============================================
// ENUMS & STATUS TYPES
// ============================================

export type UserRole = 'admin' | 'staff' | 'viewer';
export type EventStatus = 'active' | 'archived';
export type OrderStatus = 'pending' | 'paid' | 'refunded' | 'canceled';
export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'refunded';
export type TicketStatus = 'valid' | 'used' | 'revoked' | 'expired';
export type ValidationOutcome = 'success' | 'already_used' | 'invalid' | 'revoked' | 'expired';
export type EmailStatus = 'queued' | 'sent' | 'failed';
export type TicketTypeStatus = 'active' | 'inactive' | 'sold_out';

// ============================================
// DATABASE ENTITIES
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface Event {
  id: string;
  name: string;
  start_at: string;
  end_at: string;
  venue: string;
  capacity: number;
  status: EventStatus;
  created_at: string;
  description?: string;
  price?: number;
  currency?: string;
}

export interface TicketType {
  id: string;
  event_id: string;
  name: string;
  description?: string;
  base_price: number;
  service_fee: number;
  final_price: number;
  capacity: number;
  sold_count: number;
  status: TicketTypeStatus;
  is_popular: boolean;
  display_order: number;
  features: string[];
  created_at: string;
  updated_at: string;
  // Campos calculados
  available?: number;
  availability_status?: 'available' | 'low_stock' | 'sold_out';
  sold_percentage?: number;
}

export interface Order {
  id: string;
  event_id: string;
  buyer_email: string;
  buyer_name: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  external_reference: string;
  created_at: string;
  paid_at?: string;
  quantity?: number;
}

export interface Payment {
  id: string;
  order_id: string;
  mp_payment_id?: string;
  status: PaymentStatus;
  payload: Record<string, any>;
  created_at: string;
}

export interface Ticket {
  id: string;
  order_id: string;
  event_id: string;
  ticket_type_id?: string;
  token_hash: string;
  status: TicketStatus;
  used_at?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface Validation {
  id: string;
  ticket_id: string;
  outcome: ValidationOutcome;
  device_id: string;
  operator_id?: string;
  validated_at: string;
  remote_addr?: string;
}

export interface WebhookEvent {
  id: string;
  provider: string;
  event_id: string;
  payload: Record<string, any>;
  processed_at?: string;
  created_at: string;
}

export interface EmailLog {
  id: string;
  order_id: string;
  to_email: string;
  subject: string;
  status: EmailStatus;
  provider: string;
  error?: string;
  created_at: string;
  sent_at?: string;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface CreateOrderRequest {
  event_id: string;
  ticket_type_id: string;
  buyer_email: string;
  buyer_name: string;
  quantity: number;
}

export interface CreateOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_url?: string;
}

export interface ValidateTicketRequest {
  tkn: string;
  deviceId: string;
  operatorId?: string;
}

export interface ValidateTicketResponse {
  success: boolean;
  outcome: ValidationOutcome;
  ticket_id?: string;
  used_at?: string;
  message: string;
}

export interface DashboardStats {
  total_sold: number;
  total_used: number;
  total_pending: number;
  total_revenue: number;
  recent_validations: Array<{
    id: string;
    outcome: ValidationOutcome;
    validated_at: string;
    ticket_id: string;
  }>;
  sales_by_event: Array<{
    event_name: string;
    sold: number;
    used: number;
  }>;
}

// ============================================
// EXTENDED TYPES (WITH JOINS)
// ============================================

export interface OrderWithTickets extends Order {
  event?: Event;
  tickets?: Ticket[];
}

export interface TicketWithDetails extends Ticket {
  order?: Order;
  event?: Event;
}

export interface ValidationWithDetails extends Validation {
  ticket?: TicketWithDetails;
}

// ============================================
// FORM DATA TYPES
// ============================================

export interface Attendee {
  firstName: string;
  lastName: string;
  dni: string;
  email: string;
  phone?: string;
}

export interface TicketFormData {
  buyerFirstName: string;
  buyerLastName: string;
  buyerDni: string;
  buyerEmail: string;
  buyerPhone?: string;
  attendees: Attendee[];
  ticketType: 'early' | 'general' | 'vip';
  quantity: number;
}

export interface TicketPurchase {
  id: string;
  buyerFirstName: string;
  buyerLastName: string;
  buyerDni: string;
  buyerEmail: string;
  buyerPhone?: string;
  attendees: Attendee[];
  ticketType: 'early' | 'general' | 'vip';
  quantity: number;
  basePrice?: number;
  serviceCharge?: number;
  totalAmount: number;
  paymentStatus?: string;
  purchaseDate?: Date;
  eventDate?: Date;
  createdAt?: string;
  status?: OrderStatus;
}

