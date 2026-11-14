import * as THREE from './vendor/three.module.js';
export const CASTLE_HEIGHT=.31;
export function createCastleGeometry(){
 // Vier breite Ecken mit mittigen Aussparungen, flach auf der XZ-Ebene.
 const pts=[[-.41,-.41],[-.13,-.41],[-.13,-.32],[.13,-.32],[.13,-.41],[.41,-.41],[.41,-.13],[.32,-.13],[.32,.13],[.41,.13],[.41,.41],[.13,.41],[.13,.32],[-.13,.32],[-.13,.41],[-.41,.41],[-.41,.13],[-.32,.13],[-.32,-.13],[-.41,-.13]];
 const shape=new THREE.Shape();pts.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:.26,steps:1,bevelEnabled:true,bevelSegments:3,bevelSize:.025,bevelThickness:.025,curveSegments:1});
 geometry.rotateX(-Math.PI/2);geometry.translate(0,.025,0);geometry.computeVertexNormals();return geometry;
}
