"use strict";
const canvas = document.getElementById("canvas");
const viewport = document.getElementById("viewport");
const statusLabel = document.getElementById("status");
const zoomButton = document.getElementById("zoom");
const openStockroom = new URLSearchParams(location.search).get("scene") === "stockroom";
if (openStockroom) {
    const link = document.getElementById("stockroom-link");
    link.textContent = "Blank lab";
    link.href = "./";
    link.title = "Open a blank lab in a new tab";
}
let zoomed = false;

function sizeDesktop() {
    const scale = Math.min(viewport.clientWidth / 1024, viewport.clientHeight / 768) * (zoomed ? 2 : 1);
    canvas.style.setProperty("width", Math.round(1024 * scale) + "px", "important");
    canvas.style.setProperty("height", Math.round(768 * scale) + "px", "important");
}
window.addEventListener("resize", sizeDesktop);
new MutationObserver(sizeDesktop).observe(canvas, {attributes:true, attributeFilter:["width","height"]});
sizeDesktop();
zoomButton.addEventListener("click", () => {
    zoomed = !zoomed;
    zoomButton.textContent = zoomed ? "Fit" : "Zoom in";
    zoomButton.setAttribute("aria-pressed", String(zoomed));
    sizeDesktop();
    viewport.scrollTo(zoomed ? (viewport.scrollWidth-viewport.clientWidth)/2 : 0, zoomed ? (viewport.scrollHeight-viewport.clientHeight)/2 : 0);
    canvas.focus();
});
document.getElementById("keyboard").addEventListener("click", () => {
    if (window.AndroidLab) window.AndroidLab.keyboard();
    else canvas.focus();
});
function showMessage(text) { statusLabel.hidden = false; statusLabel.textContent = text; }

const fingers = new Map();
let gesture = null;
let holdTimer = 0;
function mouse(type, x, y, button, buttons) {
    canvas.dispatchEvent(new MouseEvent(type, {bubbles:true, cancelable:true, clientX:x, clientY:y, button, buttons, view:window}));
}
function finishPress(x,y) {
    clearTimeout(holdTimer);
    if (!gesture || gesture.pan) return;
    if (!gesture.down) mouse("mousedown", x, y, 0, 1);
    mouse("mouseup", x, y, gesture.right ? 2 : 0, 0);
}
function centroid() {
    const values=Array.from(fingers.values());
    return {x:(values[0].x+values[1].x)/2,y:(values[0].y+values[1].y)/2};
}
canvas.addEventListener("pointerdown", e => {
    if (e.pointerType === "mouse") return;
    e.preventDefault(); canvas.focus(); canvas.setPointerCapture(e.pointerId);
    fingers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if (fingers.size === 2) {
        clearTimeout(holdTimer);
        if (gesture && gesture.down && !gesture.pan) mouse("mouseup", gesture.x, gesture.y, gesture.right?2:0, 0);
        gesture={pan:true, center:centroid(), left:viewport.scrollLeft, top:viewport.scrollTop};
        return;
    }
    if (fingers.size !== 1) return;
    gesture={x:e.clientX,y:e.clientY,down:false,right:false};
    mouse("mousemove",e.clientX,e.clientY,0,0);
    holdTimer=setTimeout(() => {
        if (!gesture || gesture.pan || gesture.down) return;
        gesture.down=true;gesture.right=true;
        mouse("mousedown",gesture.x,gesture.y,2,2);
    },550);
});
canvas.addEventListener("pointermove", e => {
    if (!fingers.has(e.pointerId) || !gesture) return;
    e.preventDefault();fingers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if (gesture.pan) {
        if (fingers.size===2) {
            const center=centroid();
            viewport.scrollTo(gesture.left+gesture.center.x-center.x,gesture.top+gesture.center.y-center.y);
        }
        return;
    }
    if (!gesture.down && Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>3) {
        clearTimeout(holdTimer); gesture.down=true;mouse("mousedown",gesture.x,gesture.y,0,1);
    }
    if (gesture.down) mouse("mousemove",e.clientX,e.clientY,gesture.right?2:0,gesture.right?2:1);
});
function endPointer(e) {
    if (!fingers.has(e.pointerId)) return;
    e.preventDefault();
    if (e.type==="pointerup" || (gesture && gesture.down)) finishPress(e.clientX,e.clientY);
    clearTimeout(holdTimer);fingers.delete(e.pointerId);
    if (!fingers.size) gesture=null;
}
canvas.addEventListener("pointerup",endPointer);
canvas.addEventListener("pointercancel",endPointer);
for (const event of ["touchstart","touchend","touchmove","touchcancel"]) {
    canvas.addEventListener(event,e=>{e.preventDefault();e.stopImmediatePropagation();},{capture:true,passive:false});
}
canvas.addEventListener("contextmenu",e=>e.preventDefault());

function makeFs(type, options) {
    return new Promise((resolve,reject)=>BrowserFS.FileSystem[type].Create(options,(error,fs)=>error?reject(error):resolve(fs)));
}
let step="opening the package";
async function readAsset(name) {
    const response=await fetch(name);
    if (!response.ok) throw new Error("Could not read "+name+" ("+response.status+")");
    return new Uint8Array(await response.arrayBuffer());
}
function cacheArchive(archive) {
    const recent=new Map();
    let heldBytes=0;
    for (let i=0; i<archive.getNumberOfCentralDirectoryEntries(); i++) {
        const entry=archive.getCentralDirectoryEntryAt(i);
        const length=entry.uncompressedSize();
        if (entry.isDirectory() || length<8192 || length>12*1024*1024) continue;
        const read=entry.getData.bind(entry);
        entry.getData=()=>{
            if(recent.has(entry)){
                const existing=recent.get(entry);recent.delete(entry);recent.set(entry,existing);return existing;
            }
            const data=read();recent.set(entry,data);heldBytes+=data.length;
            while(heldBytes>48*1024*1024){
                const oldest=recent.keys().next().value;heldBytes-=recent.get(oldest).length;recent.delete(oldest);
            }
            return data;
        };
    }
}
function createLabDisk(bytes, reagentArchive) {
    const fields=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    const names=new TextDecoder('utf-8');
    if (names.decode(bytes.subarray(0,4))!=="RCLB" || fields.getUint32(4,true)!==2101)
        throw new Error("The simulator package is incomplete");
    const mem=new BrowserFS.FileSystem.InMemory();
    const folders=new Set(["/"]);
    const Buffer=BrowserFS.BFSRequire("buffer").Buffer;
    // Populate through BrowserFS's public filesystem API, using only package data.
    BrowserFS.initialize(mem);
    const paths=BrowserFS.BFSRequire("fs");
    let off=8;
    for(let i=0;i<2101;i++){
        const count=fields.getUint32(off,true),size=fields.getUint32(off+4,true);off+=8;
        const name=names.decode(bytes.subarray(off,off+count));off+=count;
        if(count===0 || off+size>bytes.length || name.startsWith("/") || name.split("/").includes(".."))
            throw new Error("Invalid application resource");
        const file="/"+name;
        const segments=file.split("/");segments.pop();
        let dir="";
        for (const segment of segments.filter(Boolean)) {
            dir+="/"+segment;
            if (!folders.has(dir)) {paths.mkdirSync(dir);folders.add(dir);}
        }
        const data=Buffer.from(bytes.buffer,bytes.byteOffset+off,size);
        paths.writeFileSync(file,data);
        if(name==="CrocodileChemistry.exe") paths.writeFileSync("/rabbit.exe",data);
        off+=size;
    }
    if(off!==bytes.length || paths.statSync("/rabbit.exe").size!==466944)
        throw new Error("Incomplete application drive");
    for (const path of [
        "/chemistry.domain/Resources/datafile.xml",
        "/chemistry.domain/parts/reagents.xml",
        "/product/Parts/chemistry.xml",
        "/Stockroom.cxc"
    ]) {
        paths.writeFileSync(path, reagentArchive.getCentralDirectoryEntry(path).getData());
    }
    return mem;
}
async function persistent(name) {
    const disk=await makeFs("IndexedDB",{storeName:name});
    return makeFs("AsyncMirror",{sync:new BrowserFS.FileSystem.InMemory(),async:disk});
}
async function mountDesktop() {
    const [system, application, reagents] = await Promise.all([
        readAsset("desktop.zip"), readAsset("simulator.pack"), readAsset("reagent-library-33.zip")
    ]);
    console.log("Package bytes",system.length,application.length);
    showMessage("Preparing the simulator…");
    step="reading the desktop system";
    const buffer=BrowserFS.BFSRequire("buffer").Buffer.from(system.buffer,system.byteOffset,system.length);
    const base=await makeFs("ZipFS",{zipData:buffer});
    console.log("System files",base.getNumberOfCentralDirectoryEntries());
    cacheArchive(base);
    step="loading the reagent library";
    const reagentBuffer=BrowserFS.BFSRequire("buffer").Buffer.from(reagents.buffer,reagents.byteOffset,reagents.byteLength);
    const reagentArchive=await makeFs("ZipFS",{zipData:reagentBuffer});
    const lab=createLabDisk(application,reagentArchive);
    step="opening saved work";
    const disk=await persistent("RabbitChemistryDisk");
    const labChanges=await persistent("RabbitChemistryProgramChanges");
    const desktop=await makeFs("OverlayFS",{readable:base,writable:disk});
    const applicationDisk=await makeFs("OverlayFS",{readable:lab,writable:labChanges});
    step="mounting the simulator drives";
    const mounts=new BrowserFS.FileSystem.MountableFileSystem();
    mounts.mount("/root/base",desktop);
    mounts.mount("/root/base/tmp",new BrowserFS.FileSystem.InMemory());
    mounts.mount("/root/files",applicationDisk);
    BrowserFS.initialize(mounts);
    FS.mkdir("/root");
    FS.mount(new BrowserFS.EmscriptenFS(),{root:"/root"},"/root");
    const registry="/root/base/home/username/.wine/user.reg";
    const before=FS.readFile(registry,{encoding:"utf8"});
    const section=["[Software","crocodile-clips","Rabbit Chemistry]"].join(String.fromCharCode(92,92));
    const lines=before.split("\n");
    const start=lines.findIndex(line=>line.startsWith(section));
    const setting='"ShowWelcomeDialog"=dword:00000000';
    if(start<0) lines.push("",section,setting,"");
    else {
        let end=start+1;
        while(end<lines.length && !lines[end].startsWith("[")) end++;
        const key=lines.slice(start+1,end).findIndex(line=>line.startsWith('"ShowWelcomeDialog"='));
        if(key>=0) lines[start+1+key]=setting;
        else lines.splice(start+1+(lines[start+1]?.startsWith("#time=")?1:0),0,setting);
    }
    const updated=lines.join("\n");
    if(updated!==before) FS.writeFile(registry,updated);
    step="checking the simulator executable";
    const item=FS.readFile("/root/files/rabbit.exe");
    console.log("Application drive",item.length,item[0],item[1],FS.readdir("/root/files").length);
    if (item.length!==466944 || item[0]!==77 || item[1]!==90) throw new Error("Incomplete Windows executable");
    showMessage("Starting Rabbit Chemistry…");
}
var Module={
    canvas,
    // Keep the original desktop independent of the phone's CSS pixel dimensions.
    guestDisplayWidth:1024,
    guestDisplayHeight:768,
    arguments:["-root","/root/base","-mount_drive","/root/files/","d","-nozip","-resolution","1024x768","-w","/home/username/.wine/dosdevices/d:","/bin/wine","d:\\rabbit.exe","-nosplash",...(openStockroom ? ["d:\\Stockroom.cxc"] : [])],
    preRun:[function(){
        ENV.SDL_RENDER_DRIVER="software";
        Module.addRunDependency("desktop");
        mountDesktop().then(()=>Module.removeRunDependency("desktop")).catch(e=>{
            const reason=String(e && (e.message || e.code || e.errno) || e);
            console.error("Startup failed",step,reason,JSON.stringify(e,Object.getOwnPropertyNames(e||{})));
            showMessage("Stopped while "+step+". "+reason);
        });
    }],
    print:function(line) {
        console.log(line);
        if(String(line).includes("wine: cannot find") && String(line).toLowerCase().includes("rabbit.exe")){
            showMessage("The simulator could not start. Close Rabbit Chemistry and reopen it.");
        }
        if (String(line).includes("Creating Window")) {statusLabel.hidden=true;sizeDesktop();canvas.focus();}
    },
    printErr:line=>console.warn(line),
    onAbort:()=>showMessage("Rabbit Chemistry stopped. Reopen the app to return to the lab."),
    onExit:()=>{statusLabel.style.pointerEvents="auto";showMessage("Rabbit Chemistry has closed. Tap here to reopen it.");}
};
statusLabel.addEventListener("click",()=>location.reload());
