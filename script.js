let specialties = {};

function getHash() {
  return window.location.hash ? window.location.hash.substring(1) : "S1";
}

let currentSemester = getHash();

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
      ueContainer.innerHTML = `<p style="text-align: center; padding: 150px;">Erreur lors du chargement des données pour le semestre ${semester}</p>`;
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
    const ueBlock = document.createElement("div");
    ueBlock.classList.add("ue-block");

    const ueId = sanitizeString(ue.ue);
    ueBlock.setAttribute("data-ue-id", ueId);

    const ueTitle = document.createElement("h2");
    ueTitle.textContent = ue.ue;
    ueBlock.appendChild(ueTitle);

    const ueContent = document.createElement("div");
    ueContent.classList.add("ue-content");

    const ueInputs = document.createElement("div");
    ueInputs.classList.add("ue-inputs");

    const form = document.createElement("form");
    ue.courses.forEach((course) => {
      const div = document.createElement("div");
      div.classList.add("course-row");

      if (course.name.toLowerCase().includes("académique")) {
        const spMatches = [...course.name.matchAll(/SP(\d+)/gi)];
        const spNumbers = spMatches.map((match) => match[1]);

        if (spNumbers.length > 0) {
          const spNumbersString = spNumbers.join(",");

          div.innerHTML = `
            <label for="sp-acad-${spNumbersString}-${index}">${course.name} (coef ${course.coef}) :</label>
            <input type="number" id="sp-acad-${spNumbersString}-${index}" name="notes[]" placeholder="Note" 
            class="styled-input" style="width: 73px;" min="0" max="20" step="0.1" 
            data-sp-numbers="${spNumbersString}" />
            <input type="hidden" name="coeffs[]" value="${course.coef}" />
          `;
        }
      } else if (course.grades) {
        let gradeInputs = course.grades
          .map(
            (grade, i) => `
              <input type="number" id="grade-${index}-${sanitizeString(
              course.name
            )}-${i}" name="grades[]" 
              placeholder="${grade.name}" class="styled-input" min="0" max="20" step="0.1" 
              style="width: 73px; margin-left: 5px;" />
              <input type="hidden" name="gradeCoeffs[]" value="${grade.coef}" />
            `
          )
          .join("");

        div.innerHTML = `
          <label for="note-${index}-${sanitizeString(course.name)}">${course.name} (coef ${
          course.coef
        }) :</label>
          <div style="display: flex; align-items: center;">${gradeInputs}</div>
        `;
      } else {
        div.innerHTML = `
          <label for="note-${index}-${sanitizeString(course.name)}">${course.name} (coef ${
          course.coef
        }) :</label>
          <input type="number" id="note-${index}-${sanitizeString(
          course.name
        )}" name="notes[]" placeholder="Note" 
            class="styled-input" style="width: 73px;" min="0" max="20" step="0.1" />
          <input type="hidden" name="coeffs[]" value="${course.coef}" />
        `;
      }

      form.appendChild(div);
    });

    ueInputs.appendChild(form);

    const separator = document.createElement("div");
    separator.classList.add("separator");

    const ueRight = document.createElement("div");
    ueRight.classList.add("ue-right");

    const ueActions = document.createElement("div");
    ueActions.classList.add("ue-actions");
    ueActions.innerHTML = `
      <div class="actions-left">
        <label for="moyenneCible-${index}">Moyenne cible :</label>
        <input type="number" id="moyenneCible-${index}" value="10" min="0" max="20" step="0.1" class="styled-input">
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
    ueContent.appendChild(ueInputs);
    ueContent.appendChild(separator);
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

function calculateAverageAndNeededPoints(
  notes,
  coefficients,
  targetAverage,
  grades = [],
  gradeCoefficients = []
) {
  const totalCoefficients =
    coefficients.reduce((a, b) => a + b, 0) + gradeCoefficients.reduce((a, b) => a + b, 0);
  let currentTotal = 0;
  let remainingCoefficients = 0;

  notes.forEach((note, i) => {
    if (note !== null && !isNaN(note)) {
      currentTotal += note * coefficients[i];
    } else {
      remainingCoefficients += coefficients[i];
    }
  });

  grades.forEach((grade, i) => {
    if (grade !== null && !isNaN(grade)) {
      currentTotal += grade * gradeCoefficients[i];
    } else {
      remainingCoefficients += gradeCoefficients[i];
    }
  });

  const currentAverage = totalCoefficients > 0 ? currentTotal / totalCoefficients : 0;
  const neededPoints = Math.max(0, targetAverage * totalCoefficients - currentTotal);

  const neededGrade =
    remainingCoefficients > 0
      ? Math.ceil((neededPoints / remainingCoefficients) * 100) / 100
      : null;

  return { currentAverage, neededGrade };
}

document.getElementById("specialty").addEventListener("change", (event) => {
  const selectedSpecialty = event.target.value;
  localStorage.setItem("selectedSpecialty", selectedSpecialty);
  renderSpecialty(selectedSpecialty);
});

window.addEventListener("hashchange", () => {
  currentSemester = getHash();
  loadSpecialties(currentSemester);
});

loadSpecialties(currentSemester);

function calculateSingleUE(ueBlock, index) {
  const targetAverage = parseFloat(document.getElementById(`moyenneCible-${index}`).value);
  const form = ueBlock.querySelector("form");

  const formData = new FormData(form);
  const notes = formData.getAll("notes[]").map((n) => (n.trim() === "" ? null : parseFloat(n)));
  const coefficients = formData.getAll("coeffs[]").map(parseFloat);

  const grades = formData.getAll("grades[]").map((g) => (g.trim() === "" ? null : parseFloat(g)));
  const gradeCoefficients = formData.getAll("gradeCoeffs[]").map(parseFloat);

  if (!validateNotes(notes) || !validateNotes(grades)) {
    alert("Veuillez entrer des notes valides entre 0 et 20.");
    return;
  }

  const { currentAverage, neededGrade } = calculateAverageAndNeededPoints(
    notes,
    coefficients,
    targetAverage,
    grades,
    gradeCoefficients
  );

  const missingNotesCount =
    notes.filter((n) => n === null).length + grades.filter((g) => g === null).length;

  const ueResults = ueBlock.querySelector(".ue-results");
  ueResults.innerHTML = `<h3>Résultats :</h3>`;
  ueResults.innerHTML += `<p>Moyenne actuelle : ${
    isNaN(currentAverage) ? "Aucune note saisie" : currentAverage.toFixed(2)
  }</p>`;

  if (missingNotesCount > 0) {
    if (neededGrade !== null) {
      if (currentAverage >= targetAverage) {
        ueResults.innerHTML += `<p style="color: green; font-weight: bold;">La moyenne cible est déjà atteinte !</p>`;
      } else if (neededGrade > 20) {
        ueResults.innerHTML += `<p style="color: red; font-weight: bold;">Impossible d'atteindre la moyenne cible...</p>`;
      } else {
        if (missingNotesCount > 1) {
          ueResults.innerHTML += `<p>Notes nécessaires pour valider : ${neededGrade.toFixed(
            2
          )}</p>`;
        } else {
          ueResults.innerHTML += `<p>Note nécessaire pour valider : ${neededGrade.toFixed(2)}</p>`;
        }
      }
    } else {
      ueResults.innerHTML += `<p>Toutes les notes sont déjà renseignées.</p>`;
    }
  } else {
    if (currentAverage >= targetAverage) {
      ueResults.innerHTML += `<p style="color: green; font-weight: bold;">Bravo, l'UE est validée !</p>`;

      const currentUE = ueBlock.getAttribute("data-ue-id").toLowerCase();
      const specialtySelect = document.getElementById("specialty");
      const specialty = specialtySelect.value;
      const ueName = specialties[specialty].find((ue) => sanitizeString(ue.ue) === currentUE)?.ue;
      const ueMatch = ueName?.toLowerCase().match(/ue\s*\d+\.4/);

      if (ueMatch) {
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

function validateNotes(notes) {
  return notes.every((note) => note === null || (note >= 0 && note <= 20));
}

function checkAndTriggerConfetti(specialty) {
  const spAcadInputs = document.querySelectorAll('input[id*="sp-acad-"]');
  let allValidated = true;

  spAcadInputs.forEach((spInput) => {
    const spMatch = spInput.id.match(/sp-acad-(\d+)/i);
    const spNumber = spMatch ? spMatch[1] : null;
    if (spNumber) {
      const average = parseFloat(spInput.value);
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
  const themeToggleBtnMobile = document.getElementById("themeToggleBtn-mobile");
  const logo = document.getElementById("logo");
  const hamburger = document.getElementById("hamburger");
  const navMenu = document.getElementById("nav-menu");
  const hamburgerIcon = hamburger.querySelector("i");

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

    const icons = document.querySelectorAll(".theme-toggle-btn-mobile i, #themeToggleBtn i");
    icons.forEach((icon) => {
      if (isLight) {
        icon.classList.remove("fa-moon");
        icon.classList.add("fa-sun");
      } else {
        icon.classList.remove("fa-sun");
        icon.classList.add("fa-moon");
      }
    });
  }

  const savedTheme = localStorage.getItem("theme") || "dark";
  if (savedTheme === "light") {
    document.body.classList.add("light-theme");
  } else {
    document.body.classList.remove("light-theme");
  }

  updateLogo(savedTheme);

  const initialIcon =
    savedTheme === "light" ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  themeToggleBtn.innerHTML = initialIcon;
  themeToggleBtnMobile.innerHTML = initialIcon;
  themeToggleBtn.addEventListener("click", toggleTheme);
  themeToggleBtnMobile.addEventListener("click", toggleTheme);

  hamburger.addEventListener("click", (e) => {
    e.stopPropagation();
    const isActive = navMenu.classList.toggle("active");
    hamburger.setAttribute("aria-expanded", isActive);
    document.body.classList.toggle("menu-open", isActive);

    if (isActive) {
      hamburgerIcon.classList.remove("fa-bars");
      hamburgerIcon.classList.add("fa-times");
    } else {
      hamburgerIcon.classList.remove("fa-times");
      hamburgerIcon.classList.add("fa-bars");
    }
  });

  const navLinks = navMenu.querySelectorAll("a");
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      navMenu.classList.remove("active");
      hamburger.setAttribute("aria-expanded", false);
      document.body.classList.remove("menu-open");
      hamburgerIcon.classList.remove("fa-times");
      hamburgerIcon.classList.add("fa-bars");
    });
  });

  document.addEventListener("click", (event) => {
    if (!navMenu.contains(event.target) && !hamburger.contains(event.target)) {
      navMenu.classList.remove("active");
      hamburger.setAttribute("aria-expanded", false);
      document.body.classList.remove("menu-open");
      hamburgerIcon.classList.remove("fa-times");
      hamburgerIcon.classList.add("fa-bars");
    }
  });
});
