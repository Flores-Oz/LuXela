import Phaser from "phaser";

export type Point2D = {
    x: number;
    y: number;
};

export class LineOfSight {

    private readonly obstacles: Phaser.Physics.Arcade.StaticGroup;

    constructor(obstacles: Phaser.Physics.Arcade.StaticGroup) {
        this.obstacles = obstacles;
    }

    /**
     * Comprueba si existe una línea de visión despejada (sin colisión con paredes)
     * entre dos entidades o puntos del escenario.
     */
    public hasLineOfSight(
        from: Point2D,
        to: Point2D
    ): boolean {
        return LineOfSight.hasClearLineOfSight(from, to, this.obstacles);
    }

    /**
     * Método estático para verificar si el segmento entre 'from' y 'to' intersecta
     * con algún elemento del grupo de obstáculos.
     */
    public static hasClearLineOfSight(
        from: Point2D,
        to: Point2D,
        obstacles: Phaser.Physics.Arcade.StaticGroup
    ): boolean {
        const line = new Phaser.Geom.Line(from.x, from.y, to.x, to.y);
        const children = obstacles.getChildren();

        for (let i = 0; i < children.length; i++) {
            const child = children[i] as Phaser.GameObjects.GameObject;

            if (!child.active) {
                continue;
            }

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
