import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { tsModuleUrl } from './ts-module.mjs';

const { alexTest } = await import(tsModuleUrl(new URL('../src/narrative/routes/alex/testSequence.ts', import.meta.url)));
const { alexEnding } = await import(tsModuleUrl(new URL('../src/narrative/routes/alex/ending.ts', import.meta.url)));
const { narrativeBackgrounds, narrativePortraits } = await import(tsModuleUrl(new URL('../src/config/NarrativeConfig.ts', import.meta.url)));
const { NarrativeRouteManager } = await import(tsModuleUrl(new URL('../src/narrative/NarrativeRouteManager.ts', import.meta.url)));
const { isNarrativeSequence } = await import(tsModuleUrl(new URL('../src/narrative/NarrativeTypes.ts', import.meta.url)));

const backgrounds = sequence => sequence.entries.filter(entry => entry.type === 'background').map(entry => entry.key);
const text = sequence => sequence.entries.filter(entry => entry.type === 'dialogue').map(entry => entry.text).join('\n');

test('Alex introduction has eight ordered story scenes, from home to the factory', () => {
    assert.equal(alexTest.id, 'alex_test');
    assert.equal(alexTest.chapterId, 'alex-birthday-v1');
    assert.equal(alexTest.provisional, false);
    assert.deepEqual(backgrounds(alexTest), [
        'alex-intro', 'alex-kira-baking', 'alex-house-kitchen', 'alex-robot-home-invasion',
        'alex-kira-captured', 'alex-house-damaged', 'alex-arming-up', 'alex-factory-entrance'
    ]);
    assert.match(text(alexTest), /cumpleaños/);
    assert.match(text(alexTest), /SUELTEN A KIRA/);
    assert.match(text(alexTest), /Shoot Vent/);
    assert.match(text(alexTest), /Nivel 1/);
    assert.ok(alexTest.entries.some(entry => entry.type === 'actor' && entry.id === 'kira' && entry.moveTo));
    assert.ok(alexTest.entries.some(entry => entry.type === 'prop' && entry.key === 'birthday-cake'));
});

test('Alex ending rescues Kira after Quimera and closes with the birthday celebration', () => {
    assert.equal(alexEnding.id, 'alex_ending');
    assert.equal(alexEnding.chapterId, 'alex-birthday-ending-v1');
    assert.equal(alexEnding.provisional, false);
    assert.deepEqual(backgrounds(alexEnding), [
        'alex-factory-exterior', 'alex-kira-containment', 'alex-kira-reunion',
        'alex-return-home-dawn', 'alex-house-damaged', 'alex-ending-birthday', 'alex-ending-celebration'
    ]);
    assert.match(text(alexEnding), /Quimera/);
    assert.match(text(alexEnding), /Once sectores/);
    assert.match(text(alexEnding), /cámara se abre/);
    assert.match(text(alexEnding), /Gracias por acordarte de mi cumpleaños/);
    assert.equal(alexEnding.entries.at(-1).text, 'A veces, lo único que necesitas es volver a casa.');
});

test('Story sequences validate and every background and portrait resolves to a real asset', () => {
    for (const sequence of [alexTest, alexEnding]) {
        assert.ok(isNarrativeSequence(sequence), sequence.id);
        for (const entry of sequence.entries) {
            if (entry.type === 'background') {
                const asset = narrativeBackgrounds[entry.key];
                assert.ok(asset, entry.key);
                assert.ok(existsSync(new URL('../public/' + asset.src, import.meta.url)), asset.src);
                assert.equal(asset.crop, undefined, 'Story illustrations should use the complete source');
            }
            if (entry.type === 'portrait') {
                assert.ok(narrativePortraits[entry.character]?.expressions[entry.expression], entry.expression);
            }
        }
    }
});

test('Complete CG scenes never retain a duplicate portrait, Kira actor, or cake prop', () => {
    const cgKeys = new Set([
        'alex-kira-baking', 'alex-robot-home-invasion', 'alex-kira-captured', 'alex-arming-up',
        'alex-factory-entrance', 'alex-kira-containment', 'alex-kira-reunion',
        'alex-return-home-dawn', 'alex-ending-birthday', 'alex-ending-celebration'
    ]);
    for (const sequence of [alexTest, alexEnding]) {
        const portraits = new Set(), actors = new Set(), props = new Set();
        let background;
        for (const entry of sequence.entries) {
            if (entry.type === 'portrait') portraits.add(entry.character);
            if (entry.type === 'hidePortrait') portraits.delete(entry.character);
            if (entry.type === 'actor') actors.add(entry.id);
            if (entry.type === 'hideActor') actors.delete(entry.id);
            if (entry.type === 'prop') props.add(entry.id);
            if (entry.type === 'hideProp') props.delete(entry.id);
            if (entry.type === 'background') background = entry.key;
            if (entry.type === 'dialogue' && cgKeys.has(background)) {
                assert.equal(portraits.size, 0, background + ': portrait');
                assert.equal(actors.size, 0, background + ': actor');
                assert.equal(props.size, 0, background + ': prop');
            }
        }
        assert.equal(actors.size, 0, 'Ending must leave no persistent actor');
        assert.equal(props.size, 0, 'Ending must leave no persistent prop');
    }
});

test('Versioned chapters reject old test checkpoints while preserving route ids', () => {
    const routes = new NarrativeRouteManager();
    assert.equal(routes.resolve('alex'), alexTest);
    assert.equal(routes.resolve('alex', 'alex_ending'), alexEnding);
    const firstDialogue = alexTest.entries.findIndex(entry => entry.type === 'dialogue');
    assert.equal(routes.validProgress('alex', {
        sequenceId: 'alex_test', chapterId: 'test', entryIndex: firstDialogue, status: 'reading'
    }), false);
    assert.equal(routes.validProgress('alex', {
        sequenceId: 'alex_test', chapterId: alexTest.chapterId, entryIndex: firstDialogue, status: 'reading'
    }), true);
    assert.equal(routes.resolve('lua').id, 'lua_test');
    assert.equal(routes.resolve('lua').provisional, true);
});

