const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "goodreads.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// Get Books API
app.get("/books/", (request, response) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid Access Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.send("Invalid Access Token");
      } else {
        const getBooksQuery = `
            SELECT
              *
            FROM
             book
            ORDER BY
              book_id;`;
        const booksArray = await db.all(getBooksQuery);
        response.send(booksArray);
      }
    });
  }
});

//create user API
app.post("/users/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashPassword = await bcrypt.hash(password, 5);
  const selectUserQuery = `select * from user where username='${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    console.log("new user added");
    const newUser = ` 
    insert into user(username, name, password, gender, location)
    values(
        '${username}', '${name}', '${hashPassword}', '${gender}', '${location}'
    );`;
    await db.run(newUser);
    response.send("user created successfully");
  } else {
    response.status(400);
    response.send("user name already exited");
  }
});

//login user api

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `select * from user where username='${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("user undefined");
  } else {
    const isPassword = await bcrypt.compare(password, dbUser.password);
    if (isPassword === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "siva");
      response.send({ jwtToken });
      response.send("user successfully logined");
    } else {
      response.send(400);
      response.send("user password is incorrect");
    }
  }
});
