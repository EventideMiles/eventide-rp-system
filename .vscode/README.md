# VSCode Debugging for Eventide RP System

This directory contains configuration for debugging the Eventide RP System in Foundry VTT using VSCode.

## Prerequisites

- VSCode with the "JavaScript Debugger" extension (formerly "Debugger for Chrome")
- Foundry VTT running locally
- Brave or Chrome browser (Brave is recommended for Linux users)

## Starting Foundry with Remote Debugging

To enable remote debugging, you must start your browser with the `--remote-debugging-port=9222` flag.

### Linux (Brave)

```bash
brave-browser --remote-debugging-port=9222 --user-data-dir=/tmp/foundry-debug-profile
```

### Linux (Chrome)

```bash
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/foundry-debug-profile
```

### macOS (Brave)

```bash
/Applications/Brave\ Browser.app/Contents/MacOS/Brave\ Browser --remote-debugging-port=9222 --user-data-dir=/tmp/foundry-debug-profile
```

### Windows (Brave)

```powershell
"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" --remote-debugging-port=9222 --user-data-dir=C:\temp\foundry-debug-profile
```

**Note:** The `--user-data-dir` flag creates a separate browser profile to avoid conflicts with your main browser session and prevents port-in-use errors.

## Attaching the Debugger

1. Start Foundry VTT with remote debugging enabled using one of the commands above
2. Navigate to your Foundry instance (typically `http://localhost:30000`)
3. In VSCode, press `F5` or click "Run and Debug" in the sidebar
4. Select "Foundry VTT Debug (Brave/Chrome)" from the configuration dropdown
5. The debugger will attach to the browser session

## Setting Breakpoints

Once attached, you can:

- Click in the gutter next to line numbers in `.mjs` files to set breakpoints
- Use the Debug Console to evaluate expressions in the context of the current frame
- Step through code using the debug toolbar (F10 for step over, F11 for step into)

## Special Considerations for Eventide RP System

### Source Maps

The configuration includes source map path overrides to map built files back to their source locations. This allows you to debug the original source files in `src/` and `module/` rather than the compiled output.

### ES Modules

This project uses ES modules (`.mjs` extension). The debugger should automatically resolve these correctly when source maps are enabled.

### Global Scope Access

The system exposes its API via `globalThis.erps`. You can access this in the Debug Console to inspect system state:

```javascript
// In the Debug Console
globalThis.erps
```

### Handlebars Templates

Handlebars templates (`.hbs` files) cannot be directly debugged, but you can set breakpoints in JavaScript code that renders or interacts with templates.

### SCSS/CSS

CSS debugging is limited. You can use the browser's DevTools Styles panel for live CSS inspection. For SCSS changes, use the build process:

```bash
npm run build
```

## Troubleshooting

### "Unable to attach to browser"

- Ensure the browser was started with the `--remote-debugging-port=9222` flag
- Check that no other browser instance is using port 9222
- Try using a different `--user-data-dir` path

### Breakpoints not hitting

- Verify that source maps are being generated correctly by running `npm run build`
- Check that the `webRoot` in `launch.json` matches your workspace folder
- Try refreshing the browser after attaching the debugger

### Port already in use

```bash
# Linux/macOS - Find process using port 9222
lsof -i :9222

# Kill the process if needed
kill -9 <PID>
```

## Additional Resources

- [VSCode JavaScript Debugging Documentation](https://code.visualstudio.com/docs/nodejs/browser-debugging)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Foundry VTT Documentation](https://foundryvtt.com/article/documentation/)
