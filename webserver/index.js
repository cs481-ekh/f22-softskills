/* Express configuration */
const express = require('express');
const app = express();
const port = 3000;
app.get('/', function(req, res) {
  res.send('<h1> Drive Permission Manager </h1>');
});
app.listen(port , () => console.log('App listening on port ' + port));