import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Dashboard stats API called")

    // TODO: Reemplazar con consultas reales a tu base de datos
    // Por ahora uso datos mock pero con estructura real

    // Simulación de consulta a base de datos
    const mockPurchases = [
      {
        id: "purchase_1",
        buyerName: "Juan Pérez",
        buyerEmail: "juan@email.com",
        buyerPhone: "+54911234567",
        buyerDni: "12345678",
        totalAmount: 15000,
        status: "completed",
        createdAt: new Date().toISOString(),
        mercadoPagoId: "mp_123456",
        attendees: [
          {
            id: "att_1",
            name: "Juan",
            lastName: "Pérez",
            dni: "12345678",
            email: "juan@email.com",
            ticketType: "General",
            qrToken: "qr_token_123",
            scannedAt: null,
            isRevoked: false,
          },
          {
            id: "att_2",
            name: "María",
            lastName: "García",
            dni: "87654321",
            email: "maria@email.com",
            ticketType: "VIP",
            qrToken: "qr_token_456",
            scannedAt: new Date().toISOString(),
            isRevoked: false,
          },
        ],
      },
      {
        id: "purchase_2",
        buyerName: "Ana López",
        buyerEmail: "ana@email.com",
        buyerPhone: "+54911111111",
        buyerDni: "11111111",
        totalAmount: 8000,
        status: "completed",
        createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        mercadoPagoId: "mp_789012",
        attendees: [
          {
            id: "att_3",
            name: "Ana",
            lastName: "López",
            dni: "11111111",
            email: "ana@email.com",
            ticketType: "Early Bird",
            qrToken: "qr_token_789",
            scannedAt: null,
            isRevoked: false,
          },
        ],
      },
    ]

    const stats = {
      totalSales: mockPurchases.length,
      totalTickets: mockPurchases.reduce((acc, p) => acc + p.attendees.length, 0),
      scannedTickets: mockPurchases.reduce(
        (acc, p) => acc + p.attendees.filter((a) => a.scannedAt && !a.isRevoked).length,
        0,
      ),
      revenue: mockPurchases.reduce((acc, p) => acc + p.totalAmount, 0),
      pendingTickets: mockPurchases.reduce(
        (acc, p) => acc + p.attendees.filter((a) => !a.scannedAt && !a.isRevoked).length,
        0,
      ),
      revokedTickets: mockPurchases.reduce((acc, p) => acc + p.attendees.filter((a) => a.isRevoked).length, 0),
    }

    console.log("[v0] Dashboard stats calculated:", stats)

    return NextResponse.json({
      success: true,
      purchases: mockPurchases,
      stats,
      message: "Datos cargados correctamente",
    })
  } catch (error) {
    console.error("[v0] Error fetching dashboard stats:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
        purchases: [],
        stats: {
          totalSales: 0,
          totalTickets: 0,
          scannedTickets: 0,
          revenue: 0,
          pendingTickets: 0,
          revokedTickets: 0,
        },
      },
      { status: 500 },
    )
  }
}
