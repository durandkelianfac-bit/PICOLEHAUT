import { mount } from 'svelte'
import './styles/tokens.css'
import App from './App.svelte'
import { initRouter } from './lib/router.svelte'
import { keepAwake } from './lib/wakelock'
import { claimTabId } from './lib/identity'
import { load } from './lib/storage'
import { session, gameAction, restoreSession } from './lib/room.svelte'

// Un identifiant par onglet avant d'afficher quoi que ce soit (tests à plusieurs onglets)
await claimTabId(load<{ id?: string } | null>('picole.profile', null)?.id ?? '')
initRouter()
// page rechargée (même sans le vouloir) : on retourne dans le salon et la partie en cours
const back = restoreSession()
if (back && !/^#\/(salon|jeu|table)/.test(location.hash)) location.hash = back.asTable ? '#/table' : '#/salon'
keepAwake()
// aide au débogage et aux tests automatiques (jamais dans la version publiée)
if (import.meta.env.DEV) (window as unknown as { __picole: unknown }).__picole = { session, gameAction }
mount(App, { target: document.getElementById('app')! })
