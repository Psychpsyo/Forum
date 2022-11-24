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
	cur.execute("""CREATE TABLE users(
		id INTEGER PRIMARY KEY,
		name TEXT NOT NULL,
		password TEXT NOT NULL,
		date TEXT NOT NULL,
		status TEXT,
		title TEXT
	)""")
	
	# the user's auth tokens
	cur.execute("""CREATE TABLE tokens(
		id INTEGER PRIMARY KEY,
		user INTEGER NOT NULL,
		token TEXT NOT NULL,
		date TEXT NOT NULL,
		FOREIGN KEY (user) REFERENCES users (id)
	)""")
	
	# threads that posts go into
	cur.execute("""CREATE TABLE threads(
		id INTEGER PRIMARY KEY,
		author INTEGER NOT NULL,
		name TEXT NOT NULL,
		date TEXT NOT NULL,
		lastPostDate TEXT NOT NULL,
		FOREIGN KEY (author) REFERENCES users (id)
	)""")
	
	# posts written by users
	cur.execute("""CREATE TABLE posts(
		id INTEGER PRIMARY KEY,
		thread INTEGER NOT NULL,
		author INTEGER NOT NULL,
		content TEXT NOT NULL,
		date TEXT NOT NULL,
		FOREIGN KEY (thread) REFERENCES threads (id),
		FOREIGN KEY (author) REFERENCES users (id)
	)""")
	
	# currently available invite codes
	cur.execute("""CREATE TABLE inviteCodes(
		id INTEGER PRIMARY KEY,
		code INTEGER NOT NULL
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
	token = generateTokenNoCommit(cur.lastrowid)
	con.commit()
	return (cur.lastrowid, token)

# creates a thread and returns its ID or -1 if the thread couldn't be created
def createThread(authorID, token, name, initialPostContent):
	if not isinstance(name, str) or len(name) == 0 or not authenticateToken(authorID, token):
		return -1
	cur.execute("INSERT INTO threads (author, name, date, lastPostDate) VALUES (?, ?, datetime('now'), datetime('now'))", (authorID, name))
	threadID = cur.lastrowid
	cur.execute("INSERT INTO posts (thread, author, content, date) VALUES (?, ?, ?, datetime('now'))", (threadID, authorID, initialPostContent))
	con.commit()
	return threadID

# creates a post and returns its ID or -1 if the post couldn't be created
def createPost(authorID, token, threadID, content):
	if not isinstance(content, str) or len(content) == 0 or not authenticateToken(authorID, token):
		return -1
	cur.execute("INSERT INTO posts (thread, author, content, date) VALUES (?, ?, ?, datetime('now'))", (threadID, authorID, content))
	cur.execute("UPDATE threads SET lastPostDate = datetime('now') WHERE id = ?", (threadID,))
	con.commit()
	return cur.lastrowid

# gets one page of all threads
def getThreads(userID, token, page, threadsPerPage):
	if not authenticateToken(userID, token):
		return []
	
	threads = []
	for thread in cur.execute("SELECT id, author, name, date, lastPostDate FROM threads ORDER BY lastPostDate DESC LIMIT ?, ?", (page * threadsPerPage, threadsPerPage)).fetchall():
		threadPostCount = cur.execute("SELECT COUNT(*) FROM posts WHERE thread = ?", (thread[0],)).fetchone()
		threads.append({"id": thread[0], "author": thread[1], "name": thread[2], "date": thread[3], "lastPostDate": thread[4], "postCount": threadPostCount[0]})
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
	for post in cur.execute("SELECT id, author, content, date FROM posts WHERE thread = ? ORDER BY date ASC LIMIT ?, ?", (threadID, page * postsPerPage, postsPerPage)):
		posts.append({"id": post[0], "author": post[1], "content": post[2], "date": post[3]})
	return posts

def getUserInfo(userID, token, requestedUserID):
	if not authenticateToken(userID, token):
		return None
	
	user = cur.execute("SELECT id, name, date FROM users WHERE id = ?", (requestedUserID,)).fetchone()
	userPostCount = cur.execute("SELECT COUNT(*) FROM posts WHERE author = ?", (requestedUserID,)).fetchone()
	return {"id": user[0], "name": user[1], "registrationDate": user[2], "postCount": userPostCount[0]}

def getThreadInfo(userID, token, threadID):
	if not authenticateToken(userID, token):
		return None
	
	thread = cur.execute("SELECT id, author, name, date, lastPostDate FROM threads WHERE id = ?", (threadID,)).fetchone()
	threadPostCount = cur.execute("SELECT COUNT(*) FROM posts WHERE thread = ?", (threadID,)).fetchone()
	return {"id": thread[0], "author": thread[1], "name": thread[2], "date": thread[3], "lastPostDate": thread[4], "postCount": threadPostCount[0]}

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
