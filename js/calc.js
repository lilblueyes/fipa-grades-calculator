import { lsKeyNotes, state } from "./state.js";
import { formatDecimal, parseDecimal, sanitizeString } from "./utils.js";

export function isTargetAverageValid(targetAverage) {
  return Number.isFinite(targetAverage) && targetAverage >= 0 && targetAverage <= 20;
}

export function isGradeValid(gradeValue) {
  return Number.isFinite(gradeValue) && gradeValue >= 0 && gradeValue <= 20;
}

function defaultItemIdBuilder({ courseIndex, gradeIndex }) {
  return gradeIndex === null ? `course-${courseIndex}` : `course-${courseIndex}-grade-${gradeIndex}`;
}

export function buildWeightedItems(courses, itemIdBuilder = defaultItemIdBuilder) {
  const items = [];
  let totalWeight = 0;

  courses.forEach((course, courseIndex) => {
    const courseCoef = Number(course.coef);
    if (!Number.isFinite(courseCoef) || courseCoef <= 0) {
      return;
    }

    if (Array.isArray(course.grades) && course.grades.length > 0) {
      const internalTotal = course.grades.reduce((sum, grade) => {
        const gradeCoef = Number(grade.coef);
        return sum + (Number.isFinite(gradeCoef) ? gradeCoef : 0);
      }, 0);

      if (!(internalTotal > 0)) {
        console.warn(`Somme des coefs internes nulle pour le cours "${course.name}", ignoré`);
        return;
      }

      course.grades.forEach((grade, gradeIndex) => {
        const gradeCoef = Number(grade.coef);
        const weight = (gradeCoef / internalTotal) * courseCoef;

        items.push({
          id: itemIdBuilder({ course, courseIndex, grade, gradeIndex, courseName: course.name }),
          weight,
        });
      });

      totalWeight += courseCoef;
      return;
    }

    items.push({
      id: itemIdBuilder({ course, courseIndex, grade: null, gradeIndex: null, courseName: course.name }),
      weight: courseCoef,
    });
    totalWeight += courseCoef;
  });

  return { items, totalWeight };
}

export function computeWeightedOutcome({ items, valuesById, totalWeight, targetAverage }) {
  let weightedSum = 0;
  let enteredWeight = 0;
  let remainingWeight = 0;
  let missingCount = 0;

  items.forEach((item) => {
    const value = valuesById[item.id];
    if (value === null || value === undefined || Number.isNaN(value)) {
      remainingWeight += item.weight;
      missingCount += 1;
      return;
    }

    weightedSum += value * item.weight;
    enteredWeight += item.weight;
  });

  const currentAverage = enteredWeight > 0 ? weightedSum / enteredWeight : Number.NaN;
  const finalAverage = totalWeight > 0 ? weightedSum / totalWeight : Number.NaN;

  let neededGrade = null;
  if (remainingWeight > 0 && Number.isFinite(targetAverage)) {
    neededGrade = (targetAverage * totalWeight - weightedSum) / remainingWeight;
  }

  return {
    weightedSum,
    enteredWeight,
    remainingWeight,
    missingCount,
    currentAverage,
    finalAverage,
    neededGrade,
  };
}

function collectValuesByItemId(form, items) {
  const valuesById = {};

  items.forEach((item) => {
    const input = form.querySelector(`#${item.id}`);
    if (!input) {
      valuesById[item.id] = null;
      return;
    }

    const raw = input.value.trim();
    valuesById[item.id] = raw === "" ? null : parseDecimal(raw);
  });

  return valuesById;
}

function saveFormNotes(form, specialty, ueId) {
  const notesData = { notes: [], grades: [] };

  form
    .querySelectorAll('input[name="notes[]"]')
    .forEach((input) => notesData.notes.push(input.value === "" ? null : parseDecimal(input.value)));

  form
    .querySelectorAll('input[name="grades[]"]')
    .forEach((input) => notesData.grades.push(input.value === "" ? null : parseDecimal(input.value)));

  localStorage.setItem(lsKeyNotes(specialty, ueId), JSON.stringify(notesData));
}

function updateSemesterValidationStatus() {
  const allBlocks = document.querySelectorAll(".ue-block");
  const validatedBlocks = document.querySelectorAll(".ue-block.validated");
  const ueContainer = document.getElementById("ue-container");
  const existingMessage = document.getElementById("semester-valid-message");

  if (allBlocks.length && validatedBlocks.length === allBlocks.length) {
    if (!existingMessage) {
      const message = document.createElement("p");
      message.id = "semester-valid-message";
      message.textContent = "LE SEMESTRE EST VALIDÉ !";
      message.style.cssText =
        "text-align: center; color: white; font-size: 1.5em; font-weight: bold; margin-top: 20px;";
      ueContainer.appendChild(message);
    }

    if (typeof window.triggerConfetti === "function") {
      window.triggerConfetti();
    }

    return;
  }

  if (existingMessage) {
    existingMessage.remove();
  }
}

export function calculateSingleUE(ueBlock, index) {
  const targetAverageInput = document.getElementById(`moyenneCible-${index}`);
  const targetAverage = parseDecimal(targetAverageInput.value);

  if (!isTargetAverageValid(targetAverage)) {
    alert("Veuillez saisir une moyenne cible entre 0 et 20");
    return;
  }

  const form = ueBlock.querySelector("form");
  const noteInputs = form.querySelectorAll('input[type="text"]');

  for (const input of noteInputs) {
    const raw = input.value.trim();
    if (raw === "") continue;

    const parsed = parseDecimal(raw);
    if (!isGradeValid(parsed)) {
      alert("Veuillez saisir des notes comprises entre 0 et 20");
      return;
    }
  }

  const specialty = document.getElementById("specialty").value;
  const specialtyData = state.specialties[specialty];
  const ueData = specialtyData ? specialtyData[index] : null;
  if (!ueData) {
    return;
  }

  const { items, totalWeight } = buildWeightedItems(
    ueData.courses,
    ({ courseIndex, courseName, gradeIndex }) => {
      const courseId = sanitizeString(courseName);
      if (gradeIndex === null) {
        return `note-${index}-${courseIndex}-${courseId}`;
      }
      return `grade-${index}-${courseIndex}-${courseId}-${gradeIndex}`;
    }
  );

  const valuesById = collectValuesByItemId(form, items);
  const ueId = ueBlock.dataset.ueId;
  saveFormNotes(form, specialty, ueId);

  const outcome = computeWeightedOutcome({
    items,
    valuesById,
    totalWeight,
    targetAverage,
  });

  const results = ueBlock.querySelector(".ue-results");
  results.innerHTML = `<h3>Résultats :</h3>
    <p>Moyenne actuelle : ${
      Number.isNaN(outcome.currentAverage) ? "Aucune note saisie" : formatDecimal(outcome.currentAverage)
    }</p>`;

  if (outcome.missingCount > 0) {
    ueBlock.classList.remove("validated");

    if (outcome.neededGrade !== null) {
      if (outcome.neededGrade <= 0) {
        results.innerHTML +=
          '<p style="color: green; font-weight: bold;">La moyenne cible est déjà atteinte !</p>';
      } else if (outcome.neededGrade > 20) {
        results.innerHTML +=
          '<p style="color: red; font-weight: bold;">Impossible d\'atteindre la moyenne cible...</p>';
      } else {
        results.innerHTML += `<p>Note${
          outcome.missingCount > 1 ? "s" : ""
        } nécessaires pour valider : ${formatDecimal(outcome.neededGrade)}</p>`;
      }
    }
  } else if (!Number.isNaN(outcome.finalAverage) && outcome.finalAverage >= targetAverage) {
    results.innerHTML += '<p style="color: green; font-weight: bold;">Bravo, l\'UE est validée !</p>';
    ueBlock.classList.add("validated");
  } else {
    results.innerHTML +=
      '<p style="color: red; font-weight: bold;">L\'UE n\'est pas validée, team rattrapage...</p>';
    ueBlock.classList.remove("validated");
  }

  updateSemesterValidationStatus();
}
