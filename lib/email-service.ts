import nodemailer from "nodemailer"

// Configure Gmail SMTP transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

interface EmailTicket {
  attendee_name: string
  ticket_type_name: string
  qr_code_url: string
}

export async function sendTicketEmail(
  toEmail: string,
  tickets: EmailTicket[],
  orderReference: string
) {
  try {
    const attachments = tickets.map((ticket, index) => ({
      filename: `ticket-${index + 1}-${ticket.attendee_name.replace(/\s+/g, "-")}.png`,
      content: ticket.qr_code_url.split(",")[1],
      encoding: "base64" as const,
    }))

    const info = await transporter.sendMail({
      from: `"Productora Envuelto" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `🎉 Tus entradas para FIESTA X - ${orderReference}`,
      html: generateEmailHTML(tickets, orderReference),
      attachments,
    })

    console.log("Email enviado exitosamente:", info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Error en sendTicketEmail:", error)
    return { success: false, error }
  }
}

function generateEmailHTML(tickets: EmailTicket[], orderReference: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tus Entradas</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0;">¡Compra Confirmada!</h1>
    <p style="margin: 10px 0 0 0;">FIESTA X - Opening Night</p>
  </div>

  <div style="background: #f9f9f9; padding: 30px;">
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h2 style="color: #10b981;">Tu orden fue procesada</h2>
      <p>Referencia: <strong>${orderReference}</strong></p>
    </div>

    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h3>Detalles del Evento</h3>
      <p><strong>Fecha:</strong> Sábado 15 Marzo, 2025</p>
      <p><strong>Hora:</strong> 22:00 hs</p>
      <p><strong>Lugar:</strong> El Club De Los Pescadores</p>
    </div>

    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h3>Tus Entradas (${tickets.length})</h3>
      ${tickets.map((ticket, index) => `
        <div style="background: #f3f4f6; padding: 15px; margin-bottom: 10px; border-radius: 6px;">
          <p><strong>Ticket #${index + 1}</strong></p>
          <p>${ticket.attendee_name} - ${ticket.ticket_type_name}</p>
          <p style="font-size: 12px; color: #888;">QR adjunto: ticket-${index + 1}-${ticket.attendee_name.replace(/\s+/g, "-")}.png</p>
        </div>
      `).join("")}
    </div>

    <div style="background: #fffbeb; padding: 20px; border-radius: 8px; border: 1px solid #fbbf24;">
      <h3>Importante</h3>
      <ul>
        <li>Los códigos QR están adjuntos en este email</li>
        <li>Presenta tu QR en la entrada del evento</li>
        <li>Cada QR es único e intransferible</li>
        <li>Debes presentar DNI</li>
      </ul>
    </div>
  </div>
</body>
</html>
  `
}
