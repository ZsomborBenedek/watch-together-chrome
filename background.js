'use strict';

let peer;
let active;

chrome.runtime.onInstalled.addListener(function () {
    console.log("Watchtogether extension installed!");

    chrome.storage.sync.set({ ownId: null }, function () { });
    chrome.storage.sync.set({ remoteId: null }, function () { });
    chrome.storage.sync.set({ state: 'start' }, function () { });
    chrome.storage.sync.set({ connected: false }, function () { });
    chrome.storage.sync.set({ sync: false }, function () { });
});

function keepAlive() {
    if (active) {
        setTimeout(() => {
            chrome.runtime.getBackgroundPage(_ => { });
            keepAlive();
        }, 4000);
    }
}

function syncVids(sync) {
    if (sync) {
        chrome.tabs.executeScript({
            file: 'content.js'
        }, _ => {
            let e = chrome.runtime.lastError;
            if (e !== undefined) {
                console.log(_, e);
            }
        });
        console.log('vids syncing');
        chrome.tabs.onUpdated.addListener(injectContentScript);
    } else {
        console.log('vids not syncing');
        chrome.tabs.onUpdated.removeListener(injectContentScript);
    }
}

function injectContentScript(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
        chrome.tabs.executeScript(tabId, {
            file: 'content.js'
        }, _ => {
            let e = chrome.runtime.lastError;
            if (e !== undefined) {
                console.log(tabId, _, e);
            }
        });
    }
}

function newSession(initiator) {
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
        active = true;
        keepAlive();
        let id = btoa(JSON.stringify(data));
        chrome.storage.sync.set({ ownId: id }, function () {
            console.log('signaled as ', id);
        });
    });

    // When another peer connects to this one
    peer.on('connect', function () {
        chrome.storage.sync.set({ connected: true }, function () {
            console.log('connected');
        });
        chrome.storage.sync.set({ sync: true }, function () { });
    });

    // When data is received
    peer.on('data', function (data) {
        let videoState = JSON.parse(atob(data));
        console.log(videoState);
        chrome.storage.sync.set({ videoState: videoState }, function () { });
    });

    // When peers are disconnected
    peer.on('close', function () {
        peer = null;
        active = false;
        chrome.storage.sync.set({ ownId: null }, function () { });
        chrome.storage.sync.set({ remoteId: null }, function () { });
        chrome.storage.sync.set({ state: 'start' }, function () { });
        chrome.storage.sync.set({ connected: false }, function () { });
        chrome.storage.sync.set({ sync: false }, function () { });
    });
}

function joinSession(remoteId) {
    try {
        peer.signal(JSON.parse(atob(remoteId)));
        chrome.storage.sync.set({ remoteId: remoteId }, function () { });
    } catch (error) {
        console.log(error);
    }
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
            peer.send(btoa(JSON.stringify(request.content)));
        sendResponse('State sent...');
    }
});

chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (var key in changes) {
        if (key === 'sync')
            syncVids(changes[key].newValue);
    }
});

chrome.runtime.onSuspend.addListener(function () {
    console.log("Watchtogether extension suspended!");

    if (peer)
        peer.destroy();

    chrome.storage.sync.set({ ownId: null }, function () { });
    chrome.storage.sync.set({ remoteId: null }, function () { });
    chrome.storage.sync.set({ state: 'start' }, function () { });
    chrome.storage.sync.set({ connected: false }, function () { });
    chrome.storage.sync.set({ sync: false }, function () { });
});