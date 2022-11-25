// Utility functions

function setTheme(theme) {
	document.documentElement.classList.remove("theme-" + localStorage.getItem("theme"));
	localStorage.setItem("theme", theme);
	document.documentElement.classList.add("theme-" + theme);
}

function dateStringToAgoTime(dateString) {
	let timeAgo = (Date.now() - Date.parse(dateString + "Z")) / 1000;
	let timeUnit = "second";
	if (timeAgo > 60) {
		timeAgo /= 60;
		timeUnit = "minute";
		if (timeAgo > 60) {
			timeAgo /= 60;
			timeUnit = "hour";
			if (timeAgo > 24) {
				timeAgo /= 24;
				timeUnit = "day";
				if (timeAgo > 365) {
					timeAgo /= 365;
					timeUnit = "year";
				} else if (timeAgo > 31) {
					timeAgo /= 31;
					timeUnit = "month";
				}
			}
		}
	}
	timeAgo = Math.floor(timeAgo);
	return timeAgo + " " + timeUnit + (timeAgo == 1? "" : "s") + " ago";
}

function userNameClicked(e) {
	showUser(parseInt(this.dataset.userId));
	e.stopPropagation();
}

function buildPageLink(page, current, pageClickEvent) {
	let pageLink = document.createElement(page == current? "span" : "a");
	pageLink.textContent = "" + (page + 1);
	if (page != current) {
		pageLink.dataset.page = page;
		pageLink.textContent = "" + (page + 1);
		pageLink.addEventListener("click", pageClickEvent);
	}
	return pageLink;
}

function buildPagination(current, last, pageClickEvent) {
	let pagination = document.createElement("div");
	pagination.classList.add("pagination");
	
	let paginationPage = document.createElement("span");
	paginationPage.textContent = "Page:";
	pagination.appendChild(paginationPage);
	
	let i = 0;
	while(i < 3 && i <= last) {
		pagination.appendChild(buildPageLink(i, current, pageClickEvent));
		i++;
	}
	if (i < current - 2) {
		i = current - 2;
		let dotdotdot = document.createElement("span");
		dotdotdot.textContent = "...";
		pagination.appendChild(dotdotdot);
	}
	while(i < current + 3 && i <= last) {
		pagination.appendChild(buildPageLink(i, current, pageClickEvent));
		i++;
	}
	if (i < last - 2) {
		i = last - 2;
		let dotdotdot = document.createElement("span");
		dotdotdot.textContent = "...";
		pagination.appendChild(dotdotdot);
	}
	while(i <= last) {
		pagination.appendChild(buildPageLink(i, current, pageClickEvent));
		i++;
	}
	return pagination;
}

async function buildPost(postInfo) {
	let author = await getUserInfo(postInfo.author);
	let postElement = postTemplate.content.firstElementChild.cloneNode(true);
	postElement.dataset.postId = postInfo.id;
	postElement.querySelector(".postAuthor").textContent = author.name;
	postElement.querySelector(".postAuthor").dataset.userId = author.id;
	postElement.querySelector(".postAuthorPostCount").textContent = author.postCount + " post" + (author.postCount == 1? "" : "s");
	postElement.querySelector(".postAuthorRegistered").textContent = "registered " + dateStringToAgoTime(author.registrationDate);
	postElement.querySelector(".postAuthorRegistered").title = author.registrationDate + "(UTC)";
	postElement.querySelector(".postDate").textContent = dateStringToAgoTime(postInfo.date);
	postElement.querySelector(".postDate").title = postInfo.date + "(UTC)";
	postElement.querySelector(".postID").textContent = "#" + ("" + postInfo.id).padStart(5, "0");
	if (postInfo.lastEdited) {
		postElement.querySelector(".postLastEdited").textContent = "(last edited " + dateStringToAgoTime(postInfo.lastEdited) + ")";
		postElement.querySelector(".postLastEdited").title = postInfo.lastEdited + "(UTC)";
	} else {
		postElement.querySelector(".postLastEdited").remove();
	}
	
	fillWithRichHTML(postElement.querySelector(".postContent"), postInfo.content);
	postElement.querySelector(".postAuthor").addEventListener("click", userNameClicked);
	if (postInfo.author == parseInt(localStorage.getItem("userID"))) {
		postElement.querySelector(".postOtherOptions").remove();
		postElement.querySelector(".postContentEditor").textContent = postInfo.content;
		
		postElement.querySelector(".postEdit").addEventListener("click", function() {
			let displayContent = this.closest(".post").querySelector(".postContent");
			let editContent = this.closest(".post").querySelector(".postContentEditor");
			if (window.getComputedStyle(editContent).display == "none") {
				displayContent.style.display = "none";
				editContent.style.display = "block";
				this.closest(".post").querySelector(".postDelete").style.display = "none";
				this.closest(".post").querySelector(".postEditSubmit").style.display = "inline-block";
				this.textContent = "Cancel";
				editContent.focus();
				return;
			}
			// else
			editContent.style.display = "none";
			displayContent.style.display = "block";
			this.closest(".post").querySelector(".postEditSubmit").style.display = "none";
			this.closest(".post").querySelector(".postDelete").style.display = "inline-block";
			this.textContent = "Edit";
		});
		postElement.querySelector(".postEditSubmit").addEventListener("click", async function() {
			let postContent = this.closest(".post").querySelector(".postContentEditor").innerText;
			if (postContent.length == 0) {
				return;
			}
			if (postContent.length > 8000) {
				alert("That's too long!\nKeep it below 8000 characters, please.");
				return;
			}
			if (await editPost(parseInt(this.closest(".post").dataset.postId), postContent)) {
				let postElem = this.closest(".post").querySelector(".postContent");
				postElem.innerHTML = "";
				fillWithRichHTML(postElem, postContent);
				this.closest(".post").querySelector(".postContentEditor").style.display = "none";
				postElem.style.display = "block";
				this.style.display = "none";
				this.closest(".post").querySelector(".postDelete").style.display = "inline-block";
				this.closest(".post").querySelector(".postEdit").textContent = "Edit";
			} else {
				alert("Failed to update post.");
			}
		});
		postElement.querySelector(".postDelete").addEventListener("click", async function() {
			if (window.confirm("Do you really want to delete this post?")) {
				if (await deletePost(parseInt(this.closest(".post").dataset.postId))) {
					this.closest(".post").remove();
				} else {
					alert("Failed to delete post.");
				}
			}
		});
	} else {
		postElement.querySelector(".postOwnerOptions").remove();
		postElement.querySelector(".postContentEditor").remove();
	}
	return postElement;
}