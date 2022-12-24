import bcrypt
import sqlite3
import secrets
from datetime import datetime
import base64

# database connection
con = sqlite3.connect("database.db", check_same_thread = False)
cur = con.cursor()

# Initializes the Database
def init():
	# users with accounts
	cur.execute("""CREATE TABLE IF NOT EXISTS users(
		id INTEGER PRIMARY KEY,
		name TEXT NOT NULL,
		password TEXT NOT NULL,
		date TEXT NOT NULL,
		status TEXT,
		title TEXT
	)""")
	
	# the user's auth tokens
	cur.execute("""CREATE TABLE IF NOT EXISTS tokens(
		id INTEGER PRIMARY KEY,
		user INTEGER NOT NULL,
		token TEXT NOT NULL,
		date TEXT NOT NULL,
		FOREIGN KEY (user) REFERENCES users (id)
	)""")
	
	# threads that posts go into
	cur.execute("""CREATE TABLE IF NOT EXISTS threads(
		id INTEGER PRIMARY KEY,
		author INTEGER NOT NULL,
		name TEXT NOT NULL,
		date TEXT NOT NULL,
		lastPostDate TEXT NOT NULL,
		FOREIGN KEY (author) REFERENCES users (id)
	)""")
	
	# posts written by users
	cur.execute("""CREATE TABLE IF NOT EXISTS posts(
		id INTEGER PRIMARY KEY,
		thread INTEGER NOT NULL,
		author INTEGER NOT NULL,
		content TEXT NOT NULL,
		date TEXT NOT NULL,
		lastEdited TEXT,
		FOREIGN KEY (thread) REFERENCES threads (id),
		FOREIGN KEY (author) REFERENCES users (id)
	)""")
	
	# currently available invite codes
	cur.execute("""CREATE TABLE IF NOT EXISTS inviteCodes(
		id INTEGER PRIMARY KEY,
		code INTEGER NOT NULL
	)""")
	
	# user thread subscriptions
	cur.execute("""CREATE TABLE IF NOT EXISTS threadSubscriptions(
		id INTEGER PRIMARY KEY,
		thread INTEGER NOT NULL,
		user INTEGER NOT NULL,
		FOREIGN KEY (thread) REFERENCES threads (id) ON DELETE CASCADE,
		FOREIGN KEY (user) REFERENCES users (id) ON DELETE CASCADE
	)""")
	
	# user post notifications
	cur.execute("""CREATE TABLE IF NOT EXISTS postNotifications(
		id INTEGER PRIMARY KEY,
		post INTEGER NOT NULL,
		user INTEGER NOT NULL,
		reason TEXT NOT NULL,
		FOREIGN KEY (post) REFERENCES posts (id) ON DELETE CASCADE,
		FOREIGN KEY (user) REFERENCES users (id) ON DELETE CASCADE
	)""")
	
	con.commit()

# generates an invite code on behalf of a user and returns that code or empty string if it could not be generated
def generateInviteCode(code):
	if not isinstance(code, str) or len(code) == 0:
		return ""
	
	cur.execute("INSERT INTO inviteCodes (code) VALUES (?)", (code,))
	con.commit()
	return code

def generateTokenNoCommit(forUserID):
	token = base64.b64encode(secrets.token_bytes()).decode("ascii")
	cur.execute("INSERT INTO tokens (user, token, date) VALUES (?, ?, datetime('now'))", (forUserID, token))
	return token

# takes a username and unencrypted password and returns the user's ID and initial token as a tuple (or -1 and "" if the user couldn't be inserted)
def createUser(name, password, inviteCode):
	name = name[:100]
	if not isinstance(name, str) or len(name) == 0 or not isinstance(password, str) or len(password) == 0:
		return (-1, None)
	# check if a user with that name already exists
	existingUser = cur.execute("SELECT id FROM users WHERE name = ?", (name,)).fetchone()
	if existingUser != None:
		return (-1, None)
	
	# use up the invite code
	if cur.execute("DELETE FROM inviteCodes WHERE code = ?", (inviteCode,)).rowcount == 0:
		return (-1, None)
	
	password = bcrypt.hashpw(password.encode("utf8"), bcrypt.gensalt())
	cur.execute("INSERT INTO users (name, password, date) VALUES (?, ?, datetime('now'))", (name, password))
	userID = cur.lastrowid
	token = generateTokenNoCommit(userID)
	con.commit()
	return (userID, token)

# creates a thread and returns its ID or -1 if the thread couldn't be created
def createThread(authorID, token, name, initialPostContent):
	name = name[:100]
	if not isinstance(name, str) or len(name) == 0 or not authenticateToken(authorID, token):
		return -1
	cur.execute("INSERT INTO threads (author, name, date, lastPostDate) VALUES (?, ?, datetime('now'), datetime('now'))", (authorID, name))
	threadID = cur.lastrowid
	cur.execute("INSERT INTO posts (thread, author, content, date) VALUES (?, ?, ?, datetime('now'))", (threadID, authorID, initialPostContent))
	con.commit()
	return threadID

# creates a post and returns its ID or -1 if the post couldn't be created
def createPost(authorID, token, threadID, content):
	if not isinstance(content, str) or len(content) == 0 or len(content) > 8000 or not authenticateToken(authorID, token):
		return -1
	cur.execute("INSERT INTO posts (thread, author, content, date) VALUES (?, ?, ?, datetime('now'))", (threadID, authorID, content))
	postID = cur.lastrowid
	cur.execute("UPDATE threads SET lastPostDate = datetime('now') WHERE id = ?", (threadID,))
	cur.execute("INSERT INTO postNotifications (post, user, reason) SELECT ?, user, 'newInSubscribedThread' FROM threadSubscriptions WHERE thread = ? AND user != ?", (postID, threadID, authorID))
	con.commit()
	return postID

# attempts to delete a post on behalf of a user and returns whether or not it succeeded
def deletePost(userID, token, postID):
	if not authenticateToken(userID, token):
		return False
	
	deleted = cur.execute("DELETE FROM posts WHERE id = ? AND author = ? ", (postID, userID)).rowcount > 0
	con.commit()
	return deleted

# updates the body of a post and returns whether or not it succeeded
def editPost(userID, token, postID, newContent):
	if not isinstance(newContent, str) or len(newContent) == 0 or len(newContent) > 8000 or not authenticateToken(userID, token):
		return False
	
	edited = cur.execute("UPDATE posts SET content = ?, lastEdited = datetime('now') WHERE id = ? AND author = ?", (newContent, postID, userID)).rowcount > 0
	con.commit()
	return edited

# gets one page of all threads
def getThreads(userID, token, page, threadsPerPage):
	if not authenticateToken(userID, token):
		return []
	
	threads = []
	for thread in cur.execute("SELECT id, author, name, date, lastPostDate FROM threads ORDER BY lastPostDate DESC LIMIT ?, ?", (page * threadsPerPage, threadsPerPage)).fetchall():
		threadPostCount = cur.execute("SELECT COUNT(*) FROM posts WHERE thread = ?", (thread[0],)).fetchone()
		lastPost = cur.execute("SELECT id, author, content, date, lastEdited FROM posts WHERE thread = ? ORDER BY date DESC, id DESC", (thread[0],)).fetchone()
		threads.append({"id": thread[0], "author": thread[1], "name": thread[2], "date": thread[3], "lastPostDate": thread[4], "postCount": threadPostCount[0], "lastPost": {"id": lastPost[0], "author": lastPost[1], "content": lastPost[2], "date": lastPost[3], "lastEdited": lastPost[4]}})
	return threads

# gets the total number of threads on the forum
def getThreadCount(userID, token):
	if not authenticateToken(userID, token):
		return 0
	
	return cur.execute("SELECT COUNT(*) FROM threads", ()).fetchone()[0]

# gets one page of posts from a thread
def getPosts(userID, token, threadID, page, postsPerPage):
	if not authenticateToken(userID, token):
		return []
	
	posts = []
	for post in cur.execute("SELECT id, author, content, date, lastEdited FROM posts WHERE thread = ? ORDER BY date, id LIMIT ?, ?", (threadID, page * postsPerPage, postsPerPage)):
		posts.append({"id": post[0], "author": post[1], "content": post[2], "date": post[3], "lastEdited": post[4]})
	return posts

# gets one page of posts of a user
def getUserPosts(userID, token, requestedUserID, page, postsPerPage):
	if not authenticateToken(userID, token):
		return []
	
	posts = []
	for post in cur.execute("SELECT id, author, content, date, lastEdited FROM posts WHERE author = ? ORDER BY date DESC, id DESC LIMIT ?, ?", (requestedUserID, page * postsPerPage, postsPerPage)):
		posts.append({"id": post[0], "author": post[1], "content": post[2], "date": post[3], "lastEdited": post[4]})
	return posts

def getPostLocation(userID, token, postID):
	if not authenticateToken(userID, token):
		return None
	
	thread = cur.execute("SELECT thread FROM posts WHERE id = ?", (postID,)).fetchone()
	postIndex = cur.execute("SELECT count(*) FROM posts WHERE thread = ? AND (date < (SELECT date FROM posts WHERE id = ?) OR id < ?)", (thread[0], postID, postID)).fetchone()
	return {"thread": thread[0], "index": postIndex[0]}

def getUserInfo(userID, token, requestedUserID):
	if not authenticateToken(userID, token):
		return None
	
	user = cur.execute("SELECT id, name, date FROM users WHERE id = ?", (requestedUserID,)).fetchone()
	userPostCount = cur.execute("SELECT COUNT(*) FROM posts WHERE author = ?", (requestedUserID,)).fetchone()
	return {"id": user[0], "name": user[1], "registrationDate": user[2], "postCount": userPostCount[0]}

def getForumInfo(userID, token):
	newestUserID = cur.execute("SELECT id FROM users ORDER BY date DESC", ()).fetchone()
	if newestUserID == None:
		return None
	
	return {
		"newestUser": newestUserID[0],
		"userCount": cur.execute("SELECT COUNT(*) FROM users", ()).fetchone()[0],
		"postCount": cur.execute("SELECT COUNT(*) FROM posts", ()).fetchone()[0],
		"threadCount": cur.execute("SELECT COUNT(*) FROM threads", ()).fetchone()[0]
	}

def getThreadInfo(userID, token, threadID):
	if not authenticateToken(userID, token):
		return None
	
	thread = cur.execute("SELECT id, author, name, date, lastPostDate FROM threads WHERE id = ?", (threadID,)).fetchone()
	threadPostCount = cur.execute("SELECT COUNT(*) FROM posts WHERE thread = ?", (threadID,)).fetchone()
	lastPost = cur.execute("SELECT id, author, content, date, lastEdited FROM posts WHERE thread = ? ORDER BY date DESC, id DESC", (threadID,)).fetchone()
	return {"id": thread[0], "author": thread[1], "name": thread[2], "date": thread[3], "lastPostDate": thread[4], "postCount": threadPostCount[0], "lastPost": {"id": lastPost[0], "author": lastPost[1], "content": lastPost[2], "date": lastPost[3], "lastEdited": lastPost[4]}}

def subscribeToThread(userID, token, threadID):
	if not authenticateToken(userID, token):
		return False
	
	if cur.execute("SELECT COUNT(*) FROM threadSubscriptions WHERE user = ? AND thread = ? ", (userID, threadID)).fetchone()[0] > 0:
		return False
	
	subscribed = cur.execute("INSERT INTO threadSubscriptions (thread, user) VALUES (?, ?)", (threadID, userID)).rowcount > 0
	con.commit()
	return subscribed

def unsubscribeFromThread(userID, token, threadID):
	if not authenticateToken(userID, token):
		return False
	
	unsubscribed = cur.execute("DELETE FROM threadSubscriptions WHERE user = ? AND thread = ? ", (userID, threadID)).rowcount > 0
	con.commit()
	return unsubscribed

def getNotificationCount(userID, token):
	if not authenticateToken(userID, token):
		return 0
	
	count = cur.execute("SELECT COUNT(*) FROM postNotifications WHERE user = ?", (userID,)).fetchone()
	return count[0]

def getNotifications(userID, token, page, postsPerPage):
	if not authenticateToken(userID, token):
		return []
	
	notifications = []
	for notification in cur.execute("SELECT posts.id, author, content, date, lastEdited, postNotifications.id, reason FROM postNotifications INNER JOIN posts on post = posts.id WHERE user = ? ORDER BY date DESC, posts.id DESC LIMIT ?, ?", (userID, page * postsPerPage, postsPerPage)):
		notifications.append({
			"post": {"id": notification[0], "author": notification[1], "content": notification[2], "date": notification[3], "lastEdited": notification[4]},
			"id": notification[5],
			"reason": notification[6]
		})
	
	return notifications

# attempts to remove a notification on behalf of a user and returns whether or not it succeeded
def removeNotification(userID, token, notificationID):
	if not authenticateToken(userID, token):
		return False
	
	removed = cur.execute("DELETE FROM postNotifications WHERE id = ? AND user = ? ", (notificationID, userID)).rowcount > 0
	con.commit()
	return removed

# deletes a given token from the DB
def invalidateToken(userID, token):
	cur.execute("DELETE FROM tokens WHERE user = ? AND token = ?", (userID, token))
	con.commit()

# gets a user's token and their ID, for logging in
def getTokenAndID(username, password):
	userID = cur.execute("SELECT id FROM users WHERE name = ?", (username,)).fetchone()
	if userID == None or not authenticatePassword(userID[0], password):
		return (-1, "")
	
	token = generateTokenNoCommit(userID[0])
	con.commit()
	return (userID[0], token)

# given a user's ID and a token, returns True if the given token belongs to that user and False if it doesn't or the user does not exist.
def authenticateToken(userID, token):
	userToken = cur.execute("SELECT token FROM tokens WHERE user = ? AND token = ?", (userID, token)).fetchone()
	if userToken is None:
		return False
	return userToken[0] == token

# given a user's ID and a password, returns True if the given password belongs to that user and False if it doesn't or the user does not exist.
def authenticatePassword(userID, password):
	hashedPassword = cur.execute("SELECT password FROM users WHERE id = ?", (userID,)).fetchone()
	if hashedPassword is None:
		return False
	return bcrypt.checkpw(password.encode("utf8"), hashedPassword[0])
