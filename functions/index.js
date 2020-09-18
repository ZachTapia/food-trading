const functions = require("firebase-functions");

// require in firebase-admin
const admin = require("firebase-admin");
admin.initializeApp();

// require in express
const express = require("express");
const app = express();

app.get("/posts", async (req, res) => {
  try {
    const querySnapshot = await admin
      .firestore()
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

app.post("/post", async (req, res) => {
  req.method !== "POST"
    ? res.status(400).json({ error: "must be POST request" })
    : null;

  // Create new post
  const newPost = {
    body: req.body.body,
    username: req.body.username,
    createdAt: new Date().toISOString()
  };

  // Add to firebase
  try {
    const querySnapshot = await admin
      .firestore()
      .collection("posts")
      .add(newPost);
    res.json({ message: `document ${querySnapshot.id} created successfully` });
  } catch (err) {
    res.status(500).json({ error: "something went wrong" });
    console.error(err);
  }
});

// Configure firebase to use express app
exports.api = functions.https.onRequest(app);
