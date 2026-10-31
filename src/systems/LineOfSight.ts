import Phaser from "phaser";
import { EnemyNavigationGrid, type NavigationBox } from "../entities/enemies/EnemyNavigation";

export type Point2D = {
    x: number;
    y: number;
};

export class LineOfSight {

    private readonly obstacles: Phaser.Physics.Arcade.StaticGroup;
    private navigationTime = -Infinity;
    private navigationSignature = "";
    private navigationWalls: NavigationBox[] = [];
    private readonly navigationGrids = new Map<string, EnemyNavigationGrid>();

    constructor(obstacles: Phaser.Physics.Arcade.StaticGroup) {
        this.obstacles = obstacles;
    }

    /**
     * Comprueba si existe una línea de visión despejada (sin colisión con paredes)
     * entre dos entidades o puntos del escenario.
     */
    public hasLineOfSight(
        from: Point2D,
        to: Point2D,
        ignoreInteriorWalls = false
    ): boolean {
        return LineOfSight.hasClearLineOfSight(from, to, this.obstacles,ignoreInteriorWalls);
    }

    /** Reuse one body-clearance grid across robots; refresh only if physical walls change. */
    public movementGrid(width: number, height: number, time: number): EnemyNavigationGrid {
        const bounds = this.obstacles.scene.physics.world.bounds;
        if (time !== this.navigationTime) {
            this.navigationTime = time;
            const walls = this.obstacles.getChildren().flatMap(child => {
                const body = child.body as Phaser.Physics.Arcade.StaticBody | null;
                return child.active && body?.enable ? [{ x: body.x, y: body.y, width: body.width, height: body.height }] : [];
            });
            const signature = `${bounds.x},${bounds.y},${bounds.width},${bounds.height};${walls.map(b => `${b.x},${b.y},${b.width},${b.height}`).join(';')}`;
            if (signature !== this.navigationSignature) {
                this.navigationSignature = signature; this.navigationWalls = walls; this.navigationGrids.clear();
            }
        }
        const key = `${width},${height}`;
        let grid = this.navigationGrids.get(key);
        if (!grid) { grid = new EnemyNavigationGrid(bounds, this.navigationWalls, width, height); this.navigationGrids.set(key, grid); }
        return grid;
    }

    /**
     * Método estático para verificar si el segmento entre 'from' y 'to' intersecta
     * con algún elemento del grupo de obstáculos.
     */
    public static hasClearLineOfSight(
        from: Point2D,
        to: Point2D,
        obstacles: Phaser.Physics.Arcade.StaticGroup,
        ignoreInteriorWalls = false
    ): boolean {
        const line = new Phaser.Geom.Line(from.x, from.y, to.x, to.y);
        const children = obstacles.getChildren();

        for (let i = 0; i < children.length; i++) {
            const child = children[i] as Phaser.GameObjects.GameObject;

            if (!child.active) {
                continue;
            }
            if(ignoreInteriorWalls&&child.getData("room-perimeter")===false)continue;

            const body = child.body as
                | Phaser.Physics.Arcade.StaticBody
                | Phaser.Physics.Arcade.Body
                | null;

            if (body) {
                if (Phaser.Geom.Intersects.LineToRectangle(line, body)) {
                    return false;
                }
            } else if ("getBounds" in child) {
                const bounds = (
                    child as unknown as Phaser.GameObjects.Components.GetBounds
                ).getBounds();

                if (Phaser.Geom.Intersects.LineToRectangle(line, bounds)) {
                    return false;
                }
            }
        }

        return true;
    }
}
