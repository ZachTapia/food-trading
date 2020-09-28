const keys = require("../keys");
const { isEmpty, isEmail } = require("./utils");
const functions = require("firebase-functions");

// require in firebase-admin
const admin = require("firebase-admin");
admin.initializeApp();

// assign firestore
const db = admin.firestore();

// require in express
const express = require("express");
const app = express();

// require in firebase
const firebase = require("firebase");
const firebaseConfig = {
  apiKey: keys.API_KEY,
  authDomain: "food-trading-9a7e0.firebaseapp.com",
  databaseURL: "https://food-trading-9a7e0.firebaseio.com",
  projectId: "food-trading-9a7e0",
  storageBucket: "food-trading-9a7e0.appspot.com",
  messagingSenderId: "10032118147",
  appId: "1:10032118147:web:f4ed9ed70ddb824bed1eb6",
  measurementId: "G-FT7BKVZ13E"
};
firebase.initializeApp(firebaseConfig);

// Get all posts route
app.get("/posts", async (req, res) => {
  try {
    const querySnapshot = await db
      .collection("posts")
      .orderBy("createdAt", "desc")
      .get();
    const posts = [];

    querySnapshot.forEach((document) => {
      posts.push({
        postId: document.id,
        body: document.data().body,
        username: document.data().username,
        createdAt: document.data().createdAt
      });
    });

    return res.json(posts);
  } catch (err) {
    res.status(500).json({ error: "something went wrong" });
    console.error(err);
  }
});

// Create new post route
app.post("/post", async (req, res) => {
  // New post object
  const newPost = {
    body: req.body.body,
    username: req.body.username,
    createdAt: new Date().toISOString()
  };

  // Add to firebase
  try {
    const querySnapshot = await db.collection("posts").add(newPost);
    res.json({ message: `document ${querySnapshot.id} created successfully` });
  } catch (err) {
    res.status(500).json({ error: "something went wrong" });
    console.error(err);
  }
});

// Signup route
app.post("/signup", async (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    username: req.body.username
  };

  // Validate user fields
  const errors = {};

  if (isEmpty(newUser.email)) {
    errors.email = "Must not be empty";
  } else if (!isEmail(newUser.email)) {
    errors.email = "Must be a valid email address";
  }

  if (isEmpty(newUser.password)) {
    errors.password = "Must not be empty";
  }
  if (newUser.password !== newUser.confirmPassword) {
    errors.password = "Passwords must match";
  }
  if (isEmpty(newUser.username)) {
    errors.username = "Must not be empty";
  }

  if (Object.keys(errors).length > 0) return res.status(400).json(errors);

  // Check to see if username is already taken
  const usernameCheck = await db.doc(`users/${newUser.username}`).get();
  if (usernameCheck.exists) {
    return res
      .status(400)
      .json({ username: "this username has already been taken" });
  } else {
    try {
      // Create user
      const userCredential = await firebase
        .auth()
        .createUserWithEmailAndPassword(newUser.email, newUser.password);

      // Get token
      const userIdToken = await userCredential.user.getIdToken();

      const userObject = {
        username: newUser.username,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        userId: userCredential.user.uid
      };

      // Add copy of user to db
      await db.doc(`/users/${newUser.username}`).set(userObject);
      return res.status(201).json({ token: userIdToken });
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        return res.status(400).json({ email: "Email is already taken" });
      } else {
        return res.status(500).json({ error: err.code });
      }
    }
  }
});

// Login Route
app.post("/login", async (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password
  };

  let errors = {};

  // Validate
  if (isEmpty(user.email)) {
    errors.email = "Must not be empty";
  }
  if (isEmpty(user.password)) {
    errors.password = "Must not be empty";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json(errors);
  }

  try {
    const userCredential = await firebase
      .auth()
      .signInWithEmailAndPassword(user.email, user.password);
    const token = await userCredential.user.getIdToken();
    return res.json(token);
  } catch (err) {
    console.error(err);
    if (err.code === "auth/wrong-password") {
      return res.status(403).json({ general: "Wrong credentials" });
    }
    return res.status(500).json({ err: err.code });
  }
});

// Configure firebase to use express app
exports.api = functions.https.onRequest(app);
