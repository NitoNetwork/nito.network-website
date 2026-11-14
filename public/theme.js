try {
  document.documentElement.dataset.theme =
    localStorage.getItem("nito-theme") === "light" ? "light" : "dark";
} catch {
  document.documentElement.dataset.theme = "dark";
}
try {
  document.documentElement.dataset.motion =
    localStorage.getItem("nito-motion") === "paused" ? "paused" : "active";
} catch {
  document.documentElement.dataset.motion = "active";
}
