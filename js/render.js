import {
  isSemesterAvailable,
  lsKeyLegacySelectedSpecialty,
  lsKeyNotes,
  lsKeySelectedSpecialty,
  state,
} from "./state.js";
import { computeCourseAverage, groupGrades } from "./calc.js";
import { formatDecimal, parseDecimal, sanitizeString } from "./utils.js";

export function updatePageTitle(semester) {
  const pageTitle = document.getElementById("page-title");
  pageTitle.textContent = `Calcul des moyennes pour le semestre ${semester.substring(1)}`;
}

export function setActiveNav(semester) {
  const navLinks = document.querySelectorAll("nav a");
  navLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${semester}`);
  });
}

export function updateNavAvailability() {
  const navLinks = document.querySelectorAll("nav a");
  navLinks.forEach((link) => {
    const semester = link.textContent.trim();
    const available = isSemesterAvailable(semester);

    link.classList.toggle("disabled", !available);
    if (available) {
      link.setAttribute("href", `#${semester}`);
    } else {
      link.removeAttribute("href");
    }
  });
}

export function formatSpecialtyName(specialty) {
  const names = {
    SE: "Systèmes Embarqués (SE)",
    MECA: "Mécanique (MECA)",
    ANO: "Architecture Navale (ANO)",
    AV: "Architecture de Véhicules (AV)",
    ANSNA: "AN - profil SNA",
    ANSNV: "AN - profil SNV",
    ANOFFWIND: "AN - profil Offwind",
  };

  return names[specialty] || specialty;
}

export function populateSpecialtySelect() {
  const specialtySelect = document.getElementById("specialty");
  specialtySelect.innerHTML = "";

  Object.keys(state.specialties).forEach((specialty) => {
    const option = document.createElement("option");
    option.value = specialty;
    option.textContent = formatSpecialtyName(specialty);
    specialtySelect.appendChild(option);
  });
}

export function applySelectedSpecialty(onSpecialtySelected) {
  const specialtySelect = document.getElementById("specialty");
  const availableSpecialties = Object.keys(state.specialties);
  const specialtyKey = lsKeySelectedSpecialty();
  const savedSpecialty =
    localStorage.getItem(specialtyKey) || localStorage.getItem(lsKeyLegacySelectedSpecialty());

  if (savedSpecialty && state.specialties[savedSpecialty]) {
    specialtySelect.value = savedSpecialty;
    localStorage.setItem(specialtyKey, savedSpecialty);
  } else {
    const firstSpecialty = availableSpecialties[0] || "";
    specialtySelect.value = firstSpecialty;
    if (firstSpecialty) {
      localStorage.setItem(specialtyKey, firstSpecialty);
    }
  }

  onSpecialtySelected(specialtySelect.value);
}

export function renderSpecialty(specialty, onCalculateUE) {
  const ueContainer = document.getElementById("ue-container");
  ueContainer.innerHTML = "";

  if (!state.specialties[specialty]) {
    ueContainer.innerHTML = "<p>Aucune spécialité trouvée.</p>";
    return;
  }

  state.specialties[specialty].forEach((ue, index) => {
    const ueId = sanitizeString(ue.ue);
    const ueBlock = document.createElement("div");
    ueBlock.classList.add("ue-block");
    ueBlock.dataset.ueId = ueId;

    const hasMultipleNotes = ue.courses.some((course) => Array.isArray(course.grades) && course.grades.length > 1);
    if (hasMultipleNotes) {
      ueBlock.classList.add("multiple-notes");
    }

    const ueTitle = document.createElement("h2");
    ueTitle.textContent = ue.ue;
    ueBlock.appendChild(ueTitle);

    const ueContent = document.createElement("div");
    ueContent.classList.add("ue-content");

    const ueInputs = document.createElement("div");
    ueInputs.classList.add("ue-inputs");

    const form = document.createElement("form");
    const summaryRefreshers = [];
    ue.courses.forEach((course, courseIndex) => {
      const row = document.createElement("div");
      row.classList.add("course-row");

      const courseId = sanitizeString(course.name);
      const noteInputId = `note-${index}-${courseIndex}-${courseId}`;

      const label = document.createElement("label");
      label.setAttribute("for", noteInputId);
      label.textContent = `${course.name} (coef ${course.coef}) :`;
      row.appendChild(label);

      const hasGrades = Array.isArray(course.grades) && course.grades.length > 0;

      if (hasGrades && course.grades.some((grade) => grade.group)) {
        const gradeDialog = buildGradeDialog({ course, index, courseIndex, courseId });
        label.setAttribute("for", gradeDialog.trigger.id);
        row.append(gradeDialog.summary, gradeDialog.trigger);
        form.appendChild(gradeDialog.dialog);
        summaryRefreshers.push(gradeDialog.refresh);
      } else if (hasGrades) {
        const gradesWrap = document.createElement("div");
        gradesWrap.style.display = "flex";
        gradesWrap.style.alignItems = "center";

        course.grades.forEach((grade, gradeIndex) => {
          const gradeInputId = `grade-${index}-${courseIndex}-${courseId}-${gradeIndex}`;
          if (gradeIndex === 0) {
            label.setAttribute("for", gradeInputId);
          }
          gradesWrap.append(...createGradeInput(course, grade, gradeInputId));
        });

        row.appendChild(gradesWrap);
      } else {
        const noteInput = document.createElement("input");
        noteInput.type = "text";
        noteInput.id = noteInputId;
        noteInput.name = "notes[]";
        noteInput.placeholder = "Note";
        noteInput.classList.add("styled-input");
        row.appendChild(noteInput);

        const hiddenCoeffInput = document.createElement("input");
        hiddenCoeffInput.type = "hidden";
        hiddenCoeffInput.name = "coeffs[]";
        hiddenCoeffInput.value = String(course.coef);
        row.appendChild(hiddenCoeffInput);
      }

      form.appendChild(row);
    });

    const savedKey = lsKeyNotes(specialty, ueId);
    let saved = localStorage.getItem(savedKey);
    if (saved) {
      try {
        saved = JSON.parse(saved);

        form.querySelectorAll('input[name="notes[]"]').forEach((input, position) => {
          const value = saved.notes && saved.notes[position];
          if (value != null) input.value = String(value);
        });

        form.querySelectorAll('input[name="grades[]"]').forEach((input, position) => {
          const value = saved.grades && saved.grades[position];
          if (value != null) input.value = String(value);
        });
      } catch (error) {
        console.error("Erreur parsing notes sauvegardées :", error);
      }
    }
    summaryRefreshers.forEach((refresh) => refresh());

    ueInputs.appendChild(form);
    ueContent.appendChild(ueInputs);

    const separator = document.createElement("div");
    separator.classList.add("separator");
    ueContent.appendChild(separator);

    const ueRight = document.createElement("div");
    ueRight.classList.add("ue-right");

    const ueActions = document.createElement("div");
    ueActions.classList.add("ue-actions");
    ueActions.innerHTML = `
      <div class="actions-left">
        <label for="moyenneCible-${index}">Moyenne cible :</label>
        <input type="text" id="moyenneCible-${index}" value="10" class="styled-input" />
      </div>
      <button class="calculate-btn">Calculer</button>`;

    ueActions.querySelector(".calculate-btn").addEventListener("click", (event) => {
      event.preventDefault();
      onCalculateUE(ueBlock, index);
    });
    ueRight.appendChild(ueActions);

    const ueResults = document.createElement("div");
    ueResults.classList.add("ue-results");
    ueResults.innerHTML = `
      <h3>Résultats :</h3>
      <p>Moyenne actuelle : -</p>
      <p>Notes nécessaires pour valider : -</p>`;
    ueRight.appendChild(ueResults);

    ueContent.appendChild(ueRight);
    ueBlock.appendChild(ueContent);
    ueContainer.appendChild(ueBlock);
  });
}

function createGradeInput(course, grade, inputId) {
  const gradeInput = document.createElement("input");
  gradeInput.type = "text";
  gradeInput.id = inputId;
  gradeInput.name = "grades[]";
  gradeInput.placeholder = grade.name;
  gradeInput.dataset.max = String(grade.max || 20);
  gradeInput.classList.add("styled-input");

  const hiddenCoeffInput = document.createElement("input");
  hiddenCoeffInput.type = "hidden";
  hiddenCoeffInput.name = "gradeCoeffs[]";
  hiddenCoeffInput.value = String(Number(course.coef) * Number(grade.coef));

  return [gradeInput, hiddenCoeffInput];
}

// Cours à notes multiples : la saisie se fait dans une fenêtre modale, la fiche du cours affiche la moyenne sur 20.
function buildGradeDialog({ course, index, courseIndex, courseId }) {
  const baseId = `grades-${index}-${courseIndex}-${courseId}`;
  const inputs = [];

  const dialog = document.createElement("dialog");
  dialog.classList.add("grade-dialog");
  dialog.setAttribute("aria-labelledby", `${baseId}-title`);

  const title = document.createElement("h3");
  title.id = `${baseId}-title`;
  title.textContent = course.name;

  const body = document.createElement("div");
  body.classList.add("grade-dialog-body");

  groupGrades(course.grades).forEach((group) => {
    const groupEl = document.createElement("div");
    groupEl.classList.add("grade-group");

    const groupTitle = document.createElement("span");
    groupTitle.classList.add("grade-group-title");
    const points = Number(group.coef.toFixed(2));
    groupTitle.textContent =
      `${group.name} · ${points} pts` + (group.max && Number(group.max) !== 20 ? ` · notes sur ${group.max}` : "");

    const inputsWrap = document.createElement("div");
    inputsWrap.classList.add("grade-group-inputs");
    group.gradeIndexes.forEach((gradeIndex) => {
      // Même identifiant que celui attendu par calculateSingleUE (js/calc.js) pour lire la note.
      const inputId = `grade-${index}-${courseIndex}-${courseId}-${gradeIndex}`;
      const [gradeInput, hiddenCoeffInput] = createGradeInput(course, course.grades[gradeIndex], inputId);
      inputs.push(gradeInput);
      inputsWrap.append(gradeInput, hiddenCoeffInput);
    });

    groupEl.append(groupTitle, inputsWrap);
    body.appendChild(groupEl);
  });

  const footer = document.createElement("div");
  footer.classList.add("grade-dialog-footer");

  const result = document.createElement("p");
  result.classList.add("grade-dialog-result");

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.classList.add("calculate-btn");
  closeBtn.textContent = "Fermer";
  closeBtn.addEventListener("click", () => dialog.close());

  footer.append(result, closeBtn);
  dialog.append(title, body, footer);

  const summary = document.createElement("output");
  summary.classList.add("grade-summary");

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.id = `${baseId}-open`;
  trigger.classList.add("grade-open-btn");
  trigger.textContent = "Saisir les notes";
  trigger.addEventListener("click", () => dialog.showModal());

  const refresh = () => {
    const values = inputs.map((input) => {
      const raw = input.value.trim();
      return raw === "" ? null : parseDecimal(raw);
    });
    const { average, entered, total } = computeCourseAverage(course.grades, values);

    if (average === null) {
      summary.textContent = "—";
      result.textContent = `Moyenne sur 20 : — (0/${total} notes)`;
      return;
    }

    const text = formatDecimal(average);
    summary.textContent = entered < total ? `${text} / 20 (partiel)` : `${text} / 20`;
    result.textContent = `Moyenne sur 20 : ${text} (${entered}/${total} notes)`;
  };
  dialog.addEventListener("input", refresh);

  return { dialog, summary, trigger, refresh };
}
