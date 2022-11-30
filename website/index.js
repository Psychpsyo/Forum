if (localStorage.getItem("userToken") != undefined && localStorage.getItem("userID") != undefined) {
	verifyToken().then(loggedIn => {
		if (loggedIn) {
			setLoggedInView();
		} else {
			errorDiv.style.display = "block";
			errorDiv.innerHTML = "Failed to log in.\nPlease try again later.";
		}
	});
} else {
	errorDiv.style.display = "block";
}

async function showHomepage(page, fromHistory = false) {
	if (!fromHistory) {
		history.pushState({"page": "home", "threadPage": page}, "");
	}
	clearUserCache();
	
	let threadList = await getThreads(page);
	// load all authors before writing anything to the page
	for (const thread of threadList.threads) {
		await getUserInfo(thread.author);
		await getUserInfo(thread.lastPost.author);
	}
	let forumInfo = await getForumInfo();
	let newestUser = await getUserInfo(forumInfo.newestUser);
	pageTitleText.textContent = "Homepage";
	pageContent.innerHTML = "";
	errorDiv.style.display = "none";
	window.scrollTo(0, 0);
	
	let infoBox = document.createElement("div");
	infoBox.classList.add("infoBox");
	infoBox.appendChild(document.createTextNode("Welcome to the forum!"));
	infoBox.appendChild(document.createElement("br"));
	infoBox.appendChild(document.createTextNode("We currently have " + forumInfo.userCount + " users who have written " + forumInfo.postCount + " posts in " + forumInfo.threadCount + " threads."));
	infoBox.appendChild(document.createElement("br"));
	infoBox.appendChild(document.createTextNode("Our newest user is "));
	let newestUserLink = document.createElement("a");
	newestUserLink.textContent = newestUser.name;
	newestUserLink.dataset.userId = newestUser.id;
	newestUserLink.addEventListener("click", userNameClicked);
	infoBox.appendChild(newestUserLink);
	infoBox.appendChild(document.createTextNode("."));
	pageContent.appendChild(infoBox);
	
	let postsHeader = document.createElement("div");
	postsHeader.classList.add("sectionHeader");
	postsHeader.textContent = "All Threads:"
	pageContent.appendChild(postsHeader);
	
	let paginationTop = buildPagination(page, Math.floor((threadList.threadCount - 1) / 10), function() {
		showHomepage(parseInt(this.dataset.page));
	});
	pageContent.appendChild(paginationTop);
	for (const thread of threadList.threads) {
		let threadElement = threadTemplate.content.firstElementChild.cloneNode(true);
		threadElement.dataset.threadId = thread.id;
		threadElement.querySelector(".threadName").textContent = thread.name;
		threadElement.querySelector(".threadID").textContent = "#" + ("" + thread.id).padStart(5, "0");
		threadElement.querySelector(".threadUpdateTime").textContent = dateStringToAgoTime(thread.lastPostDate);
		threadElement.querySelector(".threadUpdateTime").title = thread.lastPostDate + "(UTC)";
		threadElement.querySelector(".threadAuthor").textContent = "@" + (await getUserInfo(thread.author)).name;
		threadElement.querySelector(".threadAuthor").dataset.userId = thread.author;
		threadElement.querySelector(".threadLastPoster").textContent = "@" + (await getUserInfo(thread.lastPost.author)).name;
		threadElement.querySelector(".threadLastPoster").dataset.userId = thread.lastPost.author;
		
		threadElement.addEventListener("click", function() {
			showThread(parseInt(this.dataset.threadId), 0);
		});
		threadElement.querySelector(".threadAuthor").addEventListener("click", userNameClicked);
		threadElement.querySelector(".threadLastPoster").addEventListener("click", userNameClicked);
		threadElement.querySelector(".threadLastPostLink").dataset.postId = thread.lastPost.id;
		threadElement.querySelector(".threadLastPostLink").addEventListener("click", function() {
			showPost(parseInt(this.dataset.postId));
		});
		pageContent.appendChild(threadElement);
	}
	let paginationBottom = buildPagination(page, Math.floor((threadList.threadCount - 1) / 10), function() {
		showHomepage(parseInt(this.dataset.page));
	});
	pageContent.appendChild(paginationBottom);
	pageContent.appendChild(document.createElement("br"));
}

async function showThread(threadID, page, fromHistory = false) {
	if (!fromHistory) {
		history.pushState({"page": "thread", "thread": threadID, "threadPage": page}, "");
	}
	clearUserCache();
	
	let threadInfo = await getThreadInfo(threadID);
	let posts = await getPosts(threadID, page);
	// load all authors before writing anything to the page
	for (const post of posts) {
		await getUserInfo(post.author);
	}
	pageTitleText.textContent = "Thread: \"" + threadInfo.name + "\"";
	pageContent.innerHTML = "";
	errorDiv.style.display = "none";
	window.scrollTo(0, 0);
	let paginationTop = buildPagination(page, Math.floor((threadInfo.postCount - 1) / parseInt(localStorage.getItem("postsPerPage"))), function() {
		showThread(threadID, parseInt(this.dataset.page));
	});
	pageContent.appendChild(paginationTop);
	for (const post of posts) {
		pageContent.appendChild(await buildPost(post));
	}
	
	pageContent.appendChild(document.createElement("br"));
	pageContent.appendChild(document.createElement("hr"));
	pageContent.appendChild(document.createElement("br"));
	
	let newPostTextbox = newPostTemplate.content.firstElementChild.cloneNode(true);
	newPostTextbox.querySelector(".newPostSubmit").dataset.threadId = threadID;
	newPostTextbox.querySelector(".newPostSubmit").addEventListener("click", async function() {
		let textbox = this.closest(".newPost").querySelector(".newPostTextbox");
		let preview = this.closest(".newPost").querySelector(".newPostPreviewBox");
		preview.innerHTML = "";
		preview.style.display = "none";
		textbox.style.display = "block";
		let postContent = textbox.innerText;
		if (postContent.length == 0) {
			return;
		}
		if (postContent.length > 8000) {
			alert("That's too long!\nKeep it below 8000 characters, please.");
			return;
		}
		let threadID = parseInt(this.dataset.threadId, 10);
		let newPostID = await createPost(threadID, postContent);
		if (newPostID == -1) {
			alert("Failed to create post.");
		} else {
			if (newPostSubscribe.checked) {
				subscribeToThread(threadID);
			}
			let threadInfo = await getThreadInfo(threadID);
			showThread(threadID, Math.floor((threadInfo.postCount - 1) / parseInt(localStorage.getItem("postsPerPage"))));
		}
	});
	
	newPostTextbox.querySelector(".newPostPreview").addEventListener("click", async function() {
		let textbox = this.closest(".newPost").querySelector(".newPostTextbox");
		let preview = this.closest(".newPost").querySelector(".newPostPreviewBox");
		if (window.getComputedStyle(textbox).display == "none") {
			preview.innerHTML = "";
			preview.style.display = "none";
			textbox.style.display = "block";
			this.textContent = "Preview";
			textbox.focus();
			return;
		}
		preview.innerHTML = "";
		fillWithRichHTML(preview, textbox.innerText);
		textbox.style.display = "none";
		preview.style.display = "block";
		this.textContent = "Edit";
	});
	
	pageContent.appendChild(newPostTextbox);
	
	let paginationBottom = buildPagination(page, Math.floor((threadInfo.postCount - 1) / parseInt(localStorage.getItem("postsPerPage"))), function() {
		showThread(threadID, parseInt(this.dataset.page));
	});
	pageContent.appendChild(paginationBottom);
	pageContent.appendChild(document.createElement("br"));
}

async function showUser(userID, fromHistory = false) {
	if (!fromHistory) {
		history.pushState({"page": "user", "user": userID}, "");
	}
	
	clearUserCache();
	
	let user = await getUserInfo(userID);
	let recentPosts = await getUserPosts(userID, 0);
	pageTitleText.textContent = "User: \"" + user.name + "\"";
	pageContent.innerHTML = "";
	errorDiv.style.display = "none";
	window.scrollTo(0, 0);
	
	let infoHeader = document.createElement("div");
	infoHeader.classList.add("sectionHeader");
	infoHeader.textContent = "General Info:"
	pageContent.appendChild(infoHeader);
	
	let infoBox = document.createElement("div");
	infoBox.classList.add("infoBox");
	infoBox.appendChild(document.createTextNode("Registered " + dateStringToAgoTime(user.registrationDate) + " (" + user.registrationDate + " UTC)"));
	infoBox.appendChild(document.createElement("br"));
	infoBox.appendChild(document.createTextNode("Created " + user.postCount + " posts since then."));
	
	pageContent.appendChild(infoBox);
	
	let postsHeader = document.createElement("div");
	postsHeader.classList.add("sectionHeader");
	postsHeader.textContent = "Recent Posts:"
	pageContent.appendChild(postsHeader);
	
	for (const post of recentPosts) {
		pageContent.appendChild(await buildPost(post));
	}
	
	pageContent.appendChild(document.createElement("br"));
}

async function showNotifications(page, fromHistory = false) {
	if (!fromHistory) {
		history.pushState({"page": "notifications", "notificationsPage": page}, "");
	}
	clearUserCache();
	
	let notificationCount = await getNotificationCount();
	let notifications = await getNotifications(page);
	// load all authors before writing anything to the page
	for (const notification of notifications) {
		await getUserInfo(notification.post.author);
	}
	pageTitleText.textContent = "Notifications";
	pageContent.innerHTML = "";
	errorDiv.style.display = "none";
	window.scrollTo(0, 0);
	
	if (notifications.length > 0) {
		let paginationTop = buildPagination(page, Math.floor((notificationCount - 1) / parseInt(localStorage.getItem("postsPerPage"))), function() {
			showNotifications(parseInt(this.dataset.page));
		});
		pageContent.appendChild(paginationTop);
		for (const notification of notifications) {
			let notifElement = notificationTemplate.content.firstElementChild.cloneNode(true);
			notifElement.id = "notification" + notification.id;
			notifElement.dataset.notificationId = notification.id;
			notifElement.querySelector(".notificationReason").textContent = "New post in a thread you are subscribed to:";
			notifElement.appendChild(await buildPost(notification.post));
			
			notifElement.querySelector(".removeNotificationButton").addEventListener("click", async function() {
				let id = parseInt(this.closest(".notification").dataset.notificationId);
				if (await removeNotification(id)) {
					document.getElementById("notification" + id).remove();
				} else {
					alert("Failed to remove notification");
				}
			});
			
			pageContent.appendChild(notifElement);
		}
		let paginationBottom = buildPagination(page, Math.floor((notificationCount - 1) / parseInt(localStorage.getItem("postsPerPage"))), function() {
			showNotifications(parseInt(this.dataset.page));
		});
		pageContent.appendChild(paginationBottom);
	} else {
		errorDiv.style.display = "block";
		errorDiv.innerHTML = "You have no notifications to show.\n:(";
	}
	pageContent.appendChild(document.createElement("br"));
}

async function showPost(postID) {
	let postLocation = await getPostLocation(postID);
	showThread(postLocation.thread, Math.floor(postLocation.index / localStorage.getItem("postsPerPage")));
	// I would love to make it scroll to a post here but images in the posts above might still be loading in so that doesn't work reliably. :(
	// awaiting showThread() would be necessary in that case but doesn't fix this.
}

function setLoggedInView() {
	loggedOutHeaderOptions.style.display = "none";
	loggedInHeaderOptions.style.display = "block";
	errorDiv.style.display = "none";
	pageTitle.style.display = "block";
	getNotificationCount().then(count => {
		notificationCount.textContent = count;
	});
	showHomepage(0);
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
forumName.addEventListener("click", function() {
	showHomepage(0);
});
notificationsButton.addEventListener("click", function() {
	showNotifications(0);
});
logoutButton.addEventListener("click", logout);
overlayBackdrop.addEventListener("click", closeOverlays);

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
		if (threadID >= 0) {
			if (newThreadSubscribe.checked) {
				subscribeToThread(threadID);
			}
			closeOverlays();
			showThread(threadID, 0);
			newThreadName.value = "";
			newThreadPost.value = "";
			newThreadSubscribe.checked = false;
		} else {
			alert("Failed to create thread.");
		}
	});
});

// history
window.addEventListener("popstate", function(e) {
	switch (e.state.page) {
		case "user":
			showUser(e.state.user, true);
			break;
		case "thread":
			showThread(e.state.thread, e.state.threadPage, true);
			break;
		case "home":
			showHomepage(e.state.threadPage, true);
			break;
		case "notifications":
			showNotifications(e.state.notificationsPage, true);
			break;
	}
});