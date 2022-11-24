// load initial settings
setTheme(localStorage.getItem("theme")? localStorage.getItem("theme") : "light");
localStorage.setItem("postsPerPage", localStorage.getItem("postsPerPage")? localStorage.getItem("postsPerPage") : "15");

// settings menu
settingsButton.addEventListener("click", function() {
	openOverlay(settingsOverlay);
});
settingsTheme.addEventListener("change", function() {
	setTheme(this.value);
});
settingsPostsPerPage.addEventListener("change", function() {
	localStorage.setItem("postsPerPage", this.value);
});