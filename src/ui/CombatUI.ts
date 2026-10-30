import Phaser from 'phaser';

const panels={
    'hud-panel-frame':{x:0,y:136,width:1983,height:513,cap:198},
    'boss-hud-frame':{x:12,y:177,width:2149,height:352,cap:258},
    'level-banner-frame':{x:2,y:164,width:2168,height:365,cap:200}
} as const;
export type CombatPanelKey=keyof typeof panels;

export function loadCombatUIAssets(scene:Phaser.Scene):void {
    for(const key of [...Object.keys(panels),'alex-ability-icon','lua-ability-icon'])
        if(!scene.textures.exists(key))scene.load.image(key,`assets/ui/${key}.png`);
}

/** Three image slices also render in Canvas, unlike Phaser's WebGL-only NineSlice. */
export class CombatPanel extends Phaser.GameObjects.Container {
    private readonly slices:Phaser.GameObjects.Image[];
    private readonly source:typeof panels[CombatPanelKey];
    constructor(scene:Phaser.Scene,key:CombatPanelKey){
        super(scene,0,0);scene.add.existing(this);this.source=panels[key];
        const texture=scene.textures.get(key),s=this.source;
        if(!texture.has('hud-left')){
            texture.add('hud-left',0,s.x,s.y,s.cap,s.height);
            texture.add('hud-center',0,s.x+s.cap,s.y,s.width-2*s.cap,s.height);
            texture.add('hud-right',0,s.x+s.width-s.cap,s.y,s.cap,s.height);
        }
        this.slices=['hud-left','hud-center','hud-right'].map(frame=>scene.add.image(0,0,key,frame).setOrigin(0));
        this.add(this.slices);
    }
    resize(width:number,height:number):this {
        const cap=Math.min(width/3,this.source.cap*height/this.source.height);
        this.slices[0]!.setPosition(0,0).setDisplaySize(cap,height);
        this.slices[1]!.setPosition(cap,0).setDisplaySize(width-2*cap,height);
        this.slices[2]!.setPosition(width-cap,0).setDisplaySize(cap,height);
        this.setSize(width,height);return this;
    }
}

export function anchorCombatUI(scene:Phaser.Scene,object:Phaser.GameObjects.Container|Phaser.GameObjects.Text,x:number,y:number):void {
    const c=scene.cameras.main,z=c.zoom;
    object.setScrollFactor(0).setScale(1/z).setPosition(c.width/2+(x-c.width/2)/z,c.height/2+(y-c.height/2)/z);
}

export function combatUILayout(width:number,height:number){
    const compact=width<650,margin=12,gap=12;
    const progressWidth=compact?(width-3*margin)/2:Math.min(220,width*.28);
    const statsWidth=compact?progressWidth:Math.min(340,width*.34);
    const specialWidth=Math.min(330,width-2*margin);
    const briefingWidth=compact?width-2*margin:Math.min(460,width-specialWidth-3*margin);
    return {compact,margin,
        progress:{x:margin,y:margin,width:progressWidth,height:compact?64:76},
        stats:{x:compact?width-margin-statsWidth:(width-statsWidth)/2,y:margin,width:statsWidth,height:compact?64:76},
        pause:{x:width-margin,y:compact?84:margin},
        special:{x:margin,y:height-116,width:specialWidth,height:104},
        briefing:{x:compact?margin:width-margin-briefingWidth,y:compact?height-216:height-96,width:briefingWidth,height:84},
        boss:{x:(width-Math.min(720,width-2*margin))/2,y:compact?132:104,width:Math.min(720,width-2*margin),height:compact?72:84},gap
    };
}
