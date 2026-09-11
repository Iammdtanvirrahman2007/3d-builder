import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { TransformControls } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/TransformControls.js';

/*
  Scale-side correction layer.
  The editor's main scale handler keeps the dragged face centered by default.
  This layer detects which visible scale handle side was grabbed and corrects
  the center offset so Mirror OFF keeps the opposite face fixed.
*/

const state = new WeakMap();
const originalSetMode = TransformControls.prototype.setMode;
const originalAttach = TransformControls.prototype.attach;

function axisKey(axis){
  if(axis==='X')return'x';
  if(axis==='Y')return'y';
  if(axis==='Z')return'z';
  return null;
}

function localSize(object,axis){
  if(!object?.geometry?.computeBoundingBox)return 1;
  object.geometry.computeBoundingBox();
  const b=object.geometry.boundingBox;
  return Math.max(0.0001,b.max[axis]-b.min[axis]);
}

function pointerNdc(event,dom){
  const r=dom.getBoundingClientRect();
  return new THREE.Vector2(
    ((event.clientX-r.left)/r.width)*2-1,
    -((event.clientY-r.top)/r.height)*2+1
  );
}

function getHandleSide(control,event,object,axis){
  const helper=control.getHelper?.();
  if(!helper)return 1;

  const ndc=pointerNdc(event,control.domElement);
  const ray=new THREE.Raycaster();
  ray.setFromCamera(ndc,control.camera);
  const hits=ray.intersectObject(helper,true);
  const hit=hits.find(h=>h.object?.visible && h.object?.name?.includes(axis));
  if(!hit)return 1;

  // Transform the picked point into the object's local space. This works even
  // when TransformControls visually flips the handle because it is behind the camera.
  const p=hit.point.clone();
  object.worldToLocal(p);
  const value=p[axis.toLowerCase()];
  return value<0?-1:1;
}

function setup(control){
  if(state.has(control))return;
  const s={drag:null};
  state.set(control,s);

  control.addEventListener('mouseDown',()=>{
    if(control.getMode()!=='scale'||!control.object)return;
    // The DOM pointer event is captured below. mouseDown only resets stale state.
    s.drag=null;
  });

  control.domElement.addEventListener('pointerdown',event=>{
    if(control.getMode()!=='scale'||!control.object||event.button!==0)return;

    // TransformControls handles its own pointerdown listener first, so axis is
    // already known here.
    const axis=axisKey(control.axis);
    if(!axis)return;

    const object=control.object;
    const side=getHandleSide(control,event,object,axis);
    s.drag={
      object,
      axis,
      side,
      startScale:object.scale.clone(),
      startPosition:object.position.clone(),
      startQuaternion:object.quaternion.clone()
    };
  });

  control.addEventListener('objectChange',()=>{
    const d=s.drag;
    if(!d||control.getMode()!=='scale'||control.object!==d.object)return;

    const mirror=document.querySelector('#mirrorBtn')?.classList.contains('on')||false;
    const uniform=document.querySelector('#uniformBtn')?.classList.contains('on')||false;
    const o=d.object;

    if(mirror){
      // Mirror ON: keep the original center fixed.
      o.position.copy(d.startPosition);
      return;
    }

    const axes=uniform?['x','y','z']:[d.axis];
    const shift=new THREE.Vector3();

    axes.forEach(a=>{
      const delta=o.scale[a]-d.startScale[a];
      const amount=delta*localSize(o,a)/2;
      shift[a]=amount*d.side;
    });

    shift.applyQuaternion(d.startQuaternion);
    o.position.copy(d.startPosition).add(shift);
  });

  control.addEventListener('mouseUp',()=>{s.drag=null});
}

TransformControls.prototype.setMode=function(mode){
  const result=originalSetMode.call(this,mode);
  setup(this);
  return result;
};

TransformControls.prototype.attach=function(object){
  const result=originalAttach.call(this,object);
  setup(this);
  return result;
};
