/**
 * Sugiere una abreviatura a partir de una etiqueta (ej: "LEADS" -> "LDS").
 *
 * Es solo un punto de partida: en la UI el usuario siempre puede sobreescribir
 * el resultado a mano (por eso `catalog_values.abbreviation` se guarda como un
 * valor propio, independiente del label, y nunca se recalcula automáticamente
 * una vez que existe).
 *
 * Heurística: normaliza a mayúsculas sin acentos ni espacios, conserva la
 * primera letra, elimina vocales del resto y trunca a `maxLength`.
 */
export function suggestAbbreviation(label: string, maxLength = 4): string {
  const normalized = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos (marcas diacríticas combinadas)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ""); // deja solo letras/números

  if (normalized.length === 0) return "";
  if (normalized.length <= maxLength) return normalized;

  const first = normalized[0];
  const rest = normalized.slice(1).replace(/[AEIOU]/g, "");
  const candidate = `${first}${rest}`;

  return candidate.length > maxLength ? candidate.slice(0, maxLength) : candidate;
}
