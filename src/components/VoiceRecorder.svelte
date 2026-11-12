<script lang="ts">
  // Enregistrement de la voix (MediaRecorder). HTTPS obligatoire ; micro demandé après un geste.
  import { onMount } from 'svelte'
  import { pickMime } from '../games/doublage/logic'

  let { blob = $bindable(null), maxSeconds = 20 }: { blob?: Blob | null; maxSeconds?: number } = $props()

  let state = $state<'idle' | 'rec' | 'done' | 'error'>('idle')
  let msg = $state('')
  let secs = $state(0)
  let url = $state('')
  let rec: MediaRecorder | null = null
  let stream: MediaStream | null = null
  let chunks: Blob[] = []
  let timer: ReturnType<typeof setInterval> | undefined

  const release = () => { stream?.getTracks().forEach((t) => t.stop()); stream = null; clearInterval(timer) }

  async function start() {
    msg = ''
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      const mime = pickMime((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m))
      rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunks = []
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
      rec.onstop = () => {
        release()
        blob = new Blob(chunks, { type: rec?.mimeType || mime || 'audio/webm' })
        if (url) URL.revokeObjectURL(url)
        url = URL.createObjectURL(blob)
        state = 'done'
      }
      rec.start()
      secs = 0; state = 'rec'
      timer = setInterval(() => { secs += 1; if (secs >= maxSeconds) stop() }, 1000)
    } catch (e) {
      state = 'error'
      msg = e instanceof DOMException && e.name === 'NotAllowedError' ? 'Micro refusé : autorise-le dans les réglages du navigateur.' : 'Micro indisponible sur cet appareil.'
    }
  }
  function stop() { if (rec && rec.state !== 'inactive') rec.stop() }
  function redo() { blob = null; if (url) URL.revokeObjectURL(url); url = ''; state = 'idle' }
  onMount(() => () => { release(); if (url) URL.revokeObjectURL(url) })
</script>

<div class="stack">
  {#if state === 'idle' || state === 'error'}
    <button class="btn primary block big" onclick={start}>🎙️ Enregistrer ma voix</button>
  {:else if state === 'rec'}
    <button class="btn block big recording" onclick={stop}>⏹ Arrêter ({secs}s / {maxSeconds}s)</button>
  {:else}
    <audio controls src={url} aria-label="Réécoute de ton enregistrement"></audio>
    <button class="btn block" onclick={redo}>Refaire</button>
  {/if}
  {#if msg}<span class="muted" role="alert">{msg}</span>{/if}
</div>
<style>
  .big { min-height: 72px; font-size: 1.15rem; }
  .recording { background: var(--c-danger); color: #fff; animation: pulse 1s ease-in-out infinite alternate; }
  audio { width: 100%; }
  @keyframes pulse { to { transform: scale(1.02); } }
</style>
