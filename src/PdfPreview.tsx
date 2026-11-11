import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

type PdfPreviewProps = {
  url: string
  title: string
}

export default function PdfPreview({ url, title }: PdfPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const documentRef = useRef<any>(null)
  const renderTaskRef = useRef<any>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [containerWidth, setContainerWidth] = useState(0)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

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
    setLoading(true)
    setProgress(0)
    setError('')
    setNumPages(0)
    setPageNumber(1)
    setZoom(1)
    documentRef.current = null

    // Range requests let large chapter PDFs load a page at a time rather than
    // waiting for the entire 16–35 MB document to download before preview.
    const task = pdfjsLib.getDocument({
      url,
      rangeChunkSize: 256 * 1024,
      disableRange: false,
      disableStream: false,
      withCredentials: false
    })
    task.onProgress = (value: { loaded: number; total?: number }) => {
      if (!alive) return
      if (value.total && value.total > 0) {
        setProgress(Math.min(99, Math.round((value.loaded / value.total) * 100)))
      }
    }
    task.promise.then((pdf: any) => {
      if (!alive) {
        void task.destroy()
        return
      }
      documentRef.current = pdf
      setNumPages(pdf.numPages)
      setLoading(false)
      setProgress(100)
    }).catch((reason: unknown) => {
      if (!alive) return
      const message = reason instanceof Error ? reason.message : 'The PDF could not be loaded.'
      setError(message)
      setLoading(false)
    })

    return () => {
      alive = false
      renderTaskRef.current?.cancel?.()
      void task.destroy()
    }
  }, [url])

  useEffect(() => {
    let alive = true
    const pdf = documentRef.current
    const canvas = canvasRef.current
    if (!pdf || !canvas || !containerWidth) return

    renderTaskRef.current?.cancel?.()
    setError('')
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
        const transform: [number, number, number, number, number, number] = [
          outputScale, 0, 0, outputScale, 0, 0
        ]
        const renderTask = page.render({ canvas, viewport, transform })
        renderTaskRef.current = renderTask
        await renderTask.promise
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

  return <section className="psb-pdf-viewer" aria-label={'PDF preview: ' + title}>
    <div className="psb-pdf-toolbar">
      <div className="psb-pdf-pages">
        <button type="button" className="secondary" aria-label="Previous page" disabled={loading || pageNumber <= 1} onClick={() => setPageNumber(p => Math.max(1, p - 1))}>‹</button>
        <span>Page <b>{pageNumber}</b> / {numPages || '—'}</span>
        <button type="button" className="secondary" aria-label="Next page" disabled={loading || pageNumber >= numPages} onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}>›</button>
      </div>
      <div className="psb-pdf-zoom">
        <button type="button" className="secondary" aria-label="Zoom out" disabled={zoom <= .7} onClick={() => setZoom(v => Math.max(.7, Math.round((v - .15) * 100) / 100))}>−</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" className="secondary" aria-label="Zoom in" disabled={zoom >= 2} onClick={() => setZoom(v => Math.min(2, Math.round((v + .15) * 100) / 100))}>+</button>
        <button type="button" className="secondary psb-pdf-fit" onClick={() => setZoom(1)}>Fit</button>
      </div>
    </div>
    {loading && <div className="psb-pdf-loading"><div className="share-spinner"/><span>{progress ? 'Loading PDF… ' + progress + '%' : 'Opening PDF…'}</span></div>}
    {error && <div className="share-preview-message"><b>Preview could not load</b><p>{error}</p><a className="secondary" href={url} target="_blank" rel="noreferrer">Open PDF in browser</a></div>}
    <div className="psb-pdf-canvas-wrap" ref={containerRef} hidden={loading || !!error}>
      <canvas ref={canvasRef} aria-label={'Page ' + pageNumber + ' of ' + title}/>
    </div>
  </section>
}
