import crypto from "crypto"
import QRCode from "qrcode"

export interface QRTicketData {
  ticketId: string
  attendeeName: string
  eventName: string
  ticketType: string
}

export function generateToken(): string {
  return crypto.randomUUID()
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export async function generateQRCode(token: string): Promise<string> {
  const qrUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/scan?tkn=${token}`

  try {
    console.log("[QR] Generating QR code for URL:", qrUrl)

    // Generate QR code as Data URL using qrcode package
    const dataUrl = await QRCode.toDataURL(qrUrl, {
      errorCorrectionLevel: "M",
      type: "image/png",
      width: 512,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })

    console.log("[QR] QR code generated successfully")
    return dataUrl
  } catch (error) {
    console.error("[QR] Error generating QR code:", error)

    // SVG fallback if QR generation fails
    return createSVGFallback(qrUrl)
  }
}

function createSVGFallback(url: string): string {
  // Simple SVG fallback with the URL text
  const svg = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="white" stroke="black" stroke-width="4"/>
      <text x="256" y="200" text-anchor="middle" font-family="monospace" font-size="20" fill="black">QR CODE</text>
      <text x="256" y="250" text-anchor="middle" font-family="monospace" font-size="14" fill="black">Scan Failed</text>
      <text x="256" y="300" text-anchor="middle" font-family="monospace" font-size="10" fill="gray">${url.substring(0, 40)}...</text>
    </svg>
  `
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`
}

export function validateToken(token: string): boolean {
  // Validar formato UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(token)
}
