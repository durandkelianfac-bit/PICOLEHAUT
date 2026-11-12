<script lang="ts">
  import { route } from './lib/router.svelte'
  import Nav from './components/Nav.svelte'
  import AgeGate from './components/AgeGate.svelte'
  import Home from './views/Home.svelte'
  import Games from './views/Games.svelte'
  import Create from './views/Create.svelte'
  import Join from './views/Join.svelte'
  import Room from './views/Room.svelte'
  import Packs from './views/Packs.svelte'
  import Rules from './views/Rules.svelte'
  import Game from './views/Game.svelte'
  import Table from './views/Table.svelte'
  import { session } from './lib/room.svelte'
  import { go } from './lib/router.svelte'

  // Un appareil « table » affiche toujours l'écran partagé ; les joueurs entrent dans le jeu quand il démarre.
  $effect(() => {
    if (session.role === 'table' && session.state && route.path !== '/table') go('/table')
    else if (session.role === 'player' && session.state?.game && route.path === '/salon') go('/jeu')
  })
</script>

<AgeGate />
{#if route.path === '/jeux'}<Games />
{:else if route.path === '/creer'}<Create />
{:else if route.path === '/rejoindre'}<Join />
{:else if route.path === '/salon'}<Room />
{:else if route.path === '/packs'}<Packs />
{:else if route.path === '/regles'}<Rules />
{:else if route.path === '/jeu'}<Game />
{:else if route.path === '/table'}<Table />
{:else}<Home />{/if}
{#if route.path !== '/table'}<Nav />{/if}
