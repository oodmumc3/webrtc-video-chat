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

/**
 * 모니터링과 관련된 socket id들을 저장한다.
 * @type {*[]}
 * @private
 */
const _MONITORING_SOCKETS = [];

/**
 * 일반 채팅방과 겹치지 않도록 채팅방 명을 난해하게 설정한다.
 * @type {string}
 * @private
 */
const _MONITORING_ROOM_NAME = '!!__MONITORING__!!';

exports.init = clientSocket => {

    clientSocket.on('login', data => {
        onLogin(clientSocket, data.nickName, data.room);
    });

    clientSocket.on('disconnect', function () {
        if (_MONITORING_SOCKETS.includes(clientSocket.id)) {
            onMonitoringDisconnect(clientSocket);
        } else {
            onDisconnect(clientSocket);
        }
    });

    clientSocket.on('sendMessage', function (data) {
        onSendMessage(clientSocket, data.message);
    });

    clientSocket.on('makeOffer', function (data) {
        onMakeOffer(clientSocket, data.offer);
    });

    clientSocket.on('makeAnswer', function (data) {
        onAnswerMade(clientSocket, data.answer);
    });

    clientSocket.on('registerMonitoringSocket', function (data) {
        onRegisterMonitoringSocket(clientSocket);
    });
};

function onAnswerMade(socket, answer) {
    if (!_CLIENTS[socket.id]) { return; }

    var clientData = _CLIENTS[socket.id];
    socket.broadcast.to(clientData.room).emit('answerMade', { answer });
}

function onMakeOffer (socket, offer) {
    if (!_CLIENTS[socket.id]) { return; }

    var clientData = _CLIENTS[socket.id];
    socket.broadcast.to(clientData.room).emit('offerMade', { offer });
}

function onSendMessage (socket, message) {
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

    // 방에 아무도 없으면 해당 방정보는 없앤다. (모니터리에 0으로 계속뜸)
    if (_ROOMS[clientData.room].length === 0) {
        delete _ROOMS[clientData.room];
    }

    socket.leave(roomId);
    socket.broadcast.to(roomId).emit('userLeft', {
        nickName: clientData.nickName,
        chatRoomAllUsers: room.map(r => r.nickName)
    });

    socket.broadcast.to(_MONITORING_ROOM_NAME).emit('userLeft', {
        roomName: roomId,
        nickName: clientData.nickName
    });
}

function onMonitoringDisconnect(socket) {
    const index = _MONITORING_SOCKETS.indexOf(socket.id);
    if (index > -1) {
        _MONITORING_SOCKETS.splice(index, 1);
        socket.leave(_MONITORING_ROOM_NAME);
    }
    console.log('LEAVE _MONITORING_SOCKETS :: ', _MONITORING_SOCKETS);
}

function onLogin(socket, nickName, room) {
    console.log(`client login nickName is ${nickName} rooms is ${room}`);
    if (!_ROOMS[room]) { _ROOMS[room] = []; }
    if (!_CLIENTS[socket.id]) { _CLIENTS[socket.id] = { room, nickName }; }

    _ROOMS[room].push({ nickName, socketId: socket.id });
    socket.join(room);

    // 현재 채팅방 인원수 및 채팅 유저 리스트 출력 용도로 사용한다.
    // 내가 로그인 성공할때와 상대방이 채팅방에 진입했을때와 나갔을때 내려준다.
    const chatRoomAllUsers = _ROOMS[room].map(r => r.nickName);
    const loginSuccessData = { room, nickName, chatRoomAllUsers };

    // 현재 화상채팅은 2명만 맺어지므로 2번째 인원이 들어왔을때 반대편 화상채팅 인원의 닉네임을 넣어준다.
    if (chatRoomAllUsers.length === 2) {
        const otherUserData = _ROOMS[room].find(r => r.nickName !== nickName);
        loginSuccessData.otherNickName = otherUserData.nickName;
    }
    socket.emit('loginSuccess', loginSuccessData);

    socket.broadcast.to(room).emit('newUserLogin', {
        nickName,
        chatRoomAllUsers
    });

    socket.broadcast.to(_MONITORING_ROOM_NAME).emit('newUser', {
        roomName: room, nickName
    })
}

/**
 * 모니터링 페이지에 접속한 소켓들 정보를 등록한다.
 * @param socket 클라이언트 소켓정보
 */
function onRegisterMonitoringSocket(socket) {
    if (!_MONITORING_SOCKETS.includes(socket.id)) {
        _MONITORING_SOCKETS.push(socket.id);
    }
    socket.join(_MONITORING_ROOM_NAME);
    socket.emit('successRegisterMonitoringSocket', _ROOMS);
}