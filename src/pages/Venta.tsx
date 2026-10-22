// Registrar venta (render 05) se construye en la Fase 6.
import { Encabezado, Pantalla, Proximamente } from '../components/ui'

export function Venta() {
  return (
    <Pantalla>
      <Encabezado titulo="Registrar venta" />
      <Proximamente texto="Aquí vas a elegir los productos y la cantidad de la venta. El monto se precarga con el precio del catálogo." />
    </Pantalla>
  )
}
