const menuButton = document.getElementById("menuButton");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const navLinks = document.querySelectorAll(".nav a");

function openMenu() {
  sidebar.classList.add("open");
  overlay.classList.add("show");
}

function closeMenu() {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
}

menuButton.addEventListener("click", () => {
  if (sidebar.classList.contains("open")) {
    closeMenu();
  } else {
    openMenu();
  }
});

overlay.addEventListener("click", closeMenu);

navLinks.forEach(link => {
  link.addEventListener("click", closeMenu);
});


document.addEventListener("DOMContentLoaded", () => {
  const pageTopButton = document.getElementById("pageTopButton");

  if (!pageTopButton) {
    return;
  }

  window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
      pageTopButton.classList.add("is-show");
    } else {
      pageTopButton.classList.remove("is-show");
    }
  });

  pageTopButton.addEventListener("click", () => {
    window.scrollTo(0, 0);
  });
});