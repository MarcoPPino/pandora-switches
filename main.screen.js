const axes = {
  horizontal: new THREE.Vector3(1, 0, 0),
  vertical: new THREE.Vector3(0, 1, 0)
}
const rotations = [
  null, {axis: 'horizontal', direction: 1}, null,
  {axis: 'vertical', direction: 1},   null,  {axis: 'vertical', direction: -1},
  null, {axis: 'horizontal', direction: -1}, null
];

let currentTween;

$(document).on('keyup', function(e){
  if(e.key == 'o'){
    // 1. find side that is nearest to camera in world space
    const foremostSide = sides.find(side => {
      const vector = new THREE.Vector3();
      return vector.setFromMatrixPosition( side.matrixWorld ).z == 50;
    });
    // foremostSide.rotation.x  = Math.PI/4;
    new TWEEN.Tween({opacity: 1})
        .to({opacity: 0}, 1000)
        .onUpdate(function(){
          foremostSide.material.opacity = this.opacity;
        })
        .start();
    // 3. rotate that side 90deg around front bottom edge
    // 4. use fancy tweening
    // 5. block other buttons when box is open
    return;
  }
  let index = false;
  switch(e.key){
    case 'ArrowUp':
      index = 1;
      break;
    case 'ArrowRight':
      index = 5;
      break;
    case 'ArrowDown':
      index = 7;
      break;
    case 'ArrowLeft':
      index = 3;
      break;
  }
  if(!index) return;

  const rotation = rotations[index];
  if(currentTween){currentTween.end();currentTween.stop();}

  var q = new THREE.Quaternion(); // create once and reuse
  q.setFromAxisAngle(axes[rotation.axis], Math.PI/2*rotation.direction ); // axis must be normalized, angle in radians
  q.multiply(cube.quaternion);

  currentTween = new TWEEN.Tween({tweenVal: 0})
      .to({tweenVal: 1}, 2000)
      .onUpdate(function(){
        cube.quaternion.slerp(q, this.tweenVal);
      })
      .start();
})
var camera, controls, scene, renderer;

renderer = new THREE.WebGLRenderer({
  antialias: true
});
renderer.setClearColor( 0xffffff, 1 );
renderer.setSize(window.innerWidth, window.innerHeight);
// renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);

scene = new THREE.Scene();

camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(0, 60 ,160);
camera.lookAt(new THREE.Vector3(0,10,0));

// lights
scene.add( new THREE.AmbientLight( 0xbbbbbb ) );
var pointLight = new THREE.PointLight( 0xffffff, 1);
// pointLight.castShadow = true;
// pointLight.position.set(-100,100,100);
pointLight.position.set(0, 100, 300);
scene.add(pointLight);


const cube = new THREE.Object3D();
let targetRotation = {x: 0, y:0, z: 0};
const sides = [];
const sideGeometry = new THREE.PlaneGeometry(100, 100);  
const cubeSize = 50;
const sidePositions = [
  [0,0,cubeSize],
  [cubeSize,0,0,'y'],
  [0,0,-cubeSize],
  [-cubeSize,0,0,'y'],
  [0,cubeSize,0,'x'],
  [0,-cubeSize,0,'x']
];

for(let i=0; i<6; i++){
  const sideMaterial = new THREE.MeshLambertMaterial({
    shading: THREE.FlatShading,
    color: new THREE.Color(`hsl(0, 0%, 50%)`),
    side: THREE.DoubleSide,
    transparent: true
  });
  var side = new THREE.Mesh(sideGeometry, sideMaterial);
  side.castShadow = true;
  side.receiveShadow = true;
  side.position.set(sidePositions[i][0],sidePositions[i][1],sidePositions[i][2]);
  if(sidePositions[i][3]){
    side.rotation[sidePositions[i][3]] = Math.PI/2;
  }
  sides.push(side);
  cube.add(side);
}

for(let side of sides){
  cube.add(side);
}

scene.add(cube);

let currentTime;
function animate(time) {
  currentTime = time;
  requestAnimationFrame(animate);
  TWEEN.update(time);
  renderer.render(scene, camera);
}

animate();