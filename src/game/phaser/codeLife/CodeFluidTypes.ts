export interface CodeFluidPoint {
  readonly x: number;
  readonly y: number;
}

export interface CodeFluidBounds {
  readonly x?: number;
  readonly y?: number;
  readonly left?: number;
  readonly top?: number;
  readonly right?: number;
  readonly bottom?: number;
  readonly width?: number;
  readonly height?: number;
}

export interface CodeFluidInput {
  readonly move?: Partial<CodeFluidPoint> | null;
  readonly target?: CodeFluidPoint | null;
  readonly targetWeight?: number;
  readonly traction?: CodeFluidPoint | null;
  readonly tractionStrength?: number;
}

export interface CodeFluidBodyOptions {
  readonly mass?: number;
  readonly minMass?: number;
  readonly maxMass?: number;
  readonly baseRadius?: number;
  readonly nodeCount?: number;
  readonly minNodeCount?: number;
  readonly maxNodeCount?: number;
  readonly moveForce?: number;
  readonly targetForce?: number;
  readonly tendrilForce?: number;
  readonly springStiffness?: number;
  readonly bendStiffness?: number;
  readonly shapeStiffness?: number;
  readonly pressureStrength?: number;
  readonly damping?: number;
  readonly boundaryDamping?: number;
  readonly maxSpeed?: number;
}

export interface CodeFluidNode extends CodeFluidPoint {
  readonly vx: number;
  readonly vy: number;
  readonly radius: number;
  readonly mass: number;
  readonly glyph: string;
  readonly phase: number;
}
