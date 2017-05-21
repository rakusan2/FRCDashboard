import * as electron from "electron"
import * as child_process from "child_process"
import * as wpilib_NT from 'wpilib-nt-client'
import * as fs from 'fs'

const client = new wpilib_NT.Client()

// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const ipc = electron.ipcMain

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow: Electron.BrowserWindow;

let connected: () => any,
    ready = false
type respMesg = { key: string, val: any, valType: number, id?: number, flags: number }
function createWindow() {
    // Attempt to connect to the localhost
    client.start((con, err) => {
        // If the Window is ready than send the connection status to it
        if (ready) {
            mainWindow.webContents.send('connected', con)
        }
        // Else prepare the connection message
        else connected = () => mainWindow.webContents.send('connected', con)
    })
    // When the script starts running in the window set the ready variable
    ipc.on('ready', (ev, mesg) => {
        ready = true
        // Send connection message to the window if if the message is ready
        if (connected) connected()
    })
    // When the user chooses the address of the bot than try to connect
    ipc.on('connect', (ev, address, port) => {
        let callback = (connected: boolean, err: Error) => {
            mainWindow.webContents.send('connected', connected)
        }
        if (port) {
            client.start(callback, address, port)
        } else {
            client.start(callback, address)
        }
    })
    ipc.on('add', (ev, mesg: respMesg) => {
        client.Assign(mesg.val, mesg.key, (mesg.flags & 1) === 1)
    })
    ipc.on('update', (ev, mesg: respMesg) => {
        client.Update(mesg.id, mesg.val)
    })
    ipc.on('devTools',(ev,show:boolean)=>{
        if(show)mainWindow.webContents.openDevTools()
        else mainWindow.webContents.closeDevTools()
    })
    // Listens to the changes coming from the client
    client.addListener((key, val, valType, mesgType, id, flags) => {
        mainWindow.webContents.send(mesgType, { key, val, valType, id, flags })
    })

    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1366,
        height: 570,
        // 1366x570 is a good standard height, but you may want to change this to fit your DriverStation's screen better.
        // It's best if the dashboard takes up as much space as possible without covering the DriverStation application.
        // The window is closed until the python server is ready
        show: false
    });
    // Move window to top (left) of screen.
    mainWindow.setPosition(0, 0);
    // Load window.
    mainWindow.loadURL(`file://${__dirname}/index.html`);
    // Once the python server is ready, load window contents.
    mainWindow.once("ready-to-show", function () {
        mainWindow.show();
    });
    // Remove menu
    mainWindow.setMenu(null);
    // Emitted when the window is closed.
    mainWindow.on("closed", function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on("ready", () => {
    createWindow();
});

// Quit when all windows are closed.
app.on("window-all-closed", function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q.
    // Not like we're creating a consumer application though.
    // Let's just kill it anyway.
    // If you want to restore the standard behavior, uncomment the next line.
    // if (process.platform !== "darwin")
    app.quit();
});

app.on("quit", function () {
    console.log("Application quit.");
});

app.on("activate", function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow == null) {
        createWindow();
    }
});

function fsPromise(src:string){
    return new Promise((res,rej)=>[
        fs.readFile(src,'utf8',(err,data)=>{
            if(err){
                rej(err)
            }else{
                res(JSON.parse(data))
            }
        })
    ])
}
interface options{
    modules:{
        name:string
        mainFile:string
        optionsFile:string
        type:string
        key:string
    }[]
    locations:{
        [key:string]:{
            x:number
            y:number
            sizeX:number
            sizeY:number
        }
    }
    connect:string
}
interface moduleOptions{

}