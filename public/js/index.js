function makeChatMessage (nickName, message) {
    var msgTemplate = $('#msgTemplate').text();
    msgTemplate = msgTemplate.replace('{{user}}', nickName);
    msgTemplate = msgTemplate.replace('{{message}}', message);

    return msgTemplate;
}

var SocketRoutes = {
    _socket: null,
    init: function (socket) {
        this._socket = socket;
        this._onRoutes();
    },
    _onRoutes: function () {
        this._socket.on('loginSuccess', this._onLoginSuccess);
        this._socket.on('newUserLogin', this._onNewUserLogin);
        this._socket.on('userLeft', this._onUserLeft);
        this._socket.on('receiveMessage', this._onReceiveMessage);
    },
    _onReceiveMessage: function (data) {
        var chatMessage =
            makeChatMessage(data.nickName, data.message);
        $("#chatArea").append(chatMessage);
    },
    _onUserLeft: function (data) {
        var chatMessage =
            makeChatMessage('SYSTEM', data.nickName + '님이 퇴장하셨습니다.');
        $("#chatArea").append(chatMessage);
    },
    _onNewUserLogin: function (data) {
        var chatMessage =
            makeChatMessage('SYSTEM', data.nickName + '님이 입장하셨습니다.');
        $("#chatArea").append(chatMessage);
    },
    _onLoginSuccess: function (data) {
        $('#loginRow').hide();

        $("#conferenceRow").show();
        $("#infoRow").show();
        $("#chatRow").show();

        $('#loggedUserName').text(data.nickName);
        $('#roomName').text(data.room);
    },
    emit: function (name, data) {
        this._socket.emit(name, data);
    }
};

$(function () {
    SocketRoutes.init(io.connect());

    $('#frm').submit(function (e) {
        e.preventDefault();

        var nickName = $('#nickname').val();
        var room = $('#room').val();
        SocketRoutes.emit('login', { nickName: nickName, room: room });
    });

    $('#sendMessage').click(function (e) {
        e.preventDefault();

        var nickName = $('#nickname').val();
        var $message = $('#message');
        var message = $message.val();
        SocketRoutes.emit('sendMessage', { message: message });
        $("#chatArea").append(makeChatMessage(nickName, message));

        $message.val('');
    });
});

