$(document).ready(function () {
    let peer;
    let conn;
    let connections = {};
    let callConnections = {};
    let connectionTimes = {};
    let localStream;

    // Initialize Peer
    peer = new Peer();

    peer.on('open', function (id) {
        console.log('Your Secret ID is: ' + id);
        $.notify('Welcome Vaibhavs Website', "success");
        sessionStorage.setItem('peerID', id);
        $("#mySecretCode").text(id);
    });

    // Connect to a Peer
    function connectRoomId() {
        const targetPeerId = $("#secretInput").val();
        if (!targetPeerId) return $.notify("Please enter a peer ID to connect.", "warn");
        if (peer.id === targetPeerId) return $.notify("You need to Enter secret code for partner you wish to connect.", "info");

        $.notify("Requesting connection...", "info");
        conn = peer.connect(targetPeerId);

        conn.on('open', function () {
            connections[targetPeerId] = Object.keys(connections).length + 1;
            $.notify('Connected to Peer! ' + conn.peer, "success");
            handleNewUserConnected(conn.peer);
            populateRecipientSelect();
        });

        conn.on('error', err => $.notify("Connection failed: " + err.message, "error"));

        conn.on('data', function (data) {
            playNotificationSound();
            $(".chat-messages").append(
                `<div class="message receiver animate__animated animate__lightSpeedInLeft">
                    <span class="badge rounded-pill pill2">${connections[conn.peer]}</span>${data}
                 </div>`
            );
            scrollChatToBottom();
        });
    }

    // Send Message
    function sendMessage() {
        const message = $(".message-input input").val();
        const recipientId = $("#recipientSelect").val();
        if (!message) return $.notify('No message!', "warning");

        $(".message-input input").val("");
        $(".chat-messages").append(
            `<div class="message sender text-end animate__animated animate__lightSpeedInRight">
                ${message} <span class="badge rounded-pill pill1">You</span>
             </div>`
        );
        scrollChatToBottom();
        peer.connections[recipientId][0].send(message);
    }

    // Scroll to bottom of chat
    function scrollChatToBottom() {
        const chatBox = $(".chat-messages");
        chatBox.scrollTop(chatBox.prop("scrollHeight"));
    }

    // UI Handlers
    $("#connectUsingCodeBtn").on("click", connectRoomId);
    $("#sendMsgBtn").on("click", sendMessage);
    $(".message-input input").on("keypress", function (e) {
        if (e.which === 13 && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Handle Incoming Connections
    peer.on('connection', function (incomingConn) {
        conn = incomingConn;
        $.notify('Incoming Connection!', "info");

        conn.on('open', function () {
            connections[conn.peer] = Object.keys(connections).length + 1;
            handleNewUserConnected(conn.peer);
            populateRecipientSelect();
        });

        conn.on('data', function (data) {
            playNotificationSound();
            $(".chat-messages").append(
                `<div class="message receiver animate__animated animate__lightSpeedInLeft">
                    <span class="badge rounded-pill pill2">${connections[conn.peer]}</span>${data}
                 </div>`
            );
            scrollChatToBottom();
        });
    });

    // Handle Incoming Calls
    peer.on('call', function (call) {
        getUserMediaStream()
            .then(stream => {
                localStream = stream;
                const videoElement = document.getElementById('local-video');
                videoElement.srcObject = stream;
                videoElement.muted = true;
                videoElement.play();
                $('#local-video').addClass('visible');

                call.answer(localStream);
                callConnections[call.peer] = call;

                call.on('stream', function (remoteStream) {
                    const videoElement = document.getElementById(`user_${call.peer}_video_ele`);
                    $(videoElement).show();
                    $(`#user_${call.peer}_img_placeholder`).hide();
                    videoElement.srcObject = remoteStream;
                    videoElement.play();
                    const btnImgSrc = videoElement.muted ? "./images/mute.svg" : "./images/unMute.svg";
                    $(`#user_${call.peer}_mute_btn img`).attr('src', btnImgSrc);
                });

                call.on('close', () => $.notify('CALL Disconnected from Peer Server! ' + call.peer, "warn"));
            })
            .catch(err => $.notify('Failed to access camera and microphone!', "error"));
    });

    // Helper Functions
    function getUserMediaStream() {
        return navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    }

    function populateRecipientSelect() {
        const $select = $("#recipientSelect").empty();
        Object.keys(peer.connections).forEach(key => {
            $select.append(`<option value="${key}">${connections[key]}</option>`);
        });
    }

    function handleNewUserConnected(userId) {
        addUserCard(userId);
        connectionTimes[userId] = new Date();
        updateConnectionTime(userId);
    }

    function updateConnectionTime(userId) {
        connectionTimes[userId + '_interval'] = setInterval(() => {
            const elapsed = Math.floor((new Date() - connectionTimes[userId]) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            $(`#user_${userId}_active_time`).text(`Active Since ${minutes} mins ${seconds} secs`);
        }, 1000);
    }

    function addUserCard(userId) {
        const card = `
            <div class="col" id="user_${userId}_card">
                <div class="card animate__animated animate__fadeIn">
                    <div class="card-footer">
                        <div class="row">
                            <div class="col-sm-6 text-start"><span class="card-title">${userId}</span></div>
                            <div class="col-sm-6 text-end"><small class="text-muted" id="user_${userId}_active_time"></small></div>
                        </div>
                    </div>
                    <div class="card-body text-end">
                        <img id="user_${userId}_img_placeholder" src="./images/luffy.webp" class="card-img-top p-2" alt="luffy called you">
                        <video id="user_${userId}_video_ele" class="card-img-top" autoplay playsinline muted style="display: none;"></video>
                    </div>
                    <div class="card-footer p-0">
                        <div class="btn-toolbar justify-content-end">
                            <div class="ml-auto">
                                <button type="button" id="user_${userId}_make_call_btn" class="btn"><img src="./images/call.svg" width="16"></button>
                                <button type="button" id="user_${userId}_close_video_btn" class="btn"><img src="./images/noVideo.svg" width="16"></button>
                                <button type="button" id="user_${userId}_mute_btn" class="btn"><img src="./images/mute.svg" width="16"></button>
                                <button type="button" id="user_${userId}_disconnect_btn" class="btn"><img src="./images/xSquare.svg" width="16"></button>
                                <button type="button" id="user_${userId}_trash_btn" class="btn"><img src="./images/trash.svg" width="16"></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        $('#containerForCards').append(card);
    }

    // Button Events for User Cards
    $('#containerForCards').on('click', 'button', function () {
        const btnId = $(this).attr('id');
        const userId = btnId.split('_')[1];

        if (btnId.includes('_make_call_btn')) makeCallToUser(userId);
        else if (btnId.includes('_close_video_btn')) toggleVideoForUser(userId);
        else if (btnId.includes('_mute_btn')) toggleMuteForUser(userId);
        else if (btnId.includes('_disconnect_btn')) disconnectUser(userId);
        else if (btnId.includes('_trash_btn')) trashConnection(userId);
    });

    function makeCallToUser(userId) {
        getUserMediaStream()
            .then(stream => {
                localStream = stream;
                const videoElement = document.getElementById('local-video');
                videoElement.srcObject = stream;
                videoElement.muted = true;
                videoElement.play();
                $('#local-video').addClass('visible');

                const call = peer.call(userId, localStream);
                callConnections[call.peer] = call;

                call.on('stream', function (remoteStream) {
                    const video = document.getElementById(`user_${userId}_video_ele`);
                    $(`#user_${userId}_img_placeholder`).hide();
                    video.style.display = 'block';
                    video.srcObject = remoteStream;
                    video.play();
                    const btnImgSrc = video.muted ? "./images/mute.svg" : "./images/unMute.svg";
                    $(`#user_${userId}_mute_btn img`).attr('src', btnImgSrc);
                });
            })
            .catch(err => $.notify('Failed to access camera and microphone!', "error"));
    }

    function toggleVideoForUser(userId) {
        const video = $(`#user_${userId}_video_ele`);
        const placeholder = $(`#user_${userId}_img_placeholder`);

        if (video.is(":hidden")) {
            video.show().get(0).play();
            placeholder.hide();
        } else {
            video.get(0).pause();
            video.hide();
            placeholder.show();
        }

        const btnImgSrc = video.is(":hidden") ? "./images/showVideo.svg" : "./images/noVideo.svg";
        $(`#user_${userId}_close_video_btn img`).attr('src', btnImgSrc);
    }

    function toggleMuteForUser(userId) {
        const video = document.getElementById(`user_${userId}_video_ele`);
        video.muted = !video.muted;
        const btnImgSrc = video.muted ? "./images/mute.svg" : "./images/unMute.svg";
        $(`#user_${userId}_mute_btn img`).attr('src', btnImgSrc);
    }

    function disconnectUser(userId) {
        clearInterval(connectionTimes[userId + '_interval']);
        delete connectionTimes[userId + '_interval'];
        peer.connections[userId][0].close();
        callConnections[userId]?.close();
        $.notify('Disconnected user: ' + userId, "warn");
    }

    function trashConnection(userId) {
        $(`#user_${userId}_card`).remove();
        disconnectUser(userId);
    }

    function playNotificationSound() {
        $("#notificationSound")[0].play();
    }
});

// Block default browser shortcuts
document.addEventListener("keydown", function (e) {
    if (e.ctrlKey && ['p', 's', 'u', 'c'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        alert("Action blocked.");
    }
});
