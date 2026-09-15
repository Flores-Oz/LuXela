export const TileType = {
    Floor: 0,
    Wall: 1,
    PlayerSpawn: 2,
    RobotSpawn: 3,
    Exit: 4
} as const;

export type TileType = typeof TileType[keyof typeof TileType];

export type RoomMatrix = TileType[][];
