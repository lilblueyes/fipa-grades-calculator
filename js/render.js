import { lsKeyNotes, lsKeySelectedSpecialty, state } from "./state.js";
import { sanitizeString } from "./utils.js";

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

export function formatSpecialtyName(specialty) {
  const names = {
    SE: "Systèmes Embarqués (SE)",
    MECA: "Mécanique (MECA)",
    ANO: "Architecture Navale (ANO)",
    AV: "Architecture de Véhicules (AV)",
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
  const savedSpecialty = localStorage.getItem(lsKeySelectedSpecialty());

  if (savedSpecialty && state.specialties[savedSpecialty]) {
    specialtySelect.value = savedSpecialty;
  } else {
    const firstSpecialty = availableSpecialties[0] || "";
    specialtySelect.value = firstSpecialty;
    if (firstSpecialty) {
      localStorage.setItem(lsKeySelectedSpecialty(), firstSpecialty);
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
    ue.courses.forEach((course, courseIndex) => {
      const row = document.createElement("div");
      row.classList.add("course-row");

      const courseId = sanitizeString(course.name);
      const noteInputId = `note-${index}-${courseIndex}-${courseId}`;

      const label = document.createElement("label");
      label.setAttribute("for", noteInputId);
      label.textContent = `${course.name} (coef ${course.coef}) :`;
      row.appendChild(label);

      if (Array.isArray(course.grades) && course.grades.length > 0) {
        const gradesWrap = document.createElement("div");
        gradesWrap.style.display = "flex";
        gradesWrap.style.alignItems = "center";

        course.grades.forEach((grade, gradeIndex) => {
          const gradeInputId = `grade-${index}-${courseIndex}-${courseId}-${gradeIndex}`;
          if (gradeIndex === 0) {
            label.setAttribute("for", gradeInputId);
          }

          const gradeInput = document.createElement("input");
          gradeInput.type = "text";
          gradeInput.id = gradeInputId;
          gradeInput.name = "grades[]";
          gradeInput.placeholder = grade.name;
          gradeInput.classList.add("styled-input");
          gradesWrap.appendChild(gradeInput);

          const hiddenCoeffInput = document.createElement("input");
          hiddenCoeffInput.type = "hidden";
          hiddenCoeffInput.name = "gradeCoeffs[]";
          hiddenCoeffInput.value = String(Number(course.coef) * Number(grade.coef));
          gradesWrap.appendChild(hiddenCoeffInput);
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
