import type Phaser from "phaser";

/** Cover the viewport at native scale; only enlarge when the screen exceeds the entire room. */
export function roomCameraZoom(viewWidth:number,viewHeight:number,roomWidth:number,roomHeight:number):number {
    return Math.max(1,viewWidth/roomWidth,viewHeight/roomHeight);
}
export function layoutRoomCamera(scene:Phaser.Scene,width:number,height:number,target:Phaser.GameObjects.Components.Transform):void {
    const camera=scene.cameras.main;
    camera.setViewport(0,0,scene.scale.width,scene.scale.height)
        .setBounds(0,0,width,height)
        .setZoom(roomCameraZoom(scene.scale.width,scene.scale.height,width,height))
        .startFollow(target,true,.1,.1);
}
