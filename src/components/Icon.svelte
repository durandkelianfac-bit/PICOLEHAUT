<script lang="ts">
  // Jeu d'icônes unique du site (traits fins, 24×24, couleur du texte) : remplace les emojis, qui varient d'un appareil à l'autre.
  let { name, size = '1.1em' }: { name: string; size?: string } = $props()
  const P: Record<string, string> = {
    // jeux
    hues: '<path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-.9 2-1.8 0-1.3-1-1.5-1-2.7 0-1 .8-1.5 1.8-1.5H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
    codenames: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    pyramide: '<path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 3v17M7 12h10"/>',
    palmier: '<path d="M12 21V11"/><path d="M12 11C9 11 6 9.5 4.5 7c3-.5 5.500.5 7.500 4Z"/><path d="M12 11c3 0 6-1.500 7.500-4-3-.5-5.500.5-7.500 4Z"/><path d="M12 11C11 8 11.500 5.500 12 3c1 2.500 1.200 5 0 8Z"/><path d="M8 21h8"/>',
    guess: '<rect x="2.500" y="8" width="19" height="8" rx="1.500"/><path d="M6 8v3M9.500 8v4M13 8v3M16.500 8v4"/>',
    cyclone: '<path d="M12 12m-1 0a1 1 0 1 0 2 0 1 1 0 1 0-2 0"/><path d="M12 11a2.500 2.500 0 0 0-2.500 2.500c0 2.500 2 4 4.500 4 3 0 5.500-2.500 5.500-5.500 0-4-3.200-7-7.500-7C7 5 3.500 8.500 3.500 13"/>',
    doublage: '<rect x="3" y="9" width="18" height="12" rx="1.500"/><path d="m3 9 2-5 4 1.500-2 4M9 5.500l4 1.500-2 3M13 7l4 1.500-2 2"/>',
    // actions et états
    trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8 20h8"/>',
    crown: '<path d="m3 8 4.500 4L12 5l4.500 7L21 8l-2 11H5L3 8Z"/>',
    snow: '<path d="M12 2v20M3.300 7 20.700 17M3.300 17 20.700 7"/><path d="m9.500 3.500 2.500 2 2.500-2M9.500 20.500l2.500-2 2.500 2"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13"/><path d="M12 8C10 8 7 7 7 5s3-2.500 5 3Zm0 0c2 0 5-1 5-3s-3-2.500-5 3Z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    touch: '<path d="M9 11V5a1.500 1.500 0 0 1 3 0v5l5 1.500a2 2 0 0 1 1.400 2.400L17.500 19a2 2 0 0 1-2 1.500H11a2 2 0 0 1-1.500-.7L5 14.500a1.500 1.500 0 0 1 2.200-2L9 14"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    volume: '<path d="M4 9.500h3.500L12 6v12l-4.500-3.500H4v-5Z"/><path d="M15.500 9a4 4 0 0 1 0 6M18 6.500a8 8 0 0 1 0 11"/>',
    users: '<circle cx="9" cy="8" r="3.500"/><path d="M2.500 20a6.500 6.500 0 0 1 13 0M16 4.500a3.500 3.500 0 0 1 0 7M18 14a6.500 6.500 0 0 1 3.500 6"/>',
    timer: '<circle cx="12" cy="13.500" r="8"/><path d="M12 9v4.500l3 1.500M9.500 2.500h5"/>',
    check: '<path d="m4.500 12.500 5 5 10-11"/>',
    close: '<path d="m5 5 14 14M19 5 5 19"/>',
    warn: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v5M12 17.500v.5"/>',
    dot: '<circle cx="12" cy="12" r="5" fill="currentColor"/>',
    beer: '<path d="M6 7h9v13H6V7Z"/><path d="M15 10h2.500a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H15"/><path d="M6 7c0-2 1.500-3 3-2.500C10 3.500 13 3.500 14 5c1 .5 1 2 1 2"/>',
    cup: '<path d="M6 5h12l-1.500 15h-9L6 5Z"/><path d="M6.500 10h11M13 5l1-3"/>',
    tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
    phone: '<rect x="7" y="2.500" width="10" height="19" rx="2.500"/><path d="M11 18.500h2"/>',
    hide: '<path d="M2 12s3.600-6.500 10-6.500c2 0 3.700.6 5.200 1.500M22 12s-3.600 6.500-10 6.500c-2 0-3.700-.6-5.200-1.500"/><path d="m4 4 16 16M9.800 9.800a3 3 0 0 0 4.400 4.400"/>',
    scroll: '<path d="M7 4h11v13a3 3 0 0 1-3 3H6a3 3 0 0 0 3-3V4"/><path d="M7 4a3 3 0 0 0-3 3v1h3M11 9h4M11 13h4"/>',
    burst: '<path d="m12 2 2 5.500 5.500-2-2 5.500 5 2.500-5.500 2L19 21l-5.500-2-1.500 3.500L10.500 19 5 21l1.500-5.500L1.500 13l5.500-2L5 5.500 10.500 7.500 12 2Z"/>',
    sparkle: '<path d="M12 3c.5 4.500 2.500 6.500 7 7-4.500.5-6.500 2.500-7 7-.5-4.500-2.500-6.500-7-7 4.500-.5 6.500-2.500 7-7Z"/>',
    star: '<path d="m12 3 2.700 5.600 6.100.8-4.500 4.300 1.100 6.100L12 16.800l-5.400 3 1.100-6.100L3.200 9.400l6.100-.8L12 3Z"/>',
    clap: '<rect x="3" y="9" width="18" height="12" rx="1.500"/><path d="m3 9 2-5 4 1.500-2 4M9 5.500l4 1.500-2 3M13 7l4 1.500-2 2"/>',
    skull: '<path d="M5 11a7 7 0 0 1 14 0v3.500l-2 1V19H7v-3.500l-2-1V11Z"/><circle cx="9.500" cy="12" r="1.500"/><circle cx="14.500" cy="12" r="1.500"/><path d="M11 17v2M13 17v2"/>',
    // accessoires d'avatar
    none: '<circle cx="12" cy="12" r="8"/><path d="m6.500 6.500 11 11"/>',
    tophat: '<path d="M7 15V5h10v10M3 17.500c0-1.500 4-2.500 9-2.500s9 1 9 2.500-4 2.500-9 2.500-9-1-9-2.500Z"/><path d="M7 12h10"/>',
    party: '<path d="M12 3 5.500 20h13L12 3Z"/><path d="M8.500 13h7M7 17h10"/><circle cx="12" cy="3" r="1"/>',
    cap: '<path d="M4 16a8 8 0 0 1 16 0H4Z"/><path d="M14 16c2 0 5.500.5 6.500 2.500"/>',
    halo: '<ellipse cx="12" cy="6" rx="6.500" ry="2.500"/><circle cx="12" cy="16" r="4.500"/>',
    antenna: '<path d="M12 21v-9M7 21h10"/><circle cx="12" cy="9" r="2"/><path d="M7.500 6a6 6 0 0 1 9 0M5 3.500a9.500 9.500 0 0 1 14 0"/>',
    propeller: '<path d="M12 12v8M7 20h10"/><path d="M12 12c-2-4-6-4-8-3 2 4 6 4 8 3Zm0 0c2-4 6-4 8-3-2 4-6 4-8 3Z"/>',
  }
</script>

<svg class="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{@html P[name] ?? ''}</svg>

<style>
  .icon { display: inline-block; vertical-align: -0.18em; flex: none; }
</style>
