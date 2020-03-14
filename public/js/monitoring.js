var CHATTING_MONITORING = {
    _socket: null,
    init: function (socket) {
        this._socket = socket;
        this._registerMonitoringSocket();
        this._onRoutes();
    },
    _onRoutes: function () {
        this._socket.on(
            'successRegisterMonitoringSocket',
            $.proxy(this._onSuccessRegisterMonitoringSocket, this)
        );

        this._socket.on('newUser', $.proxy(this._onNewUser, this));
        this._socket.on('userLeft', $.proxy(this._onUserLeft, this));
    },
    /**
     * 회원이 채팅방을 빠져나갔을때 콜백
     * 방의 전체 회원이 나갔을때는 방정보를 삭제하고
     * 채팅중인 회원이 있으면 특정 회원만 없애준다.
     * @private
     */
    _onUserLeft: function (data) {
        console.log('@@@@@@@@_onUserLeft');
        var roomGroupId = this._makeChatRoomGroupId(data.roomName);
        var $roomGroup = $('#' + roomGroupId);

        if ($roomGroup.length === 0) { return; }
        var self = this;
        $roomGroup.find('li').each(function (index) {
            var $this = $(this);
            if ($this.text() === data.nickName) {
                $this.remove();
                self._decreaseChatRoomUserSize($roomGroup);
                return false; // break;
            }

        });

        if (this._getChatRoomUserSize($roomGroup) === 0) {
            $roomGroup.parent('div').remove();
        }
    },
    /**
     * 새로운 유저가 들어왔을때 새로운 방 정보를 만들어준다.
     * 기존 방정보가 없으면 새로 만들어주며 방 정보가 존재하면 유저 리스트만 업데이트한다.
     * @private
     */
    _onNewUser: function (data) {
        var roomGroupId = this._makeChatRoomGroupId(data.roomName);
        var $roomGroup = $('#' + roomGroupId);
        if ($roomGroup.length === 0) {
            var userRow = this._makeChatRoomUserRow(data.nickName);
            var template = this._makeChartRoomTemplate(data.roomName, 1, userRow);
            $('#chatRoomList').append(template);
        } else {
            var userRow = this._makeChatRoomUserRow(data.nickName);
            $roomGroup.append(userRow);
            this._increaseChatRoomUserSize($roomGroup);
        }
    },
    _increaseChatRoomUserSize: function ($roomGroup) {
        var $charUserSizeSpan = $roomGroup.find('span.current-chat-user-size');
        $charUserSizeSpan.text(parseInt($charUserSizeSpan.text()) + 1);
    },
    _decreaseChatRoomUserSize: function ($roomGroup) {
        var $charUserSizeSpan = $roomGroup.find('span.current-chat-user-size');
        var size = parseInt($charUserSizeSpan.text());
        $charUserSizeSpan.text(size === 0 ? 0 : size - 1);
    },
    _getChatRoomUserSize: function ($roomGroup) {
        var $charUserSizeSpan = $roomGroup.find('span.current-chat-user-size');
        return parseInt($charUserSizeSpan.text());
    },
    /**
     * 모니터링 소켓 접속 성공 콜백
     * @param data
     * @private
     */
    _onSuccessRegisterMonitoringSocket: function (data) {
        console.log('data :: ', data);
        if (!data) { return; }

        var $chatRoomList = $('#chatRoomList');
        for (var roomName in data) {
            var userList = this._makeChatRoomUserList(data[roomName]);
            var template = this._makeChartRoomTemplate(roomName, data[roomName].length, userList);
            $chatRoomList.append(template);
        }
    },
    /**
     * 채팅방 정보 HTML Template을 파싱하여 반환한다.
     * @param roomName 방이름
     * @param chatRoomUserSize 채팅방에 속한 회원 수
     * @param chatRoomUserList 채팅방에 속회 회원 리스트 (li)
     * @return {string} 파싱된 HTML 텍스트
     * @private
     */
    _makeChartRoomTemplate: function (roomName, chatRoomUserSize, chatRoomUserList) {
        var template = $('#chatRoomTemplate').text();

        template = template.replace('{{chatRoomGroupId}}', this._makeChatRoomGroupId(roomName));
        template = template.replace('{{chatRoomName}}', roomName);
        template = template.replace('{{chatRoomUserSize}}', chatRoomUserSize);
        template = template.replace('{{chatRoomUserList}}', chatRoomUserList);

        return template;
    },
    _makeChatRoomUserList: function (roomInfos) {
        if (!roomInfos || roomInfos.length === 0) { return ''; }
        var list = '';

        for (var i = 0; i < roomInfos.length; i++) {
            list += this._makeChatRoomUserRow(roomInfos[i].nickName);
        }

        return list;
    },
    _makeChatRoomUserRow: function (nickName) {
        return '<li class="list-group-item">'+ nickName +'</li>';
    },
    _makeChatRoomGroupId: function (chatRoomName) {
        return 'chatRoomGroup-' + chatRoomName;
    },
    _registerMonitoringSocket: function () {
        this._socket.emit('registerMonitoringSocket');
    }
};

$(function () {
    CHATTING_MONITORING.init(io.connect());
});