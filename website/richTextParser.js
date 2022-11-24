let replacementRules = [
	{ // [hr] to <hr> elements (can eat a newline before and after)
		"regex": new RegExp("(\n?\\[hr\\]\n?)", "g"),
		"replacer": function(input) {
			return document.createElement("hr");
		}
	},
	{ // newlines to <br> elements
		"regex": new RegExp("(\n)", "g"),
		"replacer": function(input) {
			return document.createElement("br");
		}
	},
	{ // images
		"regex": new RegExp("(\\[img=https?:\/\/\\S+\\])", "g"),
		"replacer": function(input) {
			input = input.substring(5, input.length - 1);
			let elem = document.createElement("img");
			elem.src = input;
			elem.classList.add("postImage");
			return elem;
		}
	},
	{ // youtube videos
		"regex": new RegExp("(\\[vid=https:\/\/www\.youtube\.com\/watch\\?v=\\S+\\])", "g"),
		"replacer": function(input) {
			input = input.substring(5, input.length - 1);
			input = input.replace("youtube.com/watch?v=", "youtube-nocookie.com/embed/");
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
		"regex": new RegExp("(https?:\/\/\\S+)", "g"),
		"replacer": function(input) {
			let elem = document.createElement("a");
			elem.textContent = input;
			elem.href = input;
			elem.target = "_blank";
			return elem;
		}
	},
	{ // @ handles to actual user links
		"regex": new RegExp("(@<\\d+>)", "g"),
		"replacer": function(input) {
			let elem = document.createElement("a");
			let userID = parseInt(input.substring(2, input.length - 1));
			getUserInfo(userID).then(user => {
				elem.textContent = user? "@" + user.name : "Invalid User";
			})
			elem.dataset.userId = userID;
			elem.addEventListener("click", userNameClicked);
			return elem;
		}
	}
]

function* toRichHtmlElements(text, ruleIndex = 0) {
	if (ruleIndex >= replacementRules.length) {
		yield document.createTextNode(text);
		return;
	}
	
	let sections = text.split(replacementRules[ruleIndex].regex);
	for (let i = 0; i < sections.length; i++) {
		if (i % 2 == 1) {
			yield replacementRules[ruleIndex].replacer(sections[i]);
		} else {
			for (let section of toRichHtmlElements(sections[i], ruleIndex + 1)) {
				yield section;
			}
		}
	}
}