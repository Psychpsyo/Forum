let loggedIn = false;
let apiEndpoint = window.location.protocol + "//" + window.location.hostname + "/api";

async function createAccount(username, password, inviteCode) {
	await fetch(apiEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "text/plain",
		},
		body: JSON.stringify({
			"action": "createAccount",
			"name": username,
			"password": await hashPassword(username, password),
			"inviteCode": inviteCode
		})
	})
	.then(response => response.json())
	.then(data => {
		if (data.userID >= 0) {
			loggedIn = true;
			localStorage.setItem("userToken", data.token);
			localStorage.setItem("userID", data.userID);
		}
	})
	.catch(error => {
		console.log("Error while creating an account:", error)
	});
	return loggedIn;
}

async function login(username, password) {
	await fetch(apiEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "text/plain",
		},
		body: JSON.stringify({
			"action": "login",
			"name": username,
			"password": await hashPassword(username, password)
		})
	})
	.then(response => response.json())
	.then(data => {
		if (data.userID >= 0) {
			loggedIn = true;
			localStorage.setItem("userToken", data.token);
			localStorage.setItem("userID", data.userID);
		}
	})
	.catch(error => {
		console.log("Error while logging in:", error)
	});
	return loggedIn;
}

// logs out the current session, forgets about its credentials and reloads the page
async function logout() {
	await fetch(apiEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "text/plain",
		},
		body: JSON.stringify({
			"action": "logout",
			"userID": localStorage.getItem("userID"),
			"token": localStorage.getItem("userToken")
		})
	})
	localStorage.removeItem("userID");
	localStorage.removeItem("userToken");
	window.location.reload();
}

async function verifyToken() {
	await fetch(apiEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "text/plain",
		},
		body: JSON.stringify({
			"action": "verifyToken",
			"userID": localStorage.getItem("userID"),
			"token": localStorage.getItem("userToken")
		})
	})
	.then(response => response.json())
	.then(data => {
		if (data.verified) {
			loggedIn = true;
		}
	})
	.catch(error => {
		console.log("Error while verifying token:", error)
	});
	return loggedIn;
}

async function createThread(name, initialMessage) {
	let response = await fetch(apiEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "text/plain",
		},
		body: JSON.stringify({
			"action": "createThread",
			"userID": localStorage.getItem("userID"),
			"token": localStorage.getItem("userToken"),
			"title": name,
			"content": initialMessage
		})
	});
	
	if (!response.ok) {
		return -1;
	}
	
	let data = await response.json();
	return data["threadID"];
}

// attempts to create a post and returns its ID or -1 if it failed
async function createPost(threadID, content) {
	let response = await fetch(apiEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "text/plain",
		},
		body: JSON.stringify({
			"action": "createPost",
			"userID": localStorage.getItem("userID"),
			"token": localStorage.getItem("userToken"),
			"threadID": threadID,
			"content": content
		})
	});
	
	if (!response.ok) {
		return -1;
	}
	
	let data = await response.json();
	return data["postID"];
}

async function deletePost(postID) {
	let response = await fetch(apiEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "text/plain",
		},
		body: JSON.stringify({
			"action": "deletePost",
			"userID": localStorage.getItem("userID"),
			"token": localStorage.getItem("userToken"),
			"postID": postID
		})
	});
	
	if (!response.ok) {
		return false;
	}
	
	let data = await response.json();
	return data["deleted"];
}

async function editPost(postID, newContent) {
	let response = await fetch(apiEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "text/plain",
		},
		body: JSON.stringify({
			"action": "editPost",
			"userID": localStorage.getItem("userID"),
			"token": localStorage.getItem("userToken"),
			"postID": postID,
			"newContent": newContent
		})
	});
	
	if (!response.ok) {
		return false;
	}
	
	let data = await response.json();
	return data["edited"];
}

async function getThreads(page) {
	let response = await fetch(apiEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "text/plain",
		},
		body: JSON.stringify({
			"action": "getThreads",
			"userID": localStorage.getItem("userID"),
			"token": localStorage.getItem("userToken"),
			"page": page
		})
	});
	
	if (!response.ok) {
		return [];
	}
	
	return response.json();
}

async function getPosts(threadID, page) {
	let response = await fetch(apiEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "text/plain",
		},
		body: JSON.stringify({
			"action": "getPosts",
			"userID": localStorage.getItem("userID"),
			"token": localStorage.getItem("userToken"),
			"threadID": threadID,
			"page": page,
			"postsPerPage": parseInt(localStorage.getItem("postsPerPage"))
		})
	});
	
	if (!response.ok) {
		return [];
	}
	
	let data = await response.json();
	return data["posts"];
}

async function getUserPosts(requestedUserID, page) {
	let response = await fetch(apiEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "text/plain",
		},
		body: JSON.stringify({
			"action": "getUserPosts",
			"userID": localStorage.getItem("userID"),
			"token": localStorage.getItem("userToken"),
			"requestedUserID": requestedUserID,
			"page": page
		})
	});
	
	if (!response.ok) {
		return [];
	}
	
	let data = await response.json();
	return data["posts"];
}

// returns a location object with the properties of thread and index, being the ID of the thread the post is in and the how many'th in the thread it is.
async function getPostLocation(postID) {
	let response = await fetch(apiEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "text/plain",
		},
		body: JSON.stringify({
			"action": "getPostLocation",
			"userID": localStorage.getItem("userID"),
			"token": localStorage.getItem("userToken"),
			"postID": postID
		})
	});
	
	if (!response.ok) {
		return null;
	}
	
	let data = await response.json();
	return data;
}

// gets info about a user from the server, then caches it locally.
// If the user info can't be retrieved, it returns null
let userCache = {};
async function getUserInfo(userID) {
	if (userID in userCache) {
		return userCache[userID];
	}
	let response = await fetch(apiEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "text/plain",
		},
		body: JSON.stringify({
			"action": "getUserInfo",
			"userID": localStorage.getItem("userID"),
			"token": localStorage.getItem("userToken"),
			"requestedUserID": userID
		})
	});
	
	if (!response.ok) {
		return null;
	}
	
	let data = await response.json();
	userCache[userID] = data["user"];
	return userCache[userID];
}

function clearUserCache() {
	userCache = {};
}

async function getThreadInfo(threadID) {
	let response = await fetch(apiEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "text/plain",
		},
		body: JSON.stringify({
			"action": "getThreadInfo",
			"userID": localStorage.getItem("userID"),
			"token": localStorage.getItem("userToken"),
			"threadID": threadID
		})
	});
	
	if (!response.ok) {
		return [];
	}
	
	let data = await response.json();
	return data["thread"];
}

async function getForumInfo() {
	let response = await fetch(apiEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "text/plain",
		},
		body: JSON.stringify({
			"action": "getForumInfo",
			"userID": localStorage.getItem("userID"),
			"token": localStorage.getItem("userToken")
		})
	});
	
	if (!response.ok) {
		return [];
	}
	
	let data = await response.json();
	return data;
}

// hashes a password with 200000 iterations of PBKDF2 (SHA-512) for it to be sent to the server.
// this is done so that the user can verify that the server never even gets to see the plaintext password.
// the password is additionally salted with the username and the string "Psych'sForumSalt", meaning it'll be unique across users and other applications.
async function hashPassword(username, password) {
	let encoder = new TextEncoder();
	return String.fromCharCode.apply(
		null,
		new Uint8Array(await window.crypto.subtle.exportKey(
			"raw",
			await window.crypto.subtle.deriveKey(
				{
					"name": "PBKDF2",
					"hash": "SHA-512",
					"salt": encoder.encode(username + "Psych'sForumSalt"),
					"iterations": 200000
				},
				await window.crypto.subtle.importKey(
					"raw",
					encoder.encode(password),
					"PBKDF2",
					false,
					["deriveKey"]),
				{"name": "AES-CTR", "length": 256}, // This does not matter, the SubtleCrypto API just wants some algorithm that the resulting key "will be used for" (which is none since we're just using this as a hash)
				true,
				["encrypt"] // also doesn't matter, but Chromium doesn't like this being empty
			)
		))
	);
}