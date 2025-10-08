import { type NextRequest, NextResponse } from "next/server"
import { generateToken, hashToken } from "@/lib/qr-utils"
import { EmailService } from "@/lib/email-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar datos requeridos
    const { buyer, attendees, tickets } = body

    if (!buyer?.email || !buyer?.firstName || !buyer?.lastName || !buyer?.dni) {
      return NextResponse.json({ error: "Información del comprador incompleta" }, { status: 400 })
    }

    if (!attendees || !Array.isArray(attendees) || attendees.length === 0) {
      return NextResponse.json({ error: "Debe incluir al menos un asistente" }, { status: 400 })
    }

    // Validar que cada asistente tenga todos los datos
    for (const attendee of attendees) {
      if (!attendee.firstName || !attendee.lastName || !attendee.dni || !attendee.email) {
        return NextResponse.json({ error: "Información incompleta de asistentes" }, { status: 400 })
      }
    }

    // Calcular totales
    const ticketPrices = {
      general: 15000,
      vip: 25000,
      early_bird: 12000,
    }

    let totalAmount = 0
    const ticketBreakdown = []

    for (const [ticketType, quantity] of Object.entries(tickets)) {
      if (quantity > 0) {
        const price = ticketPrices[ticketType as keyof typeof ticketPrices]
        const subtotal = price * (quantity as number)
        totalAmount += subtotal
        ticketBreakdown.push({
          type: ticketType,
          quantity,
          price,
          subtotal,
        })
      }
    }

    // Agregar cargo por servicio (10%)
    const serviceCharge = Math.round(totalAmount * 0.1)
    const finalAmount = totalAmount + serviceCharge

    // Generar referencia externa única
    const externalReference = `ON-REPEAT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Aquí normalmente crearías la orden en la base de datos
    // Por ahora simulamos la creación exitosa
    const orderId = crypto.randomUUID()

    // Generar tokens para cada asistente
    const ticketTokens = attendees.map((attendee: any) => {
      const token = generateToken()
      const tokenHash = hashToken(token)

      return {
        attendee,
        token,
        tokenHash,
        ticketType: attendee.ticketType,
      }
    })

    // Simular envío de email
    const emailService = new EmailService()
    const emailSent = await emailService.sendTicketEmail({
      orderId,
      buyerEmail: buyer.email,
      buyerName: `${buyer.firstName} ${buyer.lastName}`,
      attendees: ticketTokens.map((t) => ({
        name: `${t.attendee.firstName} ${t.attendee.lastName}`,
        ticketType: t.ticketType,
        token: t.token,
      })),
      eventName: "ON REPEAT - Premium Night Experience",
      eventDate: "31 de Diciembre, 2024 - 23:00hs",
      venue: "El Club De Los Pescadores - Costanera Norte",
    })

    // Crear preferencia de Mercado Pago
    const preference = {
      items: [
        {
          title: "ON REPEAT - Premium Night Experience",
          quantity: 1,
          unit_price: finalAmount,
          currency_id: "ARS",
        },
      ],
      payer: {
        email: buyer.email,
        name: buyer.firstName,
        surname: buyer.lastName,
        identification: {
          type: "DNI",
          number: buyer.dni,
        },
      },
      external_reference: externalReference,
      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/mercadopago`,
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_BASE_URL}/success?order=${orderId}`,
        failure: `${process.env.NEXT_PUBLIC_BASE_URL}/failure`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL}/pending`,
      },
      auto_return: "approved",
    }

    return NextResponse.json({
      success: true,
      orderId,
      externalReference,
      amount: finalAmount,
      breakdown: {
        subtotal: totalAmount,
        serviceCharge,
        total: finalAmount,
      },
      preference,
      emailSent,
      message: "Orden creada exitosamente. Procede al pago.",
    })
  } catch (error) {
    console.error("Error processing purchase:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
