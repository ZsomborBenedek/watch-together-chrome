'use strict';

let peer;

chrome.runtime.onInstalled.addListener(function () {
    console.log("Watchtogether extension started!");

    chrome.storage.sync.set({ connected: false }, function () { });

    function newSession(initiator) {
        console.log('starting session');
        peer = new SimplePeer({
            initiator: initiator ? true : false,
            trickle: false
        });

        // When there is peer error
        peer.on('error', function (err) {
            console.log(err);
        });

        // When peer is made
        peer.on('signal', function (data) {
            chrome.storage.sync.set({ ownId: JSON.stringify(data) }, function () {
                console.log('signaled as ', JSON.stringify(data));
            });
        });

        // When another peer connects to this one
        peer.on('connect', function () {
            chrome.storage.sync.set({ connected: true }, function () {
                console.log('connected');
            });
        });

        // When data is received
        peer.on('data', function (data) {
            let videoState = JSON.parse(data);
            console.log(videoState);
            chrome.storage.sync.set({ videoState: videoState }, function () { });
        });

        // When peers are disconnected
        peer.on('close', function () {
            peer = null;
            chrome.storage.sync.set({ ownId: null }, function () { });
            chrome.storage.sync.set({ remoteId: null }, function () { });
            chrome.storage.sync.set({ state: 'start' }, function () { });
            chrome.storage.sync.set({ connected: false }, function () { });
        });
    }

    function joinSession(remoteId) {
        peer.signal(JSON.parse(remoteId));
        chrome.storage.sync.set({ remoteId: remoteId }, function () { });
    }

    // Receiving messages
    chrome.runtime.onMessage.addListener(function (request, _sender, sendResponse) {
        if (request.action === 'newSession') {
            newSession(true);
            sendResponse('Making session...');
        } else if (request.action === 'joinSession') {
            if (!peer)
                newSession(false);
            joinSession(request.remoteId);
            sendResponse('Connecting peers...');
        } else if (request.action === 'disconnectPeers') {
            if (peer)
                peer.destroy();
            sendResponse('Disconnecting peers...');
        } else if (request.action === 'sendState') {
            if (peer != null)
                peer.send(JSON.stringify(request.content));
            sendResponse('State sent...');
        }
    });
});

chrome.runtime.onSuspend.addListener(function () {
    console.log("Watchtogether extension suspended!");

    if (peer !== undefined)
        peer.destroy();

    chrome.storage.sync.set({ ownId: null }, function () { });
    chrome.storage.sync.set({ remoteId: null }, function () { });
    chrome.storage.sync.set({ state: 'start' }, function () { });
    chrome.storage.sync.set({ connected: false }, function () { });
});