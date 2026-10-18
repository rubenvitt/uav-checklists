/** Bild als Data-URL → JPEG-Blob (Suchlage nimmt fürs Kartenfoto nur JPEG). */
export async function dataUrlToJpegBlob(dataUrl: string, quality = 0.85): Promise<Blob> {
  if (/^data:image\/jpe?g[;,]/i.test(dataUrl)) {
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    return blob.type === 'image/jpeg' ? blob : blob.slice(0, blob.size, 'image/jpeg')
  }
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Bild nicht lesbar'))
    img.src = dataUrl
  })
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Kein Canvas')
  // Transparente Flächen (PNG) werden weiß statt schwarz.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('JPEG nicht erzeugt'))), 'image/jpeg', quality)
  })
}
