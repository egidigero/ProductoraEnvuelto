import { type NextRequest, NextResponse } from "next/server"

// Mark as dynamic route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Verificar que sea un webhook de Mercado Pago
    const topic = request.headers.get("x-topic")
    const signature = request.headers.get("x-signature")

    if (!topic || !signature) {
      return NextResponse.json({ error: "Invalid webhook" }, { status: 400 })
    }

    // Verificar idempotencia
    const eventId = body.id
    if (!eventId) {
      return NextResponse.json({ error: "Missing event ID" }, { status: 400 })
    }

    // Aquí verificarías si ya procesaste este evento
    // const existingEvent = await checkWebhookEvent(eventId)
    // if (existingEvent) {
    //   return NextResponse.json({ message: 'Event already processed' })
    // }

    console.log("Mercado Pago webhook received:", {
      topic,
      eventId,
      body,
    })

    // Procesar según el tipo de evento
    switch (topic) {
      case "payment":
        await handlePaymentNotification(body)
        break
      case "merchant_order":
        await handleMerchantOrderNotification(body)
        break
      default:
        console.log("Unhandled webhook topic:", topic)
    }

    // Guardar evento como procesado
    // await saveWebhookEvent(eventId, 'mp', body)

    return NextResponse.json({ message: "Webhook processed successfully" })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function handlePaymentNotification(data: any) {
  console.log("Processing payment notification:", data)

  // Aquí obtendrías los detalles del pago desde la API de MP
  // const paymentDetails = await getPaymentFromMP(data.id)

  // Actualizar el estado de la orden en tu base de datos
  // if (paymentDetails.status === 'approved') {
  //   await updateOrderStatus(paymentDetails.external_reference, 'paid')
  //   await generateAndSendTickets(paymentDetails.external_reference)
  // }
}

async function handleMerchantOrderNotification(data: any) {
  console.log("Processing merchant order notification:", data)
  // Manejar notificaciones de órdenes de comercio
}
