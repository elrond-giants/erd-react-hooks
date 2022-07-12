import {AuthProviderType, IAuthProvider, IAuthState} from "@elrond-giants/erdjs-auth/dist/types";

export {AuthProviderType};

export interface IStateStorage {
    storeItem(key: string, value: IAuthState): void;

    getItem(key: string): IAuthState | null;

    removeItem(key: string): void;
}

export interface INetworkConfig {
    walletAddress: string;
    bridgeAddress: string;
}

export interface IProviderBuilder {
    buildProvider(type: AuthProviderType): IAuthProvider;
}


export type RequireOnlyOne<T, Keys extends keyof T = keyof T> =
    Pick<T, Exclude<keyof T, Keys>>
    & {
    [K in Keys]-?:
    Required<Pick<T, K>>
    & Partial<Record<Exclude<Keys, K>, undefined>>
}[Keys]