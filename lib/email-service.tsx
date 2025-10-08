import nodemailer from "nodemailer"
import { generateQRCode } from "./qr-utils"

interface EmailTicketData {
  orderId: string
  buyerEmail: string
  buyerName: string
  attendees: Array<{
    name: string
    ticketType: string
    token: string
  }>
  eventName: string
  eventDate: string
  venue: string
}

export class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransporter({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }

  async sendTicketEmail(data: EmailTicketData): Promise<boolean> {
    try {
      // Generar QR codes para cada asistente
      const attachments = []
      for (const attendee of data.attendees) {
        const qrCode = await generateQRCode(attendee.token)
        const qrBuffer = Buffer.from(qrCode.split(",")[1], "base64")

        attachments.push({
          filename: `ticket-${attendee.name.replace(/\s+/g, "-")}.png`,
          content: qrBuffer,
          cid: `qr-${attendee.token}`,
        })
      }

      const ticketsList = data.attendees
        .map(
          (attendee, index) => `
        <div style="margin: 20px 0; padding: 20px; border: 2px solid #8B5CF6; border-radius: 12px; background: #F8FAFC;">
          <h3 style="color: #8B5CF6; margin: 0 0 10px 0;">${attendee.name}</h3>
          <p style="margin: 5px 0;"><strong>Tipo:</strong> ${attendee.ticketType.toUpperCase()}</p>
          <div style="text-align: center; margin: 15px 0;">
            <img src="cid:qr-${attendee.token}" alt="QR Code" style="width: 200px; height: 200px;" />
          </div>
          <p style="font-size: 12px; color: #666; text-align: center;">
            Presenta este QR en la entrada del evento
          </p>
        </div>
      `,
        )
        .join("")

      const mailOptions = {
        from: process.env.SMTP_USER,
        to: data.buyerEmail,
        subject: `🎫 Tus entradas para ${data.eventName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #8B5CF6, #6366F1); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">¡Gracias por tu compra!</h1>
              <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Tus entradas están listas</p>
            </div>
            
            <div style="padding: 30px; background: white; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #1F2937; margin: 0 0 20px 0;">${data.eventName}</h2>
              <p style="margin: 10px 0;"><strong>📅 Fecha:</strong> ${data.eventDate}</p>
              <p style="margin: 10px 0;"><strong>📍 Lugar:</strong> ${data.venue}</p>
              <p style="margin: 10px 0;"><strong>👤 Comprador:</strong> ${data.buyerName}</p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;" />
              
              <h3 style="color: #1F2937; margin: 0 0 20px 0;">Tus Entradas:</h3>
              ${ticketsList}
              
              <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <h4 style="color: #92400E; margin: 0 0 10px 0;">⚠️ Importante:</h4>
                <ul style="color: #92400E; margin: 0; padding-left: 20px;">
                  <li>Cada QR es único e intransferible</li>
                  <li>Presenta tu QR en la entrada del evento</li>
                  <li>Llega temprano para evitar demoras</li>
                  <li>Guarda este email como respaldo</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <p style="color: #6B7280; font-size: 14px;">
                  ¿Problemas con tus entradas? Contactanos a<br>
                  <a href="mailto:soporte@onrepeat.com" style="color: #8B5CF6;">soporte@onrepeat.com</a>
                </p>
              </div>
            </div>
          </div>
        `,
        attachments,
      }

      await this.transporter.sendMail(mailOptions)
      return true
    } catch (error) {
      console.error("Error sending email:", error)
      return false
    }
  }
}
