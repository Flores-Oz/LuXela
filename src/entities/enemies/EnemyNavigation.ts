export interface NavigationPoint { x: number; y: number }
export interface NavigationBox extends NavigationPoint { width: number; height: number }

/** Shared static clearance grid. Routes account for the whole body, not just its origin. */
export class EnemyNavigationGrid {
    private readonly step: number;
    private readonly columns: number;
    private readonly rows: number;
    private readonly free: Uint8Array;
    private readonly obstacles: NavigationBox[];
    private readonly limits: NavigationBox;

    constructor(bounds: NavigationBox, walls: readonly NavigationBox[], bodyWidth: number, bodyHeight: number) {
        const halfWidth = bodyWidth / 2 + 2, halfHeight = bodyHeight / 2 + 2;
        this.step = Math.min(32, bodyWidth, bodyHeight);
        this.columns = Math.floor(bounds.width / this.step) + 1;
        this.rows = Math.floor(bounds.height / this.step) + 1;
        this.limits = { x: bounds.x + bodyWidth / 2, y: bounds.y + bodyHeight / 2,
            width: bounds.width - bodyWidth, height: bounds.height - bodyHeight };
        this.origin = { x: bounds.x, y: bounds.y };
        this.obstacles = walls.map(wall => ({ x: wall.x - halfWidth, y: wall.y - halfHeight,
            width: wall.width + 2 * halfWidth, height: wall.height + 2 * halfHeight }));
        this.free = new Uint8Array(this.columns * this.rows);
        for (let i = 0; i < this.free.length; i++) this.free[i] = this.clearPoint(this.point(i)) ? 1 : 0;
    }
    private readonly origin: NavigationPoint;
    private point(index: number): NavigationPoint {
        return { x: this.origin.x + index % this.columns * this.step, y: this.origin.y + Math.floor(index / this.columns) * this.step };
    }
    private clearPoint(p: NavigationPoint): boolean {
        const b = this.limits;
        return p.x >= b.x && p.y >= b.y && p.x <= b.x + b.width && p.y <= b.y + b.height &&
            !this.obstacles.some(o => p.x > o.x && p.x < o.x + o.width && p.y > o.y && p.y < o.y + o.height);
    }
    canTravel(from: NavigationPoint, to: NavigationPoint): boolean {
        if (!this.clearPoint(to)) return false;
        const dx = to.x - from.x, dy = to.y - from.y;
        return !this.obstacles.some(box => {
            // A collider may leave the body flush against a wall, inside our 2px
            // planning margin. Allow it to step away from that face, never through it.
            const inside = from.x >= box.x && from.x <= box.x + box.width && from.y >= box.y && from.y <= box.y + box.height;
            if (inside && ((from.x - box.x <= 2.01 && to.x < box.x) ||
                (box.x + box.width - from.x <= 2.01 && to.x > box.x + box.width) ||
                (from.y - box.y <= 2.01 && to.y < box.y) ||
                (box.y + box.height - from.y <= 2.01 && to.y > box.y + box.height))) return false;
            let near = 0, far = 1;
            for (const [position, delta, low, high] of [[from.x, dx, box.x, box.x + box.width], [from.y, dy, box.y, box.y + box.height]]) {
                if (Math.abs(delta!) < .0001) { if (position! <= low! || position! >= high!) return false; }
                else {
                    const a = (low! - position!) / delta!, b = (high! - position!) / delta!;
                    near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b));
                    if (near >= far) return false;
                }
            }
            return near <= far;
        });
    }
    findPath(from: NavigationPoint, target: NavigationPoint): NavigationPoint[] {
        const distance = (a: NavigationPoint, b: NavigationPoint) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
        let start = -1, nearest = Infinity;
        // Join a nearby grid node only through a swept-body-safe segment.
        const column = Math.round((from.x - this.origin.x) / this.step), row = Math.round((from.y - this.origin.y) / this.step);
        for (let y = Math.max(0, row - 2); y <= Math.min(this.rows - 1, row + 2); y++) {
            for (let x = Math.max(0, column - 2); x <= Math.min(this.columns - 1, column + 2); x++) {
                const i = y * this.columns + x, p = this.point(i), d = distance(from, p);
                if (this.free[i] && d < nearest && this.canTravel(from, p)) { start = i; nearest = d; }
            }
        }
        if (start < 0) return [];
        let goal = -1; nearest = Infinity;
        for (let i = 0; i < this.free.length; i++) if (this.free[i]) {
            const d = distance(this.point(i), target);
            if (d < nearest) { goal = i; nearest = d; }
        }
        const parents = new Int32Array(this.free.length).fill(-1), queue = new Int32Array(this.free.length);
        let head = 0, tail = 1, closest = start, best = distance(this.point(start), target);
        queue[0] = start; parents[start] = start;
        while (head < tail) {
            const current = queue[head++]!;
            const d = distance(this.point(current), target);
            if (d < best) { best = d; closest = current; }
            if (current === goal) { closest = current; break; }
            const x = current % this.columns, y = Math.floor(current / this.columns);
            for (const next of [x + 1 < this.columns ? current + 1 : -1, y + 1 < this.rows ? current + this.columns : -1,
                x > 0 ? current - 1 : -1, y > 0 ? current - this.columns : -1]) {
                if (next < 0 || !this.free[next] || parents[next] !== -1) continue;
                // Grid spacing <= body size ensures thin walls cannot fall between free nodes.
                parents[next] = current; queue[tail++] = next;
            }
        }
        const result: NavigationPoint[] = [];
        for (let i = closest; i !== start; i = parents[i]!) result.push(this.point(i));
        result.push(this.point(start)); result.reverse();
        if (this.canTravel(result[result.length - 1]!, target)) result.push({ ...target });
        return result;
    }
}
