<script lang="ts">
  import { COLS, ROWS, type Cell, cellColor, cellLabel, rowLabel, dist } from './logic'
  type Tok = { cell: Cell; color: string; initial: string }
  let {
    cs = 24, tokens = [], target = null, hint = null, selected = null, onpick,
  }: {
    cs?: number; tokens?: Tok[]; target?: Cell | null; hint?: Cell | null; selected?: Cell | null; onpick?: (c: Cell) => void
  } = $props()

  let grid: HTMLDivElement
  /** Case sous un point de l'écran (coordonnées pixels). */
  export function cellAt(px: number, py: number): Cell | null {
    const r = grid.getBoundingClientRect()
    if (px < r.left || px > r.right || py < r.top || py > r.bottom) return null
    return [Math.floor(((py - r.top) / r.height) * ROWS), Math.floor(((px - r.left) / r.width) * COLS)]
  }
  const byCell = $derived(new Map(tokens.map((t) => [t.cell.join(','), t])))
  const frame = $derived(target)
</script>

<div class="wrap" style="--cs:{cs}px">
  <div class="cols">{#each Array(COLS) as _, c}<span>{c + 1}</span>{/each}</div>
  <div class="mid">
    <div class="rows">{#each Array(ROWS) as _, r}<span>{rowLabel(r)}</span>{/each}</div>
    <div class="grid" bind:this={grid} style="grid-template-columns:repeat({COLS},var(--cs))">
      {#each Array(ROWS) as _, r}
        {#each Array(COLS) as _, c}
          {@const cell = [r, c] as Cell}
          {@const tok = byCell.get(r + ',' + c)}
          <button
            class="cell"
            class:sel={selected && selected[0] === r && selected[1] === c}
            class:frame={frame && dist(frame, cell) <= 1}
            class:tgt={frame && frame[0] === r && frame[1] === c}
            class:hint={hint && hint[0] === r && hint[1] === c}
            style="background:{cellColor(cell)}"
            disabled={!onpick}
            onclick={() => onpick?.(cell)}
            aria-label={cellLabel(cell)}
          >{#if tok}<i style="background:{tok.color}">{tok.initial}</i>{/if}</button>
        {/each}
      {/each}
    </div>
  </div>
</div>

<style>
  .wrap { display: inline-block; font-size: 10px; color: var(--c-soft); user-select: none; }
  .cols { display: grid; grid-template-columns: repeat(30, var(--cs)); margin-left: 16px; text-align: center; opacity: .7; }
  .mid { display: flex; }
  .rows { display: grid; grid-template-rows: repeat(16, var(--cs)); width: 16px; align-items: center; opacity: .7; }
  .grid { display: grid; grid-auto-rows: var(--cs); border-radius: 10px; overflow: hidden; box-shadow: var(--shadow-out); }
  .cell { position: relative; width: var(--cs); height: var(--cs); padding: 0; border: 0; border-radius: 0; display: grid; place-items: center; }
  .cell:disabled { cursor: default; }
  .cell.frame { outline: 2px solid #fff; outline-offset: -2px; z-index: 1; }
  .cell.tgt { outline: 3px solid #242423; outline-offset: -3px; z-index: 2; }
  .cell.hint { outline: 3px dashed #fff; outline-offset: -3px; z-index: 2; }
  .cell.sel { outline: 3px solid var(--c-accent); outline-offset: -3px; z-index: 3; animation: pulse .9s ease-in-out infinite alternate; }
  i { position: absolute; inset: 12%; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 2px 6px rgb(0 0 0 / .6); font-style: normal; font-weight: 800; font-size: calc(var(--cs) * .4); color: #242423; display: grid; place-items: center; z-index: 2; }
  @keyframes pulse { to { transform: scale(1.12); } }
</style>
