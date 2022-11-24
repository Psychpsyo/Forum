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
	postTemplate.content.querySelector(".post").dataset.postId = postInfo.id;
	postTemplate.content.querySelector(".postAuthor").textContent = author.name;
	postTemplate.content.querySelector(".postAuthor").dataset.userId = author.id;
	postTemplate.content.querySelector(".postAuthorPostCount").textContent = author.postCount + " post" + (author.postCount == 1? "" : "s");
	postTemplate.content.querySelector(".postAuthorRegistered").textContent = "registered " + dateStringToAgoTime(author.registrationDate);
	postTemplate.content.querySelector(".postAuthorRegistered").title = author.registrationDate + "(UTC)";
	postTemplate.content.querySelector(".postDate").textContent = dateStringToAgoTime(postInfo.date);
	postTemplate.content.querySelector(".postDate").title = postInfo.date + "(UTC)";
	postTemplate.content.querySelector(".postID").textContent = "#" + ("" + postInfo.id).padStart(5, "0");
	postTemplate.content.querySelector(".postContent").textContent = postInfo.content;
	
	let postElement = postTemplate.content.firstElementChild.cloneNode(true);
	postElement.querySelector(".postAuthor").addEventListener("click", function() {
		showUser(parseInt(this.dataset.userId));
	});
	return postElement;
}
