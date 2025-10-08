import { DatePicker } from "../../src/datePicker";
import powerbiVisualsApi from "powerbi-visuals-api";
import IVisualPlugin = powerbiVisualsApi.visuals.plugins.IVisualPlugin;
import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions;
import DialogConstructorOptions = powerbiVisualsApi.extensibility.visual.DialogConstructorOptions;
var powerbiKey: any = "powerbi";
var powerbi: any = window[powerbiKey];
var datePicker2D48A1603A5164157AE234EC418C72DFB: IVisualPlugin = {
    name: 'datePicker2D48A1603A5164157AE234EC418C72DFB',
    displayName: 'DatePicker',
    class: 'DatePicker',
    apiVersion: '5.11.0',
    create: (options?: VisualConstructorOptions) => {
        if (DatePicker) {
            return new DatePicker(options);
        }
        throw 'Visual instance not found';
    },
    createModalDialog: (dialogId: string, options: DialogConstructorOptions, initialState: object) => {
        const dialogRegistry = (<any>globalThis).dialogRegistry;
        if (dialogId in dialogRegistry) {
            new dialogRegistry[dialogId](options, initialState);
        }
    },
    custom: true
};
if (typeof powerbi !== "undefined") {
    powerbi.visuals = powerbi.visuals || {};
    powerbi.visuals.plugins = powerbi.visuals.plugins || {};
    powerbi.visuals.plugins["datePicker2D48A1603A5164157AE234EC418C72DFB"] = datePicker2D48A1603A5164157AE234EC418C72DFB;
}
export default datePicker2D48A1603A5164157AE234EC418C72DFB;