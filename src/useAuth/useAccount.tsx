import {createContext, PropsWithChildren, useContext, useEffect, useMemo, useState} from "react";
import AuthConnector from "./AuthConnector";
import ProviderBuilder from "./ProviderBuilder";
import {AuthProviderType, IAuthProvider, NetworkEnv} from "@elrond-giants/erdjs-auth/dist/types";
import {LedgerProvider} from "@elrond-giants/erdjs-auth/dist";
import {Address} from "@elrondnetwork/erdjs/out";
import {NetworkContext} from "../useNetworkProvider";
import AccountBalance from "../AccountBalance";
import {INetworkProvider} from "@elrondnetwork/erdjs-network-providers/out/interface";
import {network} from "../network";
import {ApiNetworkProvider} from "@elrondnetwork/erdjs-network-providers/out";

interface IContextProviderProps {
    connector?: AuthConnector,
    env: NetworkEnv
}

interface IContextValue {
    address: string | null;
    authenticated: boolean;
    nonce: number;
    balance: AccountBalance;
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

interface IAccountData {
    nonce: number;
    balance: AccountBalance;
}

const contextDefaultValue: IContextValue = {
    address: null,
    authenticated: false,
    nonce: 0,
    balance: new AccountBalance(0),
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
        children
    }: PropsWithChildren<IContextProviderProps>
) => {
    const [account, setAccount] = useState<IAccountData | null>(null);
    const [authConnector, setAuthConnector] = useState(() => {
        const authConnector = getConnector({connector, env});
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
            setAccount({
                nonce: data.nonce.valueOf(),
                balance: new AccountBalance(data.balance)
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

const getConnector = ({connector, env}: IContextProviderProps): AuthConnector => {
    if (connector !== undefined) {return connector;}
    const providerBuilder = new ProviderBuilder(env ?? "devnet");

    return new AuthConnector(providerBuilder);
}
