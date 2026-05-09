import qrcode from 'qrcode-generator'

export function generateQrCodeDataUrl(url: string, cellSize = 4): string {
  const qr = qrcode(0, 'M')
  qr.addData(url)
  qr.make()
  return qr.createDataURL(cellSize, 0)
}
