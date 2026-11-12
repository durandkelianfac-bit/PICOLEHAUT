import { mount } from 'svelte'
import './styles/tokens.css'
import App from './App.svelte'
import { initRouter } from './lib/router.svelte'
import { keepAwake } from './lib/wakelock'

initRouter()
keepAwake()
mount(App, { target: document.getElementById('app')! })
