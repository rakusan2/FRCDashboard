let ipc = require('electron').ipcRenderer;
let tables = {};
ipc.send('ready');
ipc.on('connected', (ev, con) => {
});
ipc.on('add', (ev, mesg) => {
    let keys = mesg.key.split('/');
    if (keys.length <= 1)
        return;
    let tab = keys[1] in tables ? tables[keys[1]] : (tables[keys[1]] = { subTables: {}, numSub: 0 }), lastI = keys.length - 1;
    for (let i = 2; i < lastI; i++) {
        if (!(keys[i] in tab.subTables)) {
            tab.subTables[keys[i]] = { subTables: {}, numSub: 0 };
            tab.numSub++;
        }
        tab = tab.subTables[keys[i]];
    }
    let name = keys[lastI];
    if (name === "~type~") {
        tab.type = mesg.val;
    }
    else {
        tab.subTables[name].val = mesg.val;
    }
});
ipc.on('delete', (ev, mesg) => {
});
ipc.on('update', (ev, mesg) => {
});
ipc.on('flagChange', (ev, mesg) => {
});
function del(keys, index) {
}
function addModule(callback) {
    let modules = {}, exports = modules;
    callback(modules, exports);
}
