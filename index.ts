let ipc = require('electron').ipcRenderer
let mainTable: table = { subTables: {}, numSub: 0 },
    connected = false,
    connectListeners: ((con: boolean) => any)[] = [],
    shareCalls: { [key: string]: ((mod: Object) => any)[] } = {},
    shared: { [key: string]: object } = {}
ipc.send('ready')
ipc.on('connected', (ev, con: boolean) => {
    connected = con
})
ipc.on('add', (ev, mesg: clientMesg) => {
    let keys = mesg.key.split('/')
    if (keys.length <= 1) return
    let tab = mainTable,
        lastI = keys.length - 1
    for (let i = 1; i < lastI; i++) {
        if (!(keys[i] in tab.subTables)) {
            tab.subTables[keys[i]] = { subTables: {}, numSub: 0 }
            tab.numSub++
        }
        tab = tab.subTables[keys[i]]
    }
    let name = keys[lastI]
    if (name === "~type~") {
        tab.type = mesg.val

    }
    if (!(name in tab.vals)) {
        tab.numSub++
    }
    tab.vals[name] = { val: mesg.val, flags: mesg.flags }
})
ipc.on('delete', (ev, mesg: clientMesg) => {
    rm(mainTable, mesg.key.split('/'), 1)
})
ipc.on('update', (ev, mesg: clientMesg) => {
    update(mainTable, mesg.key.split('/'), 1, mesg.val, mesg.flags)
})
ipc.on('flagChange', (ev, mesg: clientMesg) => {
    update(mainTable, mesg.key.split('/'), 1, null, mesg.flags)
})

/** 
 * Remove from table
 * @param table The table to delete from
 * @param keys The keys of the subTables
 * @param index The index of current key
 */
function rm(table: table, keys: string[], index: number) {
    if (table.numSub === 0) return true
    else if (index === keys.length-1) {
        if (table.numSub > 0) {
            delete table.vals[keys[index]]
            return false
        } else {
            return true
        }
    }
    else if (!(keys[index] in table.subTables)) return true
    else if (rm(table.subTables[keys[index]], keys, index + 1)) {
        if (delete table.subTables[keys[index]]) {
            table.numSub--
        }
    }
    return table.numSub === 0
}

function update(table: table, keys: string[], index: number, val: any, flags: number) {
    if (keys.length === index-1) {
        let valT=table.vals[keys[index]]
        if (val != null) valT.val = val
        valT.flags = flags
    }
    else if (keys[index] in table.subTables) {
        update(table, keys, index + 1, val, flags)
    }
}

function addModule(callback: (modules, exports) => any) {
    let modules: modules = {
        getShared: (mod, callback) => {
            if (mod in shared) {
                callback(shared[mod])
                return
            }
            if (mod in shareCalls) {
                shareCalls[mod].push(callback)
            } else {
                shareCalls[mod] = [callback]
            }
        }
    }, exports = modules, name: string
    callback(modules, exports)
    if (!('name' in modules)) {
        name = modules.name
        return
    }
    if ('onConnect' in modules) {
        connectListeners.push(modules.onConnect)
    }
    if ('shared' in modules) {
        shared[name] = modules.shared
        if (name in shareCalls) {
            let calls = shareCalls[name]
            while (calls.length) {
                calls.pop()(modules.shared)
            }
        }
    }
}

interface table {
    vals?: { [key: string]: { val: any, flags: number } }
    subTables?: { [key: string]: table }
    numSub: number
    type?: string
}

interface modules {
    key?: string | string[]
    type?: string
    name?: string
    description?: string
    onCreate?: () => HTMLElement | HTMLElement[]
    onUpdate?: (val: any) => any
    onConnect?: (connected: boolean) => any,
    shared?: object
    getShared(mod: string, callback: (module: object) => any): void
}
declare let modules: modules