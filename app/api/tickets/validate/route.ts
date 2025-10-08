import { type NextRequest, NextResponse } from "next/server"
import { hashToken, validateToken } from "@/lib/qr-utils"

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Token requerido",
        },
        { status: 400 },
      )
    }

    // Validar formato del token
    if (!validateToken(token)) {
      return NextResponse.json({
        success: false,
        message: "Formato de token inválido",
      })
    }

    // Hash del token para buscar en la base de datos
    const tokenHash = hashToken(token)

    // Aquí buscarías en la base de datos real
    // Por ahora simulamos diferentes escenarios
    const mockTickets = [
      {
        id: "1",
        tokenHash: hashToken("sample-token-123"),
        attendeeName: "Juan Pérez",
        ticketType: "vip",
        eventName: "ON REPEAT - Premium Night Experience",
        status: "valid",
      },
    ]

    const ticket = mockTickets.find((t) => t.tokenHash === tokenHash)

    if (!ticket) {
      // Log del intento de validación fallido
      await logValidation(null, "invalid", request)

      return NextResponse.json({
        success: false,
        message: "Entrada no encontrada o inválida",
      })
    }

    // Verificar estado del ticket
    if (ticket.status === "used") {
      await logValidation(ticket.id, "already_used", request)

      return NextResponse.json({
        success: false,
        message: "Esta entrada ya fue utilizada",
        ticket,
      })
    }

    if (ticket.status === "revoked") {
      await logValidation(ticket.id, "revoked", request)

      return NextResponse.json({
        success: false,
        message: "Esta entrada ha sido revocada",
        ticket,
      })
    }

    if (ticket.status === "expired") {
      await logValidation(ticket.id, "expired", request)

      return NextResponse.json({
        success: false,
        message: "Esta entrada ha expirado",
        ticket,
      })
    }

    // Marcar ticket como usado
    // En la base de datos real actualizarías el status y used_at
    ticket.status = "used"

    // Log de validación exitosa
    await logValidation(ticket.id, "success", request)

    return NextResponse.json({
      success: true,
      message: `Bienvenido/a ${ticket.attendeeName}`,
      ticket,
    })
  } catch (error) {
    console.error("Error validating ticket:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
      },
      { status: 500 },
    )
  }
}

async function logValidation(ticketId: string | null, outcome: string, request: NextRequest) {
  // Aquí guardarías el log en la base de datos
  const validationLog = {
    ticketId,
    outcome,
    deviceId: request.headers.get("user-agent") || "unknown",
    remoteAddr: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
    validatedAt: new Date().toISOString(),
  }

  console.log("Validation log:", validationLog)
  // En producción: guardar en la tabla validations
}
