import Phaser from "phaser";
import { detailedEnvironmentAtlas, environmentSheets, sheetCell, sheetTextureKey, type EnvironmentStyle } from "./EnvironmentSheets";
import { environmentThemes, type EnvironmentAtlas, type RoomTheme } from "./RoomTheme";

/** Assemble measured source crops once; the supplied PNGs remain unchanged on disk. */
export function resolveSheetTiles(scene: Phaser.Scene, theme: RoomTheme, style: EnvironmentStyle): { key:string; atlas:EnvironmentAtlas; provisional:boolean } | null {
    const key = `environment-detail-${theme}-${style}`, atlas = detailedEnvironmentAtlas(style);
    if (scene.textures.exists(key)) return { key, atlas, provisional:false };
    const styles = [style, environmentSheets[style].companion] as const;
    const required=[...styles,...(environmentSheets[style].neutral?[environmentSheets[style].neutral!]:[])];
    const missing=required.find(id=>!scene.textures.exists(sheetTextureKey(id)) || scene.textures.get(sheetTextureKey(id)).source[0]?.width !== 1254 || scene.textures.get(sheetTextureKey(id)).source[0]?.height !== 1254);
    if(missing)throw new Error(`Tileset requerido ausente o con dimensiones incorrectas: ${missing}`);
    const texture = scene.textures.createCanvas(key, atlas.columns * atlas.tileSize, atlas.rows * atlas.tileSize);
    if (!texture) return null;
    const context = texture.getContext(), size = atlas.tileSize;
    context.imageSmoothingEnabled = false;
    for (let sheet = 0; sheet < styles.length; sheet++) for (let index = 0; index < 16; index++) {
        const id = styles[sheet]!, rect = sheetCell(id,index), side = Math.min(rect.width,rect.height), frame = sheet * 16 + index;
        const source = scene.textures.get(sheetTextureKey(id)).getSourceImage() as HTMLImageElement;
        context.drawImage(source, rect.x + Math.floor((rect.width-side)/2), rect.y + Math.floor((rect.height-side)/2),side,side,
            frame % atlas.columns * size,Math.floor(frame / atlas.columns) * size,size,size);
    }
    const neutral=environmentSheets[style].neutral;
    if(neutral){
        const source=scene.textures.get(sheetTextureKey(neutral)).getSourceImage() as HTMLImageElement;
        for(const [target,index]of [[53,0],[54,13],[55,11],[56,10]] as const){
            const rect=sheetCell(neutral,index),side=Math.min(rect.width,rect.height);
            context.drawImage(source,rect.x+Math.floor((rect.width-side)/2),rect.y+Math.floor((rect.height-side)/2),side,side,target%8*size,Math.floor(target/8)*size,size,size);
        }
    }
    // Keep the first three supplied atlases available as secondary pieces as well as fallbacks.
    const base = environmentThemes[theme].textureKey;
    if (scene.textures.exists(base) && scene.textures.get(base).source[0]?.width === 256 && scene.textures.get(base).source[0]?.height === 256) {
        const source = scene.textures.get(base).getSourceImage() as HTMLImageElement;
        for (let index=0;index<16;index++) context.drawImage(source,index%4*size,Math.floor(index/4)*size,size,size,(index+32)%8*size,Math.floor((index+32)/8)*size,size,size);
    }
    for (const [target,source,turns] of [[48,4,3],[49,4,2],[50,5,3],[51,5,2],[52,5,1]] as const) {
        context.save(); context.translate((target%8+.5)*size,(Math.floor(target/8)+.5)*size); context.rotate(turns*Math.PI/2);
        context.drawImage(texture.getSourceImage() as HTMLCanvasElement,source%8*size,Math.floor(source/8)*size,size,size,-size/2,-size/2,size,size);
        context.restore();
    }
    texture.refresh().setFilter(Phaser.Textures.FilterMode.NEAREST);
    return { key, atlas, provisional:false };
}
