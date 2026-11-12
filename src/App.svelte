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
</script>

<AgeGate />
{#if route.path === '/jeux'}<Games />
{:else if route.path === '/creer'}<Create />
{:else if route.path === '/rejoindre'}<Join />
{:else if route.path === '/salon'}<Room />
{:else if route.path === '/packs'}<Packs />
{:else if route.path === '/regles'}<Rules />
{:else}<Home />{/if}
<Nav />
