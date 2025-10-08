import { type NextRequest, NextResponse } from "next/server"
import { generateQRCodeDataURL, generateToken, createTicketURL } from "@/lib/token-utils"

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { attendeeId: string } }) {
  try {
    console.log("[QR] QR generation API called for attendee:", params.attendeeId)
    const { attendeeId } = params

    if (!attendeeId) {
      console.log("[QR] Missing attendeeId")
      return NextResponse.json({ success: false, error: "ID de asistente requerido" }, { status: 400 })
    }

    // Generate unique token
    const token = generateToken()
    console.log("[QR] Generated token:", token)

    // Create ticket URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const ticketUrl = createTicketURL(baseUrl, token)

    // Generate QR code
    const qrCodeDataURL = await generateQRCodeDataURL(ticketUrl)
    console.log("[QR] QR code generated successfully")

    return NextResponse.json({
      success: true,
      qrCode: qrCodeDataURL,
      token: token,
    })
  } catch (error) {
    console.error("[QR] Error in QR generation API:", error)
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
