import QRCode from 'qrcode'
import jwt from 'jsonwebtoken'
import env from '#start/env'

interface QrPayload {
  branchId: string
  gymId: string
  type: 'attendance'
}

export function generateQrToken(payload: QrPayload): string {
  return jwt.sign(payload, env.get('JWT_SECRET'), { expiresIn: '365d' })
}

export function verifyQrToken(token: string): QrPayload {
  return jwt.verify(token, env.get('JWT_SECRET')) as QrPayload
}

export async function generateQrImage(token: string): Promise<string> {
  const deepLink = `gymos://attendance?token=${token}`
  return QRCode.toDataURL(deepLink, {
    width: 400,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
  })
}

export async function generateQrBuffer(token: string): Promise<Buffer> {
  const deepLink = `gymos://attendance?token=${token}`
  return QRCode.toBuffer(deepLink, { width: 400 })
}
