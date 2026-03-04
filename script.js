let specialties = {};

const semestersByPromotion = {
  "27": ["S1", "S2", "S3", "S4"],
  "28": ["S1", "S2", "S3"],
};

let currentPromotion = getPromotion();

function getPromotion() {
  const params = new URLSearchParams(window.location.search);
  const urlP = params.get("p");
  if (urlP === "27" || urlP === "28") {
    localStorage.setItem("selectedPromotion", urlP);
    return urlP;
  }
  const saved = localStorage.getItem("selectedPromotion");
  return saved === "27" || saved === "28" ? saved : "27";
}

function lsKeySelectedSemester() {
  return `selectedSemester-${currentPromotion}`;
}
function lsKeySelectedSpecialty() {
  return `selectedSpecialty-${currentPromotion}`;
}
function lsKeyNotes(specialty, ueId) {
  return `notes-${currentPromotion}-${currentSemester}-${specialty}-${ueId}`;
}

function defaultSemesterForPromotion(promotion) {
  return promotion === "28" ? "S1" : "S3";
}

function normalizeSemester(semester, promotion = currentPromotion) {
  const allowedSemesters = semestersByPromotion[promotion] || [];
  if (allowedSemesters.includes(semester)) return semester;
  return defaultSemesterForPromotion(promotion);
}

function getHash() {
  const hash = window.location.hash ? window.location.hash.substring(1) : null;
  const stored = localStorage.getItem(lsKeySelectedSemester());
  const preferredSemester = hash || stored || defaultSemesterForPromotion(currentPromotion);
  const semester = normalizeSemester(preferredSemester);

  if (window.location.hash !== `#${semester}`) {
    window.location.hash = `#${semester}`;
  }

  return semester;
}

let currentSemester = getHash();
localStorage.setItem(lsKeySelectedSemester(), currentSemester);

function updatePageTitle(semester) {
  const pageTitle = document.getElementById("page-title");
  pageTitle.textContent = `Calcul des moyennes pour le semestre ${semester.substring(
    1
  )}`;
}

function loadSpecialties(semester) {
  const url = `data/${currentPromotion}/${semester.toLowerCase()}.json`;

  fetch(url, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Fichier ${url} non trouvé.`);
      }
      return response.json();
    })
    .then((data) => {
      specialties = data;
      populateSpecialtySelect();
      applySelectedSpecialty();
      updatePageTitle(semester);
      setActiveNav(semester);
    })
    .catch((error) => {
      console.error(`Erreur lors du chargement des spécialités pour ${semester}:`, error);
      const ueContainer = document.getElementById("ue-container");
      ueContainer.innerHTML = `<p style="text-align: center; padding: 150px;">
        Erreur lors du chargement des données pour le semestre ${semester} en FIPA${currentPromotion}
      </p>`;
      updatePageTitle(semester);
      setActiveNav(semester);
    });
}

function setActiveNav(semester) {
  const navLinks = document.querySelectorAll("nav a");
  navLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${semester}`);
  });
}

function populateSpecialtySelect() {
  const specialtySelect = document.getElementById("specialty");
  specialtySelect.innerHTML = "";
  Object.keys(specialties).forEach((specialty) => {
    const option = document.createElement("option");
    option.value = specialty;
    option.textContent = formatSpecialtyName(specialty);
    specialtySelect.appendChild(option);
  });
}

function formatSpecialtyName(specialty) {
  const names = {
    SE: "Systèmes Embarqués (SE)",
    MECA: "Mécanique (MECA)",
    ANO: "Architecture Navale (ANO)",
    AV: "Architecture de Véhicules (AV)",
  };
  return names[specialty] || specialty;
}

function applySelectedSpecialty() {
  const specialtySelect = document.getElementById("specialty");
  let selectedSpecialty = localStorage.getItem(lsKeySelectedSpecialty());

  if (selectedSpecialty && specialties[selectedSpecialty]) {
    specialtySelect.value = selectedSpecialty;
  } else {
    const firstSpecialty = Object.keys(specialties)[0];
    specialtySelect.value = firstSpecialty || "";
    if (firstSpecialty) {
      localStorage.setItem(lsKeySelectedSpecialty(), firstSpecialty);
    }
  }
  renderSpecialty(specialtySelect.value);
}

function renderSpecialty(specialty) {
  const ueContainer = document.getElementById("ue-container");
  ueContainer.innerHTML = "";

  if (!specialties[specialty]) {
    ueContainer.innerHTML = "<p>Aucune spécialité trouvée.</p>";
    return;
  }

  specialties[specialty].forEach((ue, index) => {
    const ueId = sanitizeString(ue.ue);
    const ueBlock = document.createElement("div");
    ueBlock.classList.add("ue-block");
    const hasMultipleNotes = ue.courses.some((c) => c.grades && c.grades.length > 1);
    if (hasMultipleNotes) ueBlock.classList.add("multiple-notes");
    ueBlock.dataset.ueId = ueId;

    const ueTitle = document.createElement("h2");
    ueTitle.textContent = ue.ue;
    ueBlock.appendChild(ueTitle);

    const ueContent = document.createElement("div");
    ueContent.classList.add("ue-content");

    const ueInputs = document.createElement("div");
    ueInputs.classList.add("ue-inputs");
    const form = document.createElement("form");
    ue.courses.forEach((course, k) => {
      const row = document.createElement("div");
      row.classList.add("course-row");
      const name = sanitizeString(course.name);
      const noteInputId = `note-${index}-${k}-${name}`;

      const label = document.createElement("label");
      label.setAttribute("for", noteInputId);
      label.textContent = `${course.name} (coef ${course.coef}) :`;
      row.appendChild(label);

      if (course.grades) {
        const gradesWrap = document.createElement("div");
        gradesWrap.style.display = "flex";
        gradesWrap.style.alignItems = "center";

        course.grades.forEach((g, j) => {
          const gradeInputId = `grade-${index}-${k}-${name}-${j}`;
          if (j === 0) {
            label.setAttribute("for", gradeInputId);
          }

          const gradeInput = document.createElement("input");
          gradeInput.type = "text";
          gradeInput.id = gradeInputId;
          gradeInput.name = "grades[]";
          gradeInput.placeholder = g.name;
          gradeInput.classList.add("styled-input");
          gradesWrap.appendChild(gradeInput);

          const hiddenCoeffInput = document.createElement("input");
          hiddenCoeffInput.type = "hidden";
          hiddenCoeffInput.name = "gradeCoeffs[]";
          hiddenCoeffInput.value = String(course.coef * g.coef);
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
        form.querySelectorAll('input[name="notes[]"]').forEach((inp, i) => {
          const val = saved.notes && saved.notes[i];
          if (val != null) inp.value = String(val);
        });
        form.querySelectorAll('input[name="grades[]"]').forEach((inp, i) => {
          const val = saved.grades && saved.grades[i];
          if (val != null) inp.value = String(val);
        });
      } catch (e) {
        console.error("Erreur parsing notes sauvegardées :", e);
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
    ueActions.querySelector(".calculate-btn").addEventListener("click", (e) => {
      e.preventDefault();
      calculateSingleUE(ueBlock, index);
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

function sanitizeString(str) {
  return str
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9\-]/g, "")
    .toLowerCase();
}

document.getElementById("specialty").addEventListener("change", (e) => {
  localStorage.setItem(lsKeySelectedSpecialty(), e.target.value);
  renderSpecialty(e.target.value);
});

const promoSelectEl = document.getElementById("promotion");
if (promoSelectEl) {
  if (promoSelectEl.value !== currentPromotion) promoSelectEl.value = currentPromotion;
  promoSelectEl.addEventListener("change", (e) => {
    const previousHash = window.location.hash ? window.location.hash.substring(1) : null;
    currentPromotion = e.target.value;
    localStorage.setItem("selectedPromotion", currentPromotion);
    const nextSemester = getHash();
    if (previousHash !== nextSemester) {
      return;
    }
    currentSemester = nextSemester;
    localStorage.setItem(lsKeySelectedSemester(), currentSemester);
    loadSpecialties(currentSemester);
  });
}

window.addEventListener("hashchange", () => {
  const nextSemester = getHash();
  if (nextSemester === currentSemester) return;
  currentSemester = nextSemester;
  localStorage.setItem(lsKeySelectedSemester(), currentSemester);
  loadSpecialties(currentSemester);
});

loadSpecialties(currentSemester);

function calculateSingleUE(ueBlock, index) {
  const targetAverage = parseFloat(
    document.getElementById(`moyenneCible-${index}`).value.replace(",", ".")
  );

  if (isNaN(targetAverage) || targetAverage < 0 || targetAverage > 20) {
    alert("Veuillez saisir une moyenne cible entre 0 et 20");
    return;
  }

  const form = ueBlock.querySelector("form");

  const noteInputs = form.querySelectorAll('input[type="text"]');
  for (let input of noteInputs) {
    const val = input.value.trim().replace(",", ".");
    if (val !== "" && (isNaN(val) || val < 0 || val > 20)) {
      alert("Veuillez saisir des notes comprises entre 0 et 20");
      return;
    }
  }

  const specialty = document.getElementById("specialty").value;
  const ueId = ueBlock.dataset.ueId;
  const ueData = specialties[specialty][index];

  let S_saisis = 0; // somme pondérée des éléments remplis
  let C_saisis = 0; // somme des poids des éléments remplis
  let C_total = 0; // somme de tous les poids
  let R = 0; // poids restant (éléments manquants)
  let missing = 0; // compteur d'éléments manquants

  ueData.courses.forEach((course, k) => {
    const sname = sanitizeString(course.name);
    if (course.grades) {
      const internalTotal = course.grades.reduce((s, g) => s + g.coef, 0);

      if (!internalTotal || internalTotal <= 0) {
        console.warn(`Somme des coefs internes nulle pour le cours "${course.name}", ignoré`);
        return;
      }

      course.grades.forEach((g, i) => {
        const wj = (g.coef / internalTotal) * course.coef;
        const inp = form.querySelector(`#grade-${index}-${k}-${sname}-${i}`);
        if (!inp) return;
        const raw = inp.value.trim();
        if (raw !== "") {
          const val = parseFloat(raw.replace(",", "."));
          S_saisis += val * wj;
          C_saisis += wj;
        } else {
          R += wj;
          missing++;
        }
      });

      C_total += course.coef;
    } else {
      const w = course.coef;
      const inp = form.querySelector(`#note-${index}-${k}-${sname}`);
      if (!inp) return;
      const raw = inp.value.trim();
      if (raw !== "") {
        const val = parseFloat(raw.replace(",", "."));
        S_saisis += val * w;
        C_saisis += w;
      } else {
        R += w;
        missing++;
      }
      C_total += w;
    }
  });

  /* Sauvegarde */
  const notesData = { notes: [], grades: [] };
  form
    .querySelectorAll('input[name="notes[]"]')
    .forEach((i) =>
      notesData.notes.push(i.value === "" ? null : parseFloat(i.value.replace(",", ".")))
    );
  form
    .querySelectorAll('input[name="grades[]"]')
    .forEach((i) =>
      notesData.grades.push(i.value === "" ? null : parseFloat(i.value.replace(",", ".")))
    );
  localStorage.setItem(lsKeyNotes(specialty, ueId), JSON.stringify(notesData));

  const currentAverage = C_saisis > 0 ? S_saisis / C_saisis : NaN;

  let neededGrade = null;
  if (R > 0 && isFinite(targetAverage)) {
    neededGrade = (targetAverage * C_total - S_saisis) / R;
  }

  /* Affichage résultats */
  const results = ueBlock.querySelector(".ue-results");
  results.innerHTML = `<h3>Résultats :</h3>
    <p>Moyenne actuelle : ${
      isNaN(currentAverage) ? "Aucune note saisie" : currentAverage.toFixed(2).replace(".", ",")
    }</p>`;

  if (missing > 0) {
    ueBlock.classList.remove("validated");

    if (neededGrade !== null) {
      if (neededGrade <= 0) {
        results.innerHTML += `<p style="color: green; font-weight: bold;">La moyenne cible est déjà atteinte !</p>`;
      } else if (neededGrade > 20) {
        results.innerHTML += `<p style="color: red; font-weight: bold;">Impossible d'atteindre la moyenne cible...</p>`;
      } else {
        results.innerHTML += `<p>Note${
          missing > 1 ? "s" : ""
        } nécessaires pour valider : ${neededGrade.toFixed(2).replace(".", ",")}</p>`;
      }
    }
  } else {
    const finalAverage = C_total > 0 ? S_saisis / C_total : NaN;
    if (!isNaN(finalAverage) && finalAverage >= targetAverage) {
      results.innerHTML += `<p style="color: green; font-weight: bold;">Bravo, l'UE est validée !</p>`;
      ueBlock.classList.add("validated");
    } else {
      results.innerHTML += `<p style="color: red; font-weight: bold;">L'UE n'est pas validée, team rattrapage...</p>`;
      ueBlock.classList.remove("validated");
    }
  }

  /* Vérification globale du semestre */
  const allBlocks = document.querySelectorAll(".ue-block");
  const validatedBlocks = document.querySelectorAll(".ue-block.validated");

  const ueContainer = document.getElementById("ue-container");
  const existingMsg = document.getElementById("semester-valid-message");

  if (allBlocks.length && validatedBlocks.length === allBlocks.length) {
    if (!existingMsg) {
      const msg = document.createElement("p");
      msg.id = "semester-valid-message";
      msg.textContent = "LE SEMESTRE EST VALIDÉ !";
      msg.style.cssText =
        "text-align: center; color: white; font-size: 1.5em; font-weight: bold; margin-top: 20px;";
      ueContainer.appendChild(msg);
    }
    triggerConfetti();
  } else if (existingMsg) {
    existingMsg.remove();
  }
}

/* ---------------- Thème & UI divers ---------------- */

const metaTheme = document.getElementById("theme-color-meta");
const appleMeta = document.getElementById("apple-status-bar-meta");

function updateThemeColor() {
  const themeColor = getComputedStyle(document.body).getPropertyValue("--theme-color").trim();

  metaTheme.setAttribute("content", themeColor);
  appleMeta.setAttribute("content", themeColor);

  document.documentElement.style.backgroundColor = themeColor;
  document.body.style.backgroundColor = themeColor;
}

/* ----------------- DOMContentLoaded ----------------- */

document.addEventListener("DOMContentLoaded", () => {
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const logo = document.getElementById("logo");
  const hamburger = document.getElementById("hamburger");
  const navMenu = document.getElementById("nav-menu");
  const overlay = document.getElementById("overlay");
  const themeIcon = themeToggleBtn.querySelector("i");

  function updateLogo(theme) {
    logo.src = theme === "light" ? "assets/logo_ensta_dark.png" : "assets/logo_ensta.png";
  }

  function toggleTheme() {
    document.body.classList.toggle("light-theme");
    const isLight = document.body.classList.contains("light-theme");
    localStorage.setItem("theme", isLight ? "light" : "dark");
    updateLogo(isLight ? "light" : "dark");
    updateThemeColor();
    themeIcon.classList.toggle("fa-sun", isLight);
    themeIcon.classList.toggle("fa-moon", !isLight);
  }

  const savedTheme = localStorage.getItem("theme") || "dark";
  if (savedTheme === "light") document.body.classList.add("light-theme");
  updateLogo(savedTheme);
  updateThemeColor();
  themeIcon.classList.toggle("fa-sun", savedTheme === "light");
  themeIcon.classList.toggle("fa-moon", savedTheme !== "light");

  themeToggleBtn.addEventListener("click", toggleTheme);

  function updateZIndex() {
    themeToggleBtn.style.zIndex = overlay.classList.contains("active") ? "800" : "";
  }

  hamburger.addEventListener("click", (e) => {
    e.stopPropagation();
    const active = navMenu.classList.toggle("active");
    hamburger.setAttribute("aria-expanded", active);
    document.body.classList.toggle("menu-open", active);
    overlay.classList.toggle("active", active);
    updateZIndex();
  });

  navMenu.querySelectorAll("a").forEach((link) =>
    link.addEventListener("click", () => {
      navMenu.classList.remove("active");
      hamburger.setAttribute("aria-expanded", false);
      document.body.classList.remove("menu-open");
      overlay.classList.remove("active");
      updateZIndex();
    })
  );

  overlay.addEventListener("click", () => {
    navMenu.classList.remove("active");
    hamburger.setAttribute("aria-expanded", false);
    document.body.classList.remove("menu-open");
    overlay.classList.remove("active");
    updateZIndex();
  });

  document.addEventListener("click", (e) => {
    if (!navMenu.contains(e.target) && !hamburger.contains(e.target)) {
      if (navMenu.classList.contains("active")) {
        navMenu.classList.remove("active");
        hamburger.setAttribute("aria-expanded", false);
        document.body.classList.remove("menu-open");
        overlay.classList.remove("active");
        updateZIndex();
      }
    }
  });

  updateZIndex();
});
