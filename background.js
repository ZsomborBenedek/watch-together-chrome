'use strict';

let peer;
let conn;

chrome.runtime.onInstalled.addListener(function () {
    console.log("Watchtogether extension started!");

    chrome.storage.sync.set({ connected: false }, function () { });

    peer = new Peer();

    // When peer is made
    peer.on('open', function (id) {
        chrome.storage.sync.set({ ownId: id }, function () {
            console.log('connected to server as ' + id);
        });
    });

    // When peer is destroyed
    peer.on('close', function () {
        chrome.storage.sync.set({ ownId: null }, function () {
            console.log('peer destroyed');
        });
        console.log('reconnecting...');
        peer = new Peer();
    });

    // When peer is disconnected
    peer.on('disconnected', function () {
        console.log('disconnected from server');
        peer.reconnect();
    });

    // When there is peer error
    peer.on('error', function (err) {
        console.log(err);
    });

    function openConnectionHandler() {
        chrome.storage.sync.set({ remoteId: this.peer }, function () { });
        chrome.storage.sync.set({ connected: true }, function () { });

        console.log('connected to ' + this.peer);

        // When data is received
        this.on('data', function (data) {
            console.log(data);
            chrome.storage.sync.set({ videoState: data }, function () { });
        });
    }

    function closedConnectionHandler() {
        // chrome.storage.sync.set({ remoteId: null }, function () { });
        chrome.storage.sync.set({ connected: false }, function () { });

        console.log('other peer disconnected');
    }

    // When another peer connects to this one
    peer.on('connection', function (connection) {
        conn = connection;

        // When the connection is opened
        conn.on('open', openConnectionHandler);

        // When other peer closes the connection
        conn.on('close', closedConnectionHandler);
    });

    function connectPeers(remoteId) {
        conn = peer.connect(remoteId);

        // When the connection is opened
        conn.on('open', openConnectionHandler);

        // When other peer closes the connection
        conn.on('close', closedConnectionHandler);
    }

    // When this peer closes the connection
    function disconnectPeers() {
        conn.close();
        chrome.storage.sync.set({ connected: false }, function () { });
        console.log('disconnected');
    }

    // Receiving messages
    chrome.runtime.onMessage.addListener(function (request, _sender, sendResponse) {
        if (request.action == 'connectPeers') {
            connectPeers(request.remoteId);
            sendResponse('Connecting peers...');
        } else if (request.action == 'disconnectPeers') {
            disconnectPeers();
            sendResponse('Disconnecting peers...');
        }
    });

    chrome.storage.onChanged.addListener(function (changes, namespace) {
        for (var key in changes) {
            if (key === 'videoState') {
                if (conn != null) {
                    console.log('Sending videoState!', changes[key].newValue);
                    conn.send(changes[key].newValue);
                }
            }
        }
    });
});

chrome.runtime.onSuspend.addListener(function () {
    console.log("Watchtogether extension suspended!");

    peer.destroy();
});