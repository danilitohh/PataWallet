// Los recorridos señalan controles reales; nunca ejecutan pagos ni instalaciones.
const steps = {
  home: { path: '/', target: '.balance-hero__numbers, .dashboard .page-header', title: 'Tu punto de partida', body: 'Inicio resume tus cuentas y movimientos. El dinero registrado no es un sueldo estimado ni una consulta al banco: depende de los saldos y pagos que agregues.' },
  account: { path: '/cuentas', target: '.accounts-ledger__add', title: 'Primero, el dinero que tienes hoy', body: 'Con Agregar creas tu cuenta de banco, billetera o efectivo e indicas su saldo actual. Si tu sueldo ya está incluido ahí, no lo registres otra vez como ingreso.' },
  debtAccount: { path: '/cuentas', target: '.accounts-ledger__pane--debt .accounts-ledger__inline-add', title: 'Una deuda no es dinero disponible', body: 'Agrega aquí lo que aún debes de una tarjeta o préstamo. Después, usa “Pagué una deuda” para registrar cada abono desde una cuenta con dinero.' },
  add: { path: '/', target: '.calm-register, .side-nav__add, .dashboard > .calm-primary', title: 'Registra lo que pasó', body: 'Aquí eliges si compraste algo, recibiste dinero o pagaste una deuda. A continuación verás el formulario en modo explicación: no se guardará ningún movimiento.' },
  income: { path: '/', flow: 'income', target: '[data-guide="movement-income"]', title: 'Cuando recibas tu sueldo', body: 'Elige Recibí dinero, escribe el monto que llegó, selecciona dónde lo recibiste y la categoría Salario. Guárdalo una sola vez; no repitas dinero que ya incluiste en el saldo inicial.' },
  expense: { path: '/', flow: 'expense', target: '[data-guide="movement-expense"]', title: 'Cuando hagas una compra', body: 'Elige Hice una compra, indica monto, con qué pagaste y categoría. Efectivo o débito reduce tu saldo; una compra con crédito aumenta la deuda. En Añadir detalles puedes cambiar fecha y agregar una nota.' },
  debt: { path: '/', flow: 'debt', target: '[data-guide="movement-debt"]', title: 'Cuando abones a una deuda', body: 'Elige Pagué una deuda, indica cuánto pagaste, de qué cuenta salió y qué deuda pagaste. Disminuyen tu dinero y tu deuda: no se cuenta la misma compra como otro gasto.' },
  fixed: { path: '/cuentas', target: '#gastos-fijos .account-section-toggle', title: 'Programa tus gastos fijos', body: 'Usa Agregar gasto fijo para definir nombre, monto, frecuencia y próxima fecha. Puedes buscar y tocar un gasto para editarlo o eliminarlo. La lista se muestra por páginas; programar un gasto no significa que ya lo hayas pagado.' },
  checklist: { path: '/cuentas', target: '#recurring-payments-title', title: 'Marca solo pagos que ya hiciste', body: 'La checklist muestra el vencimiento actual y el siguiente de cada gasto. Al marcar, confirma el pago y revisa la cuenta indicada. Tras confirmarlo, desaparece ese vencimiento; no vuelvas a registrar el mismo pago con el botón +.' },
  activity: { path: '/actividad', target: '.activity-filter-panel', title: 'Encuentra y revisa tus movimientos', body: 'Busca por comercio, nota o categoría y filtra por cuenta o tipo. Abre un movimiento para revisar o corregir sus datos. Los eventos del atajo incompletos o dudosos requieren revisión.' },
  plan: { path: '/plan', target: '.plan-featured-goal__action', title: 'Ahorra con una meta', body: 'Crea una meta y aparta dinero para ella. Esa reserva organiza dinero que ya tienes: no crea ingresos ni hace una transferencia bancaria.' },
  budget: { path: '/plan', target: '.plan-budget .plan-panel__heading .icon-button', title: 'Pon un límite a tus gastos', body: 'Define tu presupuesto mensual para comparar lo que gastas con tu límite. Lo que queda del presupuesto no es lo mismo que el saldo de tus cuentas.' },
  purchase: { path: '/plan', target: '.plan-purchases .section-heading .button', title: 'Antes de tu próxima compra', body: 'Agrega una compra prevista para revisar cómo quedaría tu dinero después de compromisos y reservas. Es una evaluación con tus registros, no un pago ni una garantía de que puedas comprar.' },
  install: { path: '/ajustes', target: '.pwa-install__row', title: 'Lleva PataWallet a tu pantalla de inicio', body: 'En Ajustes → Aplicación puedes instalarla o ver los pasos. En iPhone, usa Safari → Compartir → Añadir a pantalla de inicio. En Android, usa Instalar cuando esté disponible. Si ya está instalada, verás ese estado; el recorrido no instala nada.' },
  automation: { path: '/ajustes', target: '.setting-link[href="/ajustes/automatizacion"]', title: 'El atajo para pagos con tarjeta está aquí', body: 'En Ajustes → Automatización encuentras la preparación del atajo para compras compatibles. Instalar la app no activa el atajo: se configura por separado en el iPhone.' },
  shortcut: { path: '/ajustes/automatizacion', target: '.shortcut-steps li:first-child', title: 'Añade, vincula y comprueba el atajo', body: 'Si la plantilla está disponible, añade el atajo y vincula tu cuenta. Después configura la automatización personal en Atajos y revisa el mapeo de tarjeta a cuenta. No lee Wallet directamente ni importa todas tus compras. La prueba de conexión no crea un gasto.' },
}

// Los repasos por tema reutilizan las explicaciones del recorrido general.
export const GUIDE_TOURS = {
  general: { label: 'Recorrido general', steps: ['home', 'account', 'add', 'income', 'expense', 'debt', 'fixed', 'checklist', 'activity', 'plan', 'install', 'automation', 'shortcut'] },
  accounts: { label: 'Cuentas y pagos fijos', steps: ['account', 'debtAccount', 'fixed', 'checklist'] },
  movements: { label: 'Registrar movimientos', steps: ['add', 'income', 'expense', 'debt', 'activity'] },
  plan: { label: 'Metas y presupuesto', steps: ['plan', 'budget', 'purchase'] },
  setup: { label: 'Instalación y Atajos', steps: ['install', 'automation', 'shortcut'] },
}

export function getGuideSteps(tour) {
  return (GUIDE_TOURS[tour] || GUIDE_TOURS.general).steps.map((id) => ({ id, ...steps[id] }))
}
