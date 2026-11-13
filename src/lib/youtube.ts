// Chargement à la demande de l'API IFrame officielle de YouTube.
let apiP: Promise<any> | undefined
export function loadYouTubeApi(): Promise<any> {
  const w = window as any
  if (w.YT?.Player) return Promise.resolve(w.YT)
  apiP ??= new Promise((resolve, reject) => {
    w.onYouTubeIframeAPIReady = () => resolve(w.YT)
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    s.onerror = () => reject(new Error('YouTube indisponible'))
    document.head.appendChild(s)
  })
  return apiP
}
