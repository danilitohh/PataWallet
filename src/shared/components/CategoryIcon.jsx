import {
  BriefcaseBusiness, BusFront, Circle, CircleDollarSign, HeartPulse, House,
  PawPrint, ShoppingBasket, Sparkles, Utensils, Zap,
} from 'lucide-react'
import { NightIcon } from './NightIcon.jsx'

const visuals = {
  briefcase: { Icon: BriefcaseBusiness, tone: 'salary' },
  basket: { Icon: ShoppingBasket, tone: 'market' },
  car: { Icon: BusFront, tone: 'transport' },
  paw: { Icon: PawPrint, tone: 'pets' },
  utensils: { Icon: Utensils, tone: 'food' },
  house: { Icon: House, tone: 'peach' },
  heart: { Icon: HeartPulse, tone: 'rose' },
  bolt: { Icon: Zap, tone: 'gold' },
  sparkles: { Icon: Sparkles, tone: 'violet' },
  circle: { Icon: Circle, tone: 'sky' },
  general: { Icon: CircleDollarSign, tone: 'violet' },
}

const nameHints = [
  [/salario|sueldo|ingreso|n[oó]mina|trabajo/, 'briefcase'],
  [/mercado|supermercado|despensa/, 'basket'],
  [/transporte|bus|taxi|gasolina|movilidad/, 'car'],
  [/mascota|veterin|perro|gato/, 'paw'],
  [/restaurante|comida|caf[eé]|aliment|desayuno|almuerzo|cena/, 'utensils'],
  [/vivienda|hogar|arriendo|alquiler|hipoteca/, 'house'],
  [/salud|farmacia|m[eé]dic|dentista|hospital/, 'heart'],
  [/servicio|factura|internet|luz|agua|celular/, 'bolt'],
  [/entretenimiento|ocio|streaming|cine|juego/, 'sparkles'],
]

export function categoryVisual(category, type) {
  const storedIcon = typeof category?.icon === 'string' && visuals[category.icon] ? category.icon : null
  const name = String(category?.name || '').toLocaleLowerCase('es-CO')
  const suggestedIcon = nameHints.find(([pattern]) => pattern.test(name))?.[1]
  const key = storedIcon || suggestedIcon || (type === 'income' ? 'briefcase' : 'general')
  return visuals[key] || visuals.general
}

export function CategoryIcon({ category, type = category?.type, className = '', size = 'row' }) {
  const { Icon, tone } = categoryVisual(category, type)
  return <NightIcon icon={Icon} tone={tone} variant="tile" className={`category-icon-3d category-icon-3d--${size} ${className}`.trim()} />
}
