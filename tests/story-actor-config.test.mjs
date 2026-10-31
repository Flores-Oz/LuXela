import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tsModuleUrl } from "./ts-module.mjs";
const { storyActors } = await import(tsModuleUrl(new URL("../src/narrative/StoryActorConfig.ts", import.meta.url)));

test("Kira atlas describes the real RGBA sheet and keeps every crop inside it", () => {
    const kira = storyActors.kira;
    const png = readFileSync(`public${kira.src}`);
    assert.equal(png.readUInt32BE(16), kira.sourceSize.width);
    assert.equal(png.readUInt32BE(20), kira.sourceSize.height);
    assert.equal(png[25], 6, "RGBA source retains transparency");
    for (const frame of Object.values(kira.frames)) {
        const { crop } = frame;
        assert.ok(crop.x >= 0 && crop.y >= 0);
        assert.ok(crop.x + crop.width <= kira.sourceSize.width);
        assert.ok(crop.y + crop.height <= kira.sourceSize.height);
        const dx = kira.layout.centerX - frame.anchorX + crop.x;
        const dy = kira.layout.groundY - frame.groundY + crop.y;
        assert.ok(dx >= 0 && dy >= 0, JSON.stringify(frame));
        assert.ok(dx + crop.width <= kira.layout.width);
        assert.ok(dy + crop.height <= kira.layout.height);
        assert.equal(dy + frame.groundY - crop.y, kira.layout.groundY, "feet stay aligned");
    }
});

test("Kira cycles resolve real poses with supported timings and a finite meow", () => {
    const { frames, animations } = storyActors.kira;
    for (const name of ["idle", "walk-left", "walk-right", "walk-up", "walk-down",
        "run-left", "run-right", "run-up", "run-down", "sit", "sleep", "meow"]) {
        const animation = animations[name];
        assert.ok(animation.frames.length >= 4);
        assert.ok(animation.frameRate > 0 && animation.frameRate <= 12);
        for (const frame of animation.frames) assert.ok(frames[frame], frame);
    }
    assert.equal(animations.meow.repeat, false);
    assert.equal(animations.idle.repeat, true);
    assert.ok(animations["run-right"].frameRate > animations["walk-right"].frameRate);
    assert.equal(animations.idle.frames.slice(0, 4).every(id => id === "idle-0"), true);
});

