const express = require('express');
const socketIO = require('socket.io');
const http = require('http');
const path = require('path');
const SocketRoutesConfig = require('./config/SocketRoutesConfig');

const app = express();
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, './views')));

app.get('/', (request, response) => {
    response.sendFile('index.html');
});

const httpServer = http.createServer(app);

httpServer.listen(3000, () => {
    console.log('http server is listen!');
});

const io = socketIO(httpServer);

io.on('connection', socket => {
    console.log('socket on connection socket :: ', socket.id);
    SocketRoutesConfig.init(socket);
});
