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
