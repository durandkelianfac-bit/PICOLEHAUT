<script lang="ts">
  // Placeholder SVG en attendant les avatars 3D (phase 7).
  let { name = '', color = '#F5CB5C', size = 48 }: { name?: string; color?: string; size?: number } = $props()
  const initial = $derived((name.trim()[0] ?? '?').toUpperCase())
</script>
<svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={name || 'Joueur'}>
  <defs><radialGradient id="g{color.slice(1)}" cx="35%" cy="30%"><stop offset="0" stop-color="#fff" stop-opacity=".55" /><stop offset="1" stop-color={color} /></radialGradient></defs>
  <circle cx="24" cy="24" r="23" fill="url(#g{color.slice(1)})" />
  <text x="24" y="31" text-anchor="middle" font-size="22" font-weight="800" fill="#242423" font-family="Arial Black, sans-serif">{initial}</text>
</svg>
