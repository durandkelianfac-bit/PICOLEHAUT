<script lang="ts">
  import { type Card, SUIT_SYMBOL, isRed, valueName } from '../games/pyramide/logic'
  let { card = null, w = 56, horizontal = false, glow = false }: { card?: Card | null; w?: number; horizontal?: boolean; glow?: boolean } = $props()
  const rank = $derived(!card ? '' : card.v === 0 ? '★' : card.v === 1 ? 'A' : card.v === 11 ? 'V' : card.v === 12 ? 'D' : card.v === 13 ? 'R' : String(card.v))
</script>
<div class="card" class:back={!card} class:red={card && isRed(card)} class:glow class:h={horizontal} style="--w:{w}px"
  role="img" aria-label={card ? `${valueName(card.v)} ${card.s}` : 'Carte cachée'}>
  {#if card}
    <span class="r">{rank}</span><span class="s">{SUIT_SYMBOL[card.s]}</span>
  {/if}
</div>
<style>
  .card { width: var(--w); height: calc(var(--w) * 1.4); border-radius: calc(var(--w) * .12); background: #E8EDDF; color: #242423; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 800; box-shadow: 0 4px 10px rgb(0 0 0 / .45); flex: none; transition: transform .3s var(--ease); }
  .card.red { color: #c0392b; }
  .card.back { background: repeating-linear-gradient(45deg, #333533 0 6px, #3f413e 6px 12px); border: 3px solid #CFDBD5; }
  .card.h { transform: rotate(90deg); margin: calc(var(--w) * .2) calc(var(--w) * .2); }
  .card.glow { box-shadow: 0 0 0 3px var(--c-accent), 0 0 22px 4px rgb(245 203 92 / .6); }
  .r { font-size: calc(var(--w) * .42); line-height: 1; }
  .s { font-size: calc(var(--w) * .38); line-height: 1; }
</style>
