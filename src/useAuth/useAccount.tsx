import {createContext, PropsWithChildren, useContext, useEffect, useMemo, useState} from "react";
import AuthConnector from "./AuthConnector";
import ProviderBuilder from "./ProviderBuilder";
import {
    AuthProviderType,
    IAuthProvider,
    IWebConnectionOptions,
    NetworkEnv
} from "@elrond-giants/erdjs-auth/dist/types";
import {LedgerProvider} from "@elrond-giants/erdjs-auth/dist";
import {Address} from "@multiversx/sdk-core/out";
import {NetworkContext} from "../useNetworkProvider";
import AccountBalance from "../AccountBalance";
import {INetworkProvider} from "@multiversx/sdk-network-providers/out/interface";
import {network} from "../network";
import {ApiNetworkProvider} from "@multiversx/sdk-network-providers/out";
import {GuardianData} from "@multiversx/sdk-network-providers/out/accounts";
import {computeNetworkConfig, fetchGuardianData, getNetworkEnv} from "../utils";
import {NetworkOptions, ProviderBuilderOptions, RequiredNetworkOptions} from "../types";


interface IContextProviderProps {
    connector?: AuthConnector;
    env: NetworkEnv | NetworkOptions;
    projectId?: string;
    enableWebview?: boolean;
    webConnectionOptions?: IWebConnectionOptions;
    use2FABrowserInput?: boolean;
}

interface IContextValue {
    address: string | null;
    authenticated: boolean;
    nonce: number;
    balance: AccountBalance;
    guardian: GuardianData;
    provider: IAuthProvider | null;
    networkOptions: RequiredNetworkOptions;
    use2FABrowserInput: boolean;
    login: (provider: AuthProviderType, options?: ILoginOptions) => Promise<string>;
    logout: () => Promise<boolean>;
    getLedgerAccounts: (page?: number | undefined, pageSize?: number | undefined) => Promise<string[]>;
    increaseNonce: () => number;
    refreshAccount: () => void;
}

interface ILoginOptions {
    token?: string;
    ledgerAccountIndex?: number;
}

interface IAccountData {
    nonce: number;
    balance: AccountBalance;
    guardian: GuardianData;
}

const devnetNetworkOptions: RequiredNetworkOptions = computeNetworkConfig("devnet");

const contextDefaultValue: IContextValue = {
    address: null,
    authenticated: false,
    nonce: 0,
    balance: new AccountBalance(0),
    guardian: new GuardianData({guarded: false}),
    provider: null,
    networkOptions: devnetNetworkOptions,
    use2FABrowserInput: false,
    login: async (provider: AuthProviderType, options?: ILoginOptions) => "",
    logout: async () => true,
    getLedgerAccounts: (page?: number | undefined, pageSize?: number | undefined) => {
        return Promise.resolve([]);
    },
    increaseNonce: (): number => { return 0;},
    refreshAccount: () => {},
};

export const AuthContext = createContext(contextDefaultValue);

export const AuthContextProvider = (
    {
        connector,
        env,
        children,
        projectId,
        enableWebview,
        webConnectionOptions,
        use2FABrowserInput = false
    }: PropsWithChildren<IContextProviderProps>
) => {
    const networkOptions = computeNetworkConfig(env);
    const [account, setAccount] = useState<IAccountData | null>(null);
    const [authConnector, setAuthConnector] = useState(() => {
        const authConnector = connector ?? new AuthConnector(new ProviderBuilder({
            projectId,
            webConnectionOptions,
            chainId: networkOptions.chainId,
            walletAddress: networkOptions.walletUrl,
        }));
        authConnector.onChange = async () => {
            await refreshAccount();
            setChangedAt(Date.now());
        };

        return authConnector;
    })
    const [changedAt, setChangedAt] = useState(Date.now());

    let networkProvider: INetworkProvider;
    const networkContext = useContext(NetworkContext);
    if (networkContext !== undefined && networkContext.provider !== undefined) {
        networkProvider = networkContext.provider;
    } else {
        networkProvider = new ApiNetworkProvider(networkOptions.apiUrl);
    }


    const refreshAccount = async () => {
        const address = authConnector.provider?.getAddress();
        if (address) {
            const data = await networkProvider.getAccount(Address.fromBech32(address));
            const guardian = await getGuardian(address, networkProvider);
            setAccount({
                nonce: data.nonce.valueOf(),
                balance: new AccountBalance(data.balance),
                guardian
            });
        } else {
            setAccount(null);
        }
    };

    useEffect(() => {
        if (!authConnector.initialised()) {
            (async () => {
                await authConnector.initFromStorage();
                await refreshAccount();
                setChangedAt(Date.now())
            })();
        }
    }, []);

    useEffect(() => {
        if (enableWebview && window !== undefined) {
            const params = new URLSearchParams(window.location.search);
            const accessToken = params.get("accessToken");
            if (accessToken) {
                authConnector.init(AuthProviderType.WEBVIEW);
            }
        }
    }, []);


    const value = useMemo(() => {
        const state = authConnector.provider?.toJson();
        return {
            address: state?.address ?? null,
            authenticated: state?.authenticated ?? false,
            nonce: account?.nonce ?? 0,
            balance: account?.balance ?? new AccountBalance(0),
            guardian: account?.guardian ?? new GuardianData({guarded: false}),
            provider: authConnector.provider,
            networkOptions,
            use2FABrowserInput,
            login: async (
                provider: AuthProviderType,
                {
                    token,
                    ledgerAccountIndex
                }: ILoginOptions = {}
            ) => {
                if (authConnector.provider?.getType() !== provider) {
                    await authConnector.init(provider);
                }

                if (null != ledgerAccountIndex && authConnector.provider instanceof LedgerProvider) {
                    authConnector.provider.setAccount(ledgerAccountIndex);
                }

                // @ts-ignore
                return authConnector.provider.login(token);
            },
            logout: () => {
                return authConnector.logout();
            },
            getLedgerAccounts: async (page?: number | undefined, pageSize?: number | undefined) => {
                if (
                    !authConnector.initialised()
                    || authConnector.provider?.getType() !== AuthProviderType.LEDGER
                ) {
                    await authConnector.init(AuthProviderType.LEDGER);
                }

                if (authConnector.provider instanceof LedgerProvider) {
                    return authConnector.provider.getAccounts(page, pageSize);
                }

                return [];
            },
            increaseNonce: (): number => {
                if (!account) {return 0;}
                const acc = {...account, nonce: account.nonce + 1};
                setAccount(acc);

                return acc.nonce;
            },
            refreshAccount
        }

    }, [changedAt, account?.nonce]);


    return <AuthContext.Provider value={value} children={children}/>;

}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error(`useAuth must be used within an AuthContextProvider.`);
    }
    return context;
}

const getGuardian = async (address: string, networkProvider: INetworkProvider): Promise<GuardianData> => {
    if (networkProvider instanceof ApiNetworkProvider) {
        try {
            const guardian = await networkProvider.getGuardianData(Address.fromBech32(address));

            return guardian;
        } catch (e) {
            return new GuardianData({guarded: false});
        }
    }
    const networkConfig = await networkProvider.getNetworkConfig();
    const guardianDataResponse = await fetchGuardianData(address, networkConfig.ChainID);

    return GuardianData.fromHttpResponse(guardianDataResponse);


}


