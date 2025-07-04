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
    if (link.getAttribute("href") === `#${semester}`) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
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
  const checkboxFCContainer = document.getElementById("checkboxFCContainer");
  const specialtySelect = document.getElementById("specialty");
  checkboxFCContainer.style.display = specialtySelect.value === "SE" ? "inline-block" : "none";
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
    const hasMultipleNotes = ue.courses.some((course) => course.grades && course.grades.length > 1);
    if (hasMultipleNotes) ueBlock.classList.add("multiple-notes");
    ueBlock.setAttribute("data-ue-id", ueId);

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

    if (specialty === "SE") {
      specialtySelectDiv.classList.add("se");
    } else if (specialty === "MECA") {
      specialtySelectDiv.classList.add("meca");
    }

    ue.courses
      .filter((course) => !showFC || !course.isFC)
      .forEach((course, i) => {
        const div = document.createElement("div");
        div.classList.add("course-row");
        const name = sanitizeString(course.name);

        if (course.grades) {
          const gradeInputs = course.grades
            .map(
              (grade, j) => `
                <input type="text" id="grade-${index}-${name}-${j}" 
                  name="grades[]" placeholder="${grade.name}" class="styled-input"/>
                <input type="hidden" name="gradeCoeffs[]" value="${course.coef * grade.coef}" />
              `
            )
            .join("");
          div.innerHTML = `
            <label for="note-${index}-${name}">${course.name} (coef ${course.coef}) :</label>
            <div style="display:flex; align-items:center;">${gradeInputs}</div>
          `;
        } else {
          div.innerHTML = `
            <label for="note-${index}-${name}">${course.name} (coef ${course.coef}) :</label>
            <input type="text" id="note-${index}-${name}" name="notes[]" placeholder="Note" class="styled-input"/>
            <input type="hidden" name="coeffs[]" value="${course.coef}" />
          `;
        }
        form.appendChild(div);
      });

    const savedNotesKey = `notes-${currentSemester}-${specialty}-${ueId}`;
    let savedNotes = localStorage.getItem(savedNotesKey);
    if (savedNotes) {
      try {
        savedNotes = JSON.parse(savedNotes);
        const noteInputs = form.querySelectorAll('input[name="notes[]"]');
        savedNotes.notes.forEach((val, i) => {
          if (val !== null && noteInputs[i]) {
            noteInputs[i].value = val;
          }
        });
        const gradeInputs = form.querySelectorAll('input[name="grades[]"]');
        savedNotes.grades.forEach((val, i) => {
          if (val !== null && gradeInputs[i]) {
            gradeInputs[i].value = val;
          }
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
      <button class="calculate-btn">Calculer</button>
    `;
    ueActions.querySelector(".calculate-btn").addEventListener("click", (event) => {
      event.preventDefault();
      calculateSingleUE(ueBlock, index);
    });
    ueRight.appendChild(ueActions);

    const ueResults = document.createElement("div");
    ueResults.classList.add("ue-results");
    ueResults.innerHTML = `
      <h3>Résultats :</h3>
      <p>Moyenne actuelle : -</p>
      <p>Notes nécessaires pour valider : -</p>
    `;
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

document.getElementById("specialty").addEventListener("change", (event) => {
  const selectedSpecialty = event.target.value;
  localStorage.setItem("selectedSpecialty", selectedSpecialty);
  updateFCVisibility();
  renderSpecialty(selectedSpecialty);
});

window.addEventListener("hashchange", () => {
  currentSemester = getHash();
  localStorage.setItem("selectedSemester", currentSemester);
  loadSpecialties(currentSemester);
});

loadSpecialties(currentSemester);

function calculateSingleUE(ueBlock, index) {
  const targetAverageInput = document.getElementById(`moyenneCible-${index}`).value;
  const targetAverage = parseFloat(targetAverageInput.replace(",", "."));
  const form = ueBlock.querySelector("form");

  const noteInputs = form.querySelectorAll('input[type="text"]');
  for (let input of noteInputs) {
    let value = input.value.trim().replace(",", ".");
    if (value !== "") {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0 || num > 20) {
        alert("Veuillez saisir des notes comprises entre 0 et 20");
        return;
      }
    }
  }

  const specialty = document.getElementById("specialty").value;
  const ueId = ueBlock.getAttribute("data-ue-id");
  const ueData = specialties[specialty][index];
  let totalWeightedSum = 0;
  let totalCoefficients = 0;
  let missingNotesCount = 0;
  let remainingCoefficients = 0;

  ueData.courses.forEach((course) => {
    if (course.grades) {
      let courseWeightedSum = 0;
      const totalInternalCoef = course.grades.reduce((sum, grade) => sum + grade.coef, 0);
      course.grades.forEach((grade, i) => {
        const input = form.querySelector(`input[id$="${sanitizeString(course.name)}-${i}"]`);
        if (input) {
          const value = input.value.trim().replace(",", ".");
          if (value !== "") {
            const noteValue = parseFloat(value);
            if (!isNaN(noteValue) && noteValue >= 0 && noteValue <= 20) {
              courseWeightedSum += noteValue * grade.coef;
            }
          } else {
            missingNotesCount++;
            remainingCoefficients += (grade.coef / totalInternalCoef) * course.coef;
          }
        }
      });
      totalWeightedSum += (courseWeightedSum / totalInternalCoef) * course.coef;
      totalCoefficients += course.coef;
    } else {
      const input = form.querySelector(`input[id$="${sanitizeString(course.name)}"]`);
      if (input) {
        const value = input.value.trim().replace(",", ".");
        if (value !== "") {
          const noteValue = parseFloat(value);
          if (!isNaN(noteValue) && noteValue >= 0 && noteValue <= 20) {
            totalWeightedSum += noteValue * course.coef;
            totalCoefficients += course.coef;
          }
        } else {
          missingNotesCount++;
          remainingCoefficients += course.coef;
          totalWeightedSum += 0;
          totalCoefficients += course.coef;
        }
      }
    }
  });

  const notesData = { notes: [], grades: [] };
  form.querySelectorAll('input[name="notes[]"]').forEach((input) => {
    notesData.notes.push(input.value === "" ? null : parseFloat(input.value.replace(",", ".")));
  });
  form.querySelectorAll('input[name="grades[]"]').forEach((input) => {
    notesData.grades.push(input.value === "" ? null : parseFloat(input.value.replace(",", ".")));
  });
  localStorage.setItem(`notes-${currentSemester}-${specialty}-${ueId}`, JSON.stringify(notesData));

  const currentAverage = totalCoefficients > 0 ? totalWeightedSum / totalCoefficients : 0;

  let neededGrade = null;
  if (remainingCoefficients > 0) {
    const totalTargetPoints = targetAverage * totalCoefficients;
    const neededPoints = totalTargetPoints - totalWeightedSum;
    neededGrade = neededPoints / remainingCoefficients;
  }

  const ueResults = ueBlock.querySelector(".ue-results");
  ueResults.innerHTML = `<h3>Résultats :</h3>`;
  ueResults.innerHTML += `<p>Moyenne actuelle : ${
    isNaN(currentAverage) ? "Aucune note saisie" : currentAverage.toFixed(2).replace(".", ",")
  }</p>`;

  if (missingNotesCount > 0) {
    if (neededGrade !== null) {
      if (neededGrade <= 0) {
        ueResults.innerHTML += `<p style="color: green; font-weight: bold;">La moyenne cible est déjà atteinte !</p>`;
      } else if (neededGrade > 20) {
        ueResults.innerHTML += `<p style="color: red; font-weight: bold;">Impossible d'atteindre la moyenne cible...</p>`;
      } else {
        const message = missingNotesCount > 1 ? "Notes nécessaires" : "Note nécessaire";
        ueResults.innerHTML += `<p>${message} pour valider : ${neededGrade
          .toFixed(2)
          .replace(".", ",")}</p>`;
      }
    } else {
      ueResults.innerHTML += `<p>Toutes les notes sont déjà renseignées.</p>`;
    }
  } else {
    if (currentAverage >= targetAverage) {
      ueResults.innerHTML += `<p style="color: green; font-weight: bold;">Bravo, l'UE est validée !</p>`;
      if (ueId.toLowerCase().match(/ue\s*\d+\.4/)) {
        triggerConfetti();
        const ueContainer = document.getElementById("ue-container");
        const existingMessage = ueContainer.querySelector("#semester-valid-message");
        if (!existingMessage) {
          const semesterMessage = document.createElement("p");
          semesterMessage.id = "semester-valid-message";
          semesterMessage.textContent = "LE SEMESTRE EST VALIDÉ !";
          semesterMessage.style.cssText =
            "text-align: center; color: white; font-size: 1.5em; font-weight: bold; margin-top: 20px;";
          ueContainer.appendChild(semesterMessage);
        }
      }
    } else {
      ueResults.innerHTML += `<p style="color: red; font-weight: bold;">L'UE n'est pas validée, team rattrapage...</p>`;
    }
  }
}

function checkAndTriggerConfetti(specialty) {
  const spAcadInputs = document.querySelectorAll('input[id*="sp-acad-"]');
  let allValidated = true;

  spAcadInputs.forEach((spInput) => {
    const spMatch = spInput.id.match(/sp-acad-(\d+)/i);
    const spNumber = spMatch ? spMatch[1] : null;
    if (spNumber) {
      const average = parseFloat(spInput.value.replace(",", "."));
      if (isNaN(average) || average < 10) {
        allValidated = false;
      }
    }
  });

  if (allValidated && spAcadInputs.length > 0) {
    triggerConfetti();
  }
}

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
    this.gradient = false;
    this.supportsAnimationFrame =
      window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      null;
    this.runningAnimation = false;
    this.animationTimer = null;
    this.lastFrameTime = Date.now();
    this.particles = [];
    this.waveAngle = 0;
    this.context = null;
    this.canvas = null;

    this.initCanvas();
  }

  initCanvas() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.canvas.style.position = "fixed";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.pointerEvents = "none";
    this.canvas.style.zIndex = "10000";
    document.body.appendChild(this.canvas);

    this.context = this.canvas.getContext("2d");

    window.addEventListener("resize", () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    });
  }

  resetParticle(particle) {
    particle.color = this.colors[Math.floor(Math.random() * this.colors.length)];
    particle.x = Math.random() * window.innerWidth;
    particle.y = Math.random() * window.innerHeight - window.innerHeight;
    particle.diameter = Math.random() * 10 + 5;
    particle.tilt = Math.random() * 10 - 10;
    particle.tiltAngleIncrement = Math.random() * 0.07 + 0.05;
    particle.tiltAngle = Math.random() * Math.PI;
    return particle;
  }

  start(timeout) {
    while (this.particles.length < this.maxCount) this.particles.push(this.resetParticle({}));

    this.runningAnimation = true;
    this.runAnimation();

    if (timeout) {
      setTimeout(() => this.stop(), timeout);
    }
  }

  stop() {
    this.runningAnimation = false;
  }

  runAnimation() {
    if (!this.runningAnimation && this.particles.length === 0) {
      this.context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      this.animationTimer = null;
    } else {
      let now = Date.now();
      let delta = now - this.lastFrameTime;
      if (!this.supportsAnimationFrame || delta > this.frameInterval) {
        this.context.clearRect(0, 0, window.innerWidth, window.innerHeight);
        this.updateParticles();
        this.drawParticles();
        this.lastFrameTime = now - (delta % this.frameInterval);
      }
      this.animationTimer = requestAnimationFrame(this.runAnimation.bind(this));
    }
  }

  drawParticles() {
    this.particles.forEach((particle) => {
      this.context.beginPath();
      this.context.lineWidth = particle.diameter;
      let x2 = particle.x + particle.tilt;
      let x = x2 + particle.diameter / 2;
      let y2 = particle.y + particle.tilt + particle.diameter / 2;
      if (this.gradient) {
        let gradient = this.context.createLinearGradient(x, particle.y, x2, y2);
        gradient.addColorStop("0", particle.color);
        gradient.addColorStop("1.0", particle.color2);
        this.context.strokeStyle = gradient;
      } else {
        this.context.strokeStyle = particle.color;
      }
      this.context.moveTo(x, particle.y);
      this.context.lineTo(x2, y2);
      this.context.stroke();
    });
  }

  updateParticles() {
    this.waveAngle += 0.01;
    for (let i = 0; i < this.particles.length; i++) {
      let particle = this.particles[i];
      if (!this.runningAnimation && particle.y < -15) {
        particle.y = window.innerHeight + 100;
      } else {
        particle.tiltAngle += particle.tiltAngleIncrement;
        particle.x += Math.sin(this.waveAngle) - 0.5;
        particle.y += (Math.cos(this.waveAngle) + particle.diameter + this.speed) * 0.5;
        particle.tilt = Math.sin(particle.tiltAngle) * 15;
      }

      if (
        particle.x > window.innerWidth + 20 ||
        particle.x < -20 ||
        particle.y > window.innerHeight
      ) {
        if (this.runningAnimation && this.particles.length <= this.maxCount) {
          this.resetParticle(particle);
        } else {
          this.particles.splice(i, 1);
          i--;
        }
      }
    }
  }
}

const confettiGenerator = new ConfettiGenerator();

function triggerConfetti() {
  confettiGenerator.start(1500); // ms
}

document.addEventListener("DOMContentLoaded", () => {
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const logo = document.getElementById("logo");
  const hamburger = document.getElementById("hamburger");
  const navMenu = document.getElementById("nav-menu");
  const hamburgerIcon = hamburger.querySelector("i");
  const icon = themeToggleBtn.querySelector("i");
  const overlay = document.getElementById("overlay");

  function updateLogo(theme) {
    if (theme === "light") {
      logo.src = "assets/logo_ensta_dark.png";
    } else {
      logo.src = "assets/logo_ensta.png";
    }
  }

  function toggleTheme() {
    document.body.classList.toggle("light-theme");
    const isLight = document.body.classList.contains("light-theme");
    localStorage.setItem("theme", isLight ? "light" : "dark");
    updateLogo(isLight ? "light" : "dark");

    if (isLight) {
      icon.classList.remove("fa-moon");
      icon.classList.add("fa-sun");
    } else {
      icon.classList.remove("fa-sun");
      icon.classList.add("fa-moon");
    }
  }

  function updateToggleZIndex() {
    if (overlay.classList.contains("active")) {
      themeToggleBtn.style.zIndex = "800";
    } else {
      themeToggleBtn.style.zIndex = "";
    }
  }

  const savedTheme = localStorage.getItem("theme") || "dark";
  if (savedTheme === "light") {
    document.body.classList.add("light-theme");
  } else {
    document.body.classList.remove("light-theme");
  }

  updateLogo(savedTheme);

  if (savedTheme === "light") {
    icon.classList.remove("fa-moon");
    icon.classList.add("fa-sun");
  } else {
    icon.classList.remove("fa-sun");
    icon.classList.add("fa-moon");
  }

  themeToggleBtn.addEventListener("click", toggleTheme);

  hamburger.addEventListener("click", (e) => {
    e.stopPropagation();
    const isActive = navMenu.classList.toggle("active");
    hamburger.setAttribute("aria-expanded", isActive);
    document.body.classList.toggle("menu-open", isActive);
    overlay.classList.toggle("active", isActive);
    updateToggleZIndex();
  });

  const navLinks = navMenu.querySelectorAll("a");
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      navMenu.classList.remove("active");
      hamburger.setAttribute("aria-expanded", false);
      document.body.classList.remove("menu-open");
      overlay.classList.remove("active");
      updateToggleZIndex();
    });
  });

  overlay.addEventListener("click", () => {
    navMenu.classList.remove("active");
    hamburger.setAttribute("aria-expanded", false);
    document.body.classList.remove("menu-open");
    overlay.classList.remove("active");
    updateToggleZIndex();
  });

  document.addEventListener("click", (event) => {
    if (!navMenu.contains(event.target) && !hamburger.contains(event.target)) {
      const wasActive = navMenu.classList.contains("active");
      if (wasActive) {
        navMenu.classList.remove("active");
        hamburger.setAttribute("aria-expanded", false);
        document.body.classList.remove("menu-open");
        overlay.classList.remove("active");
        updateToggleZIndex();
      }
    }
  });

  updateToggleZIndex();

  const checkboxFC = document.getElementById("checkboxFC");
  checkboxFC.checked = localStorage.getItem("checkboxFC") === "true";

  checkboxFC.addEventListener("change", () => {
    localStorage.setItem("checkboxFC", checkboxFC.checked);
    renderSpecialty(document.getElementById("specialty").value);
  });
});
