// The original program restores its own window after Wine has opened the desktop.
// Wait for its first painted title bar before pressing the native maximize button.
(() => {
    const probe = document.createElement("canvas");
    probe.width = 1024;
    probe.height = 1;
    const pixels = probe.getContext("2d", {willReadFrequently:true});
    const near = (row, x, color, tolerance = 8) =>
        color.every((value, channel) => Math.abs(row[x * 4 + channel] - value) <= tolerance);
    const timer = setInterval(() => {
        if (!statusLabel.hidden || canvas.width !== 1024 || canvas.height !== 768) return;
        function scan(y) {
            pixels.drawImage(canvas, 0, y, 1024, 1, 0, 0, 1024, 1);
            return pixels.getImageData(0, 0, 1024, 1).data;
        }
        // Match the restored title gradient, desktop background and work area together.
        const title = scan(110);
        if (!near(title, 25, [58,110,165]) || !near(title,380,[74,104,161],12) ||
            !near(title,730,[161,196,235],12) || !near(scan(300),550,[255,255,255])) return;
        clearInterval(timer);
        const bounds=canvas.getBoundingClientRect();
        const x=bounds.left + bounds.width * 776/1024;
        const y=bounds.top + bounds.height * 112/768;
        mouse("mousemove",x,y,0,0);
        mouse("mousedown",x,y,0,1);
        setTimeout(()=>mouse("mouseup",x,y,0,0),70);
    }, 450);
    setTimeout(()=>clearInterval(timer), 10 * 60 * 1000);
    window.addEventListener("pagehide",()=>clearInterval(timer),{once:true});
})();
