export const semestersByPromotion = {
  "27": ["S1", "S2", "S3", "S4"],
  "28": ["S1", "S2", "S3"],
};

export const state = {
  specialties: {},
  currentPromotion: "27",
  currentSemester: "S1",
};

export function getPromotion() {
  const params = new URLSearchParams(window.location.search);
  const urlPromotion = params.get("p");

  if (urlPromotion === "27" || urlPromotion === "28") {
    localStorage.setItem("selectedPromotion", urlPromotion);
    return urlPromotion;
  }

  const saved = localStorage.getItem("selectedPromotion");
  return saved === "27" || saved === "28" ? saved : "27";
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
  return promotion === "28" ? "S1" : "S3";
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
