// load initial settings
setTheme(localStorage.getItem("theme")? localStorage.getItem("theme") : "light");

// settings menu
settingsButton.addEventListener("click", function() {
	openOverlay(settingsOverlay);
});
settingsTheme.addEventListener("change", function() {
	setTheme(this.value);
});