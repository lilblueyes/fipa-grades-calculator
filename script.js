let specialties = {};

function getHash() {
  const hash = window.location.hash ? window.location.hash.substring(1) : null;
  if (hash) return hash;
  const stored = localStorage.getItem("selectedSemester");
  if (stored) {
    window.location.hash = `#${stored}`;
    return stored;
  }
  return "S2";
}

let currentSemester = getHash();
localStorage.setItem("selectedSemester", currentSemester);

function updatePageTitle(semester) {
  const pageTitle = document.getElementById("page-title");
  pageTitle.textContent = `Calcul des moyennes pour le semestre ${semester.substring(1)}`;
}

function loadSpecialties(semester) {
  fetch(`data/${semester.toLowerCase()}.json`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Fichier ${semester.toLowerCase()}.json non trouvé.`);
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
        Erreur lors du chargement des données pour le semestre ${semester}
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
  let selectedSpecialty = localStorage.getItem("selectedSpecialty");

  if (selectedSpecialty && specialties[selectedSpecialty]) {
    specialtySelect.value = selectedSpecialty;
  } else {
    const firstSpecialty = Object.keys(specialties)[0];
    specialtySelect.value = firstSpecialty || "";
    if (firstSpecialty) {
      localStorage.setItem("selectedSpecialty", firstSpecialty);
    }
  }

  updateFCVisibility();
  renderSpecialty(specialtySelect.value);
}

function updateFCVisibility() {
  const container = document.getElementById("checkboxFCContainer");
  const specialty = document.getElementById("specialty").value;
  container.style.display = specialty === "SE" ? "inline-block" : "none";
}

const checkboxFC = document.getElementById("checkboxFC");
checkboxFC.addEventListener("change", () => {
  renderSpecialty(document.getElementById("specialty").value);
});

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
    const showFC = checkboxFC && checkboxFC.checked;

    const specialtySelectDiv = document.querySelector(".specialty-select");
    specialtySelectDiv.classList.remove("se", "meca");
    if (specialty === "SE") specialtySelectDiv.classList.add("se");
    if (specialty === "MECA") specialtySelectDiv.classList.add("meca");

    ue.courses
      .filter((course) => !showFC || !course.isFC)
      .forEach((course) => {
        const div = document.createElement("div");
        div.classList.add("course-row");
        const name = sanitizeString(course.name);

        if (course.grades) {
          const gradeInputs = course.grades
            .map(
              (g, j) => `
                <input type="text" id="grade-${index}-${name}-${j}"
                  name="grades[]" placeholder="${g.name}" class="styled-input"/>
                <input type="hidden" name="gradeCoeffs[]" value="${course.coef * g.coef}" />`
            )
            .join("");
          div.innerHTML = `
            <label for="note-${index}-${name}">${course.name} (coef ${course.coef}) :</label>
            <div style="display:flex; align-items:center;">${gradeInputs}</div>`;
        } else {
          div.innerHTML = `
            <label for="note-${index}-${name}">${course.name} (coef ${course.coef}) :</label>
            <input type="text" id="note-${index}-${name}" name="notes[]" placeholder="Note" class="styled-input"/>
            <input type="hidden" name="coeffs[]" value="${course.coef}" />`;
        }
        form.appendChild(div);
      });

    const savedKey = `notes-${currentSemester}-${specialty}-${ueId}`;
    let saved = localStorage.getItem(savedKey);
    if (saved) {
      try {
        saved = JSON.parse(saved);
        form.querySelectorAll('input[name="notes[]"]').forEach((inp, i) => {
          const val = saved.notes[i];
          if (val !== null) inp.value = val;
        });
        form.querySelectorAll('input[name="grades[]"]').forEach((inp, i) => {
          const val = saved.grades[i];
          if (val !== null) inp.value = val;
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
  localStorage.setItem("selectedSpecialty", e.target.value);
  updateFCVisibility();
  renderSpecialty(e.target.value);
});

window.addEventListener("hashchange", () => {
  currentSemester = getHash();
  localStorage.setItem("selectedSemester", currentSemester);
  loadSpecialties(currentSemester);
});

loadSpecialties(currentSemester);

function calculateSingleUE(ueBlock, index) {
  const targetAverage = parseFloat(
    document.getElementById(`moyenneCible-${index}`).value.replace(",", ".")
  );
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

  let totalWeighted = 0,
    totalCoeff = 0,
    missing = 0,
    remainingCoeff = 0;

  ueData.courses.forEach((course) => {
    if (course.grades) {
      let courseSum = 0;
      const internalTotal = course.grades.reduce((s, g) => s + g.coef, 0);
      course.grades.forEach((g, i) => {
        const inp = form.querySelector(`input[id$="${sanitizeString(course.name)}-${i}"]`);
        if (inp) {
          const val = inp.value.trim().replace(",", ".");
          if (val !== "") courseSum += parseFloat(val) * g.coef;
          else {
            missing++;
            remainingCoeff += (g.coef / internalTotal) * course.coef;
          }
        }
      });
      totalWeighted += (courseSum / internalTotal) * course.coef;
      totalCoeff += course.coef;
    } else {
      const inp = form.querySelector(`input[id$="${sanitizeString(course.name)}"]`);
      if (inp) {
        const val = inp.value.trim().replace(",", ".");
        if (val !== "") {
          totalWeighted += parseFloat(val) * course.coef;
        } else {
          missing++;
          remainingCoeff += course.coef;
        }
        totalCoeff += course.coef;
      }
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
  localStorage.setItem(`notes-${currentSemester}-${specialty}-${ueId}`, JSON.stringify(notesData));

  const currentAverage = totalCoeff ? totalWeighted / totalCoeff : 0;
  let neededGrade = null;
  if (remainingCoeff > 0) {
    const neededPoints = targetAverage * totalCoeff - totalWeighted;
    neededGrade = neededPoints / remainingCoeff;
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
    if (currentAverage >= targetAverage) {
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

/* ----------------- Confettis ----------------- */

class ConfettiGenerator {
  constructor() {
    this.colors = [
      "rgb(30, 144, 255)",
      "rgb(128, 255, 0)",
      "rgb(255, 200, 0)",
      "rgb(212, 0, 255)",
      "rgb(87, 61, 255)",
      "rgb(0, 191, 255)",
      "rgb(238, 130, 238)",
      "rgb(0, 190, 0)",
      "rgb(70, 130, 180)",
      "rgb(255, 119, 0)",
      "rgb(40, 36, 255)",
      "rgb(220, 20, 60)",
    ];
    this.maxCount = 300;
    this.speed = 2;
    this.frameInterval = 15;
    this.particles = [];
    this.runningAnimation = false;
    this.waveAngle = 0;
    this.initCanvas();
  }

  initCanvas() {
    this.canvas = document.createElement("canvas");
    Object.assign(this.canvas.style, {
      position: "fixed",
      top: 0,
      left: 0,
      pointerEvents: "none",
      zIndex: 10000,
    });
    document.body.appendChild(this.canvas);
    this.context = this.canvas.getContext("2d");
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  resetParticle(p) {
    p.color = this.colors[(Math.random() * this.colors.length) | 0];
    p.x = Math.random() * window.innerWidth;
    p.y = Math.random() * -window.innerHeight;
    p.diameter = Math.random() * 10 + 5;
    p.tilt = Math.random() * 20 - 10;
    p.tiltAngleIncrement = Math.random() * 0.07 + 0.05;
    p.tiltAngle = Math.random() * Math.PI;
    return p;
  }

  start(timeout = 1500) {
    while (this.particles.length < this.maxCount) {
      this.particles.push(this.resetParticle({}));
    }
    this.runningAnimation = true;
    this.animate();
    setTimeout(() => this.stop(), timeout);
  }

  stop() {
    this.runningAnimation = false;
  }

  animate() {
    if (!this.runningAnimation && this.particles.length === 0) {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.update();
    this.draw();
    requestAnimationFrame(this.animate.bind(this));
  }

  update() {
    this.waveAngle += 0.01;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!this.runningAnimation && p.y < -15) {
        p.y = this.canvas.height + 100;
      } else {
        p.tiltAngle += p.tiltAngleIncrement;
        p.x += Math.sin(this.waveAngle) - 0.5;
        p.y += (Math.cos(this.waveAngle) + p.diameter + this.speed) * 0.5;
        p.tilt = Math.sin(p.tiltAngle) * 15;
      }
      if (p.x > this.canvas.width + 20 || p.x < -20 || p.y > this.canvas.height) {
        if (this.runningAnimation && this.particles.length <= this.maxCount) {
          this.resetParticle(p);
        } else {
          this.particles.splice(i, 1);
          i--;
        }
      }
    }
  }

  draw() {
    this.particles.forEach((p) => {
      this.context.beginPath();
      this.context.lineWidth = p.diameter;
      const x2 = p.x + p.tilt;
      this.context.strokeStyle = p.color;
      this.context.moveTo(p.x + p.diameter / 2 + p.tilt, p.y);
      this.context.lineTo(x2, p.y + p.tilt + p.diameter / 2);
      this.context.stroke();
    });
  }
}

const confettiGenerator = new ConfettiGenerator();
function triggerConfetti() {
  confettiGenerator.start(1500);
}

/* ----------------- DOMContentLoaded ----------------- */

document.addEventListener("DOMContentLoaded", () => {
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const logo = document.getElementById("logo");
  const hamburger = document.getElementById("hamburger");
  const navMenu = document.getElementById("nav-menu");
  const overlay = document.getElementById("overlay");
  const themeIcon = themeToggleBtn.querySelector("i");
  const hamburgerIcon = hamburger.querySelector("i");

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
  checkboxFC.checked = localStorage.getItem("checkboxFC") === "true";
  checkboxFC.addEventListener("change", () => {
    localStorage.setItem("checkboxFC", checkboxFC.checked);
    renderSpecialty(document.getElementById("specialty").value);
  });
});
