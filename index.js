let ipc = require('electron').ipcRenderer;
let mainTable = { subTables: {}, numSub: 0 }, connected = false, connectListeners = [], shareCalls = {}, shared = {}, modules = {};
ipc.send('ready');
ipc.on('connected', (ev, con) => {
    connected = con;
});
ipc.on('add', (ev, mesg) => {
    let keys = mesg.key.split('/');
    if (keys.length <= 1)
        return;
    let tab = mainTable, lastI = keys.length - 1;
    for (let i = 1; i < lastI; i++) {
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
    if (!(name in tab.vals)) {
        tab.numSub++;
    }
    tab.vals[name] = { val: mesg.val, flags: mesg.flags };
});
ipc.on('delete', (ev, mesg) => {
    rm(mainTable, mesg.key.split('/'), 1);
});
ipc.on('update', (ev, mesg) => {
    update(mainTable, mesg.key.split('/'), 1, mesg.val, mesg.flags);
});
ipc.on('flagChange', (ev, mesg) => {
    update(mainTable, mesg.key.split('/'), 1, null, mesg.flags);
});
/**
 * Remove from table
 * @param table The table to delete from
 * @param keys The keys of the subTables
 * @param index The index of current key
 */
function rm(table, keys, index) {
    if (table.numSub === 0)
        return true;
    else if (index === keys.length - 1) {
        if (table.numSub > 0) {
            delete table.vals[keys[index]];
            return false;
        }
        else {
            return true;
        }
    }
    else if (!(keys[index] in table.subTables))
        return true;
    else if (rm(table.subTables[keys[index]], keys, index + 1)) {
        if (delete table.subTables[keys[index]]) {
            table.numSub--;
        }
    }
    return table.numSub === 0;
}
function update(table, keys, index, val, flags) {
    if (keys.length === index - 1) {
        let valT = table.vals[keys[index]];
        if (val != null)
            valT.val = val;
        valT.flags = flags;
    }
    else if (keys[index] in table.subTables) {
        update(table, keys, index + 1, val, flags);
    }
}
function addModule(callback) {
    let mod = {
        getShared: (mod, callback) => {
            if (mod in shared) {
                callback(shared[mod]);
                return;
            }
            if (mod in shareCalls) {
                shareCalls[mod].push(callback);
            }
            else {
                shareCalls[mod] = [callback];
            }
        }
    }, exports = mod, name;
    callback(mod, exports);
    if (!('name' in mod)) {
        name = mod.name;
        return;
    }
    if ('onConnect' in mod) {
        connectListeners.push(mod.onConnect);
    }
    if ('shared' in mod && name) {
        shared[name] = mod.shared;
        if (name in shareCalls) {
            let calls = shareCalls[name];
            while (calls.length) {
                calls.pop()(mod.shared);
            }
        }
    }
}
