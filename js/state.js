export const semestersByPromotion = {
  "27": ["S1", "S2", "S3", "S4"],
  "28": ["S1", "S2", "S3"],
  "29": ["S1"],
};

export const promotionLabels = {
  "27": "FIPA27",
  "28": "FIPA28",
  "29": "FISA29",
};

export const state = {
  specialties: {},
  currentPromotion: "27",
  currentSemester: "S1",
};

function isKnownPromotion(promotion) {
  return Object.keys(semestersByPromotion).includes(promotion);
}

export function getPromotion() {
  const params = new URLSearchParams(window.location.search);
  const urlPromotion = params.get("p");

  if (isKnownPromotion(urlPromotion)) {
    localStorage.setItem("selectedPromotion", urlPromotion);
    return urlPromotion;
  }

  const saved = localStorage.getItem("selectedPromotion");
  return isKnownPromotion(saved) ? saved : "27";
}

export function lsKeySelectedSemester() {
  return `selectedSemester-${state.currentPromotion}`;
}

export function lsKeySelectedSpecialty() {
  return `selectedSpecialty-${state.currentPromotion}`;
}

export function lsKeyNotes(specialty, ueId) {
  return `notes-${state.currentPromotion}-${state.currentSemester}-${specialty}-${ueId}`;
}

export function defaultSemesterForPromotion(promotion) {
  const semesters = semestersByPromotion[promotion] || [];
  return semesters[semesters.length - 1] || "S1";
}

export function normalizeSemester(semester, promotion = state.currentPromotion) {
  const allowedSemesters = semestersByPromotion[promotion] || [];
  if (allowedSemesters.includes(semester)) return semester;
  return defaultSemesterForPromotion(promotion);
}

export function resolveSemesterFromLocation() {
  const hash = window.location.hash ? window.location.hash.substring(1) : null;
  const stored = localStorage.getItem(lsKeySelectedSemester());
  const preferredSemester = hash || stored || defaultSemesterForPromotion(state.currentPromotion);
  const semester = normalizeSemester(preferredSemester);

  if (window.location.hash !== `#${semester}`) {
    window.location.hash = `#${semester}`;
  }

  return semester;
}
