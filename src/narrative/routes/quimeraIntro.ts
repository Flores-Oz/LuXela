import type {NarrativeSequence} from '../NarrativeTypes';
export const quimeraIntros:readonly NarrativeSequence[]=(['alex','lua'] as const).map(route=>({
    id:`${route}_quimera_intro`,route,chapterId:'quimera-true-combat',provisional:false,
    entries:[{type:'background',key:'quimera-intro',transition:'fade'},
        ...['Datos obtenidos.','Patrones aprendidos.','Prepárate para el verdadero combate.'].map(text=>({type:'dialogue' as const,speaker:'E.X.P.-01 QUIMERA',text}))]
}));
