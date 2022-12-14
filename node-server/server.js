import express from "express";
import morgan from "morgan";
import { collection, getDocs, addDoc, setDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "./config";

// import globalRouter from "./routers/globalRouter.js";
const cors = require("cors");
const PORT = 4004 || process.env.PORT;
const app = express();
const logger = morgan("dev");
const usersCollectionRef = collection(db, "users");
const path = require('path');
const axios = require("axios");

app.set("view engine", "html");
// app.set("views", process.cwd() + "/src/views");
app.use(express.json());
app.use(cors());
app.use(logger);
app.use('/', express.static(path.join(__dirname, 'views')));


//Create new user POST msg
app.post("/create", async (req, res) => {
  const data = req.body;
  if (!req.body.UID) {
    return res.status(400).json({
      status: "error",
      error: "Please provide a valid data",
    });
  } else {
    console.log("Data of users:", data);
    const user = getDoc
    await addDoc(usersCollectionRef, { UID: data.UID, password: data.password, faceid: data.faceid });
    res.send("Creat new ID :" + data.UID);

    return res.status(200).json({
      status: "success",
    });
  }
});

//UPDATE user POST msg
app.post("/update", async (req, res) => {
  const id = req.body.id;
  if (!req.body) {
    return res.status(400).json({
      status: "error",
      error: "Please provide a valid data",
    });
  }
  res.status(200).json({
    status: "success",
    id: id,
  });
  console.log("Before deleting ID", req.body);
  delete req.body.id;
  console.log("After deleting ID", req.body);
  const data = req.body;
  await updateDoc(doc(db, "users", id), data);
  res.send({ msg: "User Updated!" });
});

//DELETE user POST msg
app.post("/delete", async (req, res) => {
  const id = req.body.id;
  if (!req.body) {
    return res.status(400).json({
      status: "error",
      error: "Please provide a valid data",
    });
  }
  res.status(200).json({
    status: "success",
    id: id,
  });

  await deleteDoc(doc(db, "users", id));
  res.send({ msg: "User Deleted!" });
});

//?????? ?????? POST : /signup
//????????? UID??? password??? ????????????, firebase??? ????????????, ??? UID??? ?????? ???????????? ????????? ??????
//data = {UID: "inputuid"}
//????????? UID ?????????, ?????? ????????? ??????
app.post("/signup", async (req, res) => {
  const data = req.body;
  const snapshot = await getDocs(usersCollectionRef);
  const uidList = snapshot.docs.map((doc) => doc.data().UID); // UID traceback
  console.log(uidList);

  if (uidList.includes(data.UID)) {
    return res.status(400).json({
      status: "error",
      error: "????????? UID?????????. ?????? UID??? ??????????????????.",
    });
  } else {
    const docRef = doc(db, "users", data.UID);
    await setDoc(docRef, { UID: data.UID, password: data.password });
    const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })); // data traceback

    return res.status(200).json({
      status: "success",
      data: data,
      list: list,
    });
  }
});

//?????? ?????? POST : /faceid
//UID(string)??? faceid(??????) request??? ?????????, firebase??? ????????????, ??? UID??? ?????? ???????????? ????????? ??????
//????????? ???????????? ?????? faceid list??? ????????? ?????????.
app.post("/faceid", async (req, res, next) => {
  const data = req.body;
  console.log(data.UID, data.password);
  const snapshot = await getDocs(usersCollectionRef);
  const uidList = snapshot.docs.map((doc) => doc.data().UID); // UID traceback
  var matched = false;
  if (uidList.includes(data.UID)) {
    snapshot.docs.map((doc) => {
      if (doc.data().UID === data.UID && doc.data().password === data.password) {
        if (doc.data().password === data.password) { 
          matched = true;
        }
      } 
    });
  } else {
    return res.status(400).json({
      status: "error",
      error: "??????????????? ?????? ????????????.",
    }); // UID??? ?????? ???
  }
  if (matched) {
    try{
      const response = await axios.get(`http://127.0.0.1:5000/register/${data.UID}`);
      console.log(response.data.result);
      if (response.data.result == '1') {
        return res.status(200).json({
          status: "success",
          message: "Face ID??? ??????????????? ??????????????????."
        })
      } else {
        return res.status(400).json({
          status: "error",
          error: "Face ID ????????? ??????????????????."
        })
      }
    }
    catch(error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        error: error,
      })
    }
  } else {
    return res.status(400).json({
      status: "error",
      error: "?????? ????????? ???????????? ????????????.",
    });
  }
});

//?????? ?????? POST : /faceauth
//??????????????? 200, ????????? 400
//data = {UID: "inputUid", faceid: InputFaceidEmbbedingVector}
app.post("/faceauth", async (req, res) => {
  const data = req.body;
  const snapshot = await getDocs(usersCollectionRef);
  const uidList = snapshot.docs.map((doc) => doc.data().UID); // UID traceback
  var flag = false;
  if (uidList.includes(data.UID)) {
    const userID = data.UID;
    try {
      const response = await axios.get(`http://127.0.0.1:5000/verify/${userID}`)
      console.log(response.data);
      if (response.data.result === '2') {
        return res.status(401).json({
          status: "error",
          error: "Face ID??? ?????? ??????????????????."
        })
      } else if (response.data.result ==='1') {
        flag = true;
      }

      if (flag) {
        return res.status(200).json({
          status: "success",
          data: data,
        });
      } else {
        return res.status(401).json({
          status: "error",
          error: "Face ID??? ???????????? ????????????.",
        });
      }
    } catch (err) {
      console.log(err);
      return res.status(400).json({
        status: "error",
        error: err,
      })
    }
  }
  return res.status(400).json({
    status: "error",
    error: "??????????????? ?????? ????????????.",
  });
});

//????????? POST msg : /login
//UID??? password??? ???????????? 200, ???????????? ????????? 400
app.post("/login", async (req, res, next) => {
  const data = req.body;
  const snapshot = await getDocs(usersCollectionRef);
  const uidList = snapshot.docs.map((doc) => doc.data().UID); // UID traceback
  if (uidList.includes(data.UID)) {
    snapshot.docs.map((doc) => {
      if (doc.data().UID === data.UID) {
        if (doc.data().password === data.password) {
          console.log("login success");
          return res.status(200).json({
            status: "success",
            data: data
          })
        } else {
          return res.status(400).json({
            status: "error",
            error: "??????????????? ???????????? ????????????.",
          });
        }
      }
    });
  } else {
    return res.status(400).json({
      status: "error",
      error: "??????????????? ?????? ????????????.",
    }); // UID??? ?????? ???
  }
});

app.get("/", async (req, res) => {
  const snapshot = await getDocs(usersCollectionRef);
  const ids = snapshot.docs.map((doc) => doc.id); // id traceback
  console.log(ids);
  const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })); // data traceback
  res.sendFile(path.join(__dirname, '../react-app/build/index.html'))
});

const handleListening = () => console.log(`server listening on port http://localhost:${PORT} ????`);

app.listen(PORT, handleListening);
