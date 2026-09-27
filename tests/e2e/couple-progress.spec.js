import { expect, test } from '@playwright/test'

// Monta la tarjeta real con datos sintéticos, sin sesión ni acceso al espacio de una pareja.
test('progreso de deuda compartida es legible, accesible y privado', async ({ page }, testInfo) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/__couple-progress-test', (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: `
    <html lang="es" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/src/styles/app.css"><link rel="stylesheet" href="/src/styles/night.css"></head>
    <body><main style="max-width:440px;margin:24px auto;padding:16px"><p>Datos de ejemplo · prueba local</p><div id="cards"></div></main><script type="module">
    import React from '/node_modules/.vite/deps/react.js';
    import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
    import RefreshRuntime from '/@react-refresh';
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
    const { SharedAccountCard } = await import('/src/features/couples/components/SharedAccountCard.jsx');
    const root = ReactDOM.createRoot(document.getElementById('cards'));
    const rows = [
      { name: 'Crédito viaje', kind: 'liability', balance_minor: 75000000, debt_paid_minor: 25000000 },
      { name: 'Cuenta de sueldo', kind: 'asset', balance_minor: 112720000 },
      { name: 'Tarjeta nueva', kind: 'liability', balance_minor: 100000000, debt_paid_minor: 0 },
      { name: 'Deuda completada', kind: 'liability', balance_minor: 0, debt_paid_minor: 130000000 },
      { name: 'Sin información', kind: 'liability', balance_minor: 30000000 }
    ];
    window.renderCards = (hiddenAmounts = false) => root.render(React.createElement('div', { className: 'shared-account-list' }, rows.map((account) => React.createElement(SharedAccountCard, { key: account.name, item: { account, owner_label: 'Tú' }, hiddenAmounts }))));
    window.renderCards();
    </script></body></html>` }))
  await page.goto('/__couple-progress-test')
  await expect.poll(async () => errors.length || await page.getByRole('progressbar').count()).toBeGreaterThan(0)
  expect(errors).toEqual([])
  await expect(page.getByRole('progressbar', { name: 'Porcentaje pagado de Crédito viaje' })).toHaveAttribute('value', '25')
  await expect(page.getByRole('progressbar')).toHaveCount(3)
  await expect(page.getByRole('progressbar', { name: 'Porcentaje pagado de Tarjeta nueva' })).toHaveAttribute('value', '0')
  await expect(page.getByRole('progressbar', { name: 'Porcentaje pagado de Deuda completada' })).toHaveAttribute('value', '100')
  await expect(page.getByText('Avance no disponible')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: `output/playwright/couple-progress-${testInfo.project.name}.png`, fullPage: true })
  await page.evaluate(() => window.renderCards(true))
  await expect(page.getByRole('progressbar')).toHaveCount(0)
  await expect(page.getByText('Avance oculto', { exact: true })).toHaveCount(4)
  await expect(page.locator('.shared-account-list')).not.toContainText('250.000')
  expect(errors).toEqual([])
})
