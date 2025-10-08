import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pago Confirmado - FIESTA X",
  description: "Tu compra se procesó exitosamente",
}

export default function SuccessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
