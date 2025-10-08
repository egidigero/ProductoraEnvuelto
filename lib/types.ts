export interface Attendee {
  firstName: string
  lastName: string
  dni: string
  email: string
}

export interface TicketPurchase {
  id: string
  buyerFirstName: string
  buyerLastName: string
  buyerDni: string
  buyerEmail: string
  buyerPhone?: string
  attendees: Attendee[]
  ticketType: "general" | "vip" | "early"
  quantity: number
  totalAmount: number
  paymentStatus: "pending" | "completed" | "failed"
  mercadoPagoId?: string
  qrCodes?: string[] // Array of QR codes, one per attendee
  purchaseDate: Date
  eventDate: Date
}

export interface TicketFormData {
  buyerFirstName: string
  buyerLastName: string
  buyerDni: string
  buyerEmail: string
  buyerPhone?: string
  attendees: Attendee[]
  ticketType: "general" | "vip" | "early"
  quantity: number
}
