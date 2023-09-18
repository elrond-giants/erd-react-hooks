import {
    AuthProviderType,
    IAuthProvider,
    IAuthState,
    IWebConnectionOptions
} from "@elrond-giants/erdjs-auth/dist/types";
import {
    IGasLimit, INonce,
    TokenPayment,
    TokenTransfer,
    Transaction,
    TransactionPayload
} from "@multiversx/sdk-core/out";
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
    value?: number | TokenTransfer;
    onBeforeSign?: () => void;
    onSigned?: () => void;
    version?: ITransactionVersion;
    options?: ITransactionOptions;
    guardian?: string;
    nonce?: number;

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

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] }


export type TransactionData = {
    transaction: ITransactionProps | Transaction;
    webReturnUrl?: string;
    onBeforeSign?: () => void;
    onSigned?: () => void;
    guard2FACode?: string;
}

export type TransactionsData = {
    transactions: WithRequired<ITransactionProps, "nonce">[] | Transaction[];
    webReturnUrl?: string;
    onBeforeSign?: () => void;
    onSigned?: () => void;
    guard2FACode?: string;
}

export type ProviderBuilderOptions = {
    chainId: string;
    projectId?: string;
    webConnectionOptions?: IWebConnectionOptions;
    walletAddress?: string;
}

export type NetworkOptions = {
    chainId: string;
    apiUrl?: string;
    gatewayUrl?: string;
    walletUrl?: string;
    toolsUrl?: string;
}

// export type RequiredNetworkOptions = Required<Omit<NetworkOptions, "walletUrl">> & {
//     walletUrl?: string
// };

export type RequiredNetworkOptions = Required<NetworkOptions>;