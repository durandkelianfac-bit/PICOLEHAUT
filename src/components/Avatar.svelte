<script lang="ts">
  // Avatar 3D (vignette générée à la demande) ; placeholder SVG instantané tant qu'elle n'est pas prête
  // ou si WebGL / le chargement échoue.
  let { name = '', color = '#F5CB5C', size = 48, look = '' }: { name?: string; color?: string; size?: number; look?: string } = $props()
  const initial = $derived((name.trim()[0] ?? '?').toUpperCase())
  let img = $state('')
  $effect(() => {
    const l = look, c = color
    img = ''
    if (!l) return
    let alive = true
    import('../lib/avatar3d')
      .then((m) => m.avatarSnapshot(l, c, size > 64 ? 256 : 160))
      .then((u) => { if (alive) img = u })
      .catch(() => {})
    return () => { alive = false }
  })
</script>
{#if img}
  <span class="ph" style="width:{size}px;height:{size}px;--c:{color}"><img src={img} alt={name || 'Joueur'} width={size} height={size} /></span>
{:else}
  <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={name || 'Joueur'}>
    <defs><radialGradient id="g{color.slice(1)}" cx="35%" cy="30%"><stop offset="0" stop-color="#fff" stop-opacity=".55" /><stop offset="1" stop-color={color} /></radialGradient></defs>
    <circle cx="24" cy="24" r="23" fill="url(#g{color.slice(1)})" />
    <text x="24" y="31" text-anchor="middle" font-size="22" font-weight="800" fill="#242423" font-family="Arial Black, sans-serif">{initial}</text>
  </svg>
{/if}
<style>
  .ph { display: inline-grid; place-items: end center; border-radius: 50%; overflow: hidden; background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--c) 55%, #fff), color-mix(in srgb, var(--c) 40%, #242423)); box-shadow: var(--shadow-out); flex: none; }
  img { display: block; object-fit: contain; }
</style>
