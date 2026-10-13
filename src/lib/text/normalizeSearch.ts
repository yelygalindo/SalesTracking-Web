/** Lowercase text without accents, so "Catálogo" matches "catalogo". */
export const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
