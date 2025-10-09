"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, Camera, Scan, LogOut, Loader2 } from "lucide-react"
import jsQR from "jsqr"

interface ValidationResult {
  success: boolean
  ticket?: {
    id: string
    attendee_name: string
    ticket_type: string
    used_at?: string
  }
  message: string
}

interface Operator {
  id: string
  username: string
  name: string
}

export default function ScanPage() {
  const router = useRouter()
  const [operator, setOperator] = useState<Operator | null>(null)
  const [loading, setLoading] = useState(true)
  const [isScanning, setIsScanning] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [manualToken, setManualToken] = useState("")
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scanningStatus, setScanningStatus] = useState<string>("Esperando código QR...")
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [captureMode, setCaptureMode] = useState<boolean>(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scanningRef = useRef<boolean>(false)
  const lastDebugUpdateRef = useRef<number>(0)

  // Verify operator session on mount
  useEffect(() => {
    const verifySession = async () => {
      try {
        const response = await fetch("/api/auth/verify")
        const data = await response.json()

        if (data.success) {
          setOperator(data.operator)
        } else {
          // Not logged in, redirect to login page
          router.push("/scan/login")
        }
      } catch (error) {
        console.error("Session verification error:", error)
        router.push("/scan/login")
      } finally {
        setLoading(false)
      }
    }

    verifySession()
  }, [router])

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/scan/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const validateTicket = async (token: string) => {
    try {
      const response = await fetch("/api/tickets/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const result = await response.json()
      setValidationResult(result)
    } catch (error) {
      setValidationResult({ success: false, message: "Error de conexión. Intenta nuevamente." })
    }
  }

  const handleManualValidation = () => {
    if (manualToken.trim()) {
      validateTicket(manualToken.trim())
      setManualToken("")
    }
  }

  const captureAndScan = () => {
    if (!videoRef.current || !canvasRef.current) return
    
    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")
    
    if (!context) return
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    })
    
    if (code) {
      console.log("[Scanner] ✅ QR Code detected in capture:", code.data)
      setDebugInfo(`Captura exitosa: ${code.data.substring(0, 30)}...`)
      
      try {
        const url = new URL(code.data)
        const token = url.searchParams.get("tkn")
        if (token) {
          stopScanning()
          validateTicket(token)
        } else {
          setDebugInfo("No se encontró token en la captura")
        }
      } catch (error) {
        stopScanning()
        validateTicket(code.data)
      }
    } else {
      setDebugInfo("No se detectó QR en la captura. Intenta de nuevo.")
    }
  }

  const startCameraScanning = async () => {
    try {
      console.log("[Scanner] Starting camera...")
      setIsScanning(true)
      scanningRef.current = true
      setCameraError(null)
      setValidationResult(null)
      setScanningStatus("Iniciando cámara...")
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      })
      
      console.log("[Scanner] Camera stream obtained")
      setScanningStatus("Cámara activa - Apunta al código QR")
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute("playsinline", "true") // iOS compatibility
        await videoRef.current.play()
        console.log("[Scanner] Video playing, starting scan loop...")
        // Wait for video to be ready before scanning
        setTimeout(() => {
          console.log("[Scanner] Initiating QR scan loop")
          setScanningStatus("🔍 Buscando código QR...")
          scanForQRCode()
        }, 1000)
      }
    } catch (error: any) {
      console.error("[Scanner] Error accessing camera:", error)
      let errorMessage = "No se pudo acceder a la cámara."
      if (error.name === 'NotAllowedError') {
        errorMessage = "Permiso de cámara denegado. Por favor permite el acceso a la cámara."
      } else if (error.name === 'NotFoundError') {
        errorMessage = "No se encontró ninguna cámara en este dispositivo."
      } else if (error.name === 'NotReadableError') {
        errorMessage = "La cámara está siendo usada por otra aplicación."
      }
      setCameraError(errorMessage)
      setIsScanning(false)
    }
  }

  const stopScanning = () => {
    setIsScanning(false)
    scanningRef.current = false
    setScanningStatus("Escaneo detenido")
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
    }
  }

  const scanForQRCode = () => {
    if (!scanningRef.current || !videoRef.current || !canvasRef.current) {
      console.log("[Scanner] Scan aborted - missing refs or not scanning")
      return
    }
    
    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")
    
    if (context && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      if (canvas.width === 0 || canvas.height === 0) {
        console.warn("[Scanner] Video dimensions are 0, waiting...")
        requestAnimationFrame(scanForQRCode)
        return
      }
      
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth", // Try both normal and inverted
      })
      
      if (code) {
        console.log("[Scanner] ✅ QR Code detected:", code.data)
        setScanningStatus("✅ ¡Código detectado! Validando...")
        setDebugInfo(`QR: ${code.data.substring(0, 50)}...`)
        
        // Extract token from URL
        try {
          const url = new URL(code.data)
          const token = url.searchParams.get("tkn")
          
          if (token) {
            console.log("[Scanner] Token extracted:", token)
            setDebugInfo(`Token: ${token}`)
            stopScanning()
            validateTicket(token)
            return // Don't continue scanning
          } else {
            console.warn("[Scanner] No 'tkn' parameter found in QR URL:", code.data)
            setScanningStatus("⚠️ Código inválido - sigue buscando...")
            setDebugInfo("No se encontró token en URL")
          }
        } catch (error) {
          // If it's not a URL, try to use it directly as a token
          console.log("[Scanner] Not a URL, trying as direct token:", code.data)
          setDebugInfo(`Token directo: ${code.data}`)
          stopScanning()
          validateTicket(code.data)
          return // Don't continue scanning
        }
      } else {
        // Update debug info every 30 frames to show it's working
        const now = Date.now()
        if (!lastDebugUpdateRef.current || now - lastDebugUpdateRef.current > 1000) {
          setDebugInfo(`Video: ${canvas.width}x${canvas.height} - Buscando...`)
          lastDebugUpdateRef.current = now
        }
      }
    } else if (video.readyState < video.HAVE_ENOUGH_DATA) {
      console.log("[Scanner] Video not ready yet, waiting...")
      setScanningStatus("⏳ Preparando video...")
    }
    
    // Continue scanning
    if (scanningRef.current) {
      requestAnimationFrame(scanForQRCode)
    }
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get("tkn")
    if (token) {
      validateTicket(token)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  useEffect(() => {
    return () => { stopScanning() }
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "valid": return "bg-green-500"
      case "used": return "bg-red-500"
      case "revoked": return "bg-gray-500"
      case "expired": return "bg-yellow-500"
      default: return "bg-gray-500"
    }
  }

  const getStatusIcon = (success: boolean) => {
    if (success) { return <CheckCircle className="w-16 h-16 text-green-500" /> }
    else { return <XCircle className="w-16 h-16 text-red-500" /> }
  }

  // Show loading state while verifying session
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto" />
          <p className="text-purple-200">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated (will redirect)
  if (!operator) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header with operator info and logout */}
        <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Operador</p>
              <p className="text-white font-medium">{operator.name}</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>

        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto mb-4 bg-purple-600 rounded-full flex items-center justify-center">
            <Scan className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Validador de Entradas</h1>
          <p className="text-purple-200">FIESTA X - Control de Acceso</p>
        </div>
        <Card className="bg-slate-800 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Camera className="w-5 h-5" />Escanear QR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isScanning && (
              <div className="relative">
                <video ref={videoRef} className="w-full h-64 bg-black rounded-lg object-cover" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 border-2 border-purple-500 rounded-lg pointer-events-none">
                  <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-purple-400"></div>
                  <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-purple-400"></div>
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-purple-400"></div>
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-purple-400"></div>
                </div>
                {/* Status indicator */}
                <div className="absolute top-2 left-2 right-2 text-center">
                  <div className="bg-black/70 rounded-full px-4 py-2 inline-block">
                    <p className="text-white text-sm font-medium">{scanningStatus}</p>
                  </div>
                </div>
                <div className="absolute bottom-2 left-2 right-2 text-center">
                  <p className="text-white text-sm bg-black/50 rounded px-2 py-1">Apunta la cámara al código QR</p>
                </div>
              </div>
            )}
            {cameraError && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-sm">{cameraError}</p>
              </div>
            )}
            {/* Debug info */}
            {debugInfo && isScanning && (
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-2">
                <p className="text-slate-300 text-xs font-mono break-all">{debugInfo}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={isScanning ? stopScanning : startCameraScanning} className={`flex-1 ${isScanning ? "bg-red-600 hover:bg-red-700" : "bg-purple-600 hover:bg-purple-700"}`}>
                {isScanning ? (<><XCircle className="w-4 h-4 mr-2" />Detener</>) : (<><Camera className="w-4 h-4 mr-2" />Escanear</>)}
              </Button>
              {isScanning && (
                <Button onClick={captureAndScan} className="bg-green-600 hover:bg-green-700" title="Capturar y escanear">
                  📸
                </Button>
              )}
            </div>
            <div className="text-center text-slate-400"><p className="text-sm">o</p></div>
            <div className="space-y-2">
              <input type="text" placeholder="Ingresa el código manualmente" value={manualToken} onChange={(e) => setManualToken(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter') { handleManualValidation() } }} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:outline-ring-2 focus:ring-purple-500" />
              <Button onClick={handleManualValidation} variant="outline" className="w-full border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white bg-transparent">Validar Código</Button>
            </div>
          </CardContent>
        </Card>
        {validationResult && (
          <Card className={`${validationResult.success ? "bg-green-900/20 border-green-500/30" : "bg-red-900/20 border-red-500/30"}`}>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                {getStatusIcon(validationResult.success)}
                <div>
                  <h3 className={`text-xl font-bold ${validationResult.success ? "text-green-400" : "text-red-400"}`}>{validationResult.success ? " Entrada Válida" : " Entrada Inválida"}</h3>
                  <p className="text-slate-300 mt-2">{validationResult.message}</p>
                </div>
                {validationResult.ticket && (
                  <div className="bg-slate-800 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-center"><span className="text-slate-400">Asistente:</span><span className="text-white font-medium">{validationResult.ticket.attendee_name}</span></div>
                    <div className="flex justify-between items-center"><span className="text-slate-400">Tipo:</span><Badge className="bg-purple-600">{validationResult.ticket.ticket_type?.toUpperCase() || 'GENERAL'}</Badge></div>
                    {validationResult.ticket.used_at && (
                      <div className="flex justify-between items-center"><span className="text-slate-400">Usado:</span><span className="text-white text-xs">{new Date(validationResult.ticket.used_at).toLocaleString('es-AR')}</span></div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex items-start gap-2"><AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" /><p>Cada entrada solo puede ser validada una vez</p></div>
              <div className="flex items-start gap-2"><AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" /><p>Verifica que el nombre coincida con el documento</p></div>
              <div className="flex items-start gap-2"><AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" /><p>En caso de problemas, contacta al supervisor</p></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
