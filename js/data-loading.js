import { state } from "./state.js";

export async function loadSpecialties(semester) {
  const url = `data/${state.currentPromotion}/${semester.toLowerCase()}.json`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Fichier ${url} non trouvé.`);
  }

  return response.json();
}
