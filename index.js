const express = require('express');
const port = 9000;
const router = require('./router');
const app = express();
const cors = require("cors");

app.use(express.json());
app.use(cors());
app.use(router);

app.listen(port, () => { console.log(`Server running on port ${port}`); });

/*Database connection
const mysql2 = require('mysql2'); 

const connection = mysql2.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'burgertic'
  });

  connection.connect((err) => {
    if (err) {
      console.error(err);
    } else {
      console.log(`Connected to database`);
    }
  });

module.exports = connection;
*/