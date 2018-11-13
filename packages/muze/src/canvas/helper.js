import { isEqual } from 'muze-utils';
import { VisualGroup } from '@chartshq/visual-group';
import { ROWS, COLUMNS, COLOR, SHAPE, SIZE, DETAIL, DATA, CONFIG, CANVAS_LOCAL_NAMESPACE }
    from '../constants';
import { canvasOptions } from './local-options';

/**
 * Instantiate high level components. Canvas knows what all high level component it has.
 * @nice-to-have dynamic high level components.
 *  - Is it even required ?
 *  - Reactive to source (canvas) streaming ?
 * @param {*} context Canvas instance
 * @return {Object.<Array>} Arrays of Title, visualGroup, Legend
 */
export const initCanvas = (context) => {
    const reg = context._registry.components;

    return [new reg.VisualGroup(context._registry, context.dependencies())];
};

/**
 *
 *
 * @memberof Canvas
 */
export const dispatchProps = (context) => {
    const lifeCycleManager = context.dependencies().lifeCycleManager;
    lifeCycleManager.notify({ client: context, action: 'beforeupdate' });
    const visualGroup = context.composition().visualGroup;

    const allOptions = context._allOptions;
    for (const key in allOptions) {
        const value = context[key]();
        if (value !== null) {
            visualGroup[key] && visualGroup[key](value);
        }
    }
    visualGroup.createMatrices();
    context._cachedProps = {};
    lifeCycleManager.notify({ client: context, action: 'initialized' });
    lifeCycleManager.notify({ client: context, action: 'updated' });
};

const equalityChecker = (props, params) => {
    let checker = () => false;
    return !props.every((option, i) => {
        switch (option) {
        case ROWS:
        case COLUMNS:
        case DETAIL:
            checker = isEqual('Array');
            break;

        case SHAPE:
        case SIZE:
        case COLOR:
        case DATA:
        case CONFIG:
            checker = isEqual('Object');
            break;
        default:
            checker = () => true;
            break;
        }
        const oldVal = params[i][0];
        const newVal = params[i][1];

        return checker(oldVal, newVal);
    });
};

const updateChecker = (props, params) => props.every((option, i) => {
    const val = params[i][1];
    switch (option) {
    case ROWS:
    case COLUMNS:
        return val !== null;

    case DATA:
        return val && !val.isEmpty();

    default:
        return true;

    }
});

export const setupChangeListener = (context) => {
    const store = context._store;

    const allOptions = Object.keys(context._allOptions);
    const props = [...allOptions, ...Object.keys(canvasOptions)];
    const nameSpaceProps = [...allOptions, ...Object.keys(canvasOptions)].map(prop =>
        `${CANVAS_LOCAL_NAMESPACE}.${prop}`);
    store.registerChangeListener(nameSpaceProps, (...params) => {
        let updateProps = equalityChecker(props, params);
        updateProps = updateChecker(props, params);

        // inform attached board to rerender
        if (updateProps && context.mount()) {
            dispatchProps(context);
            context.render();
        }
    }, true);
};

export const applyInteractionPolicy = (policies, firebolt) => {
    const canvas = firebolt.context;
    const visualGroup = canvas.composition().visualGroup;
    const valueMatrix = visualGroup.composition().matrices.value;
    policies.forEach(policy => policy(valueMatrix, firebolt));
};

export const createGroupState = (context) => {
    const [globalState, localState] = VisualGroup.getState();
    const store = context._store;
    store.append('app.group', globalState);
    store.append('local.group', localState);
};
