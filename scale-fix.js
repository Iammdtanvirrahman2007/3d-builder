import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { TransformControls } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/TransformControls.js';

/*
  Transform gizmo fixes.
  1. Keep all six axis handles visible even when part of the gizmo is behind
     the selected mesh. This matches a modeling-editor gizmo rather than a
     normal scene object.
  2. Keep the scale-side correction used by the editor's Mirror/Uniform modes.
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

  const p=hit.point.clone();
  object.worldToLocal(p);
  const value=p[axis.toLowerCase()];
  return value<0?-1:1;
}

function fixGizmoVisibility(control){
  const helper=control.getHelper?.();
  if(!helper)return;

  helper.traverse(node=>{
    if(!node.material)return;
    const materials=Array.isArray(node.material)?node.material:[node.material];
    materials.forEach(material=>{
      // Gizmo handles are editor controls, not scene geometry. They must stay
      // visible when their shafts pass through the selected object.
      material.depthTest=false;
      material.depthWrite=false;
      material.transparent=material.transparent||false;
    });
    node.renderOrder=10000;
  });
}

function setup(control){
  if(state.has(control))return;
  const s={drag:null};
  state.set(control,s);
  fixGizmoVisibility(control);

  control.addEventListener('mouseDown',()=>{
    fixGizmoVisibility(control);
    if(control.getMode()!=='scale'||!control.object)return;
    s.drag=null;
  });

  control.domElement.addEventListener('pointerdown',event=>{
    fixGizmoVisibility(control);
    if(control.getMode()!=='scale'||!control.object||event.button!==0)return;

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
    fixGizmoVisibility(control);
    const d=s.drag;
    if(!d||control.getMode()!=='scale'||control.object!==d.object)return;

    const mirror=document.querySelector('#mirrorBtn')?.classList.contains('on')||false;
    const uniform=document.querySelector('#uniformBtn')?.classList.contains('on')||false;
    const o=d.object;

    if(mirror){
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

  control.addEventListener('mouseUp',()=>{s.drag=null;fixGizmoVisibility(control)});
}

TransformControls.prototype.setMode=function(mode){
  const result=originalSetMode.call(this,mode);
  setup(this);
  fixGizmoVisibility(this);
  return result;
};

TransformControls.prototype.attach=function(object){
  const result=originalAttach.call(this,object);
  setup(this);
  fixGizmoVisibility(this);
  return result;
};
