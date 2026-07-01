export function obtenerRepuestoSugerido(nombreItem: string) {
  const item = nombreItem.toLowerCase();

  if (item.includes("gancho")) return nombreItem;
  if (item.includes("cadena")) return nombreItem;
  if (item.includes("pestillo")) return nombreItem;
  if (item.includes("freno")) return nombreItem;
  if (item.includes("rueda")) return nombreItem;
  if (item.includes("rodamiento")) return nombreItem;
  if (item.includes("botonera")) return nombreItem;
  if (item.includes("cable")) return nombreItem;
  if (item.includes("tambor")) return nombreItem;
  if (item.includes("motor")) return nombreItem;

  return nombreItem;
}