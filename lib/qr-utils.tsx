import crypto from "crypto"
import { createCanvas } from "canvas"

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
    console.log("[v0] Generating QR for URL:", qrUrl)

    // Using QR Server API as fallback since qrcode package isn't available
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(qrUrl)}&format=png`

    // Convert to data URL for consistent format
    const response = await fetch(qrApiUrl)
    if (!response.ok) {
      throw new Error(`QR API failed: ${response.status}`)
    }

    const blob = await response.blob()
    const buffer = await blob.arrayBuffer()
    const base64 = Buffer.from(buffer).toString("base64")
    const dataUrl = `data:image/png;base64,${base64}`

    console.log("[v0] QR generated successfully")
    return dataUrl
  } catch (error) {
    console.error("[v0] Error generating QR code:", error)

    // Fallback: create a simple text-based QR placeholder
    const canvas = createTextQRFallback(qrUrl)
    return canvas
  }
}

function createTextQRFallback(url: string): string {
  // Create a simple canvas with the URL as fallback
  const canvas = createCanvas(512, 512)
  const ctx = canvas.getContext("2d")

  if (ctx) {
    // White background
    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(0, 0, 512, 512)

    // Black border
    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 4
    ctx.strokeRect(0, 0, 512, 512)

    // Text
    ctx.fillStyle = "#000000"
    ctx.font = "16px monospace"
    ctx.textAlign = "center"
    ctx.fillText("QR CODE", 256, 100)
    ctx.font = "12px monospace"

    // Split URL into lines
    const words = url.split("/")
    let y = 200
    words.forEach((word) => {
      ctx.fillText(word, 256, y)
      y += 20
    })

    return canvas.toDataURL()
  }

  // Ultimate fallback
  return (
    "data:image/svg+xml;base64," +
    btoa(`
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="white" stroke="black" stroke-width="4"/>
      <text x="256" y="256" text-anchor="middle" font-family="monospace" font-size="16">QR CODE</text>
      <text x="256" y="300" text-anchor="middle" font-family="monospace" font-size="12">${url}</text>
    </svg>
  `)
  )
}

export function validateToken(token: string): boolean {
  // Validar formato UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(token)
}
