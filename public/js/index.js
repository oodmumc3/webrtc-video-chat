navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;

var peerConnection = new RTCPeerConnection({
    iceServers: [
        {
            'urls': 'stun:stun.l.google.com:19302?transport=tcp'
        },
        {
            urls: ['turn:turn.bistri.com:80'],
            credential: 'homeo',
            username: 'homeo'
        }
        // {
        //     urls: 'turn:numb.viagenie.ca',
        //     credential: 'muazkh',
        //     username: 'webrtc@live.com'
        // },
    ]
});


peerConnection.onaddstream = function (obj) {
    var $remoteVideo = $('#remoteVideo');
    $remoteVideo.get(0).srcObject = obj.stream;
};

function makeChatMessage (nickName, message) {
    var msgTemplate = $('#msgTemplate').text();
    msgTemplate = msgTemplate.replace('{{user}}', nickName);
    msgTemplate = msgTemplate.replace('{{message}}', message);

    return msgTemplate;
}

var SocketRoutes = {
    _socket: null,
    _isAlreadyCalling: false,
    init: function (socket) {
        this._socket = socket;
        this._onRoutes();
    },
    _onRoutes: function () {
        this._socket.on('loginSuccess', $.proxy(this._onLoginSuccess, this));
        this._socket.on('newUserLogin', $.proxy(this._onNewUserLogin, this));
        this._socket.on('userLeft', $.proxy(this._onUserLeft, this));
        this._socket.on('receiveMessage', this._onReceiveMessage);
        this._socket.on('offerMade', $.proxy(this._onOfferMade, this));
        this._socket.on('answerMade', $.proxy(this._onAnswerMade, this));
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

        $('#currentChatUserSize').text(data.chatRoomAllUsers.length);
        this._clearAndAddUserList(data.chatRoomAllUsers);

        var remoteVideo = $('#remoteVideo').get(0);
        remoteVideo.pause();
        remoteVideo.currentTime = 0;
    },
    _onNewUserLogin: function (data) {
        var chatMessage =
            makeChatMessage('SYSTEM', data.nickName + '님이 입장하셨습니다.');
        $("#chatArea").append(chatMessage);
        $('#currentChatUserSize').text(data.chatRoomAllUsers.length);
        this._clearAndAddUserList(data.chatRoomAllUsers);

        // 두명의 인원만 화상채팅을 지원하므로 2명일때만 호출한다.
        console.log('data.userSize :: ', data.chatRoomAllUsers.length);
        if (data.chatRoomAllUsers.length === 2) {
            $('#otherUser').text(data.nickName);
            this._callUser();
        }
    },
    _onAnswerMade: function (data) {
        var self = this;
        peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer))
            .then(function () {
                if (!self._isAlreadyCalling) {
                    self._callUser();
                    self._isAlreadyCalling = true;
                }
            })
            .catch(function (err) {
                console.error(err);
            });
    },
    _onOfferMade: function (data) {
        var self = this;
        peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer))
            .then(function () {
                peerConnection.createAnswer()
                    .then(function (answer) {
                        peerConnection.setLocalDescription(new RTCSessionDescription(answer))
                            .then(function () {
                                self.emit('makeAnswer', { answer: answer });
                            })
                            .catch(function (err) {
                                console.error(err);
                            });
                    })
                    .catch(function (err) {
                        console.error(err);
                    });
            })
            .catch(function (err) {
                console.error(err);
            });
    },
    _callUser: function () {
        var self = this;
        peerConnection.createOffer()
            .then(function (offer) {
                peerConnection.setLocalDescription(new RTCSessionDescription(offer))
                    .then(function () {
                        self.emit('makeOffer', { offer: offer });
                    })
                    .catch(function (err) {
                        console.error(err);
                    });
            })
            .catch(function (err) {
                console.error(err);
            });
    },
    _onLoginSuccess: function (data) {
        $('#loginRow').hide();

        $("#conferenceRow").show();
        $("#infoRow").show();
        $("#chatRow").show();
        $('#userListRow').show();

        $('#loggedUserName').text(data.nickName);
        $('#roomName').text(data.room);
        $('#currentChatUserSize').text(data.chatRoomAllUsers.length);
        this._clearAndAddUserList(data.chatRoomAllUsers);
        if (data.otherNickName) {
            $('#otherUser').text(data.otherNickName);
        }
    },
    _clearAndAddUserList: function (userList) {
        $('#userList > li:gt(0)').remove();

        var $userList = $('#userList');
        for (var i = 0; i < userList.length; i++) {
            $userList.append('<li class="list-group-item">'+ userList[i] +'</li>');
        }
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

        navigator.getUserMedia({video: true, audio: true}, function (stream) {
            var $localVideo = $('#localVideo');
            $localVideo.get(0).srcObject = stream;

            peerConnection.addStream(stream);
        }, function (err) {
            console.error(err);
        });

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

