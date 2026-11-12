import { mount } from 'svelte'
import './styles/tokens.css'
import App from './App.svelte'
import { initRouter } from './lib/router.svelte'
import { keepAwake } from './lib/wakelock'
import { claimTabId } from './lib/identity'
import { load } from './lib/storage'

// Un identifiant par onglet avant d'afficher quoi que ce soit (tests à plusieurs onglets)
await claimTabId(load<{ id?: string } | null>('picole.profile', null)?.id ?? '')
initRouter()
keepAwake()
mount(App, { target: document.getElementById('app')! })
