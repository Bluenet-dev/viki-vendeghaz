// Az árajánlat modul kapcsolója. Kikapcsolva az Ajánlatkérések menü, az ajánlatkérő
// űrlap és az /ajanlat oldalak nem látszanak (404).
export function offersEnabled(): boolean {
  return process.env.MODULE_OFFERS === "true";
}
