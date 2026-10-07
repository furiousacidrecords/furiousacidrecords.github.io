// Character geometry and animation from the author's Furious Roll game.
// Source: https://furiousacid.grok.me/assets/engine-BocyvfZ_.js
import * as THREE from '../vendor/three.module.js';
const Pc=new THREE.SphereGeometry(1,14,10), Fc=new THREE.BoxGeometry(1,1,1), Ic=new THREE.CylinderGeometry(1,1,1,10), Lc=new THREE.ConeGeometry(1,1,8);
const ramp=new THREE.DataTexture(new Uint8Array([92,92,92,255,141,141,141,255,200,200,200,255,255,255,255,255]),4,1,THREE.RGBAFormat);
ramp.minFilter=ramp.magFilter=THREE.NearestFilter;ramp.colorSpace=THREE.NoColorSpace;ramp.needsUpdate=true;
const toon=new Map(),basic=new Map();
function gc(color){if(!toon.has(color))toon.set(color,new THREE.MeshToonMaterial({color,gradientMap:ramp}));return toon.get(color);}
function _c(color,opacity=1){const key=color+':'+opacity;if(!basic.has(key))basic.set(key,new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:opacity>=1}));return basic.get(key);}
function $(parent,geometry,color,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0,unlit=false){const part=new THREE.Mesh(geometry,unlit?_c(color):gc(color));part.position.set(x,y,z);part.scale.set(sx,sy,sz);part.rotation.set(rx,ry,rz);part.castShadow=part.receiveShadow=true;parent.add(part);return part;}
export function createRollCharacter() {
    let e = new THREE.Group, t = new THREE.Group;
    e.add(t);
    let n = new THREE.Group;
    n.position.set(.02, 0, -1.15), t.add(n), $(n, Pc, 8011007, 0, .42, 0, .4, .36, .46), 
    $(n, Pc, 9130751, 0, .86, -.08, .32, .3, .3);
    let r = $(n, Pc, 6958816, -.12, 1.28, -.02, .1, .42, .08, .15, 0, .35), i = $(n, Pc, 6958816, .12, 1.28, -.02, .1, .42, .08, .15, 0, -.35);
    $(n, Pc, 16722474, -.1, .9, -.24, .07, .08, .05, 0, 0, 0, !0), $(n, Pc, 16722474, .1, .9, -.24, .07, .08, .05, 0, 0, 0, !0), 
    $(n, Pc, 16774890, -.1, .93, -.28, .025, .025, .02, 0, 0, 0, !0), $(n, Pc, 16774890, .1, .93, -.28, .025, .025, .02, 0, 0, 0, !0);
    let a = $(n, Ic, 8011007, -.28, .48, -.05, .08, .42, .08, -1.15, 0, .4), o = $(n, Ic, 8011007, .28, .48, -.05, .08, .42, .08, -1.15, 0, -.4);
    $(n, Pc, 6958816, -.16, .16, .08, .12, .1, .16), $(n, Pc, 6958816, .16, .16, .08, .12, .1, .16), 
    $(n, Pc, 16758496, 0, .78, -.32, .06, .04, .04);
    let s = new THREE.Group;
    s.position.set(0, .86, .34), s.scale.setScalar(.78), t.add(s), $(s, Pc, 6958816, 0, .48, 0, .26, .3, .24), 
    $(s, Pc, 16765514, 0, .46, -.16, .16, .2, .08), $(s, Fc, 5973956, 0, .86, -.02, .28, .26, .24);
    let c = $(s, Lc, 5973956, -.1, 1.12, 0, .08, .32, .06, .1, 0, .4), l = $(s, Lc, 5973956, .1, 1.12, 0, .08, .32, .06, .1, 0, -.4);
    $(s, Pc, 16774890, -.07, .88, -.14, .055, .06, .04), $(s, Pc, 16774890, .07, .88, -.14, .055, .06, .04), 
    $(s, Pc, 1708072, -.07, .88, -.17, .028, .032, .02), $(s, Pc, 1708072, .07, .88, -.17, .028, .032, .02);
    let u = $(s, Ic, 5973956, -.22, .62, -.05, .06, .4, .06, -1.25, 0, .35), d = $(s, Ic, 5973956, .22, .62, -.05, .06, .4, .06, -1.25, 0, -.35), f = new THREE.Group;
    f.position.set(0, .9, -.16), s.add(f), $(f, Fc, 1708072, -.07, 0, 0, .09, .045, .03), 
    $(f, Fc, 1708072, .07, 0, 0, .09, .045, .03), $(f, Fc, 1708072, 0, 0, 0, .06, .02, .02);
    let p = new THREE.Group;
    p.position.set(0, 0, -.12), t.add(p);
    let m = $(p, Ic, 3806312, -.11, .26, .02, .07, .46, .07), h = $(p, Ic, 3806312, .11, .26, .02, .07, .46, .07);
    $(p, Pc, 16249316, -.12, .06, -.08, .11, .05, .18), $(p, Pc, 16249316, .12, .06, -.08, .11, .05, .18), 
    $(p, Pc, 16249316, 0, .7, 0, .32, .34, .3), $(p, Pc, 13219814, 0, .72, -.18, .16, .18, .1), 
    $(p, Pc, 4050542, 0, .76, -.26, .055, .055, .04, 0, 0, 0, !0), $(p, Pc, 16774890, 0, .84, .26, .14, .13, .12);
    let g = new THREE.Group;
    g.position.set(0, 1.18, -.06), g.rotation.y = -.95, p.add(g), $(g, Pc, 16249316, 0, 0, 0, .28, .26, .26), 
    $(g, Pc, 16249316, 0, -.1, -.2, .11, .08, .1), $(g, Pc, 16731533, 0, -.06, -.28, .04, .032, .03), 
    $(g, Fc, 16774890, -.03, -.16, -.28, .03, .06, .022), $(g, Fc, 16774890, .03, -.16, -.28, .03, .06, .022), 
    $(g, Pc, 16774890, -.11, .06, -.18, .08, .09, .055), $(g, Pc, 16774890, .11, .06, -.18, .08, .09, .055), 
    $(g, Pc, 1708072, -.11, .06, -.22, .04, .045, .03), $(g, Pc, 1708072, .11, .06, -.22, .04, .045, .03), 
    $(g, Pc, 16774890, -.09, .09, -.24, .016, .016, .012, 0, 0, 0, !0), $(g, Pc, 16774890, .13, .09, -.24, .016, .016, .012, 0, 0, 0, !0);
    let _ = new THREE.Group;
    _.position.set(-.12, .2, .02), _.rotation.z = .28, g.add(_), $(_, Pc, 16249316, 0, .34, 0, .08, .4, .055), 
    $(_, Pc, 16748228, 0, .32, -.03, .045, .26, .03), $(_, Ic, 13219814, 0, .02, 0, .06, .05, .06);
    let v = new THREE.Group;
    v.position.set(.12, .2, .02), v.rotation.z = -.28, g.add(v), $(v, Pc, 16249316, 0, .34, 0, .08, .4, .055), 
    $(v, Pc, 16748228, 0, .32, -.03, .045, .26, .03), $(v, Ic, 13219814, 0, .02, 0, .06, .05, .06);
    let y = $(p, Ic, 16249316, -.32, .78, -.06, .07, .42, .07, -1.2, 0, .45), b = $(p, Ic, 16249316, .32, .78, -.06, .07, .42, .07, -1.2, 0, -.45);
    $(p, Pc, 16758496, -.46, .52, -.32, .07, .06, .07), $(p, Pc, 16758496, .46, .52, -.32, .07, .06, .07);
    let x = $(p, Ic, 3806312, -.14, 1.02, .18, .028, .2, .028, .7, 0, .15), S = $(p, Ic, 3806312, .14, 1.02, .18, .028, .2, .028, .7, 0, -.15);
    $(p, Pc, 4050542, -.16, 1.16, .08, .04, .04, .04, 0, 0, 0, !0), $(p, Pc, 4050542, .16, 1.16, .08, .04, .04, .04, 0, 0, 0, !0);
    let C = new THREE.Mesh(Ic, _c(13986815, .65));
    C.scale.set(.022, .36, .022), C.rotation.x = Math.PI / 2, C.position.set(0, 1.12, .18), 
    t.add(C);
    let w = [];
    for (let e = 0; e < 2; e++) {
        let n = new THREE.Mesh(new THREE.TorusGeometry(.34 + e * .1, .025, 6, 18), _c(13986815, .55));
        n.position.set(0, .85, -.15 + e * .08), t.add(n), w.push(n);
    }
    let T = new THREE.PointLight(11820287, 1.4, 6, 2);
    T.position.set(0, 1.1, -.2), t.add(T);
    function E(e, n, s, p) {
        let g = Math.min(1, Math.abs(n) / 3), T = e * (3 + g * 10);
        t.position.y = Math.abs(Math.sin(T)) * .05 * (p ? 1 : g), t.rotation.z = -s * .28, 
        t.rotation.x = p ? -.05 : -.22 - g * .06;
        let E = Math.sin(T) * (p ? .35 : .45 * g + .08);
        m.rotation.x = E, h.rotation.x = -E, r.rotation.x = .15 + Math.sin(T) * .12, i.rotation.x = .15 + Math.sin(T + .4) * .12, 
        c.rotation.z = .4 + Math.sin(T) * .08, l.rotation.z = -.4 - Math.sin(T) * .08, _.rotation.x = Math.sin(e * 2.1) * .06, 
        v.rotation.x = Math.sin(e * 2.1 + .7) * .06;
        let D = p ? Math.sin(e * 6) * .12 : Math.sin(T) * .08;
        x.rotation.z = .15 + D, S.rotation.z = -.15 - D, p ? (_.rotation.z = .06, v.rotation.z = -.06, 
        d.rotation.x = -.4 + Math.sin(e * 6) * .12, d.rotation.z = -1.4, u.rotation.x = -.9, 
        y.rotation.x = -.7 + Math.sin(e * 5) * .2, b.rotation.x = -.7, f.position.y = .9) : (_.rotation.z = .28, 
        v.rotation.z = -.28, u.rotation.x = -.85, d.rotation.x = -.85, u.rotation.z = .55, 
        d.rotation.z = -.55, y.rotation.x = -1.2 + E * .15, b.rotation.x = -1.2 - E * .15, 
        f.position.y = n > 4 ? .9 : 1.08), a.rotation.x = -1.15 + E * .1, o.rotation.x = -1.15 - E * .1;
        for (let t = 0; t < w.length; t++) {
            let n = w[t];
            n.rotation.z = e * (1.4 + t) * (t % 2 ? -1 : 1), n.rotation.x = Math.sin(e * 2 + t) * .4;
        }
        C.scale.y = .34 + Math.sin(e * 8) * .03;
    }
    return {
        group: e,
        reach: 1.6099999999999999,
        update: E
    };
}
