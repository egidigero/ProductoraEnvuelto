import { type NextRequest, NextResponse } from "next/server"
import { generateQRCode } from "@/lib/qr-utils"

export async function POST(request: NextRequest, { params }: { params: { attendeeId: string } }) {
  try {
    console.log("[v0] QR generation API called for attendee:", params.attendeeId)
    const { attendeeId } = params

    if (!attendeeId) {
      console.log("[v0] Missing attendeeId")
      return NextResponse.json({ success: false, error: "ID de asistente requerido" }, { status: 400 })
    }

    // En producción, buscarías el attendee en la base de datos
    // const attendee = await db.attendees.findUnique({ where: { id: attendeeId } })

    // Mock token - en producción vendría de la base de datos
    const mockToken = `token-${attendeeId}-${Date.now()}`
    console.log("[v0] Generated token:", mockToken)

    const qrCodeDataURL = await generateQRCode(mockToken)
    console.log("[v0] QR code generated successfully")

    return NextResponse.json({
      success: true,
      qrCode: qrCodeDataURL,
      token: mockToken,
    })
  } catch (error) {
    console.error("[v0] Error in QR generation API:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error generando código QR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
