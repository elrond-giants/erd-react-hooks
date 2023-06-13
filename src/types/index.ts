import {AuthProviderType, IAuthProvider, IAuthState} from "@elrond-giants/erdjs-auth/dist/types";
import {IGasLimit, TokenPayment, Transaction, TransactionPayload} from "@multiversx/sdk-core/out";
import {
    IAddress,
    ITransactionOptions,
    ITransactionVersion
} from "@multiversx/sdk-core/out/interface";

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
    buildProvider(type: AuthProviderType | string): IAuthProvider;
}

export interface ITransactionProps {
    data: string | TransactionPayload;
    receiver: string;
    gasLimit?: IGasLimit;
    chainId?: string;
    value?: number | TokenPayment;
    onBeforeSign?: () => void;
    onSigned?: () => void;
    version?: ITransactionVersion;
    options?: ITransactionOptions;
    guardian?: string;

}

export interface IPoolingOptions {
    interval?: number;
    timeout?: number;
    patience?: number;
}

export type RequireOnlyOne<T, Keys extends keyof T = keyof T> =
    Pick<T, Exclude<keyof T, Keys>>
    & {
    [K in Keys]-?:
    Required<Pick<T, K>>
    & Partial<Record<Exclude<Keys, K>, undefined>>
}[Keys]

export type TransactionData =  {
    transaction: ITransactionProps | Transaction;
    webReturnUrl?: string;
    onBeforeSign?: () => void;
    onSigned?: () => void;
}