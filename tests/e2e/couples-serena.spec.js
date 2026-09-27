import { expect, test } from '@playwright/test'

// Monta componentes de producción con un servicio local simulado: nunca escribe en cuentas reales.
test('Serena separa saldos, abre acciones a demanda y conserva permisos, errores y privacidad', async ({ page }, testInfo) => {
  test.setTimeout(90000)
  const errors = []
  const actions = []
  let failAction = false
  page.on('pageerror', (error) => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  // Usa las mismas URLs versionadas de Vite para no cargar una segunda copia de React.
  const entry = await (await page.request.get('/src/main.jsx')).text()
  const reactUrl = entry.match(/from "([^"]+\/react\.js\?[^"]+)"/)[1]
  const reactDomUrl = entry.match(/from "([^"]+\/react-dom_client\.js\?[^"]+)"/)[1]
  await page.route('**/src/services/couples/couplesClient.js', (route) => route.fulfill({ contentType: 'application/javascript', body: `
    export async function performCoupleAction(action, payload) {
      const response = await fetch('/__couples-action-test', { method: 'POST', body: JSON.stringify({ action, ...payload }) });
      if (!response.ok) throw new Error('No se guardó. Reintenta.');
      return {};
    }` }))
  await page.route('**/__couples-action-test', (route) => {
    actions.push(route.request().postDataJSON())
    return route.fulfill({ status: failAction ? 503 : 200, json: {} })
  })
  await page.route('**/__couples-serena-test', (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: `
    <html lang="es" data-theme="dark" data-motion="off"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="/src/styles/app.css"><link rel="stylesheet" href="/src/styles/night.css"><link rel="stylesheet" href="/src/app/shell.css"><link rel="stylesheet" href="/src/styles/night-icons.css"><link rel="stylesheet" href="/src/styles/calm.css"></head>
    <body><div class="app-shell calm-app"><aside class="side-nav"><strong>PataWallet</strong><span>Parejas · Prueba local</span></aside><main class="page" style="padding-top:24px"><p style="margin-bottom:24px">Datos de ejemplo · Prueba local</p><div id="team" class="couples-page"></div></main></div><script type="module">
    import React from '${reactUrl}';
    import ReactDOM from '${reactDomUrl}';
    import RefreshRuntime from '/@react-refresh';
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
    const { ActiveCouple } = await import('/src/features/couples/components/ActiveCouple.jsx');
    const root = ReactDOM.createRoot(document.getElementById('team'));
    const accounts = [
      { id: 'salary', name: 'Cuenta de sueldo', kind: 'asset', balance_minor: 112720000 },
      { id: 'travel', name: 'Crédito viaje', kind: 'liability', balance_minor: 75000000, debt_paid_minor: 25000000 },
      { id: 'private', name: 'Cuenta privada', kind: 'asset', balance_minor: 200000 },
      { id: 'archived', name: 'Archivada', kind: 'asset', archived: true }
    ];
    const couple = { id: 'space', shared_accounts: [
      ...accounts.slice(0, 2).map(account => ({ account, account_id: account.id, owner_user_id: 'me', owner_label: 'Tú' })),
      { account_id: 'card', owner_user_id: 'partner', owner_label: 'Tu pareja', account: { id: 'card', name: 'Tarjeta principal', kind: 'liability', balance_minor: 100000000, debt_paid_minor: 100000000 } }
    ], requests: [
      { id: 'review', proposer_id: 'partner', status: 'pending', account_name: 'Crédito viaje', change_type: 'account_adjustment', payload: { amount_minor: 5000000, direction: 'decrease' } },
      { id: 'own', proposer_id: 'me', status: 'pending', account_name: 'Cuenta de sueldo', change_type: 'account_adjustment', payload: { amount_minor: 1000000, direction: 'increase' } }
    ] };
    window.refreshes = 0;
    function Fixture({ empty = false, hidden = false }) {
      const [busy, setBusy] = React.useState(false);
      return React.createElement(ActiveCouple, { couple: empty ? { ...couple, shared_accounts: [], requests: [] } : couple,
        accounts, settings: { currency: 'COP', hiddenAmounts: hidden }, user: { id: 'me' }, busy, setBusy,
        reload: async () => { window.refreshes++; }, notify: () => {} });
    }
    let version = 0;
    window.renderTeam = (options = {}) => root.render(React.createElement(Fixture, { key: ++version, ...options }));
    window.renderTeam();
    </script></body></html>` }))
  await page.goto('/__couples-serena-test')
  const debts = page.getByRole('region', { name: 'Deudas compartidas' })
  const money = page.getByRole('region', { name: 'Dinero compartido' })
  await expect(debts.getByRole('progressbar')).toHaveCount(2)
  await expect(debts.getByRole('progressbar', { name: /Crédito viaje/ })).toHaveAttribute('value', '25')
  await expect(money).toContainText('Cuenta de sueldo')
  await expect(money.getByRole('progressbar')).toHaveCount(0)
  await expect(page.locator('form')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect((await debts.locator('article').first().boundingBox()).height).toBeLessThan(220)
  await page.screenshot({ path: `output/playwright/couples-serena-${testInfo.project.name}.png`, fullPage: true })

  // La selección solo expone cuentas propias, no archivadas; un error conserva el borrador.
  const sharing = page.getByRole('button', { name: 'Qué compartimos' })
  await sharing.click()
  const dialog = page.getByRole('dialog')
  await expect(page.locator('.app-shell')).toHaveAttribute('inert', '')
  await expect(dialog.getByRole('checkbox')).toHaveCount(3)
  await expect(dialog).not.toContainText('Tarjeta principal')
  await dialog.getByRole('checkbox', { name: /Cuenta privada/ }).check()
  failAction = true
  await dialog.getByRole('button', { name: 'Guardar selección' }).click()
  await expect(dialog.getByRole('alert')).toHaveText('No se guardó. Reintenta.')
  await expect(dialog.getByRole('checkbox', { name: /Cuenta privada/ })).toBeChecked()
  failAction = false
  await dialog.getByRole('button', { name: 'Guardar selección' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(sharing).toBeFocused()
  expect(actions.at(-1)).toEqual({ action: 'share_account', couple_id: 'space', account_id: 'private' })

  // Proponer cambios mantiene la aprobación posterior y nunca cambia el saldo del resumen.
  await page.getByRole('button', { name: 'Proponer un cambio' }).click()
  await dialog.getByLabel('Cuenta compartida').selectOption('partner::card')
  await dialog.getByLabel('Monto', { exact: true }).fill('50.000')
  failAction = true
  await dialog.getByRole('button', { name: 'Enviar para aprobación' }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  await expect(dialog.getByLabel('Monto', { exact: true })).toHaveValue('50.000')
  failAction = false
  await dialog.getByRole('button', { name: 'Enviar para aprobación' }).click()
  await expect(dialog).toHaveCount(0)
  expect(actions.at(-1)).toMatchObject({ action: 'create_change_request', owner_user_id: 'partner', account_id: 'card', payload: { amount_minor: 5000000 } })
  await expect(debts).toContainText('750.000')
  await page.getByRole('button', { name: 'Proponer un cambio' }).click()
  await dialog.getByLabel('Tipo de cambio').selectOption('account_update')
  await dialog.getByLabel('Cuota mensual', { exact: true }).fill('300.000')
  await dialog.getByRole('button', { name: 'Enviar para aprobación' }).click()
  await expect(dialog).toHaveCount(0)
  expect(actions.at(-1)).toMatchObject({ change_type: 'account_update', payload: { debt_monthly_payment_minor: 30000000 } })

  // Solo se permite revisar la solicitud de la pareja, nunca aprobar la propia.
  await page.getByRole('button', { name: /2 solicitudes pendientes/ }).click()
  await expect(dialog.getByRole('button', { name: 'Aprobar', exact: true })).toHaveCount(1)
  await expect(dialog).toContainText('Esperando a tu pareja')
  await dialog.getByRole('button', { name: 'Aprobar', exact: true }).click()
  await expect.poll(() => actions.at(-1)?.decision).toBe('approve')
  await expect(dialog.getByRole('button', { name: 'Rechazar', exact: true })).toBeEnabled()
  await dialog.getByRole('button', { name: 'Rechazar', exact: true }).click()
  await expect.poll(() => actions.at(-1)?.decision).toBe('reject')
  await expect(dialog.getByRole('button', { name: 'Rechazar', exact: true })).toBeEnabled()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)

  await page.evaluate(() => window.renderTeam({ hidden: true }))
  await expect(page.getByRole('progressbar')).toHaveCount(0)
  await expect(page.locator('.couples-serena')).not.toContainText('750.000')
  await page.getByRole('button', { name: /2 solicitudes pendientes/ }).click()
  await expect(dialog).not.toContainText('50.000')
  await page.keyboard.press('Escape')
  await page.evaluate(() => window.renderTeam({ empty: true }))
  await expect(page.getByRole('button', { name: 'Proponer un cambio' })).toHaveCount(0)
  await expect(debts).toContainText('Aún no comparten deudas')
  await expect(money).toContainText('Aún no comparten cuentas')
  await page.getByRole('button', { name: /Sin solicitudes pendientes/ }).click()
  await expect(dialog).toContainText('No hay solicitudes todavía')
  expect(errors).toEqual([])
})
