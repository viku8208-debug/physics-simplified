import { useEffect, useRef, useState } from 'react'

type PdfPreviewProps = {
  url: string
  title: string
  cacheKey: string
}

type CachedPdf = { key: string; blob: Blob; savedAt: number }

let cacheDbPromise: Promise<IDBDatabase> | null = null

function openPdfCacheDb(): Promise<IDBDatabase> {
  if (cacheDbPromise) return cacheDbPromise
  cacheDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open('psb-pdf-cache', 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('documents')) {
        db.createObjectStore('documents', { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Local PDF cache is unavailable.'))
    request.onblocked = () => reject(new Error('Local PDF cache is busy in another tab.'))
  }).catch(error => {
    cacheDbPromise = null
    throw error
  })
  return cacheDbPromise
}

async function readCachedPdf(key: string): Promise<Blob | null> {
  try {
    const db = await openPdfCacheDb()
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction('documents', 'readonly')
      const request = transaction.objectStore('documents').get(key)
      request.onsuccess = () => resolve((request.result as CachedPdf | undefined)?.blob || null)
      request.onerror = () => reject(request.error)
    })
  } catch {
    return null
  }
}

async function writeCachedPdf(key: string, blob: Blob): Promise<void> {
  const db = await openPdfCacheDb()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('documents', 'readwrite')
    transaction.objectStore('documents').put({ key, blob, savedAt: Date.now() } satisfies CachedPdf)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error || new Error('Could not save the PDF on this device.'))
    transaction.onabort = () => reject(transaction.error || new Error('PDF cache storage was interrupted.'))
  })
}

async function fetchPdfBlob(url: string, onProgress: (value: number) => void): Promise<Blob> {
  const response = await fetch(url)
  if (!response.ok) throw new Error('The PDF server returned an error (' + response.status + ').')
  const contentType = response.headers.get('content-type') || 'application/pdf'
  const reader = response.body?.getReader()
  if (!reader) {
    const blob = await response.blob()
    onProgress(100)
    return blob
  }

  const total = Number(response.headers.get('content-length')) || 0
  const chunks: Uint8Array[] = []
  let received = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value)
      received += value.byteLength
      if (total > 0) onProgress(Math.min(99, Math.round(received / total * 100)))
    }
  }
  onProgress(100)
  return new Blob(chunks, { type: contentType })
}

export default function PdfPreview({ url, title, cacheKey }: PdfPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const documentRef = useRef<any>(null)
  const renderTaskRef = useRef<any>(null)
  const lastRenderedPageRef = useRef(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageInput, setPageInput] = useState('1')
  const [numPages, setNumPages] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [containerWidth, setContainerWidth] = useState(0)
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 })
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [loadingStatus, setLoadingStatus] = useState('Checking this device for a saved copy…')
  const [fromCache, setFromCache] = useState(false)
  const [error, setError] = useState('')
  const [flipSnapshot, setFlipSnapshot] = useState('')
  const [flipDirection, setFlipDirection] = useState<'forward' | 'backward'>('forward')
  const [flipKey, setFlipKey] = useState(0)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const observer = new ResizeObserver(entries => {
      setContainerWidth(entries[0]?.contentRect.width || 0)
    })
    observer.observe(element)
    setContainerWidth(element.clientWidth)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let alive = true
    let task: any = null
    setLoading(true)
    setProgress(0)
    setLoadingStatus('Checking this device for a saved copy…')
    setFromCache(false)
    setError('')
    setNumPages(0)
    setPageNumber(1)
    setPageInput('1')
    setZoom(1)
    setFlipSnapshot('')
    documentRef.current = null
    lastRenderedPageRef.current = 0

    const openDocument = async () => {
      try {
        const [pdfjsLib, workerUrl] = await Promise.all([
          import('pdfjs-dist'),
          import('pdfjs-dist/build/pdf.worker.min.mjs?url')
        ])
        if (!alive) return
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.default

        // The cache key is the stable Storage path, not the short-lived signed URL.
        // Each PDF is downloaded once per device and then opened from IndexedDB.
        let blob = await readCachedPdf(cacheKey)
        if (blob) {
          if (!alive) return
          setFromCache(true)
          setProgress(100)
          setLoadingStatus('Opening the saved copy from this device…')
        } else {
          if (!alive) return
          setLoadingStatus('Saving the PDF on this device for faster future visits…')
          blob = await fetchPdfBlob(url, value => {
            if (alive) setProgress(value)
          })
          if (!alive) return
          const signature = new Uint8Array(await blob.slice(0, 5).arrayBuffer())
          if (String.fromCharCode(...signature) !== '%PDF-') {
            throw new Error('The file returned by the server is not a valid PDF. Please ask the teacher to re-upload it.')
          }
          try {
            await writeCachedPdf(cacheKey, blob)
          } catch {
            // A full browser cache must not prevent a first-time preview.
            setLoadingStatus('Opening the PDF. This device could not save a reusable copy.')
          }
        }

        if (!alive) return
        const bytes = new Uint8Array(await blob.arrayBuffer())
        if (!alive) return
        task = pdfjsLib.getDocument({ data: bytes })
        task.promise.then((pdf: any) => {
          if (!alive) {
            void task?.destroy?.()
            return
          }
          documentRef.current = pdf
          setNumPages(pdf.numPages)
          setLoading(false)
          setProgress(100)
          setLoadingStatus(fromCache ? 'Saved copy ready' : 'PDF ready')
        }).catch((reason: unknown) => {
          if (!alive) return
          setError(reason instanceof Error ? reason.message : 'The PDF could not be opened.')
          setLoading(false)
        })
      } catch (reason) {
        if (!alive) return
        setError(reason instanceof Error ? reason.message : 'The PDF could not be loaded.')
        setLoading(false)
      }
    }
    void openDocument()

    return () => {
      alive = false
      renderTaskRef.current?.cancel?.()
      void task?.destroy?.()
    }
  }, [url, cacheKey])

  useEffect(() => {
    setPageInput(String(pageNumber))
  }, [pageNumber])

  useEffect(() => {
    let alive = true
    const pdf = documentRef.current
    const canvas = canvasRef.current
    if (!pdf || !canvas || !containerWidth) return

    renderTaskRef.current?.cancel?.()
    setError('')
    const previousPage = lastRenderedPageRef.current
    let previousImage = ''
    const shouldFlip = previousPage > 0 && previousPage !== pageNumber
    if (shouldFlip) {
      try { previousImage = canvas.toDataURL('image/jpeg', 0.82) } catch { previousImage = '' }
    }

    const draw = async () => {
      try {
        const page = await pdf.getPage(pageNumber)
        if (!alive) return
        const originalViewport = page.getViewport({ scale: 1 })
        const availableWidth = Math.max(240, containerWidth - 28)
        const fitScale = Math.min(1.5, availableWidth / originalViewport.width)
        const viewport = page.getViewport({ scale: fitScale * zoom })
        const outputScale = Math.min(window.devicePixelRatio || 1, 2)
        canvas.width = Math.ceil(viewport.width * outputScale)
        canvas.height = Math.ceil(viewport.height * outputScale)
        canvas.style.width = Math.floor(viewport.width) + 'px'
        canvas.style.height = Math.floor(viewport.height) + 'px'
        setPageSize({ width: Math.floor(viewport.width), height: Math.floor(viewport.height) })
        const transform: [number, number, number, number, number, number] = [
          outputScale, 0, 0, outputScale, 0, 0
        ]
        const renderTask = page.render({ canvas, viewport, transform })
        renderTaskRef.current = renderTask
        await renderTask.promise
        if (!alive) return
        lastRenderedPageRef.current = pageNumber
        if (shouldFlip && previousImage && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          setFlipDirection(pageNumber > previousPage ? 'forward' : 'backward')
          setFlipSnapshot(previousImage)
          setFlipKey(value => value + 1)
        } else {
          setFlipSnapshot('')
        }
      } catch (reason) {
        if (!alive) return
        if ((reason as { name?: string })?.name !== 'RenderingCancelledException') {
          setError(reason instanceof Error ? reason.message : 'This PDF page could not be rendered.')
        }
      }
    }
    void draw()

    return () => {
      alive = false
      renderTaskRef.current?.cancel?.()
    }
  }, [pageNumber, zoom, containerWidth, numPages])

  const goToPage = () => {
    const requested = Number.parseInt(pageInput, 10)
    if (!Number.isFinite(requested)) {
      setPageInput(String(pageNumber))
      return
    }
    setFlipSnapshot('')
    setPageNumber(Math.min(numPages, Math.max(1, requested)))
  }

  const handlePageInputKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      goToPage()
    }
  }

  return <section className="psb-pdf-viewer" aria-label={'PDF preview: ' + title}>
    <div className="psb-pdf-toolbar">
      <div className="psb-pdf-pages">
        <button type="button" className="secondary" aria-label="Previous page" disabled={loading || pageNumber <= 1} onClick={() => { setFlipSnapshot(''); setPageNumber(p => Math.max(1, p - 1)) }}>‹</button>
        <label className="psb-pdf-goto">Page <input aria-label="Go to page number" type="number" inputMode="numeric" min="1" max={numPages || 1} value={pageInput} disabled={loading} onChange={event => setPageInput(event.target.value)} onKeyDown={handlePageInputKey}/><span>/ {numPages || '—'}</span><button type="button" className="secondary" disabled={loading || !numPages} onClick={goToPage}>Go</button></label>
        <button type="button" className="secondary" aria-label="Next page" disabled={loading || pageNumber >= numPages} onClick={() => { setFlipSnapshot(''); setPageNumber(p => Math.min(numPages, p + 1)) }}>›</button>
      </div>
      <div className="psb-pdf-zoom">
        <button type="button" className="secondary" aria-label="Zoom out" disabled={zoom <= .7} onClick={() => setZoom(v => Math.max(.7, Math.round((v - .15) * 100) / 100))}>−</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" className="secondary" aria-label="Zoom in" disabled={zoom >= 2} onClick={() => setZoom(v => Math.min(2, Math.round((v + .15) * 100) / 100))}>+</button>
        <button type="button" className="secondary psb-pdf-fit" onClick={() => setZoom(1)}>Fit</button>
      </div>
    </div>
    {loading && <div className="psb-pdf-loading"><div className="share-spinner"/><span>{loadingStatus}{!fromCache && progress > 0 ? ' ' + progress + '%' : ''}</span></div>}
    {error && <div className="share-preview-message"><b>Preview could not load</b><p>{error}</p><a className="secondary" href={url} target="_blank" rel="noreferrer">Open PDF in browser</a></div>}
    <div className="psb-pdf-canvas-wrap" ref={containerRef} hidden={loading || !!error}>
      <div className="psb-pdf-page-stage">
        <canvas ref={canvasRef} aria-label={'Page ' + pageNumber + ' of ' + title}/>
        {flipSnapshot && <div key={flipKey} className={'psb-pdf-page-flip ' + flipDirection} style={{ width: pageSize.width, height: pageSize.height, backgroundImage: 'url("' + flipSnapshot + '")' }} onAnimationEnd={() => setFlipSnapshot('')} aria-hidden="true"/>}
      </div>
    </div>
  </section>
}
