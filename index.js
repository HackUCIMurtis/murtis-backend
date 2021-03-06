const express = require("express");
const bodyParser = require("body-parser");
const cors = require('cors');

// environment file
require("dotenv").config();

var firebase = require("firebase/app");
require("firebase/auth");
require("firebase/firestore");

const app = express();
const port = process.env.port || 4000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());


// Load credentials from firebase
const admin = require('firebase-admin');


// Create the firebase connection
const firebaseConfig = {
    apiKey: process.env.API_KEY,
    authDomain: process.env.AUTH_DOMAIN,
    projectId: process.env.PROJECT_ID,
    storageBucket: process.env.STORAGE_BUCKET,
    messagingSenderId: process.env.MESSAGING_SENDER_ID,
    appId: process.env.APP_ID,
    measurementId: process.env.MEASUREMENT_ID
};
firebase.initializeApp(firebaseConfig);

// Initialize our DB
const db = firebase.firestore();

app.post("/login", async(req, res) =>{
    console.log("POST /login");
    try{
        firebase.auth().signInWithEmailAndPassword(req.body.email, req.body.password)
            .then((userCredential) => {
                // Signed in
                var user = userCredential.user;
                res.status(200).send(user);
            })
            .catch((error) => {
                var errorCode = error.code;
                var errorMessage = error.message;
                res.status(500).send(errorMessage)
        });

    }
    catch (e){
        res.status(500).send(e);
    }
})

app.post("/registerUser", async (req, res) => {
    console.log("POST /registerUser", req.body.email, req.body.password);
    try{
      firebase.auth().createUserWithEmailAndPassword(req.body.email, req.body.password)
        .then((userCredential) => {
          const userDoc = db.collection('users').doc(req.body.email).set({
            guides: [],
            likes: [],
            password: req.body.password
          });
          res.status(200).send("Success")
        })
        .catch((error) => {
          var errorCode = error.code;
          var errorMessage = error.message;
          console.log("Error creating user: ", errorMessage);
        });
    }
    catch (e){
        res.status(500).send(e);
    }
})

app.post("/guides", async (req, res) => {
    console.log("POST /guides");
    try {
        const userEmail = req.body.email;
        const docRef = db.collection('users').doc(userEmail);
        console.log(userEmail);
        const userSnapshot = await docRef.get();
        if (!userSnapshot.exists) {
            res.status(404).send(`user ${userEmail} doesn't exist`);
        }
        let userData = {
            guides: [],
            likes: []
        }
        const user = userSnapshot.data();
        const guidesRef = db.collection('guides');
        const guidesDocs = await guidesRef.get();
        guidesDocs.forEach(doc => {
            if (user.guides.includes(doc.id)) {
                userData.guides.push(doc.data());
            }
            if (user.likes.includes(doc.id)) {
                userData.likes.push(doc.data());
            }
        })
        console.log(userData);
        res.status(200).send(userData);

    } catch (e) {
        res.status(500).send(e);
    }
});


app.post("/search", async (req, res) => {
    console.log("GET /search");
    try {
        const keyword = req.body.keyword;
        const email = req.body.email;
        console.log("email", email);
        console.log("querying", keyword);
        const docRef = db.collection('guides');
        const guidesDocs = await docRef.get();
        let guides = [];
        let links = {};
        guidesDocs.forEach(doc => {
            let guide = {
                uuid: doc.id,
                data: doc.data()
            };
            console.log(guide);
            if (guide.data.title.toLowerCase().includes(keyword.toLowerCase())) {
                guides.push(guide);
            }
        });
        if (guides.length === 0) {
            res.status(400).send(`No guides found with query ${keyword}`);
        } else {
            res.status(200).json(guides);
        }
    } catch (e) {
        res.status(500).send(e);
    }
});



app.post("/createLink", async (req, res) => {
    try {
        const groupsDoc = db.collection('guides');
        const doc = await groupsDoc
            .add(req.query)
            .then(guide => {
                console.log("Successfully created guide.");
                return guide;
            })
            .catch(err => {
                console.log(err);
            })
        const userDoc = db.collection('users').doc(req.query.creator);
        const userSnapshot = await userDoc.get();
        const { guides } = userSnapshot.data();
        const unionRes = await userDoc.set({
            guides: [...guides, doc.id]
        });
        res.status(200).send({id: doc.id});
    } catch (e) {
        console.log(e);
        res.status(500).send(e);
    }
});


app.post("/likeGuide", async (req, res) => {
    try {
        const docRef = db.collection('users').doc(req.query.email);
        const userSnapshot = await docRef.get();
        const { likes } = userSnapshot.data();
        const unionRes = await docRef.set({
            likes: [...likes, req.query.uuid]
        });
        res.status(200).send({id: req.query.uuid});
    } catch (e) {
        res.status(500).send(e);
    }
})


app.listen(port, () => {
    console.log(`Murtis API listening on port ${port}`);
})
