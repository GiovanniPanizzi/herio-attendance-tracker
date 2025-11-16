const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function setupAppEnvironment() {
    const isPackaged = app.isPackaged;
    const DB_FOLDER = isPackaged ? app.getPath('userData') : __dirname;
    global.DB_FOLDER = DB_FOLDER;
    console.log(`[Main] Il DB verrà creato/trovato in: ${DB_FOLDER}`);
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadURL('http://localhost:3000/dashboard-app');

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    setupAppEnvironment();

    const server = require('./server.js');

    setTimeout(() => {
        createWindow();
    }, 500);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    app.quit();
});