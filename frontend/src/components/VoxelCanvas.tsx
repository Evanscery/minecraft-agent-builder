import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import type { PreviewData, ProjectSpec, MaterialRecord, PreviewBlock } from '../types/project';
import { blockColor, categoryFor, regionColor } from '../utils/colors';

export type CameraPreset = 'iso' | 'front' | 'side' | 'top';
export type GroundMode = 'void' | 'superflat';
export type SkyMode = 'sky' | 'day' | 'night';
export type FaceDir = 'top' | 'bottom' | 'north' | 'south' | 'east' | 'west';

interface VoxelCanvasProps {
  preview: PreviewData;
  spec: ProjectSpec;
  materials: MaterialRecord[];
  selectedRegionId: string | null;
  selectedBlock: { x: number; y: number; z: number } | null;
  viewMode: 'full' | 'region' | 'layer' | 'material' | 'interface' | 'error';
  layerY: number;
  selectedMaterialId: string | null;
  interactionMode: 'view' | 'edit';
  tool: 'select' | 'inspect' | 'paint' | 'erase' | 'build' | 'box';
  showRegionBoundary: boolean;
  showInterfaces: boolean;
  showErrors: boolean;
  xray: boolean;
  groundMode: GroundMode;
  skyMode: SkyMode;
  interfaceCells: Set<string>;
  errorRegions: Set<string>;
  cameraSignal: { preset: CameraPreset; nonce: number } | null;
  resetSignal: number;
  onSelectBlock: (coord: { x: number; y: number; z: number } | null) => void;
  onPaintBlock: (coord: { x: number; y: number; z: number }) => void;
  onEraseBlock: (coord: { x: number; y: number; z: number }) => void;
  onBuildBlock: (coord: { x: number; y: number; z: number }, face: FaceDir) => void;
}

interface SceneRefs {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  blockGroup: THREE.Group;
  lightGroup: THREE.Group;
  regionGroup: THREE.Group;
  groundGroup: THREE.Group;
  highlightMesh: THREE.LineSegments;
  hemi: THREE.HemisphereLight;
  dir: THREE.DirectionalLight;
  dispose: () => void;
}

const CLICK_THRESHOLD = 5;

const TEXTURE_BASE = 'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.20.2/blocks';
const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin('anonymous');
const textureCache = new Map<string, THREE.Texture>();

function getTexture(blockName: string, url?: string | null): THREE.Texture | null {
  const texUrl = url ?? `${TEXTURE_BASE}/${blockName}.png`;
  const cached = textureCache.get(texUrl);
  if (cached) return cached;
  const tex = textureLoader.load(texUrl, undefined, undefined, () => {
    textureCache.delete(texUrl);
  });
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapLinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(texUrl, tex);
  return tex;
}

function blockName(blockId: string): string {
  return blockId.startsWith('minecraft:') ? blockId.slice(10) : blockId;
}

function isPartial(materials: MaterialRecord[], blockId: string): boolean {
  const mat = materials.find((m) => m.id === blockId);
  return mat?.bounding_box === 'empty';
}

function isTransparent(materials: MaterialRecord[], blockId: string): boolean {
  const mat = materials.find((m) => m.id === blockId);
  return !!mat?.transparent;
}

function emitLevel(materials: MaterialRecord[], blockId: string): number {
  const mat = materials.find((m) => m.id === blockId);
  return mat?.emit_light ?? 0;
}

// Per-block render dimensions (in voxel units). Decorative blocks are small real cuboids
// with collision, approximating Minecraft's small-block shapes.
function partialSize(blockId: string): { w: number; h: number; d: number; y: number } {
  if (blockId === 'minecraft:torch' || blockId === 'minecraft:soul_torch' || blockId === 'minecraft:redstone_torch') return { w: 0.16, h: 0.6, d: 0.16, y: 0.3 };
  if (blockId === 'minecraft:lantern' || blockId === 'minecraft:soul_lantern') return { w: 0.45, h: 0.55, d: 0.45, y: 0.3 };
  if (blockId === 'minecraft:glass_pane' || blockId.endsWith('glass_pane') || blockId.endsWith('iron_bars')) return { w: 0.92, h: 0.92, d: 0.12, y: 0.5 };
  if (blockId === 'minecraft:button' || blockId.endsWith('_button')) return { w: 0.3, h: 0.1, d: 0.3, y: 0.05 };
  if (blockId === 'minecraft:lever') return { w: 0.18, h: 0.18, d: 0.4, y: 0.12 };
  if (blockId === 'minecraft:pressure_plate' || blockId.endsWith('_pressure_plate')) return { w: 0.6, h: 0.08, d: 0.6, y: 0.04 };
  if (blockId === 'minecraft:rail' || blockId.endsWith('_rail')) return { w: 0.9, h: 0.1, d: 0.9, y: 0.05 };
  if (blockId === 'minecraft:carpet' || blockId.endsWith('_carpet')) return { w: 0.95, h: 0.06, d: 0.95, y: 0.03 };
  if (blockId === 'minecraft:flower_pot') return { w: 0.4, h: 0.4, d: 0.4, y: 0.2 };
  return { w: 0.3, h: 0.3, d: 0.3, y: 0.2 };
}

// Slabs render as a half-height block (bottom half). Returns the vertical scale override
// for blocks classified as transparent but actually solid-ish shapes.
function slabHeight(blockId: string): number | null {
  if (blockId.endsWith('_slab')) return 0.5;
  return null;
}

const SKY_COLORS: Record<SkyMode, string> = { sky: '#0b1018', day: '#88bbff', night: '#0a0f1c' };

export function VoxelCanvas(props: VoxelCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const refs = useRef<SceneRefs | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SKY_COLORS[props.skyMode]);
    scene.fog = new THREE.Fog(SKY_COLORS[props.skyMode], 50, 180);

    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.1, 2000);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 0.9;
    controls.panSpeed = 0.8;
    controls.minDistance = 4;
    controls.maxDistance = 200;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };

    const hemi = new THREE.HemisphereLight(0xffffff, 0x2a3340, 1.1);
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(20, 40, 20);
    scene.add(hemi, dir);

    const blockGroup = new THREE.Group();
    scene.add(blockGroup);
    const lightGroup = new THREE.Group();
    scene.add(lightGroup);
    const regionGroup = new THREE.Group();
    scene.add(regionGroup);
    const groundGroup = new THREE.Group();
    scene.add(groundGroup);

    const highlightGeo = new THREE.BoxGeometry(1.04, 1.04, 1.04);
    const highlightEdges = new THREE.EdgesGeometry(highlightGeo);
    const highlightMesh = new THREE.LineSegments(
      highlightEdges,
      new THREE.LineBasicMaterial({ color: 0x34d399 }),
    );
    highlightMesh.visible = false;
    scene.add(highlightMesh);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function pick(event: PointerEvent): { block: PreviewBlock; face: FaceDir } | null {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const meshes: THREE.Mesh[] = [];
      blockGroup.children.forEach((c) => { if (c instanceof THREE.Mesh && c.visible) meshes.push(c); });
      const hits = raycaster.intersectObjects(meshes, false);
      if (!hits.length) return null;
      const hit = hits[0];
      const userData = hit.object.userData;
      const idx = hit.instanceId;
      const block: PreviewBlock | undefined =
        idx != null ? userData.blocks?.[idx] : (userData.block as PreviewBlock | undefined);
      if (!block) return null;
      const face = faceFromNormal(hit.face?.normal);
      return { block, face };
    }

    let downX = 0;
    let downY = 0;
    let downButton = -1;
    function onPointerDown(event: PointerEvent) {
      downX = event.clientX;
      downY = event.clientY;
      downButton = event.button;
    }
    function onPointerUp(event: PointerEvent) {
      if (downButton !== 0) { downButton = -1; return; }
      downButton = -1;
      const moved = Math.abs(event.clientX - downX) + Math.abs(event.clientY - downY);
      if (moved > CLICK_THRESHOLD) return;
      const p = propsRef.current;
      if (p.interactionMode !== 'edit') return;

      const hit = pick(event);
      if (!hit) { p.onSelectBlock(null); return; }
      const coord = { x: hit.block.x, y: hit.block.y, z: hit.block.z };
      p.onSelectBlock(coord);
      if (p.tool === 'paint') p.onPaintBlock(coord);
      if (p.tool === 'erase') p.onEraseBlock(coord);
      if (p.tool === 'build') p.onBuildBlock(coord, hit.face);
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    refs.current = {
      scene, camera, renderer, controls,
      blockGroup, lightGroup, regionGroup, groundGroup,
      highlightMesh, hemi, dir,
      dispose: () => {
        ro.disconnect();
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);
        renderer.domElement.removeEventListener('pointerup', onPointerUp);
        controls.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      },
    };

    frameToBuild(refs.current, propsRef.current.spec, true);
    return () => { refs.current?.dispose(); refs.current = null; };
  }, []);

  // In edit mode: left-drag edits (no camera), right-drag ROTATES so a builder
  // can re-orient without leaving edit mode, middle/wheel zoom, pan via shift+right.
  useEffect(() => {
    const r = refs.current;
    if (!r) return;
    if (props.interactionMode === 'edit') {
      r.controls.mouseButtons = {
        LEFT: null as unknown as THREE.MOUSE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      };
    } else {
      r.controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      };
    }
    r.controls.update();
  }, [props.interactionMode]);

  // rebuild blocks + lights when preview/materials change
  useEffect(() => {
    const r = refs.current;
    if (!r) return;
    for (const group of [r.blockGroup, r.lightGroup]) {
      while (group.children.length) {
        const child = group.children[0];
        group.remove(child);
        disposeMesh(child as THREE.Mesh);
      }
    }

    const fullByBlock = new Map<string, PreviewBlock[]>();
    const transparentByBlock = new Map<string, PreviewBlock[]>();
    const partialByBlock = new Map<string, PreviewBlock[]>();
    const emissive: PreviewBlock[] = [];

    for (const block of props.preview.blocks) {
      if (block.block === 'minecraft:air') continue;
      if (emitLevel(props.materials, block.block) > 0) emissive.push(block);
      if (isPartial(props.materials, block.block)) {
        push(partialByBlock, block.block, block);
      } else if (isTransparent(props.materials, block.block)) {
        push(transparentByBlock, block.block, block);
      } else {
        push(fullByBlock, block.block, block);
      }
    }

    // Full opaque blocks.
    fullByBlock.forEach((blocks, blockId) => {
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const color = new THREE.Color(blockColor(blockId, categoryFor(props.materials, blockId)));
      const texture = getTexture(blockName(blockId), mat(props, blockId)?.texture_url);
      const mat0 = new THREE.MeshStandardMaterial({
        color: texture ? 0xffffff : color,
        map: texture ?? null,
        roughness: 0.9, metalness: 0.04, transparent: true, opacity: 1,
      });
      const mesh = new THREE.InstancedMesh(geo, mat0, blocks.length);
      mesh.userData.blocks = blocks;
      mesh.userData.kind = 'full';
      const dummy = new THREE.Object3D();
      blocks.forEach((b, i) => {
        dummy.position.set(b.x + 0.5, b.y + 0.5, b.z + 0.5);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        if (!texture) mesh.setColorAt?.(i, color);
      });
      mesh.instanceMatrix.needsUpdate = true;
      r.blockGroup.add(mesh);
    });

    // Transparent blocks (glass): translucent, depthWrite off.
    transparentByBlock.forEach((blocks, blockId) => {
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const color = new THREE.Color(blockColor(blockId, categoryFor(props.materials, blockId)));
      const texture = getTexture(blockName(blockId), mat(props, blockId)?.texture_url);
      const mat0 = new THREE.MeshStandardMaterial({
        color: texture ? 0xffffff : color,
        map: texture ?? null,
        roughness: 0.1, metalness: 0, transparent: true, opacity: 0.55,
        depthWrite: false, side: THREE.DoubleSide,
      });
      const mesh = new THREE.InstancedMesh(geo, mat0, blocks.length);
      mesh.userData.blocks = blocks;
      mesh.userData.kind = 'transparent';
      const dummy = new THREE.Object3D();
      blocks.forEach((b, i) => {
        const slabH = slabHeight(blockId);
        if (slabH != null) {
          // slab: half height, sitting on the bottom of the voxel
          dummy.position.set(b.x + 0.5, b.y + slabH / 2, b.z + 0.5);
          dummy.scale.set(1, slabH, 1);
        } else {
          dummy.position.set(b.x + 0.5, b.y + 0.5, b.z + 0.5);
          dummy.scale.set(1, 1, 1);
        }
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      r.blockGroup.add(mesh);
    });

    // Partial / decorative blocks: small textured cuboid with alphaTest (real small block,
    // not a sprite). Torch/lantern/glass_pane each get a size matching their in-game shape.
    partialByBlock.forEach((blocks, blockId) => {
      const { w, h, d, y } = partialSize(blockId);
      const geo = new THREE.BoxGeometry(w, h, d);
      const color = new THREE.Color(blockColor(blockId, categoryFor(props.materials, blockId)));
      const texture = getTexture(blockName(blockId), mat(props, blockId)?.texture_url);
      const mat0 = new THREE.MeshStandardMaterial({
        color: texture ? 0xffffff : color,
        map: texture ?? null,
        roughness: 0.7, metalness: 0.05,
        transparent: true, opacity: 1,
        alphaTest: 0.4, // cut transparent pixels of the torch/lantern texture
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.InstancedMesh(geo, mat0, blocks.length);
      mesh.userData.blocks = blocks;
      mesh.userData.kind = 'partial';
      const dummy = new THREE.Object3D();
      blocks.forEach((b, i) => {
        dummy.position.set(b.x + 0.5, b.y + y, b.z + 0.5);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        if (!texture) mesh.setColorAt?.(i, color);
      });
      mesh.instanceMatrix.needsUpdate = true;
      r.blockGroup.add(mesh);
    });

    // Emissive point lights.
    emissive.forEach((b) => {
      const level = emitLevel(props.materials, b.block);
      const color = b.block.includes('lantern') || b.block.includes('torch') ? 0xffb347 : 0xffffff;
      const light = new THREE.PointLight(color, Math.min(level / 7, 2.5), 8, 2);
      light.position.set(b.x + 0.5, b.y + 0.5, b.z + 0.5);
      r.lightGroup.add(light);
    });
  }, [props.preview, props.materials]);

  // apply view mode opacity / visibility
  useEffect(() => {
    const r = refs.current;
    if (!r) return;
    r.blockGroup.children.forEach((child) => {
      if (!(child instanceof THREE.InstancedMesh)) return;
      const blocks = child.userData.blocks as PreviewBlock[] | undefined;
      if (!blocks) return;
      const kind = child.userData.kind;
      const dummy = new THREE.Object3D();
      let anyVisible = false;
      blocks.forEach((b, i) => {
        const { visible, opacity } = shouldShow(b, props);
        const yOff = kind === 'partial' ? partialY(b.block) : 0.5;
        if (visible) {
          dummy.position.set(b.x + 0.5, b.y + yOff, b.z + 0.5);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          child.setMatrixAt(i, dummy.matrix);
          anyVisible = true;
        } else if (opacity > 0) {
          dummy.position.set(b.x + 0.5, b.y + yOff, b.z + 0.5);
          dummy.scale.setScalar(0.96);
          dummy.updateMatrix();
          child.setMatrixAt(i, dummy.matrix);
          anyVisible = true;
        } else {
          dummy.scale.setScalar(0);
          dummy.position.set(b.x, b.y, b.z);
          dummy.updateMatrix();
          child.setMatrixAt(i, dummy.matrix);
        }
      });
      child.instanceMatrix.needsUpdate = true;
      const m = child.material as THREE.Material;
      if (kind === 'transparent') m.opacity = props.xray ? 0.3 : 0.55;
      else m.opacity = props.xray && props.viewMode === 'full' ? 0.55 : 1;
      m.transparent = props.xray || props.viewMode !== 'full' || kind === 'transparent';
      child.visible = anyVisible;
    });
  }, [props.viewMode, props.layerY, props.selectedRegionId, props.selectedMaterialId, props.xray, props.showErrors, props.preview, props.interfaceCells, props.errorRegions]);

  // region boundaries — offset by project origin
  useEffect(() => {
    const r = refs.current;
    if (!r) return;
    while (r.regionGroup.children.length) {
      const child = r.regionGroup.children[0];
      r.regionGroup.remove(child);
      disposeMesh(child as THREE.Mesh);
    }
    if (!props.showRegionBoundary) return;
    const [ox, oy, oz] = props.spec.project.origin;
    for (const region of props.spec.regions) {
      const [minX, minY, minZ, maxX, maxY, maxZ] = region.box;
      const w = maxX - minX + 1, h = maxY - minY + 1, d = maxZ - minZ + 1;
      const geo = new THREE.BoxGeometry(w, h, d);
      const edges = new THREE.EdgesGeometry(geo);
      const color = new THREE.Color(regionColor(region.id));
      const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: region.id === props.selectedRegionId ? 0.95 : 0.45 });
      const lines = new THREE.LineSegments(edges, m);
      lines.position.set(ox + minX + w / 2, oy + minY + h / 2, oz + minZ + d / 2);
      r.regionGroup.add(lines);
    }
  }, [props.spec, props.showRegionBoundary, props.selectedRegionId]);

  // highlight selected block
  useEffect(() => {
    const r = refs.current;
    if (!r) return;
    if (props.selectedBlock) {
      r.highlightMesh.visible = true;
      r.highlightMesh.position.set(props.selectedBlock.x + 0.5, props.selectedBlock.y + 0.5, props.selectedBlock.z + 0.5);
    } else {
      r.highlightMesh.visible = false;
    }
  }, [props.selectedBlock]);

  // camera presets
  useEffect(() => {
    const r = refs.current;
    if (!r || !props.cameraSignal) return;
    applyCameraPreset(r, props.cameraSignal.preset);
  }, [props.cameraSignal]);

  // full reset
  useEffect(() => {
    const r = refs.current;
    if (!r || props.resetSignal === 0) return;
    frameToBuild(r, props.spec, true);
  }, [props.resetSignal]);

  // sky / background — also changes lighting so day/night actually darken the scene
  useEffect(() => {
    const r = refs.current;
    if (!r) return;
    const color = SKY_COLORS[props.skyMode];
    r.scene.background = new THREE.Color(color);
    if (r.scene.fog instanceof THREE.Fog) r.scene.fog.color = new THREE.Color(color);
    // sky(default dark) 0.5, day 1.3, night 0.18
    const intensity = props.skyMode === 'day' ? 1.3 : props.skyMode === 'night' ? 0.18 : 0.5;
    r.hemi.intensity = intensity;
    r.dir.intensity = props.skyMode === 'day' ? 1.4 : props.skyMode === 'night' ? 0.25 : 1.0;
    r.dir.color = new THREE.Color(props.skyMode === 'night' ? '#9bb0ff' : '#ffffff');
  }, [props.skyMode]);

  // ground: void or superflat grass (aligned to build footprint)
  useEffect(() => {
    const r = refs.current;
    if (!r) return;
    while (r.groundGroup.children.length) {
      const child = r.groundGroup.children[0];
      r.groundGroup.remove(child);
      disposeMesh(child as THREE.Mesh);
    }
    if (props.groundMode === 'void') return;
    const [ox, oy, oz] = props.spec.project.origin;
    const [sx, , sz] = props.spec.project.size;
    const extent = Math.max(sx, sz) * 2 + 16;
    const grassTop = getTexture('grass_block_top');
    const grassSide = getTexture('grass_block_side');
    const dirt = getTexture('dirt');
    // Box with per-face materials: top=grass_top, sides=grass_side, bottom=dirt.
    const topMat = new THREE.MeshStandardMaterial({ map: grassTop ?? null, color: grassTop ? 0xffffff : 0x4a7a3a, roughness: 1 });
    const sideMat = new THREE.MeshStandardMaterial({ map: grassSide ?? dirt ?? null, color: (grassSide ?? dirt) ? 0xffffff : 0x6b5a3a, roughness: 1 });
    const bottomMat = new THREE.MeshStandardMaterial({ map: dirt ?? null, color: dirt ? 0xffffff : 0x6b5a3a, roughness: 1 });
    if (grassTop) grassTop.repeat.set(extent / 2, extent / 2), grassTop.wrapS = grassTop.wrapT = THREE.RepeatWrapping;
    const geo = new THREE.BoxGeometry(extent, 2, extent);
    const mat0 = [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat];
    const plane = new THREE.Mesh(geo, mat0);
    plane.position.set(ox + sx / 2, oy - 1, oz + sz / 2);
    r.groundGroup.add(plane);
  }, [props.groundMode, props.spec]);

  return <div className={`voxel-canvas mode-${props.interactionMode}`} ref={mountRef} />;
}

function push(map: Map<string, PreviewBlock[]>, key: string, b: PreviewBlock) {
  const list = map.get(key) ?? [];
  list.push(b);
  map.set(key, list);
}
function mat(props: VoxelCanvasProps, blockId: string): MaterialRecord | undefined {
  return props.materials.find((m) => m.id === blockId);
}
function partialY(blockId: string): number {
  return partialSize(blockId).y;
}

function shouldShow(block: PreviewBlock, props: VoxelCanvasProps): { visible: boolean; opacity: number } {
  if (block.block === 'minecraft:air') return { visible: false, opacity: 0 };
  const key = `${block.x},${block.y},${block.z}`;
  if (props.viewMode === 'layer') {
    return block.y === props.layerY ? { visible: true, opacity: 1 } : { visible: false, opacity: 0.05 };
  }
  if (props.viewMode === 'region') {
    if (block.region === props.selectedRegionId) return { visible: true, opacity: 1 };
    return { visible: !props.xray, opacity: props.xray ? 0.06 : 0.18 };
  }
  if (props.viewMode === 'material') {
    if (block.block === props.selectedMaterialId) return { visible: true, opacity: 1 };
    return { visible: !props.xray, opacity: 0.12 };
  }
  if (props.viewMode === 'interface') {
    // Highlight blocks sitting on an interface cell; dim the rest.
    if (props.interfaceCells.has(key)) return { visible: true, opacity: 1 };
    return { visible: !props.xray, opacity: props.xray ? 0.05 : 0.12 };
  }
  if (props.viewMode === 'error') {
    // Highlight blocks in regions that have errors; dim clean regions.
    if (props.errorRegions.has(block.region)) return { visible: true, opacity: 1 };
    return { visible: !props.xray, opacity: props.xray ? 0.05 : 0.12 };
  }
  return { visible: true, opacity: props.xray ? 0.5 : 1 };
}

function faceFromNormal(n?: THREE.Vector3): FaceDir {
  if (!n) return 'top';
  const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
  if (ay >= ax && ay >= az) return n.y > 0 ? 'top' : 'bottom';
  if (ax >= az) return n.x > 0 ? 'east' : 'west';
  return n.z > 0 ? 'south' : 'north';
}

function buildCenter(spec: ProjectSpec): THREE.Vector3 {
  const [ox, oy, oz] = spec.project.origin;
  const [sx, sy, sz] = spec.project.size;
  return new THREE.Vector3(ox + sx / 2, oy + sy / 2, oz + sz / 2);
}

function applyCameraPreset(r: SceneRefs, preset: CameraPreset) {
  const center = r.scene.userData.spec ? buildCenter(r.scene.userData.spec as ProjectSpec) : r.controls.target.clone();
  if (preset === 'iso') r.camera.position.set(center.x + 18, center.y + 16, center.z + 22);
  if (preset === 'front') r.camera.position.set(center.x, center.y, center.z + 30);
  if (preset === 'side') r.camera.position.set(center.x + 30, center.y, center.z);
  if (preset === 'top') r.camera.position.set(center.x, center.y + 30, center.z + 0.001);
  r.controls.target.copy(center);
  r.controls.update();
}

function frameToBuild(r: SceneRefs, spec: ProjectSpec, snap: boolean) {
  r.scene.userData.spec = spec;
  const center = buildCenter(spec);
  const [sx, sy, sz] = spec.project.size;
  const radius = Math.max(sx, sy, sz);
  const dist = radius * 2.0 + 6;
  r.controls.target.copy(center);
  r.camera.position.set(center.x + dist * 0.7, center.y + dist * 0.6, center.z + dist * 0.85);
  r.camera.near = 0.1;
  r.camera.far = dist * 10;
  r.camera.updateProjectionMatrix();
  r.controls.minDistance = 3;
  r.controls.maxDistance = dist * 5;
  if (snap) r.controls.update();
}

function disposeMesh(obj: THREE.Mesh | THREE.LineSegments) {
  (obj as THREE.Mesh).geometry?.dispose();
  const m = (obj as THREE.Mesh).material;
  if (Array.isArray(m)) m.forEach((x) => x.dispose());
  else m?.dispose();
}
