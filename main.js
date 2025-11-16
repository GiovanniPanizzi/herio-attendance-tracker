const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;
let splashWindow;
let splashStartTime; 

/**
 * Sets up the environment variables, particularly the database folder path.
 */
function setupAppEnvironment() {
    const isPackaged = app.isPackaged;
    // Set DB folder to userData path when packaged, or current directory when developing.
    const DB_FOLDER = isPackaged ? app.getPath('userData') : __dirname;
    global.DB_FOLDER = DB_FOLDER;
    console.log(`[Main] DB will be created/found in: ${DB_FOLDER}`);
}

/**
 * Handles the transition from splash screen to the main window, 
 * respecting the minimum display time.
 */
function triggerMainWindowShow() {
    const MIN_SPLASH_TIME = 3000; // Minimum splash display time (3 seconds)
    const timeElapsed = Date.now() - splashStartTime;
    const timeToWait = Math.max(0, MIN_SPLASH_TIME - timeElapsed); 

    setTimeout(() => {
        if (splashWindow && !splashWindow.isDestroyed()) {
            // Apply fade-out effect to splash screen
            splashWindow.webContents.executeJavaScript(`
                document.body.classList.add('fade-out');
            `);

            // Close splash and show main window after fade duration
            setTimeout(() => {
                if (splashWindow && !splashWindow.isDestroyed()) {
                    splashWindow.close();
                }
                mainWindow.show(); 
            }, 500);
        }
    }, timeToWait);
}

function createWindow() {
    // --- Splash screen setup ---
    splashWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        frame: false,
        transparent: true,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    splashWindow.loadFile('splash.html');
    splashStartTime = Date.now(); 

    // --- Main window setup ---
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        show: false, // Prevent white flash by hiding it initially
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    mainWindow.loadURL('http://localhost:3000/dashboard-app');

    // Use 'ready-to-show' to signal that the page is fully rendered
    mainWindow.once('ready-to-show', () => {
        triggerMainWindowShow();
    });

    // Listener for load errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error(`[Main] Page load failed (Code: ${errorCode}): ${errorDescription}`);
        
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.close();
        }
        
        // Show the window to display the error message
        mainWindow.show(); 
        mainWindow.webContents.executeJavaScript(`
            document.body.innerHTML = '<div style="font-family: sans-serif; padding: 50px; text-align: center;"><h1>Loading Error</h1><p>Cannot connect to the local server. Code: ${errorCode}</p></div>';
        `);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    setupAppEnvironment();

    // Start the local server
    const server = require('./server.js');

    createWindow();
});

// CLARIFIED: This handler now quits the app on all platforms 
// when the last window is closed (including macOS).
app.on('window-all-closed', () => {
    app.quit();
}); 

// Required for macOS: Recreate window when dock icon is clicked and no windows are open
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});