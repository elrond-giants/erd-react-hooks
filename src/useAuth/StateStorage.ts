import {IStateStorage} from "../types";
import {IAuthState} from "@elrond-giants/erdjs-auth/dist/types";

export default class StateStorage implements IStateStorage {
    getItem(key: string): IAuthState | null {
        const item = window.localStorage.getItem(key);
        if (item !== null) {
            return JSON.parse(item);
        }

        return item;
    }

    storeItem(key: string, value: IAuthState): void {
        localStorage.setItem(key, JSON.stringify(value));
    }

    removeItem(key: string): void {
        localStorage.removeItem(key);
    }


};