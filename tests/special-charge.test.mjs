import assert from 'node:assert/strict';
import test from 'node:test';
import { tsModuleUrl } from './ts-module.mjs';
const { SpecialAbility } = await import(tsModuleUrl(new URL('../src/abilities/SpecialAbility.ts', import.meta.url)));
const { ArcadeRunService } = await import(tsModuleUrl(new URL('../src/systems/ArcadeRunService.ts', import.meta.url)));
const { SpecialAbilityConfig } = await import(tsModuleUrl(new URL('../src/config/SpecialAbilityConfig.ts', import.meta.url)));
function setup(character = 'alex') {
    const runs = new ArcadeRunService(2), id = runs.begin(character), state = { dead: false, discharges: 0 };
    class Ability extends SpecialAbility { onDischarge() { state.discharges++; } }
    const ability = new Ability({ isDead: () => state.dead, physicsSprite: { active: true } }, SpecialAbilityConfig[character], { count: () => runs.getSpecialCharge(id), consume: () => runs.consumeSpecial(id), cooldownRemaining: () => runs.getSpecialCooldown(id) });
    const kill = (enemy, room = 0) => runs.awardKill(id, room, String(enemy), 100);
    return { runs, id, state, ability, kill };
}
for (const character of ['alex', 'lua']) {
    test(`${character}: only kills charge, activation consumes once, animation does not recharge`, () => {
        const { runs, id, ability, state, kill } = setup(character), timing = SpecialAbilityConfig[character];
        ability.update(1000000); assert.equal(ability.state, 'locked'); assert.equal(ability.activate(), false);
        for (let i = 0; i < 9; i++) kill(i);
        assert.equal(ability.activate(), false); assert.equal(runs.getSpecialCharge(id), 9);
        kill(9); assert.equal(ability.state, 'ready'); assert.equal(ability.activate(), true);
        assert.equal(runs.getSpecialCharge(id), 0); assert.equal(ability.activate(), false);
        ability.update(timing.chargeMs - 1); assert.equal(state.discharges, 0);
        ability.update(1); assert.equal(state.discharges, 1);
        ability.update(timing.durationMs + timing.recoveryMs + 100000);
        assert.equal(ability.state, 'locked'); assert.equal(state.discharges, 1); assert.equal(runs.getSpecialCharge(id), 0);
        runs.advanceSpecialCooldown(id, 100000); assert.equal(ability.state, 'locked');
    });
    test(`${character}: charge crosses rooms and retry restores entry checkpoint`, () => {
        const { runs, id, kill } = setup(character);
        kill('a'); kill('b'); runs.clearRoom(id, 0); runs.advance(id, 0);
        assert.equal(runs.getSpecialCharge(id), 2);
        kill('c', 1); assert.equal(runs.getSpecialCharge(id), 3);
        runs.defeat(id); runs.continue(id, character, 1);
        assert.equal(runs.getSpecialCharge(id), 2); assert.equal(runs.getScore(id), 200);
        assert.equal(kill('c', 1), true); assert.equal(runs.getSpecialCharge(id), 3);
        runs.begin(character); assert.equal(runs.getSpecialCharge(id), 0);
    });
}

for (const character of ['alex', 'lua']) {
    test(`${character}: ten new kills recharge immediately without a time cooldown`, () => {
        const {runs,id,ability,kill}=setup(character),timing=SpecialAbilityConfig[character];
        for(let i=0;i<10;i++)kill(`first-${i}`);
        assert.equal(runs.getSpecialCooldown(id),0);assert.equal(ability.activate(),true);
        assert.equal(runs.getSpecialCooldown(id),0);
        ability.update(timing.chargeMs+timing.durationMs+timing.recoveryMs);
        for(let i=0;i<9;i++)kill(`next-${i}`);
        runs.advanceSpecialCooldown(id,45000);assert.equal(runs.getSpecialCharge(id),9);assert.equal(ability.activate(),false);
        kill('next-9');assert.equal(ability.state,'ready');assert.equal(ability.activate(),true);
        assert.equal(runs.getSpecialCharge(id),0);assert.equal(runs.getSpecialCooldown(id),0);
    });
    test(`${character}: only kill charge crosses rooms and retry restores its entry checkpoint`, () => {
        const {runs,id,kill}=setup(character);
        for(let i=0;i<10;i++)kill(i);
        assert.equal(runs.consumeSpecial(id),true);runs.advanceSpecialCooldown(id,3000);
        for(let i=0;i<3;i++)kill(`after-${i}`);
        runs.clearRoom(id,0);assert.equal(runs.advance(id,0),true);
        assert.equal(runs.getSpecialCooldown(id),0);assert.equal(runs.getSpecialCharge(id),3);
        runs.advanceSpecialCooldown(id,10000);kill('room-two',1);runs.defeat(id);
        assert.equal(runs.continue(id,character,1),true);
        assert.equal(runs.getSpecialCooldown(id),0);assert.equal(runs.getSpecialCharge(id),3);
        const fresh=runs.begin(character);assert.equal(runs.getSpecialCooldown(fresh),0);assert.equal(runs.getSpecialCharge(fresh),0);
    });
}

test('invalid deltas, stale sessions and defeated runs cannot advance cooldown', () => {
    const {runs,id,kill}=setup();for(let i=0;i<10;i++)kill(i);runs.consumeSpecial(id);
    for(const delta of [0,-1,NaN,Infinity])runs.advanceSpecialCooldown(id,delta);
    runs.advanceSpecialCooldown(id+1,45000);assert.equal(runs.getSpecialCooldown(id),0);assert.equal(runs.getSpecialCharge(id),0);
    runs.defeat(id);runs.advanceSpecialCooldown(id,45000);assert.equal(runs.getSpecialCooldown(id),0);assert.equal(runs.getSpecialCharge(id),0);
});
test('duplicate deaths, invalid room and defeated sessions do not charge; charge is capped', () => {
    const { runs, id, kill } = setup();
    assert.equal(kill('same'), true); assert.equal(kill('same'), false); assert.equal(kill('other', 1), false);
    assert.equal(runs.getSpecialCharge(id), 1);
    for (let i = 0; i < 30; i++) kill(i);
    assert.equal(runs.getSpecialCharge(id), 10);
    runs.defeat(id); assert.equal(kill('late'), false); assert.equal(runs.consumeSpecial(id), false);
});
test('death and destruction cancel an attack without discharge or refund', () => {
    const { ability, state, runs, id, kill } = setup();
    for (let i = 0; i < 10; i++) kill(i);
    ability.activate(); ability.update(100); state.dead = true; ability.update(10000);
    assert.equal(ability.performing, false); assert.equal(state.discharges, 0); assert.equal(runs.getSpecialCharge(id), 0);
    ability.destroy(); ability.update(100000); assert.equal(ability.activate(), false);
});
