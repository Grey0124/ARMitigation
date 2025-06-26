# Simple WebXR AR Object Placement

This project demonstrates a minimal mobile AR experience using Three.js and WebXR. Tap on a detected surface to place a 3D box in AR.

## How to Run

1. **Serve over HTTPS**: WebXR requires a secure context. You can use [http-server](https://www.npmjs.com/package/http-server) or any HTTPS server.

   Example using http-server:
   ```
   npx http-server -S -C cert.pem -K key.pem
   ```
   (You need to generate your own SSL certificate for local development.)

2. **Open on a compatible mobile device** (Chrome on Android, or iOS with WebXR support).

3. **Tap the "Enter AR" button** and tap on a surface to place a box.

## Files
- `index.html`: Main HTML file, loads Three.js and ARButton.
- `main.js`: JavaScript logic for AR session, hit testing, and object placement.

## References
- [Three.js WebXR ARButton Example](https://threejs.org/examples/?q=ar#webxr_ar_hittest)
- [Learn-WebXR Lecture 7.3](https://github.com/NikLever/Learn-WebXR/tree/master/complete/lecture7_3) 