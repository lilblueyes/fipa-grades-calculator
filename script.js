import { calculateSingleUE } from "./js/calc.js";
import { loadSpecialties } from "./js/data-loading.js";
import {
  applySelectedSpecialty,
  populateSpecialtySelect,
  renderSpecialty,
  setActiveNav,
  updatePageTitle,
} from "./js/render.js";
import {
  getPromotion,
  lsKeySelectedSemester,
  lsKeySelectedSpecialty,
  resolveSemesterFromLocation,
  state,
} from "./js/state.js";
import { initThemeAndNavigation } from "./js/theme-nav.js";

function renderCurrentSpecialty(specialty) {
  renderSpecialty(specialty, calculateSingleUE);
}

async function loadAndRender(semester) {
  try {
    state.specialties = await loadSpecialties(semester);
    populateSpecialtySelect();
    applySelectedSpecialty(renderCurrentSpecialty);
    updatePageTitle(semester);
    setActiveNav(semester);
  } catch (error) {
    console.error(`Erreur lors du chargement des spécialités pour ${semester}:`, error);

    const ueContainer = document.getElementById("ue-container");
    ueContainer.innerHTML = `<p style="text-align: center; padding: 150px;">
      Erreur lors du chargement des données pour le semestre ${semester} en FIPA${state.currentPromotion}
    </p>`;

    updatePageTitle(semester);
    setActiveNav(semester);
  }
}

state.currentPromotion = getPromotion();
state.currentSemester = resolveSemesterFromLocation();
localStorage.setItem(lsKeySelectedSemester(), state.currentSemester);

const specialtySelectEl = document.getElementById("specialty");
if (specialtySelectEl) {
  specialtySelectEl.addEventListener("change", (event) => {
    localStorage.setItem(lsKeySelectedSpecialty(), event.target.value);
    renderCurrentSpecialty(event.target.value);
  });
}

const promoSelectEl = document.getElementById("promotion");
if (promoSelectEl) {
  if (promoSelectEl.value !== state.currentPromotion) {
    promoSelectEl.value = state.currentPromotion;
  }

  promoSelectEl.addEventListener("change", (event) => {
    const previousHash = window.location.hash ? window.location.hash.substring(1) : null;

    state.currentPromotion = event.target.value;
    localStorage.setItem("selectedPromotion", state.currentPromotion);

    const nextSemester = resolveSemesterFromLocation();
    if (previousHash !== nextSemester) {
      return;
    }

    state.currentSemester = nextSemester;
    localStorage.setItem(lsKeySelectedSemester(), state.currentSemester);
    loadAndRender(state.currentSemester);
  });
}

window.addEventListener("hashchange", () => {
  const nextSemester = resolveSemesterFromLocation();
  if (nextSemester === state.currentSemester) {
    return;
  }

  state.currentSemester = nextSemester;
  localStorage.setItem(lsKeySelectedSemester(), state.currentSemester);
  loadAndRender(state.currentSemester);
});

loadAndRender(state.currentSemester);
initThemeAndNavigation();
