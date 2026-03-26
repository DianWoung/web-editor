import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

function readGlbJson(glbPath: string) {
  const data = fs.readFileSync(glbPath)
  const length = data.readUInt32LE(8)
  let offset = 12
  while (offset < length) {
    const chunkLength = data.readUInt32LE(offset)
    const chunkType = data.toString('ascii', offset + 4, offset + 8)
    offset += 8
    const chunk = data.subarray(offset, offset + chunkLength)
    offset += chunkLength
    if (chunkType === 'JSON') {
      return JSON.parse(chunk.toString('utf8'))
    }
  }
  throw new Error(`GLB JSON chunk not found: ${glbPath}`)
}

function readGlb(glbPath: string) {
  const data = fs.readFileSync(glbPath)
  const length = data.readUInt32LE(8)
  let offset = 12
  let json: Record<string, unknown> | null = null
  let bin: Buffer | null = null
  while (offset < length) {
    const chunkLength = data.readUInt32LE(offset)
    const chunkType = data.toString('ascii', offset + 4, offset + 8)
    offset += 8
    const chunk = data.subarray(offset, offset + chunkLength)
    offset += chunkLength
    if (chunkType === 'JSON') {
      json = JSON.parse(chunk.toString('utf8'))
    } else if (chunkType === 'BIN\0') {
      bin = Buffer.from(chunk)
    }
  }
  if (!json || !bin) {
    throw new Error(`GLB is missing JSON or BIN chunk: ${glbPath}`)
  }
  return { json, bin }
}

function readFloatAccessor(gltf: any, bin: Buffer, accessorIndex: number): number[] {
  const accessor = gltf.accessors[accessorIndex]
  const bufferView = gltf.bufferViews[accessor.bufferView]
  const componentCountByType: Record<string, number> = {
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
    MAT4: 16,
  }
  const componentCount = componentCountByType[accessor.type]
  const byteOffset = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
  const total = accessor.count * componentCount
  const values: number[] = []
  for (let index = 0; index < total; index += 1) {
    values.push(bin.readFloatLE(byteOffset + index * 4))
  }
  return values
}

function multiplyQuaternion(a: [number, number, number, number], b: [number, number, number, number]) {
  const [ax, ay, az, aw] = a
  const [bx, by, bz, bw] = b
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ] as [number, number, number, number]
}

function applyQuaternion(
  quaternion: [number, number, number, number],
  vector: [number, number, number],
): [number, number, number] {
  const [x, y, z, w] = quaternion
  const qVector: [number, number, number, number] = [vector[0], vector[1], vector[2], 0]
  const conjugate: [number, number, number, number] = [-x, -y, -z, w]
  const rotated = multiplyQuaternion(multiplyQuaternion(quaternion, qVector), conjugate)
  return [rotated[0], rotated[1], rotated[2]]
}

test('wind turbine rotor children are stored in rotor-local coordinates', () => {
  const glbPath = path.resolve(process.cwd(), 'assets/models/wind_turbine_iot_web.glb')
  const gltf = readGlbJson(glbPath)
  const nodes = gltf.nodes as Array<{ name?: string; translation?: [number, number, number]; children?: number[] }>
  const byName = new Map(nodes.map((node, index) => [node.name, index]))
  const rotorIndex = byName.get('RotorAssembly')

  assert.notEqual(rotorIndex, undefined)

  const rotor = nodes[rotorIndex!]
  const childNames = (rotor.children ?? []).map((index) => nodes[index]?.name)

  for (const childName of childNames) {
    const child = nodes[byName.get(childName)!]
    const translation = child.translation ?? [0, 0, 0]
    assert.ok(
      Math.abs(translation[1]) < 5,
      `${childName} should stay near rotor-local origin, got ${translation.join(', ')}`,
    )
  }
})

test('wind turbine animation rotates around the rotor axle instead of the vertical axis', () => {
  const glbPath = path.resolve(process.cwd(), 'assets/models/wind_turbine_iot_web.glb')
  const { json: gltf, bin } = readGlb(glbPath)
  const animation = (gltf.animations as Array<any>)[0]
  const outputAccessorIndex = animation.samplers[0].output
  const quaternions = readFloatAccessor(gltf, bin, outputAccessorIndex)

  let maxAbsY = 0
  let maxAbsZ = 0
  for (let index = 0; index < quaternions.length; index += 4) {
    maxAbsY = Math.max(maxAbsY, Math.abs(quaternions[index + 1] ?? 0))
    maxAbsZ = Math.max(maxAbsZ, Math.abs(quaternions[index + 2] ?? 0))
  }

  assert.ok(maxAbsY < 0.02, `rotor animation should not introduce large Y quaternion components, got ${maxAbsY}`)
  assert.ok(maxAbsZ < 0.02, `rotor animation should not introduce large Z quaternion components, got ${maxAbsZ}`)
})

test('wind turbine blades fan out in one vertical rotor plane instead of pointing the same direction', () => {
  const glbPath = path.resolve(process.cwd(), 'assets/models/wind_turbine_iot_web.glb')
  const gltf = readGlbJson(glbPath) as {
    nodes: Array<{ name?: string; rotation?: [number, number, number, number] }>
  }
  const byName = new Map(gltf.nodes.map((node) => [node.name, node]))
  const rotorRotation = byName.get('RotorAssembly')?.rotation ?? [0, 0, 0, 1]
  const bladeDirections = ['Blade_1', 'Blade_2', 'Blade_3'].map((name) => {
    const bladeRotation = byName.get(name)?.rotation ?? [0, 0, 0, 1]
    const worldRotation = multiplyQuaternion(rotorRotation, bladeRotation)
    return applyQuaternion(worldRotation, [0, 0, 1])
  })

  bladeDirections.forEach((direction, index) => {
    assert.ok(Math.abs(direction[0]) < 0.02, `Blade_${index + 1} should stay in the rotor plane, got ${direction.join(', ')}`)
  })

  const uniqueDirections = new Set(bladeDirections.map((direction) => direction.map((value) => value.toFixed(3)).join(',')))
  assert.equal(uniqueDirections.size, 3, `three blades should fan out to three distinct directions, got ${[...uniqueDirections].join(' | ')}`)
})
