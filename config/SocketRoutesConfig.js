/**
 * 현재 존해하는 방 정보들을 저장한다.
 * 방번호: [접속된 socket id]
 * @type {{}}
 * @private
 */
const _ROOMS = {};
/**
 * 현재 접속한 소켓들의 정보를 저장한다.
 * socket id: 방정보, 닉네임
 * @type {{}}
 * @private
 */
const _CLIENTS = {};

exports.init = clientSocket => {

    clientSocket.on('login', data => {
        onLogin(clientSocket, data.nickName, data.room);
    });

    clientSocket.on('disconnect', function () {
        onDisconnect(clientSocket);
    });

    clientSocket.on('sendMessage', function (data) {
        onSendMessage(clientSocket, data.message);
    });
};

function onSendMessage(socket, message) {
    if (!_CLIENTS[socket.id]) { return; }

    var clientData = _CLIENTS[socket.id];
    socket.broadcast
        .to(clientData.room)
        .emit('receiveMessage', { message, nickName: clientData.nickName });
}

function onDisconnect (socket) {
    if (!_CLIENTS[socket.id]) { return; }

    var clientData = _CLIENTS[socket.id];
    delete _CLIENTS[socket.id];

    if (!_ROOMS[clientData.room]) { return; }

    var roomId = clientData.room;
    var room = _ROOMS[roomId];
    var roomInfo = room.find(data => data.nickName === clientData.nickName);
    if (room.indexOf(roomInfo) > -1) {
        room.splice(room.indexOf(roomInfo), 1);
    }

    socket.leave(roomId);
    socket.broadcast.to(roomId).emit('userLeft', { nickName: clientData.nickName });
}

function onLogin(socket, nickName, room) {
    console.log(`client login nickName is ${nickName} rooms is ${room}`);
    if (!_ROOMS[room]) { _ROOMS[room] = []; }
    if (!_CLIENTS[socket.id]) { _CLIENTS[socket.id] = { room, nickName }; }

    _ROOMS[room].push({ nickName, socketId: socket.id });
    socket.join(room);
    socket.emit('loginSuccess', { room, nickName });

    socket.broadcast.to(room).emit('newUserLogin', { nickName });
}