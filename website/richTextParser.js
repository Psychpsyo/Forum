// the main function you should use from this file
function fillWithRichHTML(targetElement, text) {
	for (const elem of toRichHtmlElements(text)) {
		targetElement.appendChild(elem);
	}
}

let replacementRules = [
	{ // text formatting
		"regex": /(((?<!\\)[\*'~_|`]{2})[^]+?\2)/g,
		"overshoot": 1,
		"replacer": function(input, overshootMatches) {
			let elem = document.createElement("div");
			input = input.substring(overshootMatches[0].length, input.length - overshootMatches[0].length);
			if (overshootMatches[0] != "``") {
				for (const section of toRichHtmlElements(input)) {
					elem.appendChild(section);
				}
			}
			switch (overshootMatches[0]) {
				case "**":
					elem.classList.add("postBold");
					break;
				case "''":
					elem.classList.add("postItalics");
					break;
				case "~~":
					elem.classList.add("postStrikethrough");
					break;
				case "__":
					elem.classList.add("postUnderlined");
					break;
				case "||":
					elem.classList.add("postHidden");
					let elemCover = document.createElement("div");
					elemCover.classList.add("postHiddenCover");
					elemCover.addEventListener("click", function() {
						this.remove();
					});
					elem.appendChild(elemCover);
					break;
				case "``":
					// undo all the styling that was done in this
					elem.textContent = input;
					elem.classList.add("postCodeblock");
					break;
			}
			return elem;
		}
	},
	{ // escaped text formatting
		"regex": /(\\[\*'~_|`]{2})/g,
		"overshoot": 0,
		"replacer": function(input, overshootMatches) {
			return document.createTextNode(input.substring(1));
		}
	},
	{ // [hr] to <hr> elements (can eat a newline before and after)
		"regex": /(\n?\[hr\]\n?)/g,
		"overshoot": 0,
		"replacer": function(input, overshootMatches) {
			return document.createElement("hr");
		}
	},
	{ // newlines to <br> elements
		"regex": /(\n)/g,
		"overshoot": 0,
		"replacer": function(input, overshootMatches) {
			return document.createElement("br");
		}
	},
	{ // images
		"regex": /(\[img=https?:\/\/\S+?\])/g,
		"overshoot": 0,
		"replacer": function(input, overshootMatches) {
			input = input.substring(5, input.length - 1);
			let elem = document.createElement("img");
			elem.src = input;
			elem.classList.add("postImage");
			return elem;
		}
	},
	{ // youtube videos
		"regex": /(\[vid=https:\/\/(www\.youtube\.com\/watch\?v=|youtu\.be\/)\S+?\])/g,
		"overshoot": 1,
		"replacer": function(input, overshootMatches) {
			input = input.substring(5, input.length - 1);
			input = input.replace(overshootMatches[0], "www.youtube-nocookie.com/embed/");
			// trims off all extra query parameters
			if (input.indexOf("&") != -1) {
				input = input.substring(0, input.indexOf("&"));
			}
			let elem = document.createElement("iframe");
			elem.src = input;
			elem.classList.add("postYoutubeVideo");
			elem.setAttribute("frameborder", "0");
			elem.setAttribute("allowfullScreen", "");
			return elem;
		}
	},
	{ // regular http/https weblinks
		"regex": /(https?:\/\/\S+)/g,
		"overshoot": 0,
		"replacer": function(input, overshootMatches) {
			let elem = document.createElement("a");
			elem.textContent = input;
			elem.href = input;
			elem.target = "_blank";
			return elem;
		}
	},
	{ // @ handles to actual user links
		"regex": /(@<\d+>)/g,
		"overshoot": 0,
		"replacer": function(input, overshootMatches) {
			let elem = document.createElement("a");
			let userID = parseInt(input.substring(2, input.length - 1));
			getUserInfo(userID).then(user => {
				elem.textContent = user? "@" + user.name : "Invalid User";
			});
			elem.dataset.userId = userID;
			elem.addEventListener("click", userNameClicked);
			return elem;
		}
	},
	{ // # handles to post links
		"regex": /(#<\d+>)/g,
		"overshoot": 0,
		"replacer": function(input, overshootMatches) {
			let elem = document.createElement("a");
			let postID = parseInt(input.substring(2, input.length - 1));
			elem.textContent = "#" + ("" + postID).padStart(5, "0");
			elem.dataset.postId = postID;
			elem.addEventListener("click", function() {
				showPost(parseInt(this.dataset.postId));
			});
			return elem;
		}
	},
	{ // # handles for thread links
		"regex": /(#\[\d+\])/g,
		"overshoot": 0,
		"replacer": function(input, overshootMatches) {
			let elem = document.createElement("a");
			let threadID = parseInt(input.substring(2, input.length - 1));
			getThreadInfo(threadID).then(thread => {
				elem.textContent = thread? "#" + thread.name : "Invalid Thread";
			});
			elem.dataset.threadId = threadID;
			elem.addEventListener("click", function() {
				showThread(parseInt(this.dataset.threadId), 0);
			});
			return elem;
			//invalid syntax cause I need to work on this more!!!
		}
	}
]

function* toRichHtmlElements(text, ruleIndex = 0) {
	if (ruleIndex >= replacementRules.length) {
		yield document.createTextNode(text);
		return;
	}
	
	let rule = replacementRules[ruleIndex];
	let sections = text.split(rule.regex);
	for (let i = 0; i < sections.length; i++) {
		if (i % (2 + rule.overshoot) == 0) {
			for (let section of toRichHtmlElements(sections[i], ruleIndex + 1)) {
				yield section;
			}
		} else if (i % (2 + rule.overshoot) == 1) {
			yield rule.replacer(sections[i], sections.slice(i + 1, i + 1 + rule.overshoot));
		}
	}
}