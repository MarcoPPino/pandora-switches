const Readable = require("stream").Readable;  
const util = require("util");  
util.inherits(MyStream, Readable);  
function MyStream(opt) {  
  Readable.call(this, opt);
}
MyStream.prototype._read = function() {};  
// hook in our stream
process.__defineGetter__("stdin", function() {  
  if (process.__stdin) return process.__stdin;
  process.__stdin = new MyStream();
  return process.__stdin;
});

// then Johnny-Five code goes below here

const five = require('johnny-five');
const board = new five.Board({
	repl: false
});

const axes = {
  horizontal: new THREE.Vector3(1, 0, 0),
  vertical: new THREE.Vector3(0, 1, 0)
}
const rotations = [
  null, {axis: 'horizontal', direction: 1}, null,
  {axis: 'vertical', direction: 1},   null,  {axis: 'vertical', direction: -1},
  null, {axis: 'horizontal', direction: -1}, null
];

let rotationTween, openingTween;
let camera, controls, scene, renderer;
let cube;
const cubeSize = 100;

let currentRiddle;

const riddle1Solution = [6, 8, 5, 0, 1, 2, 3, 7];
let riddle1Solved = 0;

board.on("ready", function() {
  // create buttons
  const buttons = [];
  let cubeOpen = false, foremostSide;
  // const directions = [
  //   [-1, -1], [0, -1], [1, -1],
  //   [-1,  0],   null,  [1,  0],
  //   [-1,  1], [0,  1], [1,  1]
  // ];
  const directions = [
    [-1, -1], ['x', -1], [1, -1],
    [-1,  0],   null,  [1,  0],
    [-1,  1], ['x', 1], [1,  1]
  ];

  for (var i = 0; i < 9; i++) {
		const button = new five.Button({
			pin: i+2,
			isPullup: true
		});
		button.index = i;
    // open cube button
    if(i == 4){
      button.on('press', function(){
        if(!cubeOpen){
          console.log('opening cube..')
          foremostSide = findForemostSide();
          // abort if cube is currently rotating
          if(!foremostSide) return; 

          // riddle 1
          currentRiddle = 1;
          addCircles();
          for(let index of riddle1Solution){
            const sphereIndex = index < 4 ? index : index - 1;
            setTimeout(function(){
              spheres.children[sphereIndex].material.color.set(0x2f992f);
            }, 1000+180*sphereIndex);
            setTimeout(function(){
              spheres.children[sphereIndex].material.color.set('hsl(0, 0%, 60%)');
            }, 1100+180*sphereIndex);
          }

          let startValue = foremostSide.position.y;
          if(openingTween){
            openingTween.stop();
          }
          openingTween = new TWEEN.Tween({offset: startValue})
            .to({offset: startValue-cubeSize}, 750)
            .onUpdate(function(){
              foremostSide.position.y = this.offset;
            })
            .start();

          cubeOpen = true;
        }
      });
      button.on('release', function(){
        if(cubeOpen){
          console.log('closing cube..')
          foremostSide = findForemostSide();
          // abort if cube is currently rotating
          if(!foremostSide) return; 

          let startValue = foremostSide.position.y;
          if(openingTween){
            openingTween.stop();
          }
          openingTween = new TWEEN.Tween({offset: startValue})
            .to({offset: startValue+cubeSize}, 750)
            .onUpdate(function(){
              foremostSide.position.y = this.offset;
            })
            .start();
          cubeOpen = false;
        }
      });
    }
    else{
      button.on('press', buttonPress);
      button.on('release', buttonRelease);
    }

		buttons.push(button);
  }

  function buttonPress(){
    if(!cubeOpen){
      const rotation = rotations[this.index];
      if(rotationTween){rotationTween.end();rotationTween.stop();}

      var q = new THREE.Quaternion(); // create once and reuse
      q.setFromAxisAngle(axes[rotation.axis], Math.PI/2*rotation.direction ); // axis must be normalized, angle in radians
      q.multiply(cube.quaternion);

      rotationTween = new TWEEN.Tween({tweenVal: 0})
          .to({tweenVal: 1}, 2000)
          .onUpdate(function(){
            cube.quaternion.slerp(q, this.tweenVal);
          })
          .start();
    }
    else{
      if(currentRiddle == 1){
        const sphereIndex = this.index < 4 ? this.index : this.index - 1;
        if(riddle1Solution[riddle1Solved] == this.index){
          // richtiger button
          spheres.children[sphereIndex].material.color.set(0x2f992f);
          riddle1Solved++;
          if(riddle1Solved == 8){
            findForemostSide().material.color.set(0x2f992f);
            currentRiddle++; // after closed again?
          }
        }
        else{
          // negative feedback
          for(let sphere of spheres.children){
            sphere.material.color.set(0x992f2f);
            const interval = setTimeout(function(){
              sphere.material.color.set('hsl(0, 0%, 60%)');
            }, 150);
          }          
          riddle1Solved = 0;
        }
      }
    }
  }
  function buttonRelease(){
    if(currentRiddle == 1){
      const index = this.index < 4 ? this.index : this.index - 1;
      // spheres.children[index].material.color.set('hsl(0, 0%, 60%)');
    }
  }

  

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
  camera.position.set(0, 60 ,150);
  camera.lookAt(new THREE.Vector3(0,-10,0));

  // lights
  scene.add( new THREE.AmbientLight( 0xbbbbbb ) );
  var pointLight = new THREE.PointLight( 0xffffff, 1);
  // pointLight.castShadow = true;
  // pointLight.position.set(-100,100,100);
  pointLight.position.set(0, 100, 300);
  scene.add(pointLight);


  cube = new THREE.Object3D();
  let targetRotation = {x: 0, y:0, z: 0};
  const sides = [];
  const sideGeometry = new THREE.PlaneGeometry(cubeSize, cubeSize);  
  const sidePositions = [
    [0,0,cubeSize/2],
    [cubeSize/2,0,0,'y'],
    [0,0,-cubeSize/2],
    [-cubeSize/2,0,0,'y'],
    [0,cubeSize/2,0,'x'],
    [0,-cubeSize/2,0,'x']
  ];

  for(let i=0; i<6; i++){
    const sideMaterial = new THREE.MeshLambertMaterial({
      shading: THREE.FlatShading,
      color: new THREE.Color(`hsl(0, 0%, 50%)`),
      side: THREE.DoubleSide,
      transparent: true
    });
    var side = new THREE.Mesh(sideGeometry, sideMaterial);
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

  function addCircles(){

    spheres = new THREE.Group();
    spheres.position.x = -cubeSize/2;
    spheres.position.y = cubeSize/2;
    scene.add(spheres);
    for(let i=0; i<8; i++){
      const sphereMaterial = new THREE.MeshLambertMaterial({
        shading: THREE.FlatShading,
        color: new THREE.Color('hsl(0, 0%, 60%)')
      });
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(7.5, 32, 32), sphereMaterial);
      spheres.add(sphere);
    }
    const spherePositions = [
      [cubeSize/6, -cubeSize/6],
      [cubeSize/6+cubeSize/3, -cubeSize/6],
      [cubeSize/6+cubeSize/3*2, -cubeSize/6],
      // -----------------
      [cubeSize/6, -(cubeSize/6+cubeSize/3)],
      [cubeSize/6+cubeSize/3*2, -(cubeSize/6+cubeSize/3)],
      // -----------------
      [cubeSize/6, -(cubeSize/6+cubeSize/3*2)],
      [cubeSize/6+cubeSize/3, -(cubeSize/6+cubeSize/3*2)],
      [cubeSize/6+cubeSize/3*2, -(cubeSize/6+cubeSize/3*2)],
    ];
    spheres.children.forEach(function(sphere, index){
      sphere.position.set(spherePositions[index][0], spherePositions[index][1], 0);
    });
  }
  function findForemostSide(){
    return sides.find(side => {
      const vector = new THREE.Vector3();
      return vector.setFromMatrixPosition( side.matrixWorld ).z == 50;
    });
  }

});