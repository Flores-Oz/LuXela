import {BossFinisherConfig as config} from '../../config/BossFinisherConfig';
import type {PlayerCharacter} from '../../config/characters';

/** Scene-delta clock for both input and animation, so Escape pauses the exact frame. */
export class FinisherChallenge {
    readonly sequence:readonly string[];
    state:'idle'|'prompt'|'animating'|'failed'|'complete'|'cancelled'='idle';
    step=0;
    remaining:number=config.stepMs;
    elapsed=0;
    private readonly duration:number;
    constructor(character:PlayerCharacter,duration:number){this.sequence=config.sequences[character];this.duration=duration;}
    get active():boolean{return this.state==='prompt'||this.state==='animating';}
    start():boolean {if(this.state!=='idle')return false;this.state='prompt';return true;}
    input(code:string,repeat=false):boolean {
        if(this.state!=='prompt'||repeat)return false;
        if(code!==this.sequence[this.step]){this.state='failed';return false;}
        this.step++;this.remaining=config.stepMs;
        if(this.step===this.sequence.length){this.state='animating';this.elapsed=0;}
        return true;
    }
    update(delta:number):void {
        if(!Number.isFinite(delta)||delta<=0)return;
        if(this.state==='prompt'){this.remaining=Math.max(0,this.remaining-delta);if(this.remaining===0)this.state='failed';}
        else if(this.state==='animating'){this.elapsed=Math.min(this.duration,this.elapsed+delta);if(this.elapsed===this.duration)this.state='complete';}
    }
    cancel():void {if(this.state!=='complete')this.state='cancelled';}
}
