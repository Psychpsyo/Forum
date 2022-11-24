if (localStorage.getItem("userToken") != undefined && localStorage.getItem("userID") != undefined) {
	verifyToken().then(loggedIn => {
		if (loggedIn) {
			setLoggedInView();
		} else {
			errorDiv.style.display = "block";
			errorDiv.innerHTML = "Failed to log in.<br>Please try again later.";
		}
	});
} else {
	errorDiv.style.display = "block";
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

function buildPagination(current, last, pageClickEvent) {
	let pagination = document.createElement("div");
	pagination.classList.add("pagination");
	
	let paginationPage = document.createElement("span");
	paginationPage.textContent = "Page:";
	pagination.appendChild(paginationPage);
	
	let i = 0;
	while(i < 3 && i <= last) {
		let pageLink = document.createElement("a");
		pageLink.dataset.page = i;
		pageLink.textContent = "" + (i + 1);
		pageLink.addEventListener("click", pageClickEvent);
		pagination.appendChild(pageLink);
		i++;
	}
	if (i < current - 2) {
		i = current - 2;
		let dotdotdot = document.createElement("span");
		dotdotdot.textContent = "...";
		pagination.appendChild(dotdotdot);
	}
	while(i < current + 3 && i <= last) {
		let pageLink = document.createElement("a");
		pageLink.dataset.page = i;
		pageLink.textContent = "" + (i + 1);
		pageLink.addEventListener("click", pageClickEvent);
		pagination.appendChild(pageLink);
		i++;
	}
	if (i < last - 2) {
		i = last - 2;
		let dotdotdot = document.createElement("span");
		dotdotdot.textContent = "...";
		pagination.appendChild(dotdotdot);
	}
	while(i <= last) {
		let pageLink = document.createElement("a");
		pageLink.dataset.page = i;
		pageLink.textContent = "" + (i + 1);
		pageLink.addEventListener("click", pageClickEvent);
		pagination.appendChild(pageLink);
		i++;
	}
	return pagination;
}

async function showThreadList(page) {
	let threadList = await getThreads(page);
	// load all authors before writing anything to the page
	for (const thread of threadList.threads) {
		await getUserInfo(thread.author);
	}
	pageTitleText.textContent = "Recent Threads";
	pageContent.innerHTML = "";
	let paginationTop = buildPagination(page, Math.floor((threadList.threadCount - 1) / 10), function() {
		showThreadList(parseInt(this.dataset.page));
	});
	pageContent.appendChild(paginationTop);
	for (const thread of threadList.threads) {
		threadTemplate.content.querySelector(".thread").dataset.threadId = thread.id;
		threadTemplate.content.querySelector(".threadName").textContent = thread.name;
		threadTemplate.content.querySelector(".threadID").textContent = "#" + ("" + thread.id).padStart(5, "0");
		threadTemplate.content.querySelector(".threadUpdateTime").textContent = dateStringToAgoTime(thread.lastPostDate);
		threadTemplate.content.querySelector(".threadAuthor").textContent = "@" + (await getUserInfo(thread.author)).name;
		
		let threadElement = threadTemplate.content.firstElementChild.cloneNode(true);
		threadElement.addEventListener("click", function() {
			showThread(parseInt(this.dataset.threadId, 10), 0);
		});
		pageContent.appendChild(threadElement);
	}
	let paginationBottom = buildPagination(page, Math.floor((threadList.threadCount - 1) / 10), function() {
		showThreadList(parseInt(this.dataset.page));
	});
	pageContent.appendChild(paginationBottom);
	pageContent.appendChild(document.createElement("br"));
}

async function showThread(threadID, page) {
	let threadInfo = await getThreadInfo(threadID);
	let posts = await getPosts(threadID, page);
	// load all authors before writing anything to the page
	for (const post of posts) {
		await getUserInfo(post.author);
	}
	pageTitleText.textContent = "Thread: \"" + threadInfo.name + "\"";
	pageContent.innerHTML = "";
	let paginationTop = buildPagination(page, Math.floor((threadInfo.postCount - 1) / 15), function() {
		showThread(threadID, parseInt(this.dataset.page));
	});
	pageContent.appendChild(paginationTop);
	for (const post of posts) {
		let author = await getUserInfo(post.author);
		postTemplate.content.querySelector(".post").dataset.postId = post.id;
		postTemplate.content.querySelector(".postAuthor").textContent = author.name;
		postTemplate.content.querySelector(".postAuthorPostCount").textContent = author.postCount + " post" + (author.postCount == 1? "" : "s");
		postTemplate.content.querySelector(".postAuthorRegistered").textContent = "registered " + dateStringToAgoTime(author.registrationDate);
		postTemplate.content.querySelector(".postDate").textContent = dateStringToAgoTime(post.date);
		postTemplate.content.querySelector(".postID").textContent = "#" + ("" + post.id).padStart(5, "0");
		postTemplate.content.querySelector(".postContent").textContent = post.content;
		
		let postElement = postTemplate.content.firstElementChild.cloneNode(true);
		pageContent.appendChild(postElement);
	}
	
	pageContent.appendChild(document.createElement("br"));
	pageContent.appendChild(document.createElement("hr"));
	pageContent.appendChild(document.createElement("br"));
	
	let newPostTextbox = newPostTemplate.content.firstElementChild.cloneNode(true);
	newPostTextbox.querySelector(".newPostSubmit").dataset.threadId = threadID;
	newPostTextbox.querySelector(".newPostSubmit").addEventListener("click", async function() {
		let threadID = parseInt(this.dataset.threadId, 10);
		let newPostID = await createPost(threadID, this.parentElement.parentElement.querySelector(".newPostTextbox").innerText);
		if (newPostID == -1) {
			alert("Failed to create post.");
		} else {
			let threadInfo = await getThreadInfo(threadID);
			showThread(threadID, Math.floor((threadInfo.postCount - 1) / 15));
		}
	});
	pageContent.appendChild(newPostTextbox);
	
	let paginationBottom = buildPagination(page, Math.floor((threadInfo.postCount - 1) / 15), function() {
		showThread(threadID, parseInt(this.dataset.page));
	});
	pageContent.appendChild(paginationBottom);
	pageContent.appendChild(document.createElement("br"));
}

function setLoggedInView() {
	loggedOutHeaderOptions.style.display = "none";
	loggedInHeaderOptions.style.display = "block";
	errorDiv.style.display = "none";
	pageTitle.style.display = "block";
	
	showThreadList(0);
}

function closeOverlays() {
	Array.from(document.querySelectorAll(".overlay")).forEach(overlay => {
		overlay.style.display = "none";
	});
	overlayBackdrop.style.display = "none";
}
function openOverlay(overlay) {
	overlay.style.display = "block";
	overlayBackdrop.style.display = "block";
}

// button events
forumName.addEventListener("click", function() {showThreadList(0);});
logoutButton.addEventListener("click", logout);
overlayBackdrop.addEventListener("click", closeOverlays);

threadTemplate.content.querySelector(".thread")

// account creation
createAccountButton.addEventListener("click", function() {
	openOverlay(accountCreationOverlay);
});
accountCreationSubmitButton.addEventListener("click", function() {
	accountCreationUsernameWarning.style.display = "none";
	accountCreationPasswordWarning.style.display = "none";
	accountCreationRepeatPasswordWarning.style.display = "none";
	accountCreationInviteCodeWarning.style.display = "none";
	
	let errorFound = false;
	if (accountCreationUsername.value === "") {
		accountCreationUsernameWarning.style.display = "initial";
		errorFound = true;
	}
	if (accountCreationPassword.value === "") {
		accountCreationPasswordWarning.style.display = "initial";
		errorFound = true;
	}
	if (accountCreationRepeatPassword.value !== accountCreationPassword.value) {
		accountCreationRepeatPasswordWarning.style.display = "initial";
		errorFound = true;
	}
	if (accountCreationInviteCode.value === "") {
		accountCreationInviteCodeWarning.style.display = "initial";
		errorFound = true;
	}
	if (errorFound) {
		return;
	}
	createAccount(accountCreationUsername.value, accountCreationPassword.value, accountCreationInviteCode.value).then(loggedIn => {
		if (loggedIn) {
			closeOverlays();
			setLoggedInView();
			accountCreationPassword.value = "";
			accountCreationRepeatPassword.value = "";
		} else {
			alert("Could not create the account.\nThere's a few reasons why this could happen:\n- Your invite code is invalid.\n- You have no internet.\n- Your username is already taken by someone else.");
		}
	});
});

// logging in
loginButton.addEventListener("click", function() {
	openOverlay(loginOverlay);
});
loginSubmitButton.addEventListener("click", function() {
	loginUsernameWarning.style.display = "none";
	loginPasswordWarning.style.display = "none";
	
	let errorFound = false;
	if (loginUsername.value === "") {
		loginUsernameWarning.style.display = "initial";
		errorFound = true;
	}
	if (loginPassword.value === "") {
		loginPasswordWarning.style.display = "initial";
		errorFound = true;
	}
	if (errorFound) {
		return;
	}
	login(loginUsername.value, loginPassword.value).then(loggedIn => {
		if (loggedIn) {
			closeOverlays();
			setLoggedInView();
			loginPassword.value = "";
		} else {
			alert("Login Failed.");
		}
	});
});

// new threads
newThreadButton.addEventListener("click", function() {
	openOverlay(newThreadOverlay);
});
newThreadSubmitButton.addEventListener("click", function() {
	newThreadNameWarning.style.display = "none";
	newThreadPostWarning.style.display = "none";
	
	let errorFound = false;
	if (newThreadName.value === "") {
		newThreadNameWarning.style.display = "initial";
		errorFound = true;
	}
	if (newThreadPost.value === "") {
		newThreadPostWarning.style.display = "initial";
		errorFound = true;
	}
	if (errorFound) {
		return;
	}
	createThread(newThreadName.value, newThreadPost.value).then(threadID => {
		closeOverlays();
		showThread(threadID, 0);
	});
});