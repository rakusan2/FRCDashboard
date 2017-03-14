let ipc = require('electron').ipcRenderer
let tables: { [key: string]: table } = {}
ipc.send('ready')
ipc.on('connected', (ev, con: boolean) => {
})
ipc.on('add', (ev, mesg: clientMesg) => {
    let keys = mesg.key.split('/')
    if (keys.length <= 1) return
    let tab = keys[1] in tables ? tables[keys[1]] : (tables[keys[1]] = { subTables: {}, numSub: 0 }),
        lastI = keys.length - 1
    for (let i = 2; i < lastI; i++) {
        if (!(keys[i] in tab.subTables)) {
            tab.subTables[keys[i]] = { subTables: {}, numSub: 0 }
            tab.numSub++
        }
        tab = tab.subTables[keys[i]]
    }
    let name = keys[lastI]
    if (name === "~type~") {
        tab.type = mesg.val
    } else {
        tab.subTables[name].val = mesg.val
    }
})
ipc.on('delete', (ev, mesg: clientMesg) => {
})
ipc.on('update', (ev, mesg: clientMesg) => {
})
ipc.on('flagChange', (ev, mesg: clientMesg) => {
})
function del(keys:string[],index:number){

}

function addModule(callback: (modules, exports) => any) {
    let modules = {}, exports = modules
    callback(modules, exports)
}

interface table {
    val?: any
    subTables?: { [key: string]: table }
    numSub: number
    type?: string
}

interface modules {
    key?: string
    type?: string
    name?: string
    description?: string
    onCreate: () => HTMLElement | HTMLElement[]
    onUpdate: (val: any) => any
}
declare let modules: modules