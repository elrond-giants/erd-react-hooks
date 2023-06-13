import {createContext, PropsWithChildren, useContext, useEffect, useMemo, useState} from "react";
import AuthConnector from "./AuthConnector";
import ProviderBuilder from "./ProviderBuilder";
import {AuthProviderType, IAuthProvider, NetworkEnv} from "@elrond-giants/erdjs-auth/dist/types";
import {LedgerProvider} from "@elrond-giants/erdjs-auth/dist";
import {Address} from "@multiversx/sdk-core/out";
import {NetworkContext} from "../useNetworkProvider";
import AccountBalance from "../AccountBalance";
import {INetworkProvider} from "@multiversx/sdk-network-providers/out/interface";
import {network} from "../network";
import {ApiNetworkProvider} from "@multiversx/sdk-network-providers/out";
import {GuardianData} from "@multiversx/sdk-network-providers/out/accounts";
import {fetchGuardianData} from "../utils";

interface IContextProviderProps {
    connector?: AuthConnector,
    env: NetworkEnv,
    projectId?: string,
}

interface IContextValue {
    address: string | null;
    authenticated: boolean;
    nonce: number;
    balance: AccountBalance;
    guardian: GuardianData;
    provider: IAuthProvider | null;
    env: NetworkEnv;
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

// type AccountGuardian = {
//     address: string;
//     serviceUID: string;
//     activationEpoch: number;
// };

interface IAccountData {
    nonce: number;
    balance: AccountBalance;
    guardian: GuardianData;
    // guarded: boolean;
    // activeGuardian?: AccountGuardian;
    // pendingGuardian?: AccountGuardian;
}

const contextDefaultValue: IContextValue = {
    address: null,
    authenticated: false,
    nonce: 0,
    balance: new AccountBalance(0),
    guardian: new GuardianData({guarded: false}),
    provider: null,
    env: "devnet",
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
        projectId
    }: PropsWithChildren<IContextProviderProps>
) => {
    const [account, setAccount] = useState<IAccountData | null>(null);
    const [authConnector, setAuthConnector] = useState(() => {
        const authConnector = getConnector({connector, env, projectId});
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
        const url = network[env]["api"];
        networkProvider = new ApiNetworkProvider(url);
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
    }, [])


    const value = useMemo(() => {
        const state = authConnector.provider?.toJson();
        return {
            address: state?.address ?? null,
            authenticated: state?.authenticated ?? false,
            nonce: account?.nonce ?? 0,
            balance: account?.balance ?? new AccountBalance(0),
            guardian: account?.guardian ?? new GuardianData({guarded: false}),
            provider: authConnector.provider,
            env,
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

const getConnector = ({connector, env, projectId}: IContextProviderProps): AuthConnector => {
    if (connector !== undefined) {return connector;}
    const providerBuilder = new ProviderBuilder(env ?? "devnet", projectId);

    return new AuthConnector(providerBuilder);
}

const getGuardian = async (address: string, networkProvider: INetworkProvider): Promise<GuardianData> => {
    if (networkProvider instanceof ApiNetworkProvider) {
        return networkProvider.getGuardianData(Address.fromBech32(address));
    }
    const networkConfig = await networkProvider.getNetworkConfig();
    const guardianDataResponse = await fetchGuardianData(address, networkConfig.ChainID);

    return GuardianData.fromHttpResponse(guardianDataResponse);


}


