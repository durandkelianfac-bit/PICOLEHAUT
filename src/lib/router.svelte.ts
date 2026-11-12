// Routeur par hash (compatible GitHub Pages, sans configuration serveur).
export const route = $state({ path: '/', params: new URLSearchParams() })

function parse() {
  const h = location.hash.replace(/^#/, '') || '/'
  const [path, query = ''] = h.split('?')
  route.path = path
  route.params = new URLSearchParams(query)
}
export function initRouter() {
  parse()
  addEventListener('hashchange', parse)
}
export function go(path: string) { location.hash = path }
