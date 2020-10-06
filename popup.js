'use strict';

let newSessionBtn = document.getElementById('newSessionBtn');
let ownId = document.getElementById('ownId');
let remoteId = document.getElementById('remoteId');
let copyButton = document.getElementById('copyBtn');
let connectButton = document.getElementById('connectBtn');
let disconnectButton = document.getElementById('disconnectBtn');
let connectionState = document.getElementById('connectionState');

function setState(connected) {
    if (connected) {
        remoteId.disabled = true;
        connectButton.hidden = true;
        disconnectButton.hidden = false;
        connectionState.hidden = false;
        connectionState.innerHTML = 'Connected to this peer';
    } else {
        remoteId.disabled = false;
        connectButton.hidden = false;
        disconnectButton.hidden = true;
        connectionState.hidden = false;
        connectionState.innerHTML = 'Not connected';
    }
}

// Sending messages
function sendAction(message) {
    chrome.runtime.sendMessage(message, function (response) {
        console.log(response);
    });
}

chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (var key in changes) {
        if (key === 'connected') {
            console.log('connected changed from ' + changes[key].oldValue + ' to ' + changes[key].newValue);
            setState(changes[key].newValue);
        } else if (key === 'ownId') {
            ownId.value = changes[key].newValue;
        }
    }
});

// Init
window.addEventListener('load', initPopup, false);

function initPopup() {

    chrome.storage.sync.get('connected', function (result) {
        setState(result.connected);
    });

    chrome.storage.sync.get('ownId', function (result) {
        if (result.ownId != null) {
            ownId.value = result.ownId;
        }
    });

    chrome.storage.sync.get('remoteId', function (result) {
        if (result.remoteId != null)
            remoteId.value = result.remoteId;
    });

    newSessionBtn.addEventListener('click', function () {
        sendAction({ action: 'newSession' });
    }, false);

    connectButton.addEventListener('click', function () {
        if (remoteId.value.length > 0)
            sendAction({ action: 'connectPeers', remoteId: remoteId.value });
    }, false);

    disconnectButton.addEventListener('click', function () {
        sendAction({ action: 'disconnectPeers' });
    }, false);

    copyButton.addEventListener('click', function () {
        ownId.select();
        document.execCommand('copy');
        copyButton.innerHTML = 'Copy again!';
    }, false);
}