import { TileType, type RoomMatrix } from "../../types/RoomTypes";

const {
    Floor,
    Wall,
    PlayerSpawn,
    RobotSpawn,
    Exit
} = TileType;

export const testRoom: RoomMatrix = [
    [Wall, Wall, Wall, Wall, Wall, Wall, Wall, Wall, Wall, Wall, Wall, Wall],
    [Wall, Floor, Floor, Floor, Floor, Floor, Floor, Floor, Floor, Floor, Floor, Wall],
    [Wall, Floor, PlayerSpawn, Floor, Floor, Floor, Wall, Floor, Floor, RobotSpawn, Floor, Wall],
    [Wall, Floor, Floor, Floor, Wall, Floor, Wall, Floor, Floor, Floor, Floor, Wall],
    [Wall, Floor, Wall, Wall, Wall, Floor, Floor, Floor, Wall, Wall, Floor, Wall],
    [Wall, Floor, Floor, Floor, Floor, Floor, Floor, Floor, Floor, Floor, Floor, Wall],
    [Wall, Floor, Floor, Wall, Floor, Floor, Wall, Floor, Floor, RobotSpawn, Floor, Wall],
    [Wall, Floor, Floor, Wall, Floor, Floor, Wall, Floor, Floor, Floor, Exit, Wall],
    [Wall, Wall, Wall, Wall, Wall, Wall, Wall, Wall, Wall, Wall, Wall, Wall],
];