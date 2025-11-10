const { app, BrowserWindow } = require('electron');
const path = require('path');
function setupAppEnvironment() {
    const isPackaged = app.isPackaged;

    const DB_FOLDER = isPackaged 
        ? app.getPath('userData') 
        : __dirname; 

    global.DB_FOLDER = DB_FOLDER; 
    
    console.log(`[Main] Il DB verrà creato/trovato in: ${DB_FOLDER}`);
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1000, 
        height: 800,
        webPreferences: { 
            nodeIntegration: true, 
            contextIsolation: false 
        }
    });

    win.loadURL('http://localhost:3000/dashboard-app');
}

app.whenReady().then(() => {
    setupAppEnvironment(); 
 
    require('./server.js'); 

    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});