import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const projectRoot = path.resolve(import.meta.dirname, '..')

const patches = [
  {
    file: 'node_modules/@react-three/fiber/dist/events-5a94e5eb.esm.js',
    anchor: "var threeTypes = /*#__PURE__*/Object.freeze({",
    helper: `
function createTimerCompat(THREERef) {
  const timer = typeof THREERef.Timer === 'function' ? new THREERef.Timer() : null;
  if (timer && typeof document !== 'undefined' && typeof timer.connect === 'function') {
    timer.connect(document);
  }
  return {
    __r3fTimerCompatPatched: true,
    autoStart: true,
    running: false,
    elapsedTime: 0,
    oldTime: 0,
    start() {
      if (timer) {
        timer.reset();
        timer.update();
      }
      this.running = true;
      this.oldTime = 0;
      this.elapsedTime = 0;
      return this;
    },
    stop() {
      this.running = false;
      return this;
    },
    getDelta() {
      if (!timer) return 0;
      if (!this.running) {
        if (this.autoStart) this.start();
        return 0;
      }
      timer.update();
      const delta = timer.getDelta();
      this.oldTime = this.elapsedTime;
      this.elapsedTime += delta;
      return delta;
    },
    getElapsedTime() {
      this.getDelta();
      return this.elapsedTime;
    }
  };
}

`,
    replacements: [{ from: 'clock: new THREE.Clock(),', to: 'clock: createTimerCompat(THREE),' }],
  },
  {
    file: 'node_modules/@react-three/fiber/dist/events-358c3764.cjs.dev.js',
    anchor: "var threeTypes = /*#__PURE__*/Object.freeze({",
    helper: `
function createTimerCompat(THREERef) {
  const timer = typeof THREERef.Timer === 'function' ? new THREERef.Timer() : null;
  if (timer && typeof document !== 'undefined' && typeof timer.connect === 'function') {
    timer.connect(document);
  }
  return {
    __r3fTimerCompatPatched: true,
    autoStart: true,
    running: false,
    elapsedTime: 0,
    oldTime: 0,
    start() {
      if (timer) {
        timer.reset();
        timer.update();
      }
      this.running = true;
      this.oldTime = 0;
      this.elapsedTime = 0;
      return this;
    },
    stop() {
      this.running = false;
      return this;
    },
    getDelta() {
      if (!timer) return 0;
      if (!this.running) {
        if (this.autoStart) this.start();
        return 0;
      }
      timer.update();
      const delta = timer.getDelta();
      this.oldTime = this.elapsedTime;
      this.elapsedTime += delta;
      return delta;
    },
    getElapsedTime() {
      this.getDelta();
      return this.elapsedTime;
    }
  };
}

`,
    replacements: [{ from: 'clock: new THREE__namespace.Clock(),', to: 'clock: createTimerCompat(THREE__namespace),' }],
  },
  {
    file: 'node_modules/@react-three/fiber/dist/events-238e0986.cjs.prod.js',
    anchor: "var threeTypes = /*#__PURE__*/Object.freeze({",
    helper: `
function createTimerCompat(THREERef) {
  const timer = typeof THREERef.Timer === 'function' ? new THREERef.Timer() : null;
  if (timer && typeof document !== 'undefined' && typeof timer.connect === 'function') {
    timer.connect(document);
  }
  return {
    __r3fTimerCompatPatched: true,
    autoStart: true,
    running: false,
    elapsedTime: 0,
    oldTime: 0,
    start() {
      if (timer) {
        timer.reset();
        timer.update();
      }
      this.running = true;
      this.oldTime = 0;
      this.elapsedTime = 0;
      return this;
    },
    stop() {
      this.running = false;
      return this;
    },
    getDelta() {
      if (!timer) return 0;
      if (!this.running) {
        if (this.autoStart) this.start();
        return 0;
      }
      timer.update();
      const delta = timer.getDelta();
      this.oldTime = this.elapsedTime;
      this.elapsedTime += delta;
      return delta;
    },
    getElapsedTime() {
      this.getDelta();
      return this.elapsedTime;
    }
  };
}

`,
    replacements: [{ from: 'clock: new THREE__namespace.Clock(),', to: 'clock: createTimerCompat(THREE__namespace),' }],
  },
]

for (const patch of patches) {
  const filePath = path.join(projectRoot, patch.file)
  let text = await readFile(filePath, 'utf8')
  if (!text.includes('__r3fTimerCompatPatched')) {
    if (!text.includes(patch.anchor)) throw new Error(`patch anchor not found: ${patch.file}`)
    text = text.replace(patch.anchor, `${patch.helper}${patch.anchor}`)
  }
  for (const replacement of patch.replacements) {
    if (text.includes(replacement.to)) continue
    if (!text.includes(replacement.from)) throw new Error(`patch target not found in ${patch.file}`)
    text = text.replace(replacement.from, replacement.to)
  }
  await writeFile(filePath, text, 'utf8')
}

console.log('[patch-react-three-fiber] applied timer compatibility patch')
