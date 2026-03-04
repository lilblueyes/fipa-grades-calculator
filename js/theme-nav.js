function updateThemeColor(metaTheme, appleMeta) {
  const themeColor = getComputedStyle(document.body).getPropertyValue("--theme-color").trim();

  metaTheme.setAttribute("content", themeColor);
  appleMeta.setAttribute("content", themeColor);
  document.documentElement.style.backgroundColor = themeColor;
  document.body.style.backgroundColor = themeColor;
}

export function initThemeAndNavigation() {
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const logo = document.getElementById("logo");
  const hamburger = document.getElementById("hamburger");
  const navMenu = document.getElementById("nav-menu");
  const overlay = document.getElementById("overlay");
  const metaTheme = document.getElementById("theme-color-meta");
  const appleMeta = document.getElementById("apple-status-bar-meta");

  if (!themeToggleBtn || !logo || !hamburger || !navMenu || !overlay || !metaTheme || !appleMeta) {
    return;
  }

  const themeIcon = themeToggleBtn.querySelector("i");

  function updateLogo(theme) {
    logo.src = theme === "light" ? "assets/logo_ensta_dark.png" : "assets/logo_ensta.png";
  }

  function toggleTheme() {
    document.body.classList.toggle("light-theme");
    const isLight = document.body.classList.contains("light-theme");

    localStorage.setItem("theme", isLight ? "light" : "dark");
    updateLogo(isLight ? "light" : "dark");
    updateThemeColor(metaTheme, appleMeta);

    themeIcon.classList.toggle("fa-sun", isLight);
    themeIcon.classList.toggle("fa-moon", !isLight);
  }

  const savedTheme = localStorage.getItem("theme") || "dark";
  if (savedTheme === "light") {
    document.body.classList.add("light-theme");
  }

  updateLogo(savedTheme);
  updateThemeColor(metaTheme, appleMeta);
  themeIcon.classList.toggle("fa-sun", savedTheme === "light");
  themeIcon.classList.toggle("fa-moon", savedTheme !== "light");

  themeToggleBtn.addEventListener("click", toggleTheme);

  function updateZIndex() {
    themeToggleBtn.style.zIndex = overlay.classList.contains("active") ? "800" : "";
  }

  hamburger.addEventListener("click", (event) => {
    event.stopPropagation();

    const active = navMenu.classList.toggle("active");
    hamburger.setAttribute("aria-expanded", active);
    document.body.classList.toggle("menu-open", active);
    overlay.classList.toggle("active", active);

    updateZIndex();
  });

  navMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navMenu.classList.remove("active");
      hamburger.setAttribute("aria-expanded", false);
      document.body.classList.remove("menu-open");
      overlay.classList.remove("active");
      updateZIndex();
    });
  });

  overlay.addEventListener("click", () => {
    navMenu.classList.remove("active");
    hamburger.setAttribute("aria-expanded", false);
    document.body.classList.remove("menu-open");
    overlay.classList.remove("active");
    updateZIndex();
  });

  document.addEventListener("click", (event) => {
    if (!navMenu.contains(event.target) && !hamburger.contains(event.target)) {
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
}
